import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Group name is required'], trim: true, maxlength: 100 },
  description: { type: String, maxlength: 500 },
  coverImage: String,
  category: {
    type: String,
    enum: ['fitness', 'learning', 'career', 'finance', 'health', 'social', 'creative', 'productivity', 'other'],
    default: 'other',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'moderator', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    xpInGroup: { type: Number, default: 0 },
  }],
  goals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Goal' }],
  isPrivate: { type: Boolean, default: false },
  inviteCode: { type: String, unique: true, sparse: true },
  maxMembers: { type: Number, default: 50 },
  totalXp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastActivityDate: Date,
  rules: [String],
  tags: [String],
}, { timestamps: true });

groupSchema.index({ category: 1, totalXp: -1 });
groupSchema.index({ members: 1 });

groupSchema.methods.toLeaderboardJSON = function () {
  return {
    id: this._id,
    name: this.name,
    coverImage: this.coverImage,
    memberCount: this.members.length,
    totalXp: this.totalXp,
    streak: this.streak,
    category: this.category,
  };
};

export default mongoose.model('Group', groupSchema);
