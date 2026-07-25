'use client';

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (token?: string): Socket => {
  if (socket?.connected && !token) return socket;

  socket = io(SOCKET_URL, {
    auth: { token: token || '' },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinGroup = (groupId: string) => {
  socket?.emit('group:join', groupId);
};

export const leaveGroup = (groupId: string) => {
  socket?.emit('group:leave', groupId);
};

export const sendMessage = (data: { groupId: string; content: string; messageType?: string }) => {
  return new Promise((resolve, reject) => {
    socket?.emit('message:send', data, (response: any) => {
      if (response?.error) reject(new Error(response.error));
      else resolve(response);
    });
  });
};

export const sendTyping = (groupId: string, isTyping: boolean) => {
  const event = isTyping ? 'typing:start' : 'typing:stop';
  socket?.emit(event, { groupId });
};

export const markAsRead = (messageIds: string[], groupId: string) => {
  socket?.emit('message:read', { messageIds, groupId });
};
