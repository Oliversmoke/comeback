import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: [true, 'Message content is required'], maxlength: 2000 },
  messageType: {
    type: String,
    enum: ['text', 'image', 'system', 'task_completed', 'milestone_reached', 'ai_insight'],
    default: 'text',
  },
  attachments: [{
    url: String,
    type: { type: String, enum: ['image', 'file', 'link'] },
    name: String,
  }],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  editedAt: Date,
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ group: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
