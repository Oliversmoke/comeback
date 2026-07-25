'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, ListTodo, TrendingUp, Bot, Sparkles,
  CheckCircle2, ArrowRight, Zap, Flame, Users, Lightbulb, Star, Trophy,
} from 'lucide-react';
import { tasksAPI, goalsAPI, aiAPI, leaderboardAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem, ScaleIn } from '@/components/animations/MotionComponents';
import {
  HoloCard, AnimatedCounter, ProgressRing, NeonBar, GlowChip, AICoachOrb, TaskCompleteButton, NexusBackground,
} from '@/components/nexus/NexusPrimitives';
import { calculateXpProgress, getCategoryColor, getPriorityColor, getStatusColor } from '@/lib/utils';
import TaskReviewModal from '@/components/features/TaskReviewModal';
import toast from 'react-hot-toast';
import type { Task, Goal } from '@/types';

export default function DashboardPage() {
  const { user, updateXp, updateStreak } = useAuthStore();
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [userRank, setUserRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
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
    setInsightsLoading(true);
    try {
      const { data } = await aiAPI.getInsights();
      setInsights(data.data);
    } catch {
      toast.error('Failed to load insights');
    } finally {
      setInsightsLoading(false);
    }
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
  const firstName = (user?.displayName || user?.username || 'there').split(' ')[0];

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
            <div key={i} className="skeleton-stat" />
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
    <AnimatedPage className="relative">
      <NexusBackground />

      {/* Command header */}
      <FadeIn>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <GlowChip glow="green">SYSTEM ONLINE</GlowChip>
            <h1 className="mt-3 text-2xl font-bold tracking-tight lg:text-3xl">
              Welcome back, <span className="gradient-text">{firstName}</span>
            </h1>
            <p className="page-subtitle">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <motion.button
            onClick={generateAiTasks}
            disabled={aiGenerating}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary flex items-center justify-center gap-2 self-start disabled:opacity-60"
          >
            <Sparkles className={`h-4 w-4 ${aiGenerating ? 'animate-spin' : ''}`} />
            {aiGenerating ? 'Generating...' : 'Generate AI Tasks'}
          </motion.button>
        </div>
      </FadeIn>

      {/* Stat HUD */}
      <StaggerContainer className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Level */}
        <StaggerItem>
          <HoloCard glow="blue" className="h-full p-5">
            <div className="flex items-center gap-4">
              <ProgressRing value={xpProgress} glow="blue" size={64} stroke={5}>
                <AnimatedCounter value={user?.level || 1} format={false} className="text-lg font-bold text-white" />
              </ProgressRing>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-dark-400">Level</p>
                <p className="mt-1 font-mono text-sm text-primary-300">
                  <AnimatedCounter value={user?.xp || 0} /> XP
                </p>
              </div>
            </div>
          </HoloCard>
        </StaggerItem>

        {/* Streak */}
        <StaggerItem>
          <HoloCard glow="red" className="h-full p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error/15 text-error">
                <Flame className="h-5 w-5" />
              </div>
              <span className="text-sm text-dark-400">Streak</span>
            </div>
            <p className="text-2xl font-bold">
              <AnimatedCounter value={user?.streak || 0} format={false} />
              <span className="ml-1 text-sm font-normal text-dark-400">days</span>
            </p>
            <p className="mt-1 text-xs text-dark-400">{user?.longestStreak || 0} day best</p>
          </HoloCard>
        </StaggerItem>

        {/* Completed */}
        <StaggerItem>
          <HoloCard glow="green" className="h-full p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-sm text-dark-400">Completed</span>
            </div>
            <p className="text-2xl font-bold">
              <AnimatedCounter value={user?.completedTasks || 0} />
            </p>
            <p className="mt-1 text-xs text-dark-400">tasks done</p>
          </HoloCard>
        </StaggerItem>

        {/* Rank */}
        <StaggerItem>
          <HoloCard glow="red" className="h-full p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-sm text-dark-400">Rank</span>
            </div>
            <p className="text-2xl font-bold">#{userRank?.rank ?? '-'}</p>
            <p className="mt-1 text-xs text-dark-400">Top {100 - (userRank?.percentile || 0)}%</p>
          </HoloCard>
        </StaggerItem>
      </StaggerContainer>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Today's tasks */}
          <FadeIn>
            <HoloCard glow="blue" tilt={false} className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-primary-400" />
                  <h2 className="text-lg font-semibold">Today&apos;s Tasks</h2>
                  {todayTasks.length > 0 && (
                    <span className="rounded-full bg-primary-500/15 px-2 py-0.5 font-mono text-xs text-primary-300">
                      {todayTasks.length}
                    </span>
                  )}
                </div>
                <Link href="/tasks" className="flex items-center gap-1 text-sm text-primary-400 transition-colors hover:text-primary-300">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {todayTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="py-12 text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 text-success">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <p className="mb-1 text-lg font-medium">All clear!</p>
                  <p className="mb-6 text-sm text-dark-400">Every task done. Let the AI line up your next moves.</p>
                  <motion.button
                    onClick={generateAiTasks}
                    disabled={aiGenerating}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="btn-primary inline-flex items-center gap-2 text-sm"
                  >
                    <Sparkles className={`h-4 w-4 ${aiGenerating ? 'animate-spin' : ''}`} />
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
                        initial={{ opacity: 0, x: -20, scale: 0.97 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 24, scale: 0.95, transition: { duration: 0.2 } }}
                        transition={{ delay: i * 0.04, duration: 0.3, ease: 'easeOut' }}
                        onClick={() => completeTask(task._id)}
                        className="group flex cursor-pointer items-center gap-4 rounded-xl border border-transparent bg-white/[0.03] p-4 transition-all hover:border-primary-500/30 hover:bg-primary-500/[0.06]"
                      >
                        <TaskCompleteButton onComplete={() => completeTask(task._id)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium transition-colors group-hover:text-primary-200">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="mt-0.5 truncate text-xs text-dark-400">{task.description}</p>
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
                              <Sparkles className="h-3.5 w-3.5 text-accent-400" />
                            </motion.div>
                          )}
                          <span className="font-mono text-xs font-medium text-primary-300/90">+{task.xpReward}XP</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </HoloCard>
          </FadeIn>

          {/* Active goals */}
          <FadeIn>
            <HoloCard glow="cyan" tilt={false} className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary-400" />
                  <h2 className="text-lg font-semibold">Active Goals</h2>
                </div>
                <Link href="/goals" className="flex items-center gap-1 text-sm text-primary-400 transition-colors hover:text-primary-300">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-2">
                {goals.slice(0, 4).map((goal) => (
                  <Link key={goal._id} href={`/goals/${goal._id}`}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-4 rounded-xl p-3 transition-all hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{goal.title}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={`badge ${getCategoryColor(goal.category)}`}>{goal.category}</span>
                          <span className={`badge ${getStatusColor(goal.status)}`}>{goal.status}</span>
                        </div>
                      </div>
                      <div className="w-24 text-right">
                        <p className="mb-1 font-mono text-sm font-semibold">{goal.progress}%</p>
                        <NeonBar value={goal.progress} glow={goal.progress >= 100 ? 'green' : 'blue'} />
                      </div>
                    </motion.div>
                  </Link>
                ))}
                {goals.length === 0 && (
                  <div className="py-6 text-center">
                    <Target className="mx-auto mb-2 h-10 w-10 text-dark-400" />
                    <p className="text-sm text-dark-400">No active goals yet</p>
                    <Link href="/goals" className="text-sm text-primary-400 hover:text-primary-300">
                      Create your first goal
                    </Link>
                  </div>
                )}
              </div>
            </HoloCard>
          </FadeIn>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* AI Coach */}
          <ScaleIn>
            <HoloCard glow="red" tilt={false} className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <AICoachOrb size={40} active={!insights}>
                  <Bot className="h-4 w-4" />
                </AICoachOrb>
                <div>
                  <h2 className="text-lg font-semibold leading-tight">AI Coach</h2>
                  <p className="text-xs text-dark-400">{insights ? 'Analysis ready' : 'Standing by'}</p>
                </div>
              </div>

              {insightsLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton h-16 rounded-xl" />
                  ))}
                </div>
              ) : insights ? (
                <div className="space-y-3">
                  {[
                    { icon: Lightbulb, label: 'Insight', text: insights.insight, tone: 'primary' },
                    { icon: Target, label: 'Suggestion', text: insights.suggestion, tone: 'accent' },
                    { icon: Star, label: 'Encouragement', text: insights.encouragement, tone: 'success' },
                  ].map((row, i) => {
                    const Icon = row.icon;
                    const map: Record<string, string> = {
                      primary: 'bg-primary-500/10 border-primary-500/20 text-primary-400',
                      accent: 'bg-accent-500/10 border-accent-500/20 text-accent-400',
                      success: 'bg-success/10 border-success/20 text-success',
                    };
                    return (
                      <motion.div
                        key={row.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className={`rounded-xl border p-3.5 ${map[row.tone]}`}
                      >
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5" />
                          <p className="text-xs font-medium uppercase tracking-wide">{row.label}</p>
                        </div>
                        <p className="text-sm leading-relaxed text-dark-100">{row.text}</p>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="mb-3 text-sm text-dark-400">Get a personalized read on your momentum.</p>
                  <button onClick={getInsights} className="btn-primary inline-flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4" />
                    Get Insights
                  </button>
                </div>
              )}
            </HoloCard>
          </ScaleIn>

          {/* Quick stats */}
          <ScaleIn>
            <HoloCard glow="blue" tilt={false} className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary-400" />
                <h2 className="text-lg font-semibold">Quick Stats</h2>
              </div>
              <div className="space-y-1">
                {[
                  { label: 'Total XP', value: `${(user?.xp || 0).toLocaleString()}`, color: 'text-primary-300' },
                  { label: 'Streak', value: `${user?.streak || 0} days`, color: 'text-error' },
                  { label: 'Tasks Done', value: `${user?.completedTasks || 0}`, color: 'text-success' },
                  { label: 'Your Rank', value: `#${userRank?.rank || '-'}`, color: 'text-accent-400' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between border-b border-white/5 py-2.5 last:border-0"
                  >
                    <span className="text-sm text-dark-400">{stat.label}</span>
                    <span className={`font-mono font-semibold ${stat.color}`}>{stat.value}</span>
                  </motion.div>
                ))}
              </div>
            </HoloCard>
          </ScaleIn>

          {/* Quick actions */}
          <ScaleIn>
            <HoloCard glow="cyan" tilt={false} className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary-400" />
                <h2 className="text-lg font-semibold">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { href: '/goals/new', icon: Target, label: 'New Goal', color: 'text-primary-400' },
                  { href: '/groups', icon: Users, label: 'Join Group', color: 'text-info' },
                  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard', color: 'text-warning' },
                  { href: '/ai-coach', icon: Bot, label: 'AI Chat', color: 'text-accent-400' },
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
                        className="group flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3.5 text-center transition-all hover:border-primary-500/30 hover:bg-primary-500/[0.08]"
                      >
                        <motion.span
                          whileHover={{ scale: 1.12, rotate: -6 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="inline-flex"
                        >
                          <Icon className={`h-5 w-5 ${action.color}`} />
                        </motion.span>
                        <span className="text-xs font-medium text-dark-300 transition-colors group-hover:text-dark-100">
                          {action.label}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </HoloCard>
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
