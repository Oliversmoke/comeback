import UserMemory from '../models/UserMemory.js';
import UserInsight from '../models/UserInsight.js';
import UserActivity from '../models/UserActivity.js';
import Goal from '../models/Goal.js';
import Task from '../models/Task.js';

const ADAPTATION_THRESHOLDS = {
  completionRate: { low: 40, medium: 60, high: 80 },
  burnoutRisk: { warning: 50, critical: 75 },
  streak: { building: 7, consistent: 30, elite: 90 },
  consistencyScore: { low: 30, medium: 60, high: 80 },
};

export async function analyzeUserPatterns(userId) {
  const memory = await UserMemory.findOne({ user: userId });
  if (!memory) return null;

  const recentTasks = await Task.find({ user: userId })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  const activities = await UserActivity.find({ user: userId })
    .sort({ date: -1 })
    .limit(100)
    .lean();

  const analysis = {
    performanceTrend: calculatePerformanceTrend(recentTasks),
    timePattern: analyzeTimePattern(activities),
    categoryPerformance: analyzeCategoryPerformance(recentTasks),
    obstacleFrequency: analyzeObstacles(memory),
    adaptationScore: calculateAdaptationScore(memory),
    recommendedDifficulty: null,
    recommendedCoachingStyle: null,
  };

  analysis.recommendedDifficulty = recommendTaskDifficulty(analysis, memory);
  analysis.recommendedCoachingStyle = recommendCoachingStyle(analysis, memory);

  return analysis;
}

function calculatePerformanceTrend(tasks) {
  if (tasks.length < 5) return { trend: 'insufficient_data', slope: 0 };

  const sorted = [...tasks].sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
  const recent = sorted.slice(-20);

  const windows = {
    last3: recent.slice(-3).filter(t => t.status === 'completed').length / 3,
    last7: recent.slice(-7).filter(t => t.status === 'completed').length / 7,
    last14: recent.slice(-14).filter(t => t.status === 'completed').length / 14,
    all: recent.filter(t => t.status === 'completed').length / recent.length,
  };

  let trend = 'stable';
  const slope = windows.last3 - windows.last14;
  if (slope > 0.15) trend = 'improving';
  else if (slope < -0.15) trend = 'declining';
  else if (windows.last3 > 0.8) trend = 'breakthrough';

  return { trend, slope, windows, completionRate: Math.round(windows.all * 100) };
}

function analyzeTimePattern(activities) {
  const hourBuckets = {};
  const dayBuckets = {};

  for (const act of activities) {
    const hour = act.context?.hour ?? new Date(act.date).getHours();
    const day = act.context?.dayOfWeek ?? new Date(act.date).getDay();

    if (act.activityType === 'task_completed') {
      hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      dayBuckets[dayNames[day]] = (dayBuckets[dayNames[day]] || 0) + 1;
    }
  }

  const peakHour = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];
  const peakDay = Object.entries(dayBuckets).sort((a, b) => b[1] - a[1])[0];

  const morning = Object.entries(hourBuckets).filter(([h]) => h >= 5 && h < 12).reduce((s, [,c]) => s + c, 0);
  const afternoon = Object.entries(hourBuckets).filter(([h]) => h >= 12 && h < 17).reduce((s, [,c]) => s + c, 0);
  const evening = Object.entries(hourBuckets).filter(([h]) => h >= 17 && h < 22).reduce((s, [,c]) => s + c, 0);
  const night = Object.entries(hourBuckets).filter(([h]) => h >= 22 || h < 5).reduce((s, [,c]) => s + c, 0);

  const times = { morning, afternoon, evening, night };
  const dominantTime = Object.entries(times).sort((a, b) => b[1] - a[1])[0]?.[0] || 'morning';

  return {
    peakProductivityHour: peakHour ? parseInt(peakHour[0]) : null,
    peakProductivityDay: peakDay?.[0] || null,
    dominantTimeOfDay: dominantTime,
    hourlyDistribution: Object.fromEntries(
      Object.entries(hourBuckets).sort((a, b) => a[0] - b[0])
    ),
  };
}

