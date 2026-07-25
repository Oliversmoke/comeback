import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { getDashboardAnalytics, getWeeklyReport, getMonthlyReport, getSystemAnalytics } from '../services/analyticsService.js';
import { generateAndSaveInsights } from '../services/aiMemoryService.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', catchAsync(async (req, res) => {
  const analytics = await getDashboardAnalytics(req.user.id);
  res.json({ success: true, data: analytics });
}));

router.get('/weekly', catchAsync(async (req, res) => {
  const report = await getWeeklyReport(req.user.id);
  res.json({ success: true, data: report });
}));

router.get('/monthly', catchAsync(async (req, res) => {
  const report = await getMonthlyReport(req.user.id);
  res.json({ success: true, data: report });
}));

router.post('/generate-insights', catchAsync(async (req, res) => {
  const insights = await generateAndSaveInsights(req.user.id);
  res.json({ success: true, data: insights });
}));

router.get('/system', catchAsync(async (req, res) => {
  const user = await (await import('../models/User.js')).default.findById(req.user.id).select('email');
  if (user?.email !== process.env.OWNER_EMAIL) {
    return res.status(403).json({ success: false, message: 'Owner only' });
  }
  const analytics = await getSystemAnalytics();
  res.json({ success: true, data: analytics });
}));

export default router;
