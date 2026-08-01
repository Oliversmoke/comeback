import { Router } from 'express';
import {
  isStellarAuthConfigured,
  isValidStellarPublicKey,
  buildChallenge,
  verifyChallenge,
  findOrCreateStellarUser,
} from '../services/stellarAuth.js';
import { generateTokens } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import { logActivity } from '../services/backupService.js';

const router = Router();

// SEP-10 challenge endpoint: returns a challenge XDR for the client to sign.
router.post('/challenge', catchAsync(async (req, res) => {
  if (!isStellarAuthConfigured()) {
    throw new AppError('Stellar auth is not configured on this server', 503, 'NOT_CONFIGURED');
  }

  const { publicKey } = req.body;
  if (!isValidStellarPublicKey(publicKey)) {
    throw new AppError('A valid Stellar public key (G...) is required', 400, 'VALIDATION');
  }

  const challenge = buildChallenge(publicKey);
  res.json({ success: true, data: challenge });
}));

// SEP-10 verification endpoint: verifies the signed challenge and issues JWTs.
router.post('/verify', catchAsync(async (req, res) => {
  if (!isStellarAuthConfigured()) {
    throw new AppError('Stellar auth is not configured on this server', 503, 'NOT_CONFIGURED');
  }

  const { publicKey, signedXdr } = req.body;
  if (!publicKey || !signedXdr || typeof signedXdr !== 'string') {
    throw new AppError('publicKey and signedXdr are required', 400, 'VALIDATION');
  }

  let verifiedKey;
  try {
    verifiedKey = verifyChallenge(publicKey, signedXdr);
  } catch {
    throw new AppError('Invalid or expired challenge signature', 401, 'INVALID_SIGNATURE');
  }

  const user = await findOrCreateStellarUser(verifiedKey);
  const tokens = generateTokens(user.toPublicJSON());

  user.refreshToken = tokens.refreshToken;
  user.isOnline = true;
  user.lastSeen = new Date();
  await user.save();

  logActivity(`Stellar wallet login: ${verifiedKey}`);

  res.json({
    success: true,
    data: { user: user.toPublicJSON(), ...tokens },
  });
}));

export default router;
