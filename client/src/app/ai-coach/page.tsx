'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, Target, Lightbulb, TrendingUp, User, MessageSquare, LockKeyhole } from 'lucide-react';
import { aiAPI } from '@/lib/api';
import { AnimatedPage, FadeIn } from '@/components/animations/MotionComponents';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface ChatMessage {
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
}

const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL;

export default function AICoachPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'coach',
      content: "Hi! I'm your AI productivity coach. I can help you analyze your goals, suggest daily tasks, and provide motivation. What would you like to work on today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOwner = OWNER_EMAIL ? user?.email === OWNER_EMAIL : false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setLoading(true);

    try {
      const { data } = await aiAPI.chat({
        prompt: userMsg,
        context: { recentMessages: messages.slice(-5) },
      });
      setMessages((prev) => [...prev, {
        role: 'coach',
        content: data.data.response,
        timestamp: new Date(),
      }]);
    } catch {
      toast.error('Failed to get AI response');
      setMessages((prev) => [...prev, {
        role: 'coach',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getInsights = async () => {
    try {
      const { data } = await aiAPI.getInsights();
      setInsights(data.data);
      setMessages((prev) => [...prev, {
        role: 'coach',
        content: `💡 **Insight:** ${data.data.insight}\n\n🎯 **Suggestion:** ${data.data.suggestion}\n\n🌟 **Encouragement:** ${data.data.encouragement}`,
        timestamp: new Date(),
      }]);
    } catch {
      toast.error('Failed to get insights');
    }
  };

  const generateTasks = async () => {
    try {
      await aiAPI.generateTasks();
      toast.success('AI tasks generated for today!');
      setMessages((prev) => [...prev, {
        role: 'coach',
        content: "I've generated personalized daily tasks based on your goals! Check your Tasks page to see them.",
        timestamp: new Date(),
      }]);
    } catch {
      toast.error('Failed to generate tasks');
    }
  };

  if (!isOwner) {
    return (
      <AnimatedPage>
        <div className="min-h-[80vh] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-lg"
          >
            <div className="w-24 h-24 rounded-3xl bg-dark-700/50 flex items-center justify-center mx-auto mb-6">
              <LockKeyhole className="w-12 h-12 text-dark-400" />
            </div>
            <h1 className="text-3xl font-bold mb-3 text-dark-300">AI Coach</h1>
            <p className="text-dark-500 mb-8 text-lg">
              This feature is currently in private preview and not yet available for your account.
            </p>
          </motion.div>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <FadeIn>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Coach</h1>
              <p className="text-dark-400 text-sm">Your personal productivity assistant</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={getInsights} className="btn-secondary text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Insights
            </button>
            <button onClick={generateTasks} className="btn-primary text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Generate Tasks
            </button>
          </div>
        </div>
      </FadeIn>

      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        <div className="lg:col-span-2 glass-card flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'coach' && (
                    <div className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-accent-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-primary-500/20 border border-primary-500/30 rounded-br-md'
                        : 'bg-dark-700/50 border border-dark-600/50 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className="text-[10px] text-dark-500 mt-2">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary-400" />
                    </div>
                  )}
                </motion.div>
              ))}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-accent-400" />
                  </div>
                  <div className="bg-dark-700/50 border border-dark-600/50 p-4 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <motion.div
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-accent-400"
                      />
                      <motion.div
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                        className="w-2 h-2 rounded-full bg-accent-400"
                      />
                      <motion.div
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                        className="w-2 h-2 rounded-full bg-accent-400"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-dark-700/50">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex gap-3"
            >
              <input
                type="text"
                placeholder="Ask your AI coach anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="input-field flex-1"
                disabled={loading}
              />
              <motion.button
                type="submit"
                disabled={loading || !input.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary px-5"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-accent-400" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={getInsights}
                className="w-full p-3 rounded-xl bg-dark-700/30 hover:bg-primary-500/10 border border-dark-700/50 text-left text-sm transition-all flex items-center gap-3"
              >
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                Get Productivity Insights
              </button>
              <button
                onClick={generateTasks}
                className="w-full p-3 rounded-xl bg-dark-700/30 hover:bg-primary-500/10 border border-dark-700/50 text-left text-sm transition-all flex items-center gap-3"
              >
                <Target className="w-4 h-4 text-primary-400" />
                Generate Daily Tasks
              </button>
              <button className="w-full p-3 rounded-xl bg-dark-700/30 hover:bg-primary-500/10 border border-dark-700/50 text-left text-sm transition-all flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Analyze My Progress
              </button>
            </div>
          </div>

          {insights && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5"
            >
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                Latest Insights
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20">
                  <p className="text-xs text-dark-400 mb-1">💡 Insight</p>
                  <p className="text-sm">{insights.insight}</p>
                </div>
                <div className="p-3 rounded-xl bg-accent-500/10 border border-accent-500/20">
                  <p className="text-xs text-dark-400 mb-1">🎯 Suggestion</p>
                  <p className="text-sm">{insights.suggestion}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-dark-400 mb-1">🌟 Encouragement</p>
                  <p className="text-sm">{insights.encouragement}</p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="glass-card p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-primary-400" />
              Sample Questions
            </h3>
            <div className="space-y-2">
              {[
                'How can I be more productive?',
                'Help me break down my goals',
                'What should I focus on today?',
                'How do I stay motivated?',
                'Analyze my current progress',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="w-full text-left text-sm text-dark-400 hover:text-dark-200 p-2 rounded-lg hover:bg-dark-700/50 transition-all"
                >
                  &ldquo;{q}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
