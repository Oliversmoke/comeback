import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { getLeaderboard, getGroupLeaderboard } from '../services/xpService.js';
import User from '../models/User.js';

const router = Router();

router.get('/users', catchAsync(async (req, res) => {
  const { limit = 20, groupId } = req.query;
  const leaderboard = await getLeaderboard(Number(limit), groupId || null);
  res.json({ success: true, data: leaderboard });
}));

router.get('/groups', catchAsync(async (req, res) => {
  const { limit = 20 } = req.query;
  const leaderboard = await getGroupLeaderboard(Number(limit));
  res.json({ success: true, data: leaderboard });
}));

router.get('/user-rank', authenticate, catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.json({ success: true, data: { rank: null, totalUsers: 0 } });

  const rank = await User.countDocuments({ xp: { $gt: user.xp } }) + 1;
  const totalUsers = await User.countDocuments();

  res.json({
    success: true,
    data: { rank, totalUsers, percentile: Math.round(((totalUsers - rank) / totalUsers) * 100) },
  });
}));

export default router;
