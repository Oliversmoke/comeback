import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  password: {
    type: String,
    minlength: 8,
    select: false,
  },
  displayName: { type: String, trim: true, maxlength: 100 },
  avatar: {
    type: String,
    default: 'https://ui-avatars.com/api/?background=6366f1&color=fff&name=User',
  },
  bio: { type: String, maxlength: 500 },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  providerId: String,
  goals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Goal' }],
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDate: Date,
  completedTasks: { type: Number, default: 0 },
  isOnline: { type: Boolean, default: false },
  lastSeen: Date,
  refreshToken: { type: String, select: false },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    email: this.email,
    username: this.username,
    displayName: this.displayName,
    avatar: this.avatar,
    bio: this.bio,
    xp: this.xp,
    level: this.level,
    streak: this.streak,
    longestStreak: this.longestStreak,
    completedTasks: this.completedTasks,
    goals: this.goals,
    groups: this.groups,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    createdAt: this.createdAt,
  };
};

userSchema.index({ xp: -1 });
userSchema.index({ streak: -1 });

export default mongoose.model('User', userSchema);
