import { Router } from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', catchAsync(async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user.id })
    .populate('participants', 'username displayName avatar isOnline lastSeen')
    .populate('lastMessage.sender', 'username displayName avatar')
    .sort({ lastActivityAt: -1 });

  res.json({ success: true, data: conversations });
}));

router.get('/:id', catchAsync(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user.id,
  }).populate('participants', 'username displayName avatar isOnline lastSeen');

  if (!conversation) throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: conversation });
}));

router.post('/', catchAsync(async (req, res) => {
  const { participantId } = req.body;
  if (!participantId) throw new AppError('participantId is required', 400, 'VALIDATION');
  if (participantId === req.user.id) throw new AppError('Cannot start conversation with yourself', 400, 'VALIDATION');

  const otherUser = await User.findById(participantId);
  if (!otherUser) throw new AppError('User not found', 404, 'NOT_FOUND');

  const sortedParticipants = [req.user.id, participantId].sort();
  const existing = await Conversation.findOne({
    participants: { $all: sortedParticipants, $size: 2 },
  }).populate('participants', 'username displayName avatar isOnline lastSeen');

  if (existing) return res.json({ success: true, data: existing });

  const conversation = await Conversation.create({
    participants: sortedParticipants,
  });

  const populated = await Conversation.findById(conversation._id)
    .populate('participants', 'username displayName avatar isOnline lastSeen');

  res.status(201).json({ success: true, data: populated });
}));

router.get('/:id/messages', catchAsync(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user.id,
  });
  if (!conversation) throw new AppError('Conversation not found', 404, 'NOT_FOUND');

  const messages = await Message.find({ conversation: req.params.id, isDeleted: false })
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
