import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  goal: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  title: { type: String, required: [true, 'Task title is required'], trim: true, maxlength: 300 },
  description: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'skipped', 'expired', 'pending_review'],
    default: 'pending',
  },
  dueDate: Date,
  scheduledDate: Date,
  completedAt: Date,
  xpReward: { type: Number, default: 10 },
  isAiGenerated: { type: Boolean, default: false },
  aiContext: {
    reasoning: String,
    difficulty: String,
    category: String,
    timeEstimate: Number,
  },
  proof: {
    text: String,
    image: String,
    submittedAt: Date,
  },
  aiReview: {
    questions: [{ question: String }],
    answers: [{ question: String, answer: String }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedAt: Date,
  },
  isDailyTask: { type: Boolean, default: false },
  dateFor: Date,
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isGroupTask: { type: Boolean, default: false },
}, { timestamps: true });

taskSchema.index({ user: 1, status: 1, dueDate: 1 });
taskSchema.index({ group: 1, status: 1 });
taskSchema.index({ dateFor: 1, user: 1 });

export default mongoose.model('Task', taskSchema);
