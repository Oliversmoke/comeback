import User from '../models/User.js';
import XpTransaction from '../models/XpTransaction.js';
import Group from '../models/Group.js';
import * as cache from '../utils/cache.js';

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500,
  10000, 13000, 16500, 20500, 25000, 30000, 36000, 43000, 51000, 60000,
];

export const calculateLevel = (xp) => {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
};

export const awardXp = async (userId, amount, type, source = {}) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    const multipliers = {
      task_completed: 1,
      goal_completed: 5,
      streak_bonus: user.streak > 0 ? Math.min(user.streak * 0.1, 3) : 1,
      daily_login: 1,
      milestone: 2,
      group_bonus: 1.5,
      leaderboard_bonus: 2,
      social_boost: 1.2,
    };

    const multiplier = multipliers[type] || 1;
    const finalAmount = Math.round(amount * multiplier);

    user.xp += finalAmount;
    user.level = calculateLevel(user.xp);
    user.lastActiveDate = new Date();
    await user.save({ session });

    await XpTransaction.create([{
      user: userId,
      amount: finalAmount,
      type,
      source,
      multiplier,
    }], { session });

    const updatedUser = user.toPublicJSON();

    await session.commitTransaction();
    cache.del('leaderboard:');
    return { xpAwarded: finalAmount, totalXp: user.xp, level: user.level, user: updatedUser };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const updateStreak = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const now = new Date();
  const lastActive = user.lastActiveDate || new Date(0);
  const diffDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return user.streak;
  if (diffDays === 1) {
    user.streak += 1;
    if (user.streak > user.longestStreak) user.longestStreak = user.streak;
  } else {
    user.streak = 1;
  }
  user.lastActiveDate = now;
  await user.save();
  return user.streak;
};

export const getLeaderboard = async (limit = 20, groupId = null) => {
  const cacheKey = groupId ? `leaderboard:group:${groupId}:${limit}` : `leaderboard:global:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let result;
  if (groupId) {
    const group = await Group.findById(groupId).populate('members.user', 'username displayName avatar xp level streak');
    if (!group) throw new Error('Group not found');
    result = group.members
      .filter((m) => m.user)
      .sort((a, b) => (b.xpInGroup || 0) - (a.xpInGroup || 0))
      .slice(0, limit)
      .map((m, i) => ({
        rank: i + 1,
        userId: m.user._id,
        username: m.user.username,
        displayName: m.user.displayName,
        avatar: m.user.avatar,
        xp: m.xpInGroup,
        level: m.user.level,
        streak: m.user.streak,
      }));
  } else {
    const users = await User.find({})
      .sort({ xp: -1 })
      .limit(limit)
      .select('username displayName avatar xp level streak completedTasks');

    result = users.map((u, i) => ({
      rank: i + 1,
      userId: u._id,
      username: u.username,
      displayName: u.displayName,
      avatar: u.avatar,
      xp: u.xp,
      level: u.level,
      streak: u.streak,
      completedTasks: u.completedTasks,
    }));
  }

  cache.set(cacheKey, result, 30_000);
  return result;
};

export const getGroupLeaderboard = async (limit = 20) => {
  const cacheKey = `leaderboard:groups:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const groups = await Group.find({})
    .sort({ totalXp: -1 })
    .limit(limit)
    .select('name coverImage memberCount totalXp streak category');

  const result = groups.map((g, i) => ({
    rank: i + 1,
    ...g.toLeaderboardJSON(),
  }));

  cache.set(cacheKey, result, 30_000);
  return result;
};
