'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Search, MoreVertical, Clock } from 'lucide-react';
import { goalsAPI } from '@/lib/api';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from '@/components/animations/MotionComponents';
import { getCategoryColor, getStatusColor, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Goal } from '@/types';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');

  useEffect(() => { loadGoals(); }, [filter]);

  const loadGoals = async () => {
    try {
      const { data } = await goalsAPI.list({ status: filter, limit: '50' });
      setGoals(data.data);
    } catch { toast.error('Failed to load goals'); }
    finally { setLoading(false); }
  };

  const deleteGoal = async (id: string) => {
    try {
      await goalsAPI.delete(id);
      setGoals((prev) => prev.filter((g) => g._id !== id));
      toast.success('Goal deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = goals.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatedPage>
      <FadeIn>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="page-header">Goals</h1>
            <p className="page-subtitle">Track and achieve what matters</p>
          </div>
          <Link href="/goals/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Goal
          </Link>
        </div>
      </FadeIn>

      <FadeIn>
        <div className="flex flex-wrap gap-3 mb-6">
          {['active', 'paused', 'completed', 'archived'].map((s) => (
            <motion.button
              key={s}
              onClick={() => setFilter(s)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`filter-btn ${
                filter === s ? 'filter-btn-active' : 'filter-btn-inactive'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </motion.button>
          ))}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search goals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 py-2 text-sm w-48"
            />
          </div>
        </div>
      </FadeIn>

      {loading ? (
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <StaggerItem key={i}>
              <div className="skeleton h-48 rounded-2xl" />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 rounded-2xl bg-dark-800/50 flex items-center justify-center mx-auto mb-5 border border-dark-700/50">
            <Target className="w-10 h-10 text-dark-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{search ? 'No matching goals' : 'No goals yet'}</h3>
          <p className="text-dark-400 mb-6 max-w-sm mx-auto">
            {search ? 'Try adjusting your search or filters' : 'Create your first goal to start tracking what matters'}
          </p>
          {!search && (
            <Link href="/goals/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Goal
            </Link>
          )}
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((goal) => (
            <StaggerItem key={goal._id}>
              <motion.div
                layout
                whileHover={{ y: -2 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="glass-card-hover p-5 group relative overflow-hidden"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500/5 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${goal.progress >= 100 ? 'bg-green-400' : 'bg-primary-400'}`} />
                    <span className={`badge ${getCategoryColor(goal.category)}`}>{goal.category}</span>
                  </div>
                  <div className="relative">
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.1 }}
                      className="p-1 rounded-lg hover:bg-dark-700"
                    >
                      <MoreVertical className="w-4 h-4 text-dark-400" />
                    </motion.button>
                  </div>
                </div>

                <Link href={`/goals/${goal._id}`}>
                  <h3 className="font-semibold mb-1 hover:text-primary-300 transition-colors">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-sm text-dark-400 line-clamp-2 mb-3">{goal.description}</p>
                  )}
                </Link>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-dark-400 mb-1">
                    <span>Progress</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <div className="xp-bar">
                    <motion.div
                      className="xp-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.progress}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-dark-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(goal.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${getStatusColor(goal.status)}`}>{goal.status}</span>
                    <span className="text-purple-400">{goal.milestones?.filter((m) => m.isCompleted).length}/{goal.milestones?.length} ms</span>
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
        </AnimatePresence>
      )}
    </AnimatedPage>
  );
}
