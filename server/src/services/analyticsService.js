import Goal from '../models/Goal.js';
import Task from '../models/Task.js';
import UserActivity from '../models/UserActivity.js';
import UserInsight from '../models/UserInsight.js';
import { getProductivityTrend, getPeakProductivityHours, getOrCreateMemory } from './aiMemoryService.js';

export async function getDashboardAnalytics(userId) {
  const [goals, tasks, trends, peakHours, memory] = await Promise.all([
    Goal.find({ user: userId }).lean(),
    Task.find({ user: userId }).lean(),
    getProductivityTrend(userId, 30),
    getPeakProductivityHours(userId, 14),
    getOrCreateMemory(userId),
  ]);

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingTasks = tasks.filter(t => ['pending', 'in_progress'].includes(t.status));

  const categoryBreakdown = {};
  for (const task of completedTasks) {
    const cat = task.aiContext?.category || 'general';
    if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { completed: 0, total: 0 };
    categoryBreakdown[cat].completed++;
  }
  for (const task of tasks) {
    const cat = task.aiContext?.category || 'general';
    if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { completed: 0, total: 0 };
    categoryBreakdown[cat].total++;
  }

  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const pendingRate = totalTasks > 0 ? Math.round((pendingTasks.length / totalTasks) * 100) : 0;

  let weeklyTrend = 0;
  if (trends.length >= 2) {
    const recent = trends.slice(-2);
    weeklyTrend = recent[1].rate - recent[0].rate;
  }

  let streakData = { current: memory.progressTracking.averageCompletionRate };
  const bestStreak = memory.progressTracking.averageCompletionRate;

  const insights = await UserInsight.find({
    user: userId,
    isRead: false,
    isDismissed: false,
  }).sort({ relevanceScore: -1, createdAt: -1 }).limit(5).lean();

  return {
    summary: {
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      totalTasks,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      completionRate,
      pendingRate,
      weeklyTrend,
    },
    categoryBreakdown,
    productivityTrend: trends.slice(-14),
    peakProductivityHours: peakHours.slice(0, 5),
    streak: {
      current: memory.progressTracking.averageCompletionRate,
      best: bestStreak,
      consistency: memory.personalityProfile.consistencyScore,
    },
    goals: activeGoals.slice(0, 5).map(g => ({
      id: g._id,
      title: g.title,
      category: g.category,
      progress: g.progress,
      priority: g.priority,
      targetDate: g.targetDate,
    })),
    coachingEffectiveness: {
      interactionCount: memory.interactionCount || 0,
      preferredTone: memory.coachingStyle.preferredTone,
      challengePreference: memory.coachingStyle.challengePreference,
      topObstacles: memory.obstacles.sort((a, b) => b.frequency - a.frequency).slice(0, 3),
    },
    recentInsights: insights,
  };
}

export async function getWeeklyReport(userId) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [activities, tasks, goals, insights] = await Promise.all([
    UserActivity.find({ user: userId, date: { $gte: weekAgo } }).lean(),
    Task.find({ user: userId, updatedAt: { $gte: weekAgo } }).lean(),
    Goal.find({ user: userId }).lean(),
    UserInsight.find({ user: userId, createdAt: { $gte: weekAgo } }).lean(),
  ]);

  const completed = activities.filter(a => a.activityType === 'task_completed').length;
  const skipped = activities.filter(a => a.activityType === 'task_skipped').length;
  const total = completed + skipped;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const dailyBreakdown = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    dailyBreakdown[key] = { completed: 0, skipped: 0, total: 0 };
  }
  for (const act of activities) {
    const key = new Date(act.date).toISOString().split('T')[0];
    if (dailyBreakdown[key]) {
      if (act.activityType === 'task_completed') dailyBreakdown[key].completed++;
      else if (act.activityType === 'task_skipped') dailyBreakdown[key].skipped++;
      dailyBreakdown[key].total++;
    }
  }

  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;

  let encouragement = '';
  if (rate >= 80) encouragement = 'Outstanding week! You\'re building powerful habits.';
  else if (rate >= 60) encouragement = 'Solid week with good consistency. Keep building.';
  else if (rate >= 40) encouragement = 'Decent week. Focus on removing obstacles next week.';
  else encouragement = 'Every week is a fresh start. Identify what blocked you and adjust.';

  return {
    period: {
      start: weekAgo.toISOString(),
      end: now.toISOString(),
    },
    summary: {
      tasksCompleted: completed,
      tasksSkipped: skipped,
      completionRate: rate,
      activeGoals,
      goalsCompleted: completedGoals,
      aiInteractions: activities.filter(a => a.activityType === 'ai_chat').length,
      insightsGenerated: insights.length,
    },
    dailyBreakdown: Object.entries(dailyBreakdown).map(([date, stats]) => ({ date, ...stats })),
    encouragement,
    nextWeekFocus: rate < 50
      ? 'Focus on consistency over volume. Aim for 1-2 tasks daily.'
      : 'Maintain your momentum. Challenge yourself with slightly bigger goals.',
  };
}

