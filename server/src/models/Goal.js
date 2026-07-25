import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: [true, 'Goal title is required'], trim: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  category: {
    type: String,
    enum: ['fitness', 'learning', 'career', 'finance', 'health', 'social', 'creative', 'productivity', 'other'],
    default: 'other',
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['active', 'paused', 'completed', 'archived'], default: 'active' },
  startDate: { type: Date, default: Date.now },
  targetDate: Date,
  completedDate: Date,
  progress: { type: Number, default: 0, min: 0, max: 100 },
  milestones: [{
    title: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: Date,
  }],
  tags: [String],
  isAiGenerated: { type: Boolean, default: false },
  aiInsights: {
    difficulty: { type: String, enum: ['easy', 'moderate', 'hard', 'extreme'] },
    estimatedWeeks: Number,
    breakdown: [String],
    suggestions: [String],
  },
  sharedWithGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  xpAwarded: { type: Number, default: 0 },
}, { timestamps: true });

goalSchema.index({ user: 1, status: 1 });
goalSchema.index({ category: 1, status: 1 });

export default mongoose.model('Goal', goalSchema);
