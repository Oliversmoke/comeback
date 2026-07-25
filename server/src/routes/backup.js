import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import User from '../models/User.js';
import { runBackup, sendLogs, getLogs, getSystemStatsForResponse, logActivity } from '../services/backupService.js';
import { notifyOwner } from '../services/emailService.js';

const router = Router();

router.use(authenticate);

const requireOwner = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user || user.email !== process.env.OWNER_EMAIL) {
    return res.status(403).json({ success: false, message: 'Owner access required' });
  }
  next();
};

router.get('/status', requireOwner, catchAsync(async (req, res) => {
  const stats = await getSystemStatsForResponse();
  res.json({ success: true, data: stats });
}));

router.post('/run', requireOwner, catchAsync(async (req, res) => {
  logActivity('Manual backup triggered');
  const result = await runBackup();
  res.json({ success: result, message: result ? 'Backup sent' : 'Backup failed' });
}));

router.post('/logs', requireOwner, catchAsync(async (req, res) => {
  const result = await sendLogs();
  res.json({ success: result, message: result ? 'Logs sent' : 'Failed to send logs' });
}));

router.get('/logs', requireOwner, catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({ success: true, data: getLogs(limit) });
}));

router.post('/notify', requireOwner, catchAsync(async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) throw new AppError('Subject and message required', 400);
  await notifyOwner(`[Manual] ${subject}`, `<p>${message}</p>`);
  res.json({ success: true, message: 'Notification sent' });
}));

router.get('/users', requireOwner, catchAsync(async (req, res) => {
  const users = await User.find().select('email username displayName xp level streak createdAt provider isOnline lastSeen').sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: users, total: users.length });
}));

export default router;