function analyzeCategoryPerformance(tasks) {
  const categories = {};
  for (const task of tasks) {
    const cat = task.aiContext?.category || task.category || 'uncategorized';
    if (!categories[cat]) categories[cat] = { completed: 0, total: 0, xpEarned: 0 };
    categories[cat].total++;
    if (task.status === 'completed') {
      categories[cat].completed++;
      categories[cat].xpEarned += task.xpReward || 0;
    }
  }

  return Object.entries(categories).map(([name, stats]) => ({
    name,
    completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    completed: stats.completed,
    total: stats.total,
    xpEarned: stats.xpEarned,
  })).sort((a, b) => b.completionRate - a.completionRate);
}

function analyzeObstacles(memory) {
  return (memory.obstacles || [])
    .map(o => ({
      pattern: o.pattern,
      frequency: o.frequency,
      description: o.description,
      lastOccurrence: o.lastOccurrence,
      recency: Math.floor((Date.now() - new Date(o.lastOccurrence).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => (b.frequency * (b.recency < 7 ? 2 : 1)) - (a.frequency * (a.recency < 7 ? 2 : 1)));
}

function calculateAdaptationScore(memory) {
  const completionRate = memory.progressTracking?.averageCompletionRate || 50;
  const burnoutRisk = memory.personalityProfile?.burnoutRisk || 0;
  const consistencyScore = memory.personalityProfile?.consistencyScore || 50;

  let score = 50;

  if (completionRate > ADAPTATION_THRESHOLDS.completionRate.high) score += 15;
  else if (completionRate < ADAPTATION_THRESHOLDS.completionRate.low) score -= 15;

  if (burnoutRisk > ADAPTATION_THRESHOLDS.burnoutRisk.critical) score -= 20;
  else if (burnoutRisk > ADAPTATION_THRESHOLDS.burnoutRisk.warning) score -= 10;

  if (consistencyScore > ADAPTATION_THRESHOLDS.consistencyScore.high) score += 10;
  else if (consistencyScore < ADAPTATION_THRESHOLDS.consistencyScore.low) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function recommendTaskDifficulty(analysis, memory) {
  const currentPref = memory.coachingStyle?.challengePreference || 'moderate';
  const trend = analysis.performanceTrend;

  if (trend.trend === 'declining' || trend.completionRate < ADAPTATION_THRESHOLDS.completionRate.low) {
    return 'gentle';
  }
  if (trend.trend === 'improving' && trend.completionRate > ADAPTATION_THRESHOLDS.completionRate.high) {
    return 'stretch';
  }
  if (trend.trend === 'breakthrough') {
    return 'stretch';
  }
  if (memory.personalityProfile?.burnoutRisk > ADAPTATION_THRESHOLDS.burnoutRisk.warning) {
    return 'gentle';
  }
  return currentPref;
}

function recommendCoachingStyle(analysis, memory) {
  const currentTone = memory.coachingStyle?.preferredTone || 'encouraging';
  const trend = analysis.performanceTrend;
  const obstacles = analysis.obstacleFrequency;

  if (obstacles.length > 0 && obstacles[0].frequency > 3) {
    return { tone: 'analytical', focus: 'problem_solving' };
  }
  if (trend.trend === 'declining') {
    return { tone: 'encouraging', focus: 'rebuilding_confidence' };
  }
  if (trend.trend === 'breakthrough') {
    return { tone: 'warm', focus: 'celebration' };
  }
  if (memory.personalityProfile?.burnoutRisk > ADAPTATION_THRESHOLDS.burnoutRisk.warning) {
    return { tone: 'gentle', focus: 'recovery' };
  }
  return { tone: currentTone, focus: 'growth' };
}

export async function generateAdaptiveInsight(userId) {
  const analysis = await analyzeUserPatterns(userId);
  if (!analysis) return null;

  const insights = [];
  const { performanceTrend, timePattern, categoryPerformance, recommendedDifficulty, recommendedCoachingStyle } = analysis;

  if (performanceTrend.trend === 'declining' && performanceTrend.completionRate < 40) {
    insights.push({
      type: 'productivity_trend',
      title: 'Productivity dip detected',
      content: `Your completion rate has dropped to ${performanceTrend.completionRate}%. This is normal — the key is adjusting, not pushing harder.`,
      data: { metric: 'completion_rate', currentValue: performanceTrend.completionRate, trend: 'declining' },
      recommendation: {
        action: `Reduce daily tasks and focus on just ${recommendedDifficulty === 'gentle' ? '1-2 easy wins' : '2-3 important tasks'} today`,
        reasoning: 'Lowering difficulty when performance dips prevents burnout and rebuilds confidence',
        priority: 'high',
      },
    });
  }

  if (performanceTrend.trend === 'breakthrough') {
    insights.push({
      type: 'breakthrough',
      title: 'Breakthrough performance!',
      content: `Your recent completion rate of ${Math.round(performanceTrend.windows.last3 * 100)}% is outstanding. You're in a flow state — capitalize on it.`,
      data: { metric: 'completion_rate', currentValue: performanceTrend.completionRate, trend: 'breakthrough' },
      recommendation: {
        action: 'Schedule your most challenging tasks during your peak hours this week',
        reasoning: 'You\'re in a high-performance window — leverage it for difficult tasks',
        priority: 'high',
      },
    });
  }

  if (timePattern.peakProductivityHour !== null) {
    insights.push({
      type: 'motivation_pattern',
      title: `Peak productivity at ${timePattern.peakProductivityHour}:00`,
      content: `You tend to be most productive at ${timePattern.peakProductivityHour}:00 on ${timePattern.peakProductivityDay || 'your most active day'}. Schedule important work during this window.`,
      data: { metric: 'peak_hour', currentValue: timePattern.peakProductivityHour },
      recommendation: {
        action: `Try scheduling your most challenging tasks around ${timePattern.peakProductivityHour}:00`,
        reasoning: 'Aligning work with natural energy peaks increases completion likelihood',
        priority: 'medium',
      },
    });
  }

  if (categoryPerformance.length > 0) {
    const best = categoryPerformance[0];
    const worst = categoryPerformance[categoryPerformance.length - 1];

    if (best.completionRate > 70) {
      insights.push({
        type: 'habit_suggestion',
        title: `Your strength: ${best.name}`,
        content: `You complete ${best.completionRate}% of tasks in "${best.name}" — this is your zone of strength.`,
        data: { metric: 'category_performance', currentValue: best.completionRate },
        recommendation: {
          action: `Consider setting more goals in "${best.name}" or using this category for momentum-building`,
          reasoning: 'Starting with a strength area builds confidence and motivation',
          priority: 'low',
        },
      });
    }

    if (worst && worst.completionRate < 40 && worst.total > 3) {
      insights.push({
        type: 'goal_insight',
        title: `Growth opportunity: ${worst.name}`,
        content: `Tasks in "${worst.name}" have a ${worst.completionRate}% completion rate. Consider breaking them into smaller steps.`,
        data: { metric: 'category_improvement', currentValue: worst.completionRate, previousValue: 50, trend: 'declining' },
        recommendation: {
          action: `Break "${worst.name}" tasks into smaller, 5-10 minute chunks`,
          reasoning: 'Large or difficult tasks in weak areas need to be reduced to manageable pieces',
          priority: 'medium',
        },
      });
    }
  }

  if (recommendedCoachingStyle.focus !== 'growth') {
    insights.push({
      type: 'motivation_pattern',
      title: 'Coaching adaptation applied',
      content: `I've adjusted my coaching to focus on "${recommendedCoachingStyle.focus}" with a ${recommendedCoachingStyle.tone} tone based on your recent patterns.`,
      data: { metric: 'coaching_adaptation' },
      recommendation: {
        action: `Focus on ${recommendedCoachingStyle.focus.replace('_', ' ')} activities today`,
        reasoning: 'Adapted coaching targets your current needs more effectively',
        priority: 'medium',
      },
    });
  }

  const savedInsights = [];
  for (const insightData of insights) {
    const existing = await UserInsight.findOne({
      user: userId,
      type: insightData.type,
      title: insightData.title,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    if (!existing) {
      const doc = await UserInsight.create({
        user: userId,
        ...insightData,
        source: { type: 'psychology_engine' },
        relevanceScore: insightData.recommendation?.priority === 'high' ? 0.9 : insightData.recommendation?.priority === 'medium' ? 0.6 : 0.3,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      });
      savedInsights.push(doc);
    }
  }

  return savedInsights;
}

export async function updateLearningModel(userId, interaction) {
  const memory = await UserMemory.findOne({ user: userId });
  if (!memory) return null;

  if (interaction.completedTask) {
    memory.progressTracking.averageCompletionRate = calculateNewRate(
      memory.progressTracking.averageCompletionRate,
      1, 1
    );
  }

  if (interaction.skippedTask) {
    memory.progressTracking.averageCompletionRate = calculateNewRate(
      memory.progressTracking.averageCompletionRate,
      0, 1
    );
  }

  if (interaction.feedback?.tonePreference) {
    memory.coachingStyle.preferredTone = interaction.feedback.tonePreference;
  }

  if (interaction.feedback?.challengePreference) {
    memory.coachingStyle.challengePreference = interaction.feedback.challengePreference;
  }

  if (interaction.timeOfDay) {
    const existing = memory.behavioralPatterns.bestTaskTimes;
    if (!existing.includes(interaction.timeOfDay)) {
      existing.push(interaction.timeOfDay);
      if (existing.length > 5) existing.shift();
    }
  }

  memory.lastModelUpdate = new Date();
  await memory.save();

  const analysis = await analyzeUserPatterns(userId);
  if (analysis?.performanceTrend) {
    const consistencyScore = Math.min(100, memory.personalityProfile.consistencyScore + (
      analysis.performanceTrend.trend === 'improving' ? 5 :
      analysis.performanceTrend.trend === 'declining' ? -5 : 0
    ));
    memory.personalityProfile.consistencyScore = Math.max(0, consistencyScore);
  }

  if (analysis?.performanceTrend?.trend === 'declining' && analysis.performanceTrend.completionRate < 50) {
    memory.personalityProfile.burnoutRisk = Math.min(100, (memory.personalityProfile.burnoutRisk || 0) + 10);
  } else if (analysis?.performanceTrend?.trend === 'improving') {
    memory.personalityProfile.burnoutRisk = Math.max(0, (memory.personalityProfile.burnoutRisk || 0) - 5);
  }

  await memory.save();
  return memory;
}

function calculateNewRate(currentRate, completed, total) {
  if (total === 0) return currentRate;
  const alpha = 0.3;
  const newRate = (completed / total) * 100;
  return Math.round(currentRate * (1 - alpha) + newRate * alpha);
}

export function getAdaptationReport(analysis) {
  if (!analysis) return null;

  return {
    currentState: {
      performance: analysis.performanceTrend.trend,
      completionRate: analysis.performanceTrend.completionRate,
      dominantTime: analysis.timePattern.dominantTimeOfDay,
      peakHour: analysis.timePattern.peakProductivityHour,
    },
    adaptations: {
      taskDifficulty: analysis.recommendedDifficulty,
      coachingStyle: analysis.recommendedCoachingStyle,
    },
    strengths: analysis.categoryPerformance.slice(0, 2).map(c => c.name),
    areasForGrowth: analysis.categoryPerformance.slice(-1).map(c => c.name),
    adaptationScore: analysis.adaptationScore,
  };
}

export async function runLearningCycle(userId) {
  const analysis = await analyzeUserPatterns(userId);
  const insights = await generateAdaptiveInsight(userId);
  const memory = await UserMemory.findOne({ user: userId });

  const cycleResult = {
    analysis: getAdaptationReport(analysis),
    insightsGenerated: insights?.length || 0,
    memoryUpdated: !!memory,
    timestamp: new Date().toISOString(),
  };

  if (memory) {
    memory.lastModelUpdate = new Date();
    await memory.save();
  }

  return cycleResult;
}