import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  date: { type: Date, required: true },
  activityType: {
    type: String,
    enum: [
      'task_completed', 'task_skipped', 'task_created',
      'goal_created', 'goal_completed', 'goal_updated',
      'ai_chat', 'ai_insight_viewed', 'ai_tasks_generated',
      'login', 'session',
      'group_joined', 'group_left', 'group_message',
      'milestone_completed', 'xp_earned',
      'reflection_completed', 'settings_updated',
      'achievement_unlocked',
    ],
    required: true,
  },

  metadata: {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    category: String,
    value: Number,
    duration: Number,
    description: String,
    source: String,
    emotion: String,
  },

  context: {
    timeOfDay: { type: String, enum: ['morning', 'afternoon', 'evening', 'night'] },
    dayOfWeek: Number,
    weekNumber: Number,
    monthNumber: Number,
    year: Number,
    hour: Number,
    streak: Number,
    level: Number,
  },

  impact: {
    xpEarned: { type: Number, default: 0 },
    streakContribution: { type: Boolean, default: false },
    goalProgress: { type: Number, default: 0 },
  },

}, { timestamps: true });

userActivitySchema.index({ user: 1, date: -1 });
userActivitySchema.index({ user: 1, activityType: 1, date: -1 });
userActivitySchema.index({ user: 1, 'metadata.category': 1 });
userActivitySchema.index({ date: -1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model('UserActivity', userActivitySchema);
