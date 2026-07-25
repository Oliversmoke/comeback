import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, default: 'award' },
  category: {
    type: String,
    enum: ['streak', 'volume', 'consistency', 'social', 'milestone', 'special', 'mastery'],
    required: true,
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze',
    required: true,
  },
  xpReward: { type: Number, default: 0 },

  progress: {
    current: { type: Number, default: 0 },
    target: { type: Number, required: true },
  },

  unlockedAt: Date,
  isNotified: { type: Boolean, default: false },

}, { timestamps: true });

achievementSchema.index({ user: 1, id: 1 }, { unique: true });
achievementSchema.index({ user: 1, unlockedAt: -1 });
achievementSchema.index({ user: 1, isNotified: 1 });

export default mongoose.model('Achievement', achievementSchema);