export async function getMonthlyReport(userId) {
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [activities, goals, memory] = await Promise.all([
    UserActivity.find({ user: userId, date: { $gte: monthAgo } }).lean(),
    Goal.find({ user: userId }).lean(),
    getOrCreateMemory(userId),
  ]);

  const weeklyData = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(monthAgo);
    weekStart.setDate(weekStart.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekActivities = activities.filter(a => {
      const d = new Date(a.date);
      return d >= weekStart && d < weekEnd;
    });

    const completed = weekActivities.filter(a => a.activityType === 'task_completed').length;
    const total = weekActivities.length;
    weeklyData.push({
      week: w + 1,
      completed,
      total,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  const categoryData = {};
  for (const goal of goals) {
    if (!categoryData[goal.category]) {
      categoryData[goal.category] = { total: 0, completed: 0, active: 0 };
    }
    categoryData[goal.category].total++;
    if (goal.status === 'completed') categoryData[goal.category].completed++;
    if (goal.status === 'active') categoryData[goal.category].active++;
  }

  const total = goals.length;
  const completedCount = goals.filter(g => g.status === 'completed').length;
  const overallRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return {
    period: {
      start: monthAgo.toISOString(),
      end: now.toISOString(),
    },
    weeklyBreakdown: weeklyData,
    categoryBreakdown: categoryData,
    goalStats: {
      total,
      active: goals.filter(g => g.status === 'active').length,
      completed: completedCount,
      paused: goals.filter(g => g.status === 'paused').length,
      completionRate: overallRate,
    },
    coachingStats: {
      interactions: memory.interactionCount || 0,
      commonObstacles: memory.obstacles.sort((a, b) => b.frequency - a.frequency).slice(0, 5),
      consistency: memory.personalityProfile.consistencyScore,
      burnoutRisk: memory.personalityProfile.burnoutRisk,
    },
    highlights: {
      topCategory: Object.entries(categoryData).sort((a, b) => b[1].completed - a[1].completed)[0]?.[0] || 'none',
      bestWeek: weeklyData.reduce((best, w) => w.rate > (best?.rate || 0) ? w : best, null),
      needsAttention: Object.entries(categoryData).filter(([_, v]) => v.active > 0 && v.completed === 0).map(([k]) => k),
    },
  };
}

export async function getSystemAnalytics() {
  const [totalUsers, totalTasks, totalGoals, totalGroups, recentActivities] = await Promise.all([
    (await import('../models/User.js')).default.countDocuments(),
    Task.countDocuments(),
    Goal.countDocuments(),
    (await import('../models/Group.js')).default.countDocuments(),
    UserActivity.countDocuments({ date: { $gte: new Date(Date.now() - 86400000) } }),
  ]);

  const completedTasks = await Task.countDocuments({ status: 'completed' });
  const activeGoals = await Goal.countDocuments({ status: 'active' });

  return {
    users: { total: totalUsers },
    tasks: { total: totalTasks, completed: completedTasks, completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0 },
    goals: { total: totalGoals, active: activeGoals },
    groups: { total: totalGroups },
    activity: { last24h: recentActivities },
    timestamp: new Date().toISOString(),
  };
}
