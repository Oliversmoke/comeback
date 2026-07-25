import UserMemory from '../models/UserMemory.js';
import UserActivity from '../models/UserActivity.js';
import UserInsight from '../models/UserInsight.js';
import Goal from '../models/Goal.js';
import Task from '../models/Task.js';

export async function getOrCreateMemory(userId) {
  let memory = await UserMemory.findOne({ user: userId });
  if (!memory) {
    memory = await UserMemory.create({ user: userId });
  }
  return memory;
}

export async function updateMemoryFromInteraction(userId, interaction) {
  const memory = await getOrCreateMemory(userId);
  memory.interactionCount = (memory.interactionCount || 0) + 1;
  memory.lastModelUpdate = new Date();

  if (interaction.topics) {
    for (const topic of interaction.topics) {
      const existing = memory.behavioralPatterns.commonlyDiscussedTopics.find(
        t => t.topic.toLowerCase() === topic.toLowerCase()
      );
      if (existing) {
        existing.mentionCount += 1;
        existing.lastMentioned = new Date();
      } else {
        memory.behavioralPatterns.commonlyDiscussedTopics.push({
          topic,
          mentionCount: 1,
          lastMentioned: new Date(),
        });
      }
    }
  }

  if (interaction.preferredTone) {
    memory.coachingStyle.preferredTone = interaction.preferredTone;
  }

  await memory.save();
  return memory;
}

export async function recordActivity(userId, activityType, metadata = {}, context = {}) {
  const now = new Date();
  const hour = now.getHours();

  let timeOfDay = 'morning';
  if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
  else if (hour >= 22 || hour < 5) timeOfDay = 'night';

  const activity = await UserActivity.create({
    user: userId,
    date: now,
    activityType,
    metadata,
    context: {
      timeOfDay,
      dayOfWeek: now.getDay(),
      weekNumber: getWeekNumber(now),
      monthNumber: now.getMonth(),
      year: now.getFullYear(),
      hour,
      ...context,
    },
  });

  return activity;
}

export async function getUserTimeline(userId, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return UserActivity.find({
    user: userId,
    date: { $gte: since },
  }).sort({ date: -1 }).lean();
}

export async function getProductivityTrend(userId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const activities = await UserActivity.find({
    user: userId,
    date: { $gte: since },
    activityType: { $in: ['task_completed', 'task_skipped'] },
  }).lean();

  const daily = {};
  for (const act of activities) {
    const dayKey = new Date(act.date).toISOString().split('T')[0];
    if (!daily[dayKey]) daily[dayKey] = { completed: 0, skipped: 0, total: 0 };
    if (act.activityType === 'task_completed') daily[dayKey].completed++;
    else daily[dayKey].skipped++;
    daily[dayKey].total++;
  }

  return Object.entries(daily).map(([date, stats]) => ({
    date,
    ...stats,
    rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
  }));
}

export async function getPeakProductivityHours(userId, days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const completions = await UserActivity.find({
    user: userId,
    date: { $gte: since },
    activityType: 'task_completed',
  }).lean();

  const hourCounts = {};
  for (const act of completions) {
    const h = act.context?.hour ?? new Date(act.date).getHours();
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  }

  return Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count);
}

export async function getMemorySummary(userId) {
  const memory = await getOrCreateMemory(userId);
  const goals = await Goal.find({ user: userId, status: 'active' }).lean();
  const pendingTasks = await Task.countDocuments({ user: userId, status: { $in: ['pending', 'in_progress'] } });

  return {
    coachingStyle: memory.coachingStyle,
    personality: memory.personalityProfile,
    patterns: {
      bestTimes: memory.behavioralPatterns.bestTaskTimes,
      peakHours: memory.behavioralPatterns.peakProductivityHours,
      commonTopics: memory.behavioralPatterns.commonlyDiscussedTopics.slice(0, 5),
      completionRate: memory.progressTracking.averageCompletionRate,
    },
    topObstacles: memory.obstacles.sort((a, b) => b.frequency - a.frequency).slice(0, 3),
    recentWins: memory.wins.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3),
    preferences: memory.preferences,
    activeGoals: goals.length,
    pendingTasks,
    interactionCount: memory.interactionCount,
  };
}

export async function trackWin(userId, description, category, impact = 'small') {
  const memory = await getOrCreateMemory(userId);
  memory.wins.push({ description, category, date: new Date(), impact });
  if (memory.wins.length > 50) {
    memory.wins = memory.wins.slice(-50);
  }
  await memory.save();
  return memory;
}

export async function trackObstacle(userId, pattern, description, strategies = []) {
  const memory = await getOrCreateMemory(userId);
  const existing = memory.obstacles.find(o => o.pattern === pattern);
  if (existing) {
    existing.frequency += 1;
    existing.lastOccurrence = new Date();
    if (strategies.length) existing.suggestedStrategies = [...new Set([...existing.suggestedStrategies, ...strategies])];
  } else {
    memory.obstacles.push({ pattern, description, frequency: 1, lastOccurrence: new Date(), suggestedStrategies: strategies });
  }
  await memory.save();
  return memory;
}

export async function updateCompletionRate(userId) {
  const memory = await getOrCreateMemory(userId);
  const trends = await getProductivityTrend(userId, 7);
  const total = trends.reduce((sum, d) => sum + d.total, 0);
  const completed = trends.reduce((sum, d) => sum + d.completed, 0);
  memory.progressTracking.averageCompletionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  await memory.save();
  return memory;
}

async function generateInsightsFromAnalytics(userId, memory) {
  const insights = [];

  if (memory.progressTracking.averageCompletionRate < 40) {
    insights.push({
      type: 'burnout_warning',
      title: 'Completion rate below 40%',
      content: 'Your recent task completion rate has dropped significantly. Consider reducing your daily task load.',
      recommendation: { action: 'Review your current goals and scale back to 1-2 key tasks per day', priority: 'high' },
    });
  }

  if (memory.personalityProfile.burnoutRisk > 70) {
    insights.push({
      type: 'burnout_warning',
      title: 'Burnout risk detected',
      content: 'Your activity patterns suggest you may be at risk of burnout. Rest is productive too.',
      recommendation: { action: 'Schedule a rest day and focus on recovery activities', priority: 'high' },
    });
  }

  const highEnergyCats = memory.behavioralPatterns.highEnergyCategories;
  if (highEnergyCats.length) {
    insights.push({
      type: 'productivity_trend',
      title: 'Energy alignment opportunity',
      content: `You tend to perform best in "${highEnergyCats[0]}" tasks. Consider scheduling these during peak hours.`,
      recommendation: { action: `Schedule "${highEnergyCats[0]}" tasks during your peak productivity window`, priority: 'medium' },
    });
  }

  return insights;
}

export async function generateAndSaveInsights(userId) {
  const memory = await getOrCreateMemory(userId);
  const analyticInsights = await generateInsightsFromAnalytics(userId, memory);

  const saved = [];
  for (const insight of analyticInsights) {
    const doc = await UserInsight.create({
      user: userId,
      ...insight,
      source: { type: 'analytics' },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    saved.push(doc);
  }

  return saved;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
