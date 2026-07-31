import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { validateFile, uploadImage, uploadAvatar, uploadProofImage, uploadAttachment, deleteImage } from '../services/cloudinaryService.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Message from '../models/Message.js';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/avatar', authenticate, upload.single('image'), catchAsync(async (req, res) => {
  validateFile(req.file);
  const result = await uploadAvatar(req.file, req.user.id);

  if (req.user.avatar && req.user.avatar.includes('cloudinary')) {
    const oldPublicId = req.user.avatar.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '');
    deleteImage(oldPublicId).catch(() => {});
  }

  await User.findByIdAndUpdate(req.user.id, { avatar: result.url });

  res.json({ success: true, data: result });
}));

router.post('/proof/:taskId', authenticate, upload.single('image'), catchAsync(async (req, res) => {
  validateFile(req.file);
  const task = await Task.findOne({ _id: req.params.taskId, user: req.user.id });
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  const result = await uploadProofImage(req.file, req.params.taskId);
  task.proof = { image: result.url, submittedAt: new Date() };
  await task.save();

  res.json({ success: true, data: result });
}));

router.post('/attachment/:conversationId', authenticate, upload.single('image'), catchAsync(async (req, res) => {
  validateFile(req.file);
  const result = await uploadAttachment(req.file, req.params.conversationId);

  const message = await Message.create({
    conversation: req.params.conversationId,
    sender: req.user.id,
    content: '',
    messageType: 'image',
    attachments: [{ url: result.url, type: 'image' }],
  });

  res.json({ success: true, data: { ...result, messageId: message._id } });
}));

router.post('/group-cover/:groupId', authenticate, upload.single('image'), catchAsync(async (req, res) => {
  validateFile(req.file);

  const Group = (await import('../models/Group.js')).default;
  const group = await Group.findOne({ _id: req.params.groupId, 'members.user': req.user.id });
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found or access denied' });
  }

  const result = await uploadImage(req.file, `comeback-ai/groups/${req.params.groupId}`);
  group.coverImage = result.url;
  await group.save();

  res.json({ success: true, data: result });
}));

export default router;
