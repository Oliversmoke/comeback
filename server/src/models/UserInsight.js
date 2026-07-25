import mongoose from 'mongoose';

const userInsightSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  type: {
    type: String,
    enum: [
      'productivity_trend', 'consistency_pattern', 'burnout_warning',
      'streak_insight', 'goal_insight', 'habit_suggestion',
      'motivation_pattern', 'recovery_plan', 'celebration',
      'weekly_summary', 'monthly_report', 'breakthrough',
      'challenge_recommendation', 'social_insight',
    ],
    required: true,
  },

  title: { type: String, required: true },
  content: { type: String, required: true },

  data: {
    metric: String,
    currentValue: Number,
    previousValue: Number,
    change: Number,
    trend: { type: String, enum: ['improving', 'declining', 'stable', 'breakthrough'] },
    percentile: Number,
  },

  recommendation: {
    action: String,
    reasoning: String,
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    suggestedTasks: [String],
    relatedResources: [String],
  },

  isRead: { type: Boolean, default: false },
  isActioned: { type: Boolean, default: false },
  isDismissed: { type: Boolean, default: false },
  relevanceScore: { type: Number, default: 1 },

  source: {
    type: { type: String, enum: ['system', 'ai', 'analytics', 'psychology_engine'], default: 'ai' },
    triggerActivity: { type: mongoose.Schema.Types.ObjectId, ref: 'UserActivity' },
  },

  expiresAt: Date,

}, { timestamps: true });

userInsightSchema.index({ user: 1, createdAt: -1 });
userInsightSchema.index({ user: 1, type: 1, createdAt: -1 });
userInsightSchema.index({ user: 1, isRead: 1, relevanceScore: -1 });
userInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('UserInsight', userInsightSchema);
