'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, Users, ArrowLeft, Loader2, Bot,
} from 'lucide-react';
import { groupsAPI } from '@/lib/api';
import { getSocket, sendMessage, sendTyping, joinGroup, markAsRead } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { AnimatedPage, FadeIn } from '@/components/animations/MotionComponents';
import { formatTimeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Group, Message } from '@/types';

export default function ChatPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, { username: string; timeout: NodeJS.Timeout }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, accessToken } = useAuthStore();

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    socket.on('message:new', (message: Message) => {
      if (message.group === activeGroup?._id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('message:deleted', ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    socket.on('typing:start', ({ userId, username, groupId }: any) => {
      if (groupId === activeGroup?._id && userId !== user?.id) {
        setTypingUsers((prev) => {
          if (prev[userId]) clearTimeout(prev[userId].timeout);
          const timeout = setTimeout(() => {
            setTypingUsers((p) => {
              const newUsers = { ...p };
              delete newUsers[userId];
              return newUsers;
            });
          }, 3000);
          return { ...prev, [userId]: { username, timeout } };
        });
      }
    });

    socket.on('typing:stop', ({ userId, groupId }: any) => {
      if (groupId === activeGroup?._id) {
        setTypingUsers((prev) => {
          const newUsers = { ...prev };
          delete newUsers[userId];
          return newUsers;
        });
      }
    });

    return () => {
      socket.off('message:new');
      socket.off('message:deleted');
      socket.off('typing:start');
      socket.off('typing:stop');
    };
  }, [accessToken, activeGroup?._id, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadGroups = async () => {
    try {
      const { data } = await groupsAPI.getMy();
      setGroups(data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const selectGroup = async (group: Group) => {
    setActiveGroup(group);
    setMessagesLoading(true);
    try {
      const { data } = await groupsAPI.getMessages(group._id, { limit: '50' });
      setMessages(data.data);
      joinGroup(group._id);
    } catch { toast.error('Failed to load messages'); }
    finally { setMessagesLoading(false); }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeGroup) return;
    const content = input.trim();
    setInput('');

    try {
      await sendMessage({ groupId: activeGroup._id, content });
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (activeGroup) {
      sendTyping(activeGroup._id, isTyping);
    }
  };

  const typingText = Object.values(typingUsers).length > 0
    ? `${Object.values(typingUsers).map((t) => t.username).join(', ')} typing...`
    : '';

  return (
    <AnimatedPage>
      <FadeIn>
        <h1 className="text-2xl font-bold mb-6">Group Chat</h1>
      </FadeIn>

      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Group List */}
        <div className="w-72 flex-shrink-0 hidden md:block">
          <div className="glass-card h-full overflow-y-auto">
            <div className="p-4 relative border-b border-dark-700/50">
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-400" />
                Your Groups
              </h2>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-dark-400" />
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="w-8 h-8 text-dark-400 mx-auto mb-2" />
                <p className="text-sm text-dark-400">No groups yet</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {groups.map((group) => (
                  <motion.button
                    key={group._id}
                    layout
                    onClick={() => selectGroup(group)}
                    className={`w-full p-4 text-left hover:bg-dark-700/30 transition-all border-b border-dark-700/30 ${
                      activeGroup?._id === group._id ? 'bg-primary-500/10 border-l-2 border-l-primary-400' : ''
                    }`}
                  >
                    <p className="text-sm font-medium truncate">{group.name}</p>
                    <p className="text-xs text-dark-400 mt-0.5">{group.memberCount || group.members?.length || 0} members</p>
                  </motion.button>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 glass-card flex flex-col">
          {activeGroup ? (
            <>
              <div className="p-4 border-b border-dark-700/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">{activeGroup.name}</h3>
                  <p className="text-xs text-dark-400">
                    {activeGroup.memberCount || activeGroup.members?.length || 0} members
                    {typingText && <span className="text-primary-400 ml-2">{typingText}</span>}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-dark-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
                  >
                    <MessageSquare className="w-10 h-10 text-dark-400 mx-auto mb-2" />
                    <p className="text-dark-400 text-sm">No messages yet. Start the conversation!</p>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {messages.map((msg) => (
                      <motion.div
                        key={msg._id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.01 }}
                        className={`flex gap-3 ${msg.sender?._id === user?.id ? 'justify-end' : ''}`}
                      >
                        {msg.sender?._id !== user?.id && (
                          <img
                            src={msg.sender?.avatar || `https://ui-avatars.com/api/?name=${msg.sender?.username}&background=00A8FF&color=fff`}
                            alt=""
                            className="w-8 h-8 rounded-full flex-shrink-0 mt-1"
                          />
                        )}
                        <div
                          className={`max-w-[70%] p-3 rounded-2xl ${
                            msg.sender?._id === user?.id
                              ? 'bg-primary-500/20 border border-primary-500/30 rounded-br-md'
                              : 'bg-dark-700/50 border border-dark-600/50 rounded-bl-md'
                          }`}
                        >
                          {msg.sender?._id !== user?.id && (
                            <p className="text-xs text-primary-400 font-medium mb-1">{msg.sender?.displayName || msg.sender?.username}</p>
                          )}
                          <p className="text-sm">{msg.content}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-dark-500">{formatTimeAgo(msg.createdAt)}</p>
                            {msg.messageType === 'task_completed' && <Bot className="w-3 h-3 text-green-400" />}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-dark-700/50">
                <form onSubmit={handleSend} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => handleTyping(true)}
                    onBlur={() => handleTyping(false)}
                    className="input-field flex-1"
                  />
                  <motion.button
                    type="submit"
                    disabled={!input.trim()}
                    animate={input.trim() ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-primary px-5"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-dark-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Select a group</h3>
                <p className="text-dark-400">Choose a group from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
