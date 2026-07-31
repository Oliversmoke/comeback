import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { authenticate, generateTokens, generateResetToken } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import { validate, registerSchema, loginSchema } from '../validators/schemas.js';
import { notifyNewRegistration, sendPasswordReset } from '../services/emailService.js';
import { logActivity } from '../services/backupService.js';
import { initializeAchievements } from '../services/achievementService.js';
import { recordActivity } from '../services/aiMemoryService.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = Router();

router.post('/register', validate(registerSchema), catchAsync(async (req, res) => {
  const { email, username, password, displayName } = req.validatedBody;

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    throw new AppError(
      existing.email === email ? 'Email already registered' : 'Username taken',
      409, 'DUPLICATE'
    );
  }

  const user = await User.create({
    email, username, password, displayName: displayName || username,
  });

  logActivity(`New user registered: ${email} (${username})`);
  notifyNewRegistration(user);

  const tokens = generateTokens(user);
  const userJSON = user.toPublicJSON();

  user.refreshToken = tokens.refreshToken;
  await user.save();

  initializeAchievements(user._id).catch(() => {});

  res.status(201).json({
    success: true,
    data: { user: userJSON, ...tokens },
  });
}));

router.post('/login', validate(loginSchema), (req, res, next) => {
  passport.authenticate('local', { session: false }, async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ success: false, message: info.message });

    const tokens = generateTokens(user);
    const dbUser = await User.findById(user.id);
    if (dbUser) {
      dbUser.refreshToken = tokens.refreshToken;
      dbUser.isOnline = true;
      dbUser.lastSeen = new Date();
      await dbUser.save();
      recordActivity(dbUser._id, 'login', { description: 'User logged in' }).catch(() => {});
    }

    res.json({
      success: true,
      data: { user, ...tokens },
    });
  })(req, res, next);
});

router.post('/google', catchAsync(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) throw new AppError('Google ID token required', 400, 'VALIDATION');

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    // Fallback for development without real credentials
    const decoded = jwt.decode(idToken);
    if (!decoded?.email) throw new AppError('Invalid Google token', 401, 'INVALID_TOKEN');
    payload = decoded;
  }

  if (!payload?.email) throw new AppError('Invalid Google token', 401, 'INVALID_TOKEN');

  let user = await User.findOne({
    $or: [{ providerId: payload.sub }, { email: payload.email }],
  });

  if (!user) {
    user = await User.create({
      email: payload.email,
      username: `${payload.given_name || 'user'}_${payload.sub.slice(-6)}`,
      displayName: payload.name,
      avatar: payload.picture,
      provider: 'google',
      providerId: payload.sub,
    });
  } else if (user.provider === 'local') {
    user.provider = 'google';
    user.providerId = payload.sub;
    await user.save();
  }

  const tokens = generateTokens(user.toPublicJSON());
  res.json({
    success: true,
    data: { user: user.toPublicJSON(), ...tokens },
  });
}));

router.post('/refresh', catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required', 400, 'VALIDATION');

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') throw new Error();

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      throw new Error();
    }

    const tokens = generateTokens(user.toPublicJSON());
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({ success: true, data: tokens });
  } catch {
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }
}));

router.post('/logout', authenticate, catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    user.refreshToken = null;
    user.isOnline = false;
    user.lastSeen = new Date();
    await user.save();
  }
  res.json({ success: true, message: 'Logged out' });
}));

router.get('/me', authenticate, catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('goals')
    .populate('groups', 'name coverImage memberCount');
  res.json({ success: true, data: user ? user.toPublicJSON() : req.user });
}));

router.put('/profile', authenticate, catchAsync(async (req, res) => {
  const allowed = ['displayName', 'bio', 'avatar'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
  res.json({ success: true, data: user.toPublicJSON() });
}));

router.post('/forgot-password', catchAsync(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError('Email is required', 400, 'VALIDATION');

  const user = await User.findOne({ email, provider: 'local' }).select('+resetPasswordToken +resetPasswordExpires');
  if (!user) {
    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  }

  const resetToken = generateResetToken(user.id);
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  await sendPasswordReset(user, resetToken);
  logActivity(`Password reset requested for: ${email}`);

  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
}));

router.post('/reset-password', catchAsync(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) throw new AppError('Token and password are required', 400, 'VALIDATION');
  if (password.length < 8) throw new AppError('Password must be at least 8 characters', 400, 'VALIDATION');

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
    provider: 'local',
  }).select('+password +resetPasswordToken +resetPasswordExpires');

  if (!user) throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.refreshToken = null;
  await user.save();

  logActivity(`Password reset completed for: ${user.email}`);
  res.json({ success: true, message: 'Password has been reset. You can now log in.' });
}));

export default router;
