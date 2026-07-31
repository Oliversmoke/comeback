import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Group from '../models/Group.js';

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

const onlineUsers = new Map();
let io;

export const configureSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));

      socket.userId = user.id;
      socket.user = user.toPublicJSON();
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);

    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

    io.emit('user:online', { userId, username: socket.user.username });

    const userGroups = await Group.find({ 'members.user': userId }).select('_id');
    userGroups.forEach((group) => {
      socket.join(`group:${group._id}`);
    });

    socket.on('group:join', async (groupId, callback) => {
      try {
        if (!groupId) return callback?.({ error: 'Group ID required' });
        const isMember = await Group.exists({ _id: groupId, 'members.user': userId });
        if (isMember) {
          socket.join(`group:${groupId}`);
          callback?.({ success: true });
        } else {
          callback?.({ error: 'Not a member' });
        }
      } catch (error) {
        callback?.({ error: error.message });
      }
    });

    socket.on('group:leave', (groupId) => {
      if (groupId) socket.leave(`group:${groupId}`);
    });

    socket.on('message:send', async (data, callback) => {
      try {
        const { groupId, content, messageType = 'text' } = data;
        if (!groupId || !content?.trim()) return callback?.({ error: 'Missing required fields' });

        const isMember = await Group.exists({ _id: groupId, 'members.user': userId });
        if (!isMember) return callback?.({ error: 'Not a member' });

        const message = await Message.create({
          group: groupId,
          sender: userId,
          content: content.trim(),
          messageType,
        });

        const populated = await Message.findById(message._id)
          .populate('sender', 'username displayName avatar');

        io.to(`group:${groupId}`).emit('message:new', populated);

        await Group.findByIdAndUpdate(groupId, {
          $set: { lastActivityDate: new Date() },
        });

        callback?.({ success: true, message: populated });
      } catch (error) {
        console.error('Socket message:send error:', error);
        callback?.({ error: error.message });
      }
    });

    socket.on('message:read', async (data) => {
      try {
        const { messageIds, groupId } = data;
        if (!messageIds?.length || !groupId) return;

        await Message.updateMany(
          { _id: { $in: messageIds }, group: groupId },
          { $addToSet: { readBy: userId } }
        );

        io.to(`group:${groupId}`).emit('message:read', {
          messageIds,
          userId,
          username: socket.user.username,
        });
      } catch (error) {
        console.error('Socket message:read error:', error);
      }
    });

    socket.on('message:delete', async (data) => {
      try {
        const { messageId, groupId } = data;
        if (!messageId) return;

        const message = await Message.findOne({ _id: messageId, group: groupId });
        if (!message || (message.sender.toString() !== userId)) return;

        message.isDeleted = true;
        await message.save();

        io.to(`group:${groupId}`).emit('message:deleted', { messageId });
      } catch (error) {
        console.error('Socket message:delete error:', error);
      }
    });

    socket.on('typing:start', (data) => {
      const { groupId } = data;
      if (!groupId) return;
      socket.to(`group:${groupId}`).emit('typing:start', {
        userId,
        username: socket.user.username,
        groupId,
      });
    });

    socket.on('typing:stop', (data) => {
      const { groupId } = data;
      if (!groupId) return;
      socket.to(`group:${groupId}`).emit('typing:stop', {
        userId,
        username: socket.user.username,
        groupId,
      });
    });

    socket.on('group:activity', (data) => {
      try {
        const { groupId, type, payload } = data;
        if (!groupId || !type) return;
        io.to(`group:${groupId}`).emit('group:activity', {
          userId,
          username: socket.user.username,
          type,
          payload,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Socket group:activity error:', error);
      }
    });

    socket.on('disconnect', async () => {
      try {
        onlineUsers.delete(userId);
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        io.emit('user:offline', { userId, username: socket.user.username });
      } catch (error) {
        console.error('Socket disconnect error:', error);
      }
    });
  });

  return io;
};

export const getOnlineUsers = () => Array.from(onlineUsers.keys());
export const getIO = () => io;
