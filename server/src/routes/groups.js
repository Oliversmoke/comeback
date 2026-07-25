import { Router } from 'express';
import crypto from 'crypto';
import Group from '../models/Group.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { authenticate } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import { validate, groupSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/', catchAsync(async (req, res) => {
  const { category, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (category) filter.category = category;

  const groups = await Group.find(filter)
    .sort({ totalXp: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .select('-members');

  const total = await Group.countDocuments(filter);

  res.json({
    success: true,
    data: groups,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
}));

router.get('/my', catchAsync(async (req, res) => {
  const groups = await Group.find({ 'members.user': req.user.id })
    .select('name coverImage memberCount totalXp streak category');
  res.json({ success: true, data: groups });
}));

router.get('/:id', catchAsync(async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('members.user', 'username displayName avatar xp level streak isOnline')
    .populate('goals', 'title status progress priority');
  if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: group });
}));

router.post('/', validate(groupSchema), catchAsync(async (req, res) => {
  const group = await Group.create({
    ...req.validatedBody,
    createdBy: req.user.id,
    members: [{ user: req.user.id, role: 'admin' }],
    inviteCode: crypto.randomBytes(6).toString('hex'),
  });

  await User.findByIdAndUpdate(req.user.id, {
    $push: { groups: group._id },
  });

  res.status(201).json({ success: true, data: group });
}));

router.put('/:id', catchAsync(async (req, res) => {
  const group = await Group.findOne({ _id: req.params.id, 'members.user': req.user.id, 'members.role': 'admin' });
  if (!group) throw new AppError('Group not found or not authorized', 404, 'NOT_FOUND');

  const allowed = ['name', 'description', 'coverImage', 'category', 'isPrivate', 'rules', 'tags'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) group[key] = req.body[key];
  }
  await group.save();
  res.json({ success: true, data: group });
}));

router.post('/join/:inviteCode', catchAsync(async (req, res) => {
  const group = await Group.findOne({ inviteCode: req.params.inviteCode });
  if (!group) throw new AppError('Invalid invite code', 404, 'NOT_FOUND');

  const isMember = group.members.some((m) => m.user.toString() === req.user.id);
  if (isMember) throw new AppError('Already a member', 409, 'DUPLICATE');
  if (group.members.length >= group.maxMembers) {
    throw new AppError('Group is full', 400, 'GROUP_FULL');
  }

  group.members.push({ user: req.user.id, role: 'member' });
  await group.save();

  await User.findByIdAndUpdate(req.user.id, {
    $push: { groups: group._id },
  });

  res.json({ success: true, data: group });
}));

router.post('/:id/leave', catchAsync(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');

  group.members = group.members.filter((m) => m.user.toString() !== req.user.id);
  await group.save();

  await User.findByIdAndUpdate(req.user.id, {
    $pull: { groups: group._id },
  });

  res.json({ success: true, message: 'Left group' });
}));

router.put('/:id/members/:userId/role', catchAsync(async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'moderator', 'member'].includes(role)) {
    throw new AppError('Invalid role', 400, 'VALIDATION');
  }
  const group = await Group.findOne({ _id: req.params.id, 'members.user': req.user.id, 'members.role': 'admin' });
  if (!group) throw new AppError('Not authorized', 403, 'FORBIDDEN');

  const member = group.members.find((m) => m.user.toString() === req.params.userId);
  if (!member) throw new AppError('Member not found', 404, 'NOT_FOUND');
  member.role = role;
  await group.save();
  res.json({ success: true, data: group });
}));

router.get('/:id/messages', catchAsync(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const messages = await Message.find({ group: req.params.id, isDeleted: false })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('sender', 'username displayName avatar');

  res.json({
    success: true,
    data: messages.reverse(),
    pagination: { page: Number(page), limit: Number(limit) },
  });
}));

export default router;
