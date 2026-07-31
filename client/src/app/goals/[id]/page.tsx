'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ArrowLeft, Clock, CheckCircle2, Trash2, Plus } from 'lucide-react';
import { goalsAPI } from '@/lib/api';
import { AnimatedPage, FadeIn } from '@/components/animations/MotionComponents';
import { getCategoryColor, getStatusColor, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Goal } from '@/types';

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [milestoneTitle, setMilestoneTitle] = useState('');

  useEffect(() => {
    loadGoal();
  }, [params.id]);

  const loadGoal = async () => {
    try {
      const { data } = await goalsAPI.get(params.id as string);
      setGoal(data.data);
    } catch {
      toast.error('Goal not found');
      router.push('/goals');
    } finally {
      setLoading(false);
    }
  };

  const toggleMilestone = async (milestoneId: string) => {
    try {
      const { data } = await goalsAPI.toggleMilestone(goal!._id, milestoneId);
      setGoal(data.data);
    } catch {
      toast.error('Failed to update milestone');
    }
  };

  const addMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim()) return;
    try {
      const { data } = await goalsAPI.addMilestone(goal!._id, milestoneTitle);
      setGoal(data.data);
      setMilestoneTitle('');
      toast.success('Milestone added');
    } catch {
      toast.error('Failed to add milestone');
    }
  };

  const deleteGoal = async () => {
    if (!confirm('Delete this goal?')) return;
    try {
      await goalsAPI.delete(goal!._id);
      toast.success('Goal deleted');
      router.push('/goals');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-32 rounded-xl" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="skeleton h-48 rounded-2xl" />
            <div className="skeleton h-64 rounded-2xl" />
          </div>
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!goal) return null;

  return (
    <AnimatedPage>
      <FadeIn>
        <motion.button
          onClick={() => router.push('/goals')}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Goals
        </motion.button>
      </FadeIn>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FadeIn>
            <div className="glass-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${getCategoryColor(goal.category)}`}>{goal.category}</span>
                    <span className={`badge ${getStatusColor(goal.status)}`}>{goal.status}</span>
                  </div>
                  <h1 className="text-2xl font-bold">{goal.title}</h1>
                  {goal.description && (
                    <p className="text-dark-400 mt-2">{goal.description}</p>
                  )}
                </div>
                <motion.button
                  onClick={deleteGoal}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm text-dark-400 mb-1">
                  <span>Progress</span>
                  <span>{goal.progress}%</span>
                </div>
                <div className="xp-bar h-3">
                  <motion.div
                    className="xp-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-dark-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Created {formatDate(goal.createdAt)}
                </div>
                {goal.targetDate && (
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    Due {formatDate(goal.targetDate)}
                  </div>
                )}
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary-400" />
                Milestones
              </h2>

              <form onSubmit={addMilestone} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="Add a milestone..."
                  className="input-field flex-1"
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
              </form>

              <motion.div className="space-y-2" layout>
                {goal.milestones?.length === 0 ? (
                  <p className="text-dark-400 text-sm text-center py-4">No milestones yet</p>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {goal.milestones?.map((ms) => (
                      <motion.div
                        key={ms._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-700/30 transition-all"
                      >
                      <button
                        onClick={() => toggleMilestone(ms._id!)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          ms.isCompleted
                            ? 'bg-green-500 border-green-500'
                            : 'border-dark-400 hover:border-primary-400'
                        }`}
                      >
                        {ms.isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </button>
                      <span className={`text-sm flex-1 ${ms.isCompleted ? 'line-through text-dark-400' : ''}`}>
                        {ms.title}
                      </span>
                      {ms.completedAt && (
                        <span className="text-xs text-dark-400">{formatDate(ms.completedAt)}</span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              </motion.div>
            </div>
          </FadeIn>
        </div>

        <div className="space-y-6">
          <FadeIn>
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3">Quick Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Priority</span>
                  <span className="font-medium capitalize">{goal.priority}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Milestones</span>
                  <span className="font-medium">
                    {goal.milestones?.filter((m) => m.isCompleted).length || 0}/{goal.milestones?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">XP Awarded</span>
                  <span className="font-medium text-purple-400">{goal.xpAwarded || 0} XP</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </AnimatedPage>
  );
}
