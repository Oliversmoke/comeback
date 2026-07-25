'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, Target, Lightbulb, TrendingUp, User, MessageSquare, Brain, Heart, AlertTriangle, RefreshCw, Trophy, BookOpen, Zap } from 'lucide-react';
import { aiAPI, psychologyAPI } from '@/lib/api';
import { AnimatedPage, FadeIn } from '@/components/animations/MotionComponents';
import { useAuthStore } from '@/store/authStore';
import { ImplementationIntention, BurnoutCheck, ConsistencyPlan } from '@/types';
import toast from 'react-hot-toast';

interface ChatMessage {
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
  psychologyContext?: {
    intention?: ImplementationIntention;
    encouragement?: string;
  };
}

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
  const [intention, setIntention] = useState<ImplementationIntention | null>(null);
  const [burnout, setBurnout] = useState<BurnoutCheck | null>(null);
  const [consistencyPlan, setConsistencyPlan] = useState<ConsistencyPlan | null>(null);
  const [showPsychology, setShowPsychology] = useState(false);
  const [loadingPsych, setLoadingPsych] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const encouragement = data.data.encouragement;
      setMessages((prev) => [...prev, {
        role: 'coach',
        content: data.data.response,
        timestamp: new Date(),
        psychologyContext: encouragement ? { encouragement } : undefined,
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

  const loadPsychology = async () => {
    setLoadingPsych(true);
    setShowPsychology(true);
    try {
      const [intentionRes, burnoutRes, planRes] = await Promise.all([
        psychologyAPI.generateIntention('your goals', ''),
        psychologyAPI.burnoutCheck(),
        psychologyAPI.consistencyPlan(),
      ]);
      setIntention(intentionRes.data.data);
      setBurnout(burnoutRes.data.data);
      setConsistencyPlan(planRes.data.data);
    } catch {
      // silently fail — psychology features are enhancements
    } finally {
      setLoadingPsych(false);
    }
  };

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
                  <motion.div
                    whileHover={msg.role === 'user' ? { scale: 1.01 } : {}}
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
                  </motion.div>
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
                        animate={{ opacity: [0, 1, 0], y: [0, -3, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-2 h-2 rounded-full bg-accent-400"
                      />
                      <motion.div
                        animate={{ opacity: [0, 1, 0], y: [0, -3, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
                        className="w-2 h-2 rounded-full bg-accent-400"
                      />
                      <motion.div
                        animate={{ opacity: [0, 1, 0], y: [0, -3, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
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
                animate={input.trim() ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className="btn-primary px-5"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </form>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto">
          <div className="glass-card p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-accent-400" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <motion.button
                onClick={getInsights}
                whileHover={{ scale: 1.02, x: 3 }}
                whileTap={{ scale: 0.98 }}
                layout
                className="w-full p-3 rounded-xl bg-dark-700/30 hover:bg-primary-500/10 border border-dark-700/50 text-left text-sm transition-all flex items-center gap-3"
              >
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                Get Productivity Insights
              </motion.button>
              <motion.button
                onClick={generateTasks}
                whileHover={{ scale: 1.02, x: 3 }}
                whileTap={{ scale: 0.98 }}
                layout
                className="w-full p-3 rounded-xl bg-dark-700/30 hover:bg-primary-500/10 border border-dark-700/50 text-left text-sm transition-all flex items-center gap-3"
              >
                <Target className="w-4 h-4 text-primary-400" />
                Generate Daily Tasks
              </motion.button>
              <motion.button
                onClick={loadPsychology}
                whileHover={{ scale: 1.02, x: 3 }}
                whileTap={{ scale: 0.98 }}
                layout
                className="w-full p-3 rounded-xl bg-dark-700/30 hover:bg-accent-500/10 border border-dark-700/50 text-left text-sm transition-all flex items-center gap-3"
              >
                <Brain className="w-4 h-4 text-accent-400" />
                Psychology Check-In
              </motion.button>
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
                  <p className="text-xs text-dark-400 mb-1">Insight</p>
                  <p className="text-sm">{insights.insight}</p>
                </div>
                <div className="p-3 rounded-xl bg-accent-500/10 border border-accent-500/20">
                  <p className="text-xs text-dark-400 mb-1">Suggestion</p>
                  <p className="text-sm">{insights.suggestion}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-dark-400 mb-1">Encouragement</p>
                  <p className="text-sm">{insights.encouragement}</p>
                </div>
              </div>
            </motion.div>
          )}

          {showPsychology && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5"
            >
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-accent-400" />
                Psychology Check-In
              </h3>
              {loadingPsych ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-dark-600 rounded w-3/4" />
                  <div className="h-4 bg-dark-600 rounded w-1/2" />
                </div>
              ) : (
                <div className="space-y-3">
                  {burnout && burnout.burnoutRisk.level > 50 && (
                    <div className="p-3 rounded-xl bg-warning-500/10 border border-warning-500/20">
                      <p className="text-xs text-warning-400 mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Burnout Risk: {burnout.burnoutRisk.category}
                      </p>
                      <p className="text-xs text-dark-300">{burnout.suggestions[0]}</p>
                    </div>
                  )}
                  {intention && (
                    <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20">
                      <p className="text-xs text-primary-400 mb-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Implementation Intention
                      </p>
                      <p className="text-xs text-dark-300 italic">"{intention.fullStatement}"</p>
                    </div>
                  )}
                  {consistencyPlan && (
                    <div className="p-3 rounded-xl bg-accent-500/10 border border-accent-500/20">
                      <p className="text-xs text-accent-400 mb-1 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {consistencyPlan.title}
                      </p>
                      <p className="text-xs text-dark-300 italic">"{consistencyPlan.mantra}"</p>
                    </div>
                  )}
                </div>
              )}
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
                <motion.button
                  key={q}
                  onClick={() => { setInput(q); }}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-left text-sm text-dark-400 hover:text-dark-200 p-2 rounded-lg hover:bg-dark-700/50 transition-all"
                >
                  &ldquo;{q}&rdquo;
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
