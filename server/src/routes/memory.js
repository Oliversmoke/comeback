import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import UserMemory from '../models/UserMemory.js';
import UserInsight from '../models/UserInsight.js';
import UserActivity from '../models/UserActivity.js';
import { getOrCreateMemory, getUserTimeline, getProductivityTrend, getPeakProductivityHours } from '../services/aiMemoryService.js';
import mongoose from 'mongoose';

const userObjectId = (id) => typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;

const router = Router();

router.use(authenticate);

router.get('/', catchAsync(async (req, res) => {
  const memory = await getOrCreateMemory(req.user.id);
  res.json({ success: true, data: memory });
}));

router.put('/', catchAsync(async (req, res) => {
  const allowedFields = [
    'coachingStyle.preferredTone', 'coachingStyle.challengePreference',
    'coachingStyle.reflectionFrequency', 'coachingStyle.feedbackStyle',
    'preferences.notificationTime', 'preferences.weeklyReviewDay',
    'preferences.wantsAccountability', 'preferences.wantsGroupChallenges',
    'preferences.reflectionPromptTime', 'preferences.preferredGoalCategories',
  ];

  const memory = await getOrCreateMemory(req.user.id);

  for (const field of allowedFields) {
    const keys = field.split('.');
    if (keys.length === 2) {
      if (req.body[keys[0]]?.[keys[1]] !== undefined) {
        memory[keys[0]][keys[1]] = req.body[keys[0]][keys[1]];
      }
    } else if (keys.length === 1) {
      if (req.body[field] !== undefined) {
        memory[field] = req.body[field];
      }
    }
  }

  memory.lastModelUpdate = new Date();
  await memory.save();
  res.json({ success: true, data: memory });
}));

router.get('/timeline', catchAsync(async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const timeline = await getUserTimeline(req.user.id, days);
  res.json({ success: true, data: timeline });
}));

router.get('/trends', catchAsync(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const [trends, peakHours] = await Promise.all([
    getProductivityTrend(req.user.id, days),
    getPeakProductivityHours(req.user.id, Math.min(days, 14)),
  ]);
  res.json({ success: true, data: { trends, peakHours } });
}));

router.get('/insights', catchAsync(async (req, res) => {
  const type = req.query.type;
  const filter = { user: req.user.id, isDismissed: false };
  if (type) filter.type = type;

  const insights = await UserInsight.find(filter)
    .sort({ relevanceScore: -1, createdAt: -1 })
    .limit(parseInt(req.query.limit) || 20)
    .lean();

  res.json({ success: true, data: insights });
}));

router.put('/insights/:id/read', catchAsync(async (req, res) => {
  const insight = await UserInsight.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { isRead: true },
    { new: true }
  );
  if (!insight) throw new AppError('Insight not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: insight });
}));

router.put('/insights/:id/dismiss', catchAsync(async (req, res) => {
  const insight = await UserInsight.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { isDismissed: true },
    { new: true }
  );
  if (!insight) throw new AppError('Insight not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: insight });
}));

router.get('/insights/unread-count', catchAsync(async (req, res) => {
  const count = await UserInsight.countDocuments({
    user: req.user.id,
    isRead: false,
    isDismissed: false,
  });
  res.json({ success: true, data: { count } });
}));

router.get('/activity/summary', catchAsync(async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const activities = await UserActivity.aggregate([
    { $match: { user: userObjectId(req.user.id), date: { $gte: since } } },
    { $group: {
      _id: '$activityType',
      count: { $sum: 1 },
      totalXp: { $sum: '$impact.xpEarned' },
    }},
    { $sort: { count: -1 } },
  ]);

  res.json({ success: true, data: activities });
}));

export default router;
