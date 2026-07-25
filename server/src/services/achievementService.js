import Achievement from '../models/Achievement.js';
import Task from '../models/Task.js';
import Goal from '../models/Goal.js';
import User from '../models/User.js';
import XpTransaction from '../models/XpTransaction.js';
import { awardXp } from './xpService.js';
import { recordActivity } from './aiMemoryService.js';

const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first_task', title: 'First Step', description: 'Complete your first task', icon: 'target', category: 'milestone', tier: 'bronze', target: 1, xpReward: 25 },
  { id: 'ten_tasks', title: 'Getting Started', description: 'Complete 10 tasks', icon: 'list-checks', category: 'volume', tier: 'bronze', target: 10, xpReward: 50 },
  { id: 'fifty_tasks', title: 'Task Machine', description: 'Complete 50 tasks', icon: 'zap', category: 'volume', tier: 'silver', target: 50, xpReward: 100 },
  { id: 'hundred_tasks', title: 'Centurion', description: 'Complete 100 tasks', icon: 'trophy', category: 'volume', tier: 'gold', target: 100, xpReward: 200 },
  { id: 'five_hundred_tasks', title: 'Legendary Productivity', description: 'Complete 500 tasks', icon: 'crown', category: 'volume', tier: 'platinum', target: 500, xpReward: 500 },
  { id: 'thousand_tasks', title: 'Productivity Titan', description: 'Complete 1000 tasks', icon: 'diamond', category: 'volume', tier: 'diamond', target: 1000, xpReward: 1000 },

  { id: 'streak_3', title: 'Getting Consistent', description: 'Maintain a 3-day streak', icon: 'flame', category: 'streak', tier: 'bronze', target: 3, xpReward: 30 },
  { id: 'streak_7', title: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'flame', category: 'streak', tier: 'silver', target: 7, xpReward: 75 },
  { id: 'streak_14', title: 'Two Week Fire', description: 'Maintain a 14-day streak', icon: 'flame', category: 'streak', tier: 'silver', target: 14, xpReward: 150 },
  { id: 'streak_30', title: 'Monthly Master', description: 'Maintain a 30-day streak', icon: 'flame', category: 'streak', tier: 'gold', target: 30, xpReward: 300 },
  { id: 'streak_60', title: 'Two Month Champion', description: 'Maintain a 60-day streak', icon: 'flame', category: 'streak', tier: 'platinum', target: 60, xpReward: 600 },
  { id: 'streak_100', title: 'The Unstoppable', description: 'Maintain a 100-day streak', icon: 'flame', category: 'streak', tier: 'diamond', target: 100, xpReward: 1000 },

  { id: 'first_goal', title: 'Goal Getter', description: 'Complete your first goal', icon: 'flag', category: 'milestone', tier: 'bronze', target: 1, xpReward: 50 },
  { id: 'five_goals', title: 'Achiever', description: 'Complete 5 goals', icon: 'flag', category: 'milestone', tier: 'silver', target: 5, xpReward: 150 },
  { id: 'ten_goals', title: 'Goal Crusher', description: 'Complete 10 goals', icon: 'flag', category: 'milestone', tier: 'gold', target: 10, xpReward: 300 },
  { id: 'twenty_goals', title: 'Visionary', description: 'Complete 20 goals', icon: 'flag', category: 'milestone', tier: 'platinum', target: 20, xpReward: 500 },

  { id: 'consistency_3', title: 'Three Days Strong', description: 'Complete tasks 3 days in a row', icon: 'calendar-check', category: 'consistency', tier: 'bronze', target: 3, xpReward: 30 },
  { id: 'consistency_7', title: 'Solid Week', description: 'Complete tasks 7 days in a row', icon: 'calendar-check', category: 'consistency', tier: 'silver', target: 7, xpReward: 70 },
  { id: 'consistency_30', title: 'Iron Will', description: 'Complete tasks 30 days in a row', icon: 'calendar-check', category: 'consistency', tier: 'gold', target: 30, xpReward: 300 },

  { id: 'first_group', title: 'Team Player', description: 'Join your first group', icon: 'users', category: 'social', tier: 'bronze', target: 1, xpReward: 25 },
  { id: 'five_groups', title: 'Social Butterfly', description: 'Join 5 groups', icon: 'users', category: 'social', tier: 'silver', target: 5, xpReward: 100 },
  { id: 'group_messages_50', title: 'Chatter', description: 'Send 50 group messages', icon: 'message-square', category: 'social', tier: 'bronze', target: 50, xpReward: 50 },
  { id: 'group_messages_200', title: 'Community Builder', description: 'Send 200 group messages', icon: 'message-square', category: 'social', tier: 'silver', target: 200, xpReward: 150 },

  { id: 'level_5', title: 'Rising Star', description: 'Reach level 5', icon: 'trending-up', category: 'mastery', tier: 'bronze', target: 5, xpReward: 100 },
  { id: 'level_10', title: 'Seasoned Pro', description: 'Reach level 10', icon: 'trending-up', category: 'mastery', tier: 'silver', target: 10, xpReward: 250 },
  { id: 'level_15', title: 'Expert', description: 'Reach level 15', icon: 'trending-up', category: 'mastery', tier: 'gold', target: 15, xpReward: 500 },
  { id: 'level_20', title: 'Grandmaster', description: 'Reach level 20', icon: 'trophy', category: 'mastery', tier: 'platinum', target: 20, xpReward: 1000 },

  { id: 'early_bird_5', title: 'Early Bird', description: 'Complete 5 tasks before 9 AM', icon: 'sunrise', category: 'consistency', tier: 'bronze', target: 5, xpReward: 50 },
  { id: 'night_owl_5', title: 'Night Owl', description: 'Complete 5 tasks after 10 PM', icon: 'moon', category: 'consistency', tier: 'bronze', target: 5, xpReward: 50 },
  { id: 'comeback_king', title: 'The Comeback', description: 'Rebuild a streak after losing it', icon: 'refresh-cw', category: 'special', tier: 'silver', target: 1, xpReward: 100 },
  { id: 'ai_coach_10', title: 'AI Learner', description: 'Have 10 conversations with AI Coach', icon: 'bot', category: 'special', tier: 'bronze', target: 10, xpReward: 75 },
  { id: 'ai_coach_50', title: 'AI Explorer', description: 'Have 50 conversations with AI Coach', icon: 'bot', category: 'special', tier: 'silver', target: 50, xpReward: 200 },
];

