'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, ArrowLeft, Users, Loader2, CheckCheck, Bot,
} from 'lucide-react';
import { groupsAPI } from '@/lib/api';
import { getSocket, sendMessage, sendTyping, joinGroup } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { AnimatedPage, FadeIn } from '@/components/animations/MotionComponents';
import toast from 'react-hot-toast';
import type { Group, Message } from '@/types';

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, { username: string; timeout: NodeJS.Timeout }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, accessToken } = useAuthStore();

  const groupId = params.id as string;

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  useEffect(() => {
    if (!accessToken || !group) return;
    const socket = getSocket(accessToken ?? undefined);

    joinGroup(groupId);

    socket.on('message:new', (message: Message) => {
      if (message.group === groupId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('message:deleted', ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    socket.on('typing:start', ({ userId, username, groupId: gId }: any) => {
      if (gId === groupId && userId !== user?.id) {
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

    socket.on('typing:stop', ({ userId, groupId: gId }: any) => {
      if (gId === groupId) {
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
  }, [accessToken, group, groupId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadGroup = async () => {
    try {
      const { data } = await groupsAPI.get(groupId);
      setGroup(data.data);
      const msgRes = await groupsAPI.getMessages(groupId, { limit: '50' });
      setMessages(msgRes.data.data);
    } catch {
      toast.error('Failed to load group chat');
      router.push('/groups');
    } finally {
      setLoading(false);
      setMessagesLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const content = input.trim();
    setInput('');

    try {
      await sendMessage({ groupId, content });
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (isTyping: boolean) => {
    sendTyping(groupId, isTyping);
  };

  const typingText = Object.values(typingUsers).length > 0
    ? `${Object.values(typingUsers).map((t) => t.username).join(', ')} typing...`
    : '';

  const formatMessageTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <AnimatedPage>
      <FadeIn>
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="flex items-center gap-2 text-wa-300 hover:text-wa-50 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Group
        </button>
      </FadeIn>

      <div className="flex flex-col h-[calc(100vh-12rem)] bg-wa-950 rounded-xl overflow-hidden border border-wa-700/50 relative">
        <div className="absolute inset-0 wa-chat-bg opacity-20 pointer-events-none" />

        <div className="px-4 py-3 wa-glass border-b border-wa-700/50 flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-green-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-wa-50 text-sm">{group.name}</h3>
            <p className="text-xs text-wa-300">
              {group.memberCount || group.members?.length || 0} members
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 relative z-10">
          {messagesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-wa-300" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-10 h-10 text-wa-300 mx-auto mb-2" />
              <p className="text-wa-300 text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((msg) => {
                const isOwn = msg.sender?._id === user?.id;
                return (
                  <motion.div
                    key={msg._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
                  >
                    {!isOwn && (
                      <img
                        src={msg.sender?.avatar || `https://ui-avatars.com/api/?name=${msg.sender?.username}&background=00a884&color=fff`}
                        alt=""
                        className="w-7 h-7 rounded-full flex-shrink-0 self-end mb-1"
                      />
                    )}
                    <div
                      className={`max-w-[75%] px-3.5 py-2 ${
                        isOwn
                          ? 'wa-message-own'
                          : 'wa-message-other'
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-xs text-brand-400 font-medium mb-0.5">{msg.sender?.displayName || msg.sender?.username}</p>
                      )}
                      <p className="text-sm text-wa-50 leading-relaxed">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <p className="text-[10px] text-wa-300/70">{formatMessageTime(msg.createdAt)}</p>
                        {isOwn && <CheckCheck className="w-3.5 h-3.5 text-brand-400" />}
                        {msg.messageType === 'task_completed' && <Bot className="w-3 h-3 text-green-400" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          {typingText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2 items-center text-xs text-wa-300 italic px-2"
            >
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-wa-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-wa-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-wa-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              {typingText}
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 py-3 wa-glass z-10">
          <form onSubmit={handleSend} className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => handleTyping(true)}
              onBlur={() => handleTyping(false)}
              className="flex-1 px-4 py-2.5 bg-wa-900 rounded-full text-sm text-wa-50 placeholder-wa-300/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30 border border-wa-700/50"
            />
            <motion.button
              type="submit"
              disabled={!input.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-green-500 flex items-center justify-center disabled:opacity-40 transition-all shadow-sm shadow-brand-500/20"
            >
              <Send className="w-4 h-4 text-white" />
            </motion.button>
          </form>
        </div>
      </div>
    </AnimatedPage>
  );
}
