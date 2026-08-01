'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Square, Sparkles, Target, Lightbulb, TrendingUp, User, MessageSquare } from 'lucide-react';
import { aiAPI } from '@/lib/api';
import { AnimatedPage, FadeIn } from '@/components/animations/MotionComponents';
import toast from 'react-hot-toast';

interface ChatMessage {
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
}

export default function AICoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'coach',
      content: "Hi! I'm your AI productivity coach. I can help you analyze your goals, suggest daily tasks, and provide motivation. What would you like to work on today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingBufferRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  /** Abort the in-flight SSE stream (Stop button). */
  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  const sendMessage = async (prompt?: string) => {
    const userMsg = (prompt ?? input).trim();
    if (!userMsg || loading) return;
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setLoading(true);
    // Keep streamingText null until the first delta arrives so the typing-dots
    // indicator shows while we await the first token, then swap to the live bubble.
    setStreamingText(null);
    streamingBufferRef.current = '';

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await aiAPI.chatStream(
        { prompt: userMsg, context: { recentMessages: messages.slice(-5) } },
        (delta) => {
          streamingBufferRef.current += delta;
          setStreamingText(streamingBufferRef.current);
        },
        controller.signal
      );
      setMessages((prev) => [
        ...prev,
        {
          role: 'coach',
          content:
            streamingBufferRef.current ||
            "I didn't catch that — try asking again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        // User hit Stop — keep whatever streamed so far.
        if (streamingBufferRef.current) {
          setMessages((prev) => [
            ...prev,
            { role: 'coach', content: streamingBufferRef.current, timestamp: new Date() },
          ]);
        }
      } else {
        toast.error('Failed to get AI response');
        setMessages((prev) => [
          ...prev,
          {
            role: 'coach',
            content: "I'm having trouble connecting right now. Please try again in a moment.",
            timestamp: new Date(),
          },
        ]);
      }
    } finally {
      setLoading(false);
      setStreamingText(null);
      abortRef.current = null;
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
              {loading && streamingText === null && (
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
              {streamingText !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-accent-400" />
                  </div>
                  <div className="bg-dark-700/50 border border-dark-600/50 p-4 rounded-2xl rounded-bl-md max-w-[80%]">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {streamingText}
                      <span className="inline-block w-2 h-4 ml-0.5 bg-accent-400 animate-pulse align-text-bottom" />
                    </p>
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
              {loading ? (
                <motion.button
                  type="button"
                  onClick={stopStreaming}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-secondary px-5"
                  title="Stop generating"
                >
                  <Square className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  type="submit"
                  disabled={!input.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary px-5"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              )}
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
              <button
                onClick={() => sendMessage('Analyze my current progress')}
                disabled={loading}
                className="w-full p-3 rounded-xl bg-dark-700/30 hover:bg-primary-500/10 border border-dark-700/50 text-left text-sm transition-all flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
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
