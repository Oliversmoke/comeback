import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import {
  getEncouragement,
  getReflectionPrompt,
  getRecoveryStrategy,
  generateChallenge,
  generateRecoveryPlan,
  generateReframingSuggestion,
  getAllPrinciples,
  getPsychologyPrinciple,
  generateImplementationIntention,
  generateBurnoutPrevention,
  generateGrowthMindsetPrompt,
  generateConsistencyPlan,
} from '../services/psychologyEngine.js';
import { getOrCreateMemory, getMemorySummary } from '../services/aiMemoryService.js';
import { analyzeUserPatterns, getAdaptationReport, runLearningCycle, generateAdaptiveInsight } from '../services/adaptiveLearningEngine.js';
import User from '../models/User.js';
import Goal from '../models/Goal.js';

const router = Router();
router.use(authenticate);

router.get('/principles', catchAsync(async (req, res) => {
  const principles = getAllPrinciples();
  res.json({ success: true, data: Object.values(principles) });
}));

router.get('/principle/:name', catchAsync(async (req, res) => {
  const principle = getPsychologyPrinciple(req.params.name);
  if (!principle) throw new AppError('Principle not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: principle });
}));

router.post('/intention', catchAsync(async (req, res) => {
  const { goalTitle, obstacle } = req.body;
  if (!goalTitle) throw new AppError('Goal title required', 400, 'VALIDATION');
  const intention = generateImplementationIntention(goalTitle, obstacle);
  res.json({ success: true, data: intention });
}));

router.get('/burnout-check', catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  const memory = await getOrCreateMemory(req.user.id);
  const result = generateBurnoutPrevention(user, memory);
  res.json({ success: true, data: result });
}));

router.get('/growth-mindset', catchAsync(async (req, res) => {
  const { obstacle } = req.query;
  const result = generateGrowthMindsetPrompt(obstacle);
  res.json({ success: true, data: result });
}));

router.get('/consistency-plan', catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  const memory = await getOrCreateMemory(req.user.id);
  const plan = generateConsistencyPlan(user, memory);
  res.json({ success: true, data: plan });
}));

router.post('/reframe', catchAsync(async (req, res) => {
  const { obstacle } = req.body;
  if (!obstacle) throw new AppError('Obstacle description required', 400, 'VALIDATION');
  const reframe = generateReframingSuggestion(obstacle);
  res.json({ success: true, data: reframe || { message: 'Keep going \u2014 you\'ve got this!' } });
}));

router.get('/encouragement', catchAsync(async (req, res) => {
  const { type, ...replacements } = req.query;
  const message = getEncouragement(type || 'taskCompletion', replacements);
  res.json({ success: true, data: { message } });
}));

router.get('/reflection-prompt', catchAsync(async (req, res) => {
  const type = req.query.type || 'daily';
  const index = req.query.index ? parseInt(req.query.index) : -1;
  const prompt = getReflectionPrompt(type, index);
  res.json({ success: true, data: { prompt, type } });
}));

router.get('/recovery-strategy', catchAsync(async (req, res) => {
  const strategy = getRecoveryStrategy();
  res.json({ success: true, data: strategy });
}));

router.post('/recovery-plan', catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  const daysMissed = req.body.daysMissed || (() => {
    if (!user.lastActiveDate) return 0;
    const diff = Math.floor((Date.now() - new Date(user.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff - 1);
  })();
  const plan = generateRecoveryPlan(user, daysMissed);
  res.json({ success: true, data: plan });
}));

router.get('/challenge', catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  const memory = await getMemorySummary(req.user.id).catch(() => null);
  const preference = memory?.personality?.challengePreference || 'moderate';
  const challenge = generateChallenge(preference);
  res.json({ success: true, data: challenge });
}));

router.get('/analysis', catchAsync(async (req, res) => {
  const analysis = await analyzeUserPatterns(req.user.id);
  const report = getAdaptationReport(analysis);
  res.json({ success: true, data: report });
}));

router.post('/learning-cycle', catchAsync(async (req, res) => {
  const result = await runLearningCycle(req.user.id);
  res.json({ success: true, data: result });
}));

router.post('/adaptive-insights', catchAsync(async (req, res) => {
  const insights = await generateAdaptiveInsight(req.user.id);
  res.json({ success: true, data: insights || [] });
}));

export default router;