import mongoose from 'mongoose';

const userMemorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

  coachingStyle: {
    preferredTone: { type: String, enum: ['encouraging', 'direct', 'analytical', 'warm', 'minimalist'], default: 'encouraging' },
    challengePreference: { type: String, enum: ['stretch', 'moderate', 'gentle'], default: 'moderate' },
    reflectionFrequency: { type: String, enum: ['daily', 'weekly', 'never'], default: 'weekly' },
    feedbackStyle: { type: String, enum: ['detailed', 'concise', 'actionable'], default: 'actionable' },
  },

  personalityProfile: {
    primaryMotivation: { type: String, enum: ['achievement', 'growth', 'connection', 'mastery', 'autonomy', 'purpose'], default: 'growth' },
    productivityPattern: { type: String, enum: ['morning', 'afternoon', 'evening', 'night', 'irregular'], default: 'morning' },
    consistencyScore: { type: Number, min: 0, max: 100, default: 50 },
    burnoutRisk: { type: Number, min: 0, max: 100, default: 0 },
    learningStyle: { type: String, enum: ['visual', 'text', 'structured', 'social', 'experimental'], default: 'structured' },
  },

  behavioralPatterns: {
    bestTaskTimes: [String],
    worstTaskTimes: [String],
    highEnergyCategories: [String],
    lowEnergyCategories: [String],
    averageCompletionRate: { type: Number, default: 0 },
    averageStreakBeforeReset: { type: Number, default: 0 },
    peakProductivityHours: [Number],
    commonlyDiscussedTopics: [{
      topic: String,
      mentionCount: { type: Number, default: 0 },
      lastMentioned: Date,
    }],
  },

  progressTracking: {
    weeklyCompletionTrends: [{
      week: String,
      completed: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      rate: { type: Number, default: 0 },
    }],
    monthlyCompletionTrends: [{
      month: String,
      completed: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      rate: { type: Number, default: 0 },
    }],
    categoryBreakdown: [{
      category: String,
      completed: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    }],
  },

  obstacles: [{
    pattern: String,
    description: String,
    frequency: { type: Number, default: 1 },
    lastOccurrence: Date,
    suggestedStrategies: [String],
  }],

  wins: [{
    description: String,
    category: String,
    date: Date,
    impact: { type: String, enum: ['small', 'medium', 'large', 'breakthrough'], default: 'small' },
  }],

  preferences: {
    preferredGoalCategories: [String],
    avoidedGoalCategories: [String],
    notificationTime: { type: String, default: '09:00' },
    weeklyReviewDay: { type: Number, default: 0 },
    wantsAccountability: { type: Boolean, default: false },
    wantsGroupChallenges: { type: Boolean, default: true },
    reflectionPromptTime: { type: String, default: '20:00' },
  },

  lastModelUpdate: Date,
  lastInteractionSummary: { type: String, maxlength: 1000 },
  interactionCount: { type: Number, default: 0 },

}, { timestamps: true });

userMemorySchema.index({ 'behavioralPatterns.peakProductivityHours': 1 });
userMemorySchema.index({ 'preferences.wantsAccountability': 1, 'progressTracking.averageCompletionRate': -1 });

export default mongoose.model('UserMemory', userMemorySchema);
