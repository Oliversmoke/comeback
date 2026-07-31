import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import { validate, aiPromptSchema } from '../validators/schemas.js';
import { generateDailyTasks, generateInsights, chatWithCoach } from '../services/openai.js';
import { getMemorySummary, recordActivity, updateMemoryFromInteraction, generateAndSaveInsights, getOrCreateMemory } from '../services/aiMemoryService.js';
import { getEncouragement, getRecoveryStrategy, generateChallenge, getReflectionPrompt, generateRecoveryPlan, generateImplementationIntention, generateGrowthMindsetPrompt, generateConsistencyPlan, generateBurnoutPrevention } from '../services/psychologyEngine.js';
import { analyzeUserPatterns, updateLearningModel, generateAdaptiveInsight } from '../services/adaptiveLearningEngine.js';
import { initializeAchievements, checkAchievements } from '../services/achievementService.js';
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

  const memorySummary = await getMemorySummary(req.user.id).catch(() => null);
  const tasks = await generateDailyTasks(user, goals, recentTasks, memorySummary);

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
        reasoning: taskData.reasoning || 'AI-generated based on goal analysis',
        difficulty: taskData.difficulty,
        category: taskData.category,
        timeEstimate: taskData.estimatedMinutes,
      },
    });
    createdTasks.push(task);
  }

  await recordActivity(req.user.id, 'ai_tasks_generated', {
    description: `Generated ${createdTasks.length} tasks across ${goals.length} goals`,
    value: createdTasks.length,
  }).catch(() => {});

  const analysis = await analyzeUserPatterns(req.user.id).catch(() => null);
  const recommendations = analysis ? {
    recommendedDifficulty: analysis.recommendedDifficulty,
    coachingFocus: analysis.recommendedCoachingStyle?.focus || 'growth',
    performanceTrend: analysis.performanceTrend?.trend || 'stable',
  } : null;

  const intentions = goals.slice(0, 2).map((g) => {
    const obstacle = req.body.obstacle || analysis?.obstacleFrequency?.[0]?.pattern;
    return generateImplementationIntention(g.title, obstacle);
  }).filter(Boolean);

  res.json({
    success: true,
    data: {
      tasks: createdTasks,
      recommendations,
      implementationIntentions: intentions,
      psychologyContext: {
        consistencyPlan: goals.length > 0 ? generateConsistencyPlan(user, await getOrCreateMemory(req.user.id).catch(() => null)) : null,
        encouragement: getEncouragement('taskCompletion', { task: 'generating your daily tasks' }),
      },
    },
  });
}));

router.post('/insights', catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  const goals = await Goal.find({ user: req.user.id });
  const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(30);
  const groupCount = await Group.countDocuments({ 'members.user': req.user.id });
  const memorySummary = await getMemorySummary(req.user.id).catch(() => null);

  const insights = await generateInsights(user, goals, tasks, { groupCount }, memorySummary);

  await recordActivity(req.user.id, 'ai_insight_viewed', {
    description: 'Viewed AI productivity insights',
  }).catch(() => {});

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

  const memorySummary = await getMemorySummary(req.user.id).catch(() => null);
  userContext.memorySummary = memorySummary;

  const response = await chatWithCoach(user, prompt, userContext);

  await recordActivity(req.user.id, 'ai_chat', {
    description: `AI Coach chat: "${prompt.slice(0, 80)}..."`,
  }).catch(() => {});

  await updateMemoryFromInteraction(req.user.id, {
    topics: extractTopics(prompt),
  }).catch(() => {});

  await checkAchievements(req.user.id).catch(() => {});

  await updateLearningModel(req.user.id, {
    topics: extractTopics(prompt),
    timeOfDay: getTimeOfDay(),
  }).catch(() => {});

  const analysis = await analyzeUserPatterns(req.user.id).catch(() => null);
  const psychologyContext = analysis ? {
    recommendedCoachingStyle: analysis.recommendedCoachingStyle,
    performanceTrend: analysis.performanceTrend?.trend,
    dominantTimeOfDay: analysis.timePattern?.dominantTimeOfDay,
  } : null;

  res.json({
    success: true,
    data: {
      response,
      context: userContext,
      encouragement: getEncouragement('taskCompletion', { task: 'chatting with your AI coach' }),
      psychologyContext,
    },
  });
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

router.post('/recovery-plan', catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  const daysMissed = req.body.daysMissed || calculateDaysMissed(user);
  const plan = generateRecoveryPlan(user, daysMissed);

  res.json({ success: true, data: plan });
}));

router.get('/reflection-prompt', catchAsync(async (req, res) => {
  const type = req.query.type || 'daily';
  const index = req.query.index ? parseInt(req.query.index) : -1;
  const prompt = getReflectionPrompt(type, index);

  res.json({ success: true, data: { prompt, type } });
}));

router.get('/challenge', catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  const memory = await getMemorySummary(req.user.id).catch(() => null);
  const preference = memory?.personality?.challengePreference || 'moderate';
  const challenge = generateChallenge(preference);

  res.json({ success: true, data: challenge });
}));

router.post('/track-win', catchAsync(async (req, res) => {
  const { description, category, impact } = req.body;
  if (!description) throw new AppError('Win description required', 400, 'VALIDATION');

  const { trackWin } = await import('../services/aiMemoryService.js');
  const memory = await trackWin(req.user.id, description, category || 'general', impact || 'small');

  await recordActivity(req.user.id, 'ai_chat', {
    description: `Tracked win: ${description.slice(0, 60)}`,
  }).catch(() => {});

  const encouragement = getEncouragement('taskCompletion', { task: description });

  res.json({ success: true, data: { memory, encouragement } });
}));

router.post('/encouragement', catchAsync(async (req, res) => {
  const { type, replacements } = req.body;
  const message = getEncouragement(type || 'taskCompletion', replacements || {});

  res.json({ success: true, data: { message } });
}));

function extractTopics(text) {
  const topicKeywords = {
    productivity: ['productivity', 'focus', 'efficiency', 'deep work', 'distraction', 'time'],
    motivation: ['motivation', 'unmotivated', 'drive', 'passion', 'inspiration', 'burnout'],
    goals: ['goal', 'ambition', 'dream', 'purpose', 'vision', 'objective', 'target'],
    habits: ['habit', 'routine', 'daily', 'ritual', 'consistency', 'automatic'],
    stress: ['stress', 'anxiety', 'overwhelm', 'pressure', 'worry', 'nervous', 'tired'],
    health: ['health', 'exercise', 'sleep', 'energy', 'wellness', 'fitness', 'mental'],
    learning: ['learn', 'study', 'skill', 'knowledge', 'course', 'read', 'improve'],
    career: ['career', 'work', 'job', 'promotion', 'project', 'professional', 'business'],
    relationships: ['friend', 'family', 'relationship', 'social', 'community', 'group'],
    confidence: ['confidence', 'self-esteem', 'doubt', 'imposter', 'believe', 'fear'],
  };

  const found = [];
  const lower = text.toLowerCase();
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      found.push(topic);
    }
  }
  return found.slice(0, 3);
}

function calculateDaysMissed(user) {
  if (!user.lastActiveDate) return 0;
  const now = new Date();
  const diff = Math.floor((now - new Date(user.lastActiveDate)) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff - 1);
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export default router;
