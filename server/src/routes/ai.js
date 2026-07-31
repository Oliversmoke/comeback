import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import { validate, aiPromptSchema } from '../validators/schemas.js';
import { generateDailyTasks, generateInsights, chatWithCoach } from '../services/openai.js';
import User from '../models/User.js';
import Goal from '../models/Goal.js';
import Task from '../models/Task.js';
import Group from '../models/Group.js';

const router = Router();

router.use(authenticate);

router.post('/generate-tasks', catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  const goals = await Goal.find({ user: req.user.id, status: 'active' });
  const recentTasks = await Task.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(20);

  const tasks = await generateDailyTasks(user, goals, recentTasks);

  const createdTasks = [];
  for (const taskData of tasks) {
    const goalId = taskData.goalId || (goals.length === 1 ? goals[0]._id : null);
    const matchedGoal = !goalId && goals.length > 0
      ? goals.find((g) => taskData.category === g.category || taskData.title.toLowerCase().includes(g.title.toLowerCase().split(' ').slice(0, 2).join(' ')))
      : null;

    const task = await Task.create({
      user: req.user.id,
      goal: goalId || matchedGoal?._id || undefined,
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.difficulty === 'hard' ? 'high' : taskData.difficulty === 'easy' ? 'low' : 'medium',
      isAiGenerated: true,
      isDailyTask: true,
      dateFor: new Date(),
      xpReward: taskData.difficulty === 'hard' ? 20 : taskData.difficulty === 'medium' ? 15 : 10,
      aiContext: {
        reasoning: 'AI-generated based on goal analysis',
        difficulty: taskData.difficulty,
        category: taskData.category,
        timeEstimate: taskData.estimatedMinutes,
      },
    });
    createdTasks.push(task);
  }

  res.json({ success: true, data: createdTasks });
}));

router.post('/insights', catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  const goals = await Goal.find({ user: req.user.id });
  const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(30);
  const groupCount = await Group.countDocuments({ 'members.user': req.user.id });

  const insights = await generateInsights(user, goals, tasks, { groupCount });

  res.json({ success: true, data: insights });
}));

router.post('/chat', validate(aiPromptSchema), catchAsync(async (req, res) => {
  const { prompt, context } = req.validatedBody;
  const user = await User.findById(req.user.id);

  const userContext = context || {};
  if (!context?.goals) {
    const goals = await Goal.find({ user: req.user.id, status: 'active' }).limit(5);
    userContext.goals = goals;
  }
  if (!context?.tasks) {
    const tasks = await Task.find({ user: req.user.id, status: { $in: ['pending', 'in_progress'] } }).limit(5);
    userContext.tasks = tasks;
  }

  const response = await chatWithCoach(user, prompt, userContext);

  res.json({ success: true, data: { response, context: userContext } });
}));

router.post('/group-adapt', catchAsync(async (req, res) => {
  const { groupId } = req.body;
  if (!groupId) throw new AppError('Group ID required', 400, 'VALIDATION');

  const group = await Group.findById(groupId)
    .populate('members.user', 'username xp level streak')
    .populate('goals', 'title status progress');

  if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');

  const isMember = group.members.some((m) => m.user?._id?.toString() === req.user.id);
  if (!isMember) throw new AppError('Not a member', 403, 'FORBIDDEN');

  const members = group.members.filter((m) => m.user).map((m) => m.user);
  const goals = group.goals || [];
  const suggestions = (await import('../services/openai.js')).adaptTasksForGroup;

  const result = await suggestions(group, members, goals);

  res.json({ success: true, data: { suggestions: result, group: group.toLeaderboardJSON() } });
}));

export default router;
