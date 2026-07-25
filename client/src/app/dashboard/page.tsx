'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, ListTodo, TrendingUp, Bot, Sparkles,
  CheckCircle2, ArrowRight, Zap, Flame, Users, Lightbulb, Star,
} from 'lucide-react';
import { tasksAPI, goalsAPI, aiAPI, leaderboardAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  AnimatedPage, FadeIn, StaggerContainer, StaggerItem, ScaleIn,
} from '@/components/animations/MotionComponents';
import { calculateXpProgress, getCategoryColor, getPriorityColor, getStatusColor, formatTimeAgo } from '@/lib/utils';
import TaskReviewModal from '@/components/features/TaskReviewModal';
import toast from 'react-hot-toast';
import type { Task, Goal, LeaderboardEntry } from '@/types';

export default function DashboardPage() {
  const { user, updateXp, updateStreak } = useAuthStore();
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [userRank, setUserRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [reviewTask, setReviewTask] = useState<{ task: Task; questions: string[] } | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [tasksRes, goalsRes, rankRes] = await Promise.all([
        tasksAPI.getToday().catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[Dashboard] Failed to load tasks: ${msg}`);
          return null;
        }),
        goalsAPI.list({ status: 'active', limit: '5' }).catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[Dashboard] Failed to load goals: ${msg}`);
          return null;
        }),
        leaderboardAPI.getUserRank().catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[Dashboard] Failed to load rank: ${msg}`);
          return null;
        }),
      ]);
      if (tasksRes?.data?.data) setTodayTasks(tasksRes.data.data);
      if (goalsRes?.data?.data) setGoals(goalsRes.data.data);
      if (rankRes?.data?.data) setUserRank(rankRes.data.data);
    } catch (err) {
      console.error('[Dashboard] Unexpected load error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const generateAiTasks = async () => {
    setAiGenerating(true);
    try {
      const { data } = await aiAPI.generateTasks();
      toast.success(`AI Coach generated ${data.data.length} new tasks!`);
      loadDashboard();
    } catch {
      toast.error('Failed to generate AI tasks');
    } finally {
      setAiGenerating(false);
    }
  };

  const getInsights = async () => {
    try {
      const { data } = await aiAPI.getInsights();
      setInsights(data.data);
    } catch {}
  };

  const completeTask = async (taskId: string) => {
    try {
      const { data } = await tasksAPI.complete(taskId);
      if (data.data.needsReview) {
        const task = todayTasks.find((t) => t._id === taskId);
        if (task) {
          setReviewTask({ task, questions: data.data.questions });
        }
        return;
      }
      if (data.data.xp) {
        updateXp(data.data.xp.totalXp, data.data.xp.level);
      }
      if (data.data.streak) {
        updateStreak(data.data.streak);
      }
      setTodayTasks((prev) => prev.filter((t) => t._id !== taskId));
      toast.success('Task completed! +XP');
    } catch {
      toast.error('Failed to complete task');
    }
  };

  const handleReviewApproved = (taskId: string) => {
    setTodayTasks((prev) => prev.filter((t) => t._id !== taskId));
    toast.success('Task completed! +XP');
  };

  const xpProgress = calculateXpProgress(user?.xp || 0);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton-title" />
            <div className="skeleton-text w-48" />
          </div>
          <div className="skeleton h-12 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="skeleton h-64 rounded-2xl" />
            <div className="skeleton h-48 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <div className="skeleton h-48 rounded-2xl" />
            <div className="skeleton h-48 rounded-2xl" />
            <div className="skeleton h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatedPage>
      {/* Welcome Header */}
      <FadeIn>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="page-header">
              Welcome back, <span className="gradient-text">{user?.displayName || user?.username}</span>
            </h1>
            <p className="page-subtitle">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <motion.button
            onClick={generateAiTasks}
            disabled={aiGenerating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex items-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${aiGenerating ? 'animate-spin' : ''}`} />
            {aiGenerating ? 'Generating...' : 'AI Tasks'}
          </motion.button>
        </div>
      </FadeIn>

      {/* Stats Grid */}
      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StaggerItem>
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="glass-card-hover p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-purple-500/10 transition-shadow">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-sm text-dark-400">Level</span>
            </div>
            <p className="text-2xl font-bold">{user?.level || 1}</p>
            <div className="mt-2 xp-bar">
              <motion.div
                className="xp-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-dark-400 mt-1">{user?.xp || 0} XP</p>
          </motion.div>
        </StaggerItem>

        <StaggerItem>
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="glass-card-hover p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <span className="text-sm text-dark-400">Streak</span>
            </div>
            <p className="text-2xl font-bold">{user?.streak || 0}</p>
            <p className="text-xs text-dark-400 mt-1">{user?.longestStreak || 0} day best</p>
          </motion.div>
        </StaggerItem>

        <StaggerItem>
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="glass-card-hover p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-sm text-dark-400">Completed</span>
            </div>
            <p className="text-2xl font-bold">{user?.completedTasks || 0}</p>
            <p className="text-xs text-dark-400 mt-1">tasks done</p>
          </motion.div>
        </StaggerItem>

        <StaggerItem>
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="glass-card-hover p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm text-dark-400">Rank</span>
            </div>
            <p className="text-2xl font-bold">#{userRank?.rank || '-'}</p>
            <p className="text-xs text-dark-400 mt-1">Top {100 - (userRank?.percentile || 0)}%</p>
          </motion.div>
        </StaggerItem>
      </StaggerContainer>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <FadeIn>
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-primary-400" />
                  <h2 className="text-lg font-semibold">Today&apos;s Tasks</h2>
                </div>
                <Link href="/tasks" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {todayTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-lg font-medium mb-1">All clear!</p>
                  <p className="text-dark-400 text-sm mb-6">All tasks completed. Great job!</p>
                  <motion.button
                    onClick={generateAiTasks}
                    disabled={aiGenerating}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary text-sm"
                  >
                    <motion.span
                      animate={aiGenerating ? { rotate: 360 } : {}}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="inline-flex"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                    </motion.span>
                    {aiGenerating ? 'Generating...' : 'Generate AI Tasks'}
                  </motion.button>
                </motion.div>
              ) : (
                <AnimatePresence mode="popLayout">
                  <div className="space-y-2">
                    {todayTasks.map((task, i) => (
                      <motion.div
                        key={task._id}
                        layout
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.2 } }}
                        transition={{ delay: i * 0.04, duration: 0.3, ease: 'easeOut' }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 hover:border hover:border-dark-600/50 transition-all group cursor-pointer"
                        onClick={() => completeTask(task._id)}
                      >
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); completeTask(task._id); }}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          className="w-6 h-6 rounded-full border-2 border-dark-400 flex items-center justify-center hover:border-green-400 hover:bg-green-500/20 transition-all flex-shrink-0"
                        >
                          <motion.div
                            whileHover={{ scale: 1.2 }}
                            className="w-3 h-3 rounded-full group-hover:bg-green-400 transition-colors"
                          />
                        </motion.button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary-300 transition-colors">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-dark-400 truncate mt-0.5">{task.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className={`badge ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                          {task.isAiGenerated && (
                            <motion.div
                              initial={{ rotate: -20, scale: 0 }}
                              animate={{ rotate: 0, scale: 1 }}
                              transition={{ type: 'spring', stiffness: 300 }}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            </motion.div>
                          )}
                          <span className="text-xs font-medium text-purple-400/80">+{task.xpReward}XP</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </div>
          </FadeIn>

          {/* Active Goals */}
          <FadeIn>
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-400" />
                  <h2 className="text-lg font-semibold">Active Goals</h2>
                </div>
                <Link href="/goals" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {goals.slice(0, 4).map((goal) => (
                  <Link key={goal._id} href={`/goals/${goal._id}`}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-dark-700/30 transition-all"
                    >
                      <div className={`w-2 h-2 rounded-full ${goal.progress >= 100 ? 'bg-green-400' : 'bg-primary-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{goal.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`badge ${getCategoryColor(goal.category)}`}>{goal.category}</span>
                          <span className={`badge ${getStatusColor(goal.status)}`}>{goal.status}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{goal.progress}%</p>
                        <div className="w-20 h-1.5 rounded-full bg-dark-700 mt-1">
                          <motion.div
                            className="h-full rounded-full bg-primary-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${goal.progress}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
                {goals.length === 0 && (
                  <div className="text-center py-6">
                    <Target className="w-10 h-10 text-dark-400 mx-auto mb-2" />
                    <p className="text-dark-400 text-sm">No active goals yet</p>
                    <Link href="/goals" className="text-primary-400 text-sm hover:text-primary-300">Create your first goal</Link>
                  </div>
                )}
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Coach Insight */}
          <ScaleIn>
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-accent-400" />
                </div>
                <h2 className="text-lg font-semibold">AI Coach</h2>
              </div>
              {insights ? (
                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="p-3.5 rounded-xl bg-primary-500/10 border border-primary-500/20"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-primary-400" />
                      <p className="text-xs text-dark-400 font-medium">Insight</p>
                    </div>
                    <p className="text-sm leading-relaxed">{insights.insight}</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-3.5 rounded-xl bg-accent-500/10 border border-accent-500/20"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Target className="w-3.5 h-3.5 text-accent-400" />
                      <p className="text-xs text-dark-400 font-medium">Suggestion</p>
                    </div>
                    <p className="text-sm leading-relaxed">{insights.suggestion}</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Star className="w-3.5 h-3.5 text-green-400" />
                      <p className="text-xs text-dark-400 font-medium">Encouragement</p>
                    </div>
                    <p className="text-sm leading-relaxed">{insights.encouragement}</p>
                  </motion.div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bot className="w-10 h-10 text-dark-400 mx-auto mb-3" />
                  <p className="text-dark-400 text-sm mb-3">Get personalized AI insights about your progress</p>
                  <button
                    onClick={getInsights}
                    className="btn-primary text-sm inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Get Insights
                  </button>
                </div>
              )}
            </div>
          </ScaleIn>

          {/* Quick Stats */}
          <ScaleIn>
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary-400" />
                </div>
                <h2 className="text-lg font-semibold">Quick Stats</h2>
              </div>
              <div className="space-y-1">
                {[
                  { label: 'Total XP', value: `${user?.xp || 0}`, color: 'text-purple-400' },
                  { label: 'Streak', value: `${user?.streak || 0} days`, color: 'text-orange-400' },
                  { label: 'Tasks Done', value: `${user?.completedTasks || 0}`, color: 'text-green-400' },
                  { label: 'Your Rank', value: `#${userRank?.rank || '-'}`, color: 'text-blue-400' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex justify-between items-center py-2.5 border-b border-dark-700/30 last:border-0"
                  >
                    <span className="text-sm text-dark-400">{stat.label}</span>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.05 + 0.15, type: 'spring', stiffness: 200 }}
                      className={`font-semibold ${stat.color}`}
                    >
                      {stat.value}
                    </motion.span>
                  </motion.div>
                ))}
              </div>
            </div>
          </ScaleIn>

          {/* Quick Actions */}
          <ScaleIn>
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-dark-600/50 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-dark-300" />
                </div>
                <h2 className="text-lg font-semibold">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { href: '/goals/new', icon: Target, label: 'New Goal', color: 'text-primary-400' },
                  { href: '/groups', icon: Users, label: 'Join Group', color: 'text-blue-400' },
                  { href: '/tasks', icon: ListTodo, label: 'New Task', color: 'text-green-400' },
                  { href: '/ai-coach', icon: Bot, label: 'AI Chat', color: 'text-purple-400' },
                ].map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={action.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                    >
                      <Link
                        href={action.href}
                        className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-dark-700/30 hover:bg-primary-500/10 hover:border-primary-500/30 border border-dark-700/50 transition-all text-center group"
                      >
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: -5 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <Icon className={`w-5 h-5 ${action.color} mx-auto`} />
                        </motion.div>
                        <span className="text-xs font-medium text-dark-300 group-hover:text-dark-100 transition-colors">{action.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </ScaleIn>
        </div>
      </div>

      {reviewTask && (
        <TaskReviewModal
          task={reviewTask.task}
          questions={reviewTask.questions}
          isOpen={!!reviewTask}
          onClose={() => setReviewTask(null)}
          onApproved={handleReviewApproved}
        />
      )}
    </AnimatedPage>
  );
}
