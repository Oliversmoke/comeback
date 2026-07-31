import { Router } from 'express';
import Task from '../models/Task.js';
import Goal from '../models/Goal.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import { validate, taskSchema } from '../validators/schemas.js';
import { awardXp, updateStreak } from '../services/xpService.js';
import { generateReviewQuestions, verifyTaskProof } from '../services/openai.js';

const router = Router();

router.use(authenticate);

router.get('/', catchAsync(async (req, res) => {
  const { status, priority, goalId, groupId, isDaily, dateFor, page = 1, limit = 50 } = req.query;
  const filter = { user: req.user.id };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (goalId) filter.goal = goalId;
  if (groupId) filter.group = groupId;
  if (isDaily === 'true') filter.isDailyTask = true;
  if (dateFor) {
    const date = new Date(dateFor);
    filter.dateFor = { $gte: new Date(date.setHours(0, 0, 0, 0)), $lte: new Date(date.setHours(23, 59, 59, 999)) };
  }

  const tasks = await Task.find(filter)
    .sort({ priority: -1, dueDate: 1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('goal', 'title category')
    .populate('group', 'name');

  const total = await Task.countDocuments(filter);

  res.json({
    success: true,
    data: tasks,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
}));

router.get('/today', catchAsync(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tasks = await Task.find({
    user: req.user.id,
    status: { $in: ['pending', 'in_progress', 'pending_review'] },
    $or: [
      { dueDate: { $gte: today, $lt: tomorrow } },
      { isDailyTask: true, dateFor: { $gte: today, $lt: tomorrow } },
      { dueDate: null, status: 'pending' },
    ],
  }).sort({ priority: -1, createdAt: 1 }).populate('goal', 'title category');

  res.json({ success: true, data: tasks });
}));

router.get('/:id', catchAsync(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user.id })
    .populate('goal', 'title category')
    .populate('group', 'name');
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: task });
}));

router.post('/', validate(taskSchema), catchAsync(async (req, res) => {
  const taskData = { ...req.validatedBody, user: req.user.id };
  if (req.validatedBody.goalId) {
    taskData.goal = req.validatedBody.goalId;
    delete taskData.goalId;
  }
  if (req.validatedBody.groupId) {
    taskData.group = req.validatedBody.groupId;
    taskData.isGroupTask = true;
    delete taskData.groupId;
  }
  const task = await Task.create(taskData);
  res.status(201).json({ success: true, data: task });
}));

router.put('/:id', catchAsync(async (req, res) => {
  const allowed = ['title', 'description', 'priority', 'status', 'dueDate', 'scheduledDate', 'xpReward'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

  const wasCompleted = updates.status === 'completed' && task.status !== 'completed';

  Object.assign(task, updates);
  if (updates.status === 'completed') task.completedAt = new Date();
  await task.save();

  if (wasCompleted) {
    const streak = await updateStreak(req.user.id);
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { completedTasks: 1 },
    });

    const xpResult = await awardXp(req.user.id, task.xpReward || 10, 'task_completed', {
      type: 'task', ref: task._id, description: `Completed: ${task.title}`,
    });

    if (task.goal) {
      const goal = await Goal.findById(task.goal);
      if (goal && goal.progress < 100) {
        const progressIncrease = Math.min(5, 100 - goal.progress);
        await Goal.findByIdAndUpdate(task.goal, { $inc: { progress: progressIncrease } });
      }
    }

    res.json({ success: true, data: { task, xp: xpResult, streak } });
  } else {
    res.json({ success: true, data: task });
  }
}));

router.delete('/:id', catchAsync(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');
  res.json({ success: true, message: 'Task deleted' });
}));

router.post('/:id/complete', catchAsync(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');
  if (task.status === 'completed') throw new AppError('Task already completed', 400, 'ALREADY_COMPLETED');

  if (task.isAiGenerated && task.status !== 'pending_review') {
    const goal = task.goal ? await Goal.findById(task.goal) : null;
    const questions = await generateReviewQuestions(task, goal);

    task.status = 'pending_review';
    task.aiReview = { questions, answers: [], status: 'pending' };
    await task.save();

    return res.json({
      success: true,
      data: { task, needsReview: true, questions: questions.map((q) => q.question) },
    });
  }

  task.status = 'completed';
  task.completedAt = new Date();
  await task.save();

  const streak = await updateStreak(req.user.id);
  await User.findByIdAndUpdate(req.user.id, {
    $inc: { completedTasks: 1 },
  });

  const xpResult = await awardXp(req.user.id, task.xpReward || 10, 'task_completed', {
    type: 'task', ref: task._id, description: `Completed: ${task.title}`,
  });

  if (task.isGroupTask && task.group) {
    await Group.findByIdAndUpdate(task.group, {
      $inc: { totalXp: task.xpReward || 10 },
      $set: { lastActivityDate: new Date() },
    });
    await Group.updateOne(
      { _id: task.group, 'members.user': req.user.id },
      { $inc: { 'members.$.xpInGroup': task.xpReward || 10 } }
    );
  }

  if (task.goal) {
    const goal = await Goal.findById(task.goal);
    if (goal && goal.progress < 100) {
      await Goal.findByIdAndUpdate(task.goal, { $inc: { progress: Math.min(5, 100 - goal.progress) } });
    }
  }

  res.json({ success: true, data: { task, xp: xpResult, streak } });
}));

router.post('/:id/submit-proof', catchAsync(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');
  if (task.status !== 'pending_review') throw new AppError('Task is not pending review', 400, 'NOT_PENDING_REVIEW');

  const { answers, text } = req.body;
  if (!answers && !text) throw new AppError('Proof required', 400, 'VALIDATION');

  const userAnswers = answers || [{ question: 'Tell me about it', answer: text }];

  task.proof = { text: text || answers?.map((a) => a.answer).join('\n'), submittedAt: new Date() };
  task.aiReview.answers = userAnswers;

  const goal = task.goal ? await Goal.findById(task.goal) : null;
  const result = await verifyTaskProof(task, goal, task.aiReview.answers);

  if (result.approved) {
    task.status = 'completed';
    task.completedAt = new Date();
    task.aiReview.status = 'approved';
    task.aiReview.reviewedAt = new Date();
    await task.save();

    const streak = await updateStreak(req.user.id);
    await User.findByIdAndUpdate(req.user.id, { $inc: { completedTasks: 1 } });

    const xpResult = await awardXp(req.user.id, task.xpReward || 10, 'task_completed', {
      type: 'task', ref: task._id, description: `Completed: ${task.title}`,
    });

    if (task.goal) {
      const g = await Goal.findById(task.goal);
      if (g && g.progress < 100) {
        await Goal.findByIdAndUpdate(task.goal, { $inc: { progress: Math.min(5, 100 - g.progress) } });
      }
    }

    return res.json({
      success: true, data: { task, xp: xpResult, streak, approved: true, feedback: result.feedback },
    });
  }

  task.aiReview.status = 'rejected';
  task.aiReview.reviewedAt = new Date();
  await task.save();

  res.json({
    success: true, data: { task, approved: false, feedback: result.feedback || 'Your proof was not sufficient. Please complete the task and try again.' },
  });
}));

export default router;
