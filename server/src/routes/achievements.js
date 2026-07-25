import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { initializeAchievements, checkAchievements, getUserAchievements, getAchievementStats } from '../services/achievementService.js';

const router = Router();

router.use(authenticate);

router.get('/', catchAsync(async (req, res) => {
  const achievements = await getUserAchievements(req.user.id);
  res.json({ success: true, data: achievements });
}));

router.get('/stats', catchAsync(async (req, res) => {
  const stats = await getAchievementStats(req.user.id);
  res.json({ success: true, data: stats });
}));

router.post('/initialize', catchAsync(async (req, res) => {
  await initializeAchievements(req.user.id);
  res.json({ success: true, message: 'Achievements initialized' });
}));

router.post('/check', catchAsync(async (req, res) => {
  const newlyUnlocked = await checkAchievements(req.user.id);
  res.json({ success: true, data: { newlyUnlocked, count: newlyUnlocked.length } });
}));

export default router;
