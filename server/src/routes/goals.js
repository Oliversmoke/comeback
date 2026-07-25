import { Router } from 'express';
import Goal from '../models/Goal.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import { validate, goalSchema } from '../validators/schemas.js';
import { awardXp } from '../services/xpService.js';

const router = Router();

router.use(authenticate);

router.get('/', catchAsync(async (req, res) => {
  const { status, category, page = 1, limit = 20 } = req.query;
  const filter = { user: req.user.id };
  if (status) filter.status = status;
  if (category) filter.category = category;

  const goals = await Goal.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('sharedWithGroups', 'name');

  const total = await Goal.countDocuments(filter);

  res.json({
    success: true,
    data: goals,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

router.get('/:id', catchAsync(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id })
    .populate('sharedWithGroups', 'name coverImage memberCount');
  if (!goal) throw new AppError('Goal not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: goal });
}));

router.post('/', validate(goalSchema), catchAsync(async (req, res) => {
  const goal = await Goal.create({
    ...req.validatedBody,
    user: req.user.id,
  });

  await User.findByIdAndUpdate(req.user.id, {
    $push: { goals: goal._id },
  });

  res.status(201).json({ success: true, data: goal });
}));

router.put('/:id', catchAsync(async (req, res) => {
  const allowed = ['title', 'description', 'category', 'priority', 'status', 'targetDate', 'tags', 'milestones', 'progress'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (updates.status === 'completed') {
    updates.completedDate = new Date();
  }

  const goal = await Goal.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!goal) throw new AppError('Goal not found', 404, 'NOT_FOUND');

  if (updates.status === 'completed') {
    const xpAwarded = goal.priority === 'critical' ? 100 : goal.priority === 'high' ? 75 : goal.priority === 'medium' ? 50 : 25;
    await awardXp(req.user.id, xpAwarded, 'goal_completed', {
      type: 'goal', ref: goal._id, description: `Completed goal: ${goal.title}`,
    });
  }

  res.json({ success: true, data: goal });
}));

router.delete('/:id', catchAsync(async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!goal) throw new AppError('Goal not found', 404, 'NOT_FOUND');
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { goals: goal._id },
  });
  res.json({ success: true, message: 'Goal deleted' });
}));

router.post('/:id/milestones', catchAsync(async (req, res) => {
  const { title } = req.body;
  if (!title) throw new AppError('Milestone title required', 400, 'VALIDATION');

  const goal = await Goal.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $push: { milestones: { title } } },
    { new: true }
  );
  if (!goal) throw new AppError('Goal not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: goal });
}));

router.put('/:id/milestones/:milestoneId', catchAsync(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });
  if (!goal) throw new AppError('Goal not found', 404, 'NOT_FOUND');

  const milestone = goal.milestones.id(req.params.milestoneId);
  if (!milestone) throw new AppError('Milestone not found', 404, 'NOT_FOUND');

  milestone.isCompleted = !milestone.isCompleted;
  milestone.completedAt = milestone.isCompleted ? new Date() : null;
  await goal.save();

  if (milestone.isCompleted) {
    await awardXp(req.user.id, 15, 'milestone', {
      type: 'goal', ref: goal._id, description: `Milestone: ${milestone.title}`,
    });
  }

  res.json({ success: true, data: goal });
}));

export default router;