export async function initializeAchievements(userId) {
  const existing = await Achievement.findOne({ user: userId });
  if (existing) return;

  const achievements = ACHIEVEMENT_DEFINITIONS.map(def => ({
    user: userId,
    id: def.id,
    title: def.title,
    description: def.description,
    icon: def.icon,
    category: def.category,
    tier: def.tier,
    xpReward: def.xpReward,
    progress: { current: 0, target: def.target },
  }));

  await Achievement.insertMany(achievements);
}

export async function checkAchievements(userId) {
  const [user, achievements] = await Promise.all([
    User.findById(userId),
    Achievement.find({ user: userId }),
  ]);

  if (!user || !achievements.length) return [];

  const [totalCompletedTasks, totalCompletedGoals, currentStreak] = await Promise.all([
    Task.countDocuments({ user: userId, status: 'completed' }),
    Goal.countDocuments({ user: userId, status: 'completed' }),
    user.streak || 0,
  ]);

  const newlyUnlocked = [];

  for (const achievement of achievements) {
    if (achievement.unlockedAt) continue;

    let current = 0;
    switch (achievement.id) {
      case 'first_task': case 'ten_tasks': case 'fifty_tasks':
      case 'hundred_tasks': case 'five_hundred_tasks': case 'thousand_tasks':
        current = totalCompletedTasks;
        break;
      case 'first_goal': case 'five_goals': case 'ten_goals': case 'twenty_goals':
        current = totalCompletedGoals;
        break;
      case 'streak_3': case 'streak_7': case 'streak_14':
      case 'streak_30': case 'streak_60': case 'streak_100':
        current = currentStreak;
        break;
      case 'level_5': case 'level_10': case 'level_15': case 'level_20':
        current = user.level;
        break;
      default:
        current = achievement.progress?.current || 0;
    }

    achievement.progress.current = Math.min(current, achievement.progress.target);

    if (current >= achievement.progress.target && !achievement.unlockedAt) {
      achievement.unlockedAt = new Date();
      await achievement.save();

      await awardXp(userId, achievement.xpReward, 'achievement', {
        type: 'system',
        description: `Achievement unlocked: ${achievement.title}`,
      });

      await recordActivity(userId, 'achievement_unlocked', {
        description: achievement.title,
        value: achievement.xpReward,
      });

      newlyUnlocked.push(achievement);
    } else {
      await achievement.save();
    }
  }

  return newlyUnlocked;
}

export async function getUserAchievements(userId) {
  return Achievement.find({ user: userId }).sort({ tier: 1, unlockedAt: -1 }).lean();
}

export async function getAchievementStats(userId) {
  const achievements = await Achievement.find({ user: userId }).lean();
  const unlocked = achievements.filter(a => a.unlockedAt);
  const total = achievements.length;
  const byTier = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
  const byCategory = {};

  for (const a of unlocked) {
    byTier[a.tier] = (byTier[a.tier] || 0) + 1;
    byCategory[a.category] = (byCategory[a.category] || 0) + 1;
  }

  return {
    total,
    unlocked: unlocked.length,
    progress: total > 0 ? Math.round((unlocked.length / total) * 100) : 0,
    totalXpFromAchievements: unlocked.reduce((sum, a) => sum + (a.xpReward || 0), 0),
    byTier,
    byCategory,
    exoticCount: unlocked.filter(a => a.tier === 'diamond' || a.tier === 'platinum').length,
  };
}

export { ACHIEVEMENT_DEFINITIONS };
