import mongoose from 'mongoose';

const xpTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  type: {
    type: String,
    enum: [
      'task_completed', 'goal_completed', 'streak_bonus', 'group_bonus',
      'daily_login', 'milestone', 'challenge', 'leaderboard_bonus',
      'social_boost', 'achievement',
    ],
    required: true,
  },
  source: {
    type: { type: String, enum: ['task', 'goal', 'group', 'system', 'challenge'] },
    ref: { type: mongoose.Schema.Types.ObjectId },
    description: String,
  },
  multiplier: { type: Number, default: 1 },
  bonusReason: String,
}, { timestamps: true });

xpTransactionSchema.index({ user: 1, createdAt: -1 });
xpTransactionSchema.index({ user: 1, type: 1 });

export default mongoose.model('XpTransaction', xpTransactionSchema);
