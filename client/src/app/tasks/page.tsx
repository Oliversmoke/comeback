'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Sparkles, Search, Trash2,
} from 'lucide-react';
import { tasksAPI, aiAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from '@/components/animations/MotionComponents';
import { getPriorityColor, getStatusColor, formatTimeAgo } from '@/lib/utils';
import TaskReviewModal from '@/components/features/TaskReviewModal';
import toast from 'react-hot-toast';
import type { Task } from '@/types';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [reviewTask, setReviewTask] = useState<{ task: Task; questions: string[] } | null>(null);
  const { updateXp, updateStreak } = useAuthStore();

  useEffect(() => { loadTasks(); }, [filter]);

  const loadTasks = async () => {
    try {
      const params: Record<string, string> = { limit: '50' };
      if (filter !== 'all') params.status = filter;
      const { data } = await tasksAPI.list(params);
      setTasks(data.data);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  };

  const completeTask = async (taskId: string) => {
    try {
      const { data } = await tasksAPI.complete(taskId);
      if (data.data.needsReview) {
        const task = tasks.find((t) => t._id === taskId);
        if (task) {
          setReviewTask({ task, questions: data.data.questions });
        }
        return;
      }
      if (data.data.xp) updateXp(data.data.xp.totalXp, data.data.xp.level);
      if (data.data.streak) updateStreak(data.data.streak);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      toast.success(`Task completed! +${data.data.xp?.xpAwarded || 10}XP`);
    } catch { toast.error('Failed to complete task'); }
  };

  const handleReviewApproved = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    toast.success('Task completed! +XP');
  };

  const deleteTask = async (id: string) => {
    try {
      await tasksAPI.delete(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
      toast.success('Task deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const generateAiTasks = async () => {
    setAiGenerating(true);
    try {
      await aiAPI.generateTasks();
      toast.success('AI tasks generated!');
      loadTasks();
    } catch { toast.error('Failed to generate'); }
    finally { setAiGenerating(false); }
  };

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatedPage>
      <FadeIn>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="page-header">Tasks</h1>
            <p className="page-subtitle">Manage your daily tasks</p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={generateAiTasks}
              disabled={aiGenerating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Sparkles className={`w-4 h-4 ${aiGenerating ? 'animate-spin' : ''}`} />
              AI Generate
            </motion.button>
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <div className="flex flex-wrap gap-3 mb-6">
          <AnimatePresence mode="wait">
            {['all', 'pending', 'in_progress', 'pending_review', 'completed'].map((s) => (
              <motion.button
                key={s}
                onClick={() => setFilter(s)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                layout
                className={`filter-btn ${
                  filter === s ? 'filter-btn-active' : 'filter-btn-inactive'
                }`}
              >
                {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                {filter === s && (
                  <motion.div
                    layoutId="activeFilter"
                    className="w-1 h-1 rounded-full bg-primary-400 inline-block ml-1.5"
                  />
                )}
              </motion.button>
            ))}
          </AnimatePresence>
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 py-2 text-sm w-48 lg:w-56"
            />
          </div>
        </div>
      </FadeIn>

      {loading ? (
        <StaggerContainer className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <StaggerItem key={i}>
              <div className="skeleton h-20 rounded-2xl" />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center py-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 rounded-2xl bg-dark-800/50 flex items-center justify-center mx-auto mb-5 border border-dark-700/50"
          >
            <CheckCircle2 className="w-10 h-10 text-dark-400" />
          </motion.div>
          <h3 className="text-xl font-semibold mb-2">{search ? 'No matching tasks' : 'All clear!'}</h3>
          <p className="text-dark-400 mb-6 max-w-sm mx-auto">
            {search ? 'Try adjusting your search or filters' : 'No tasks in this category'}
          </p>
        </motion.div>
      ) : (
        <StaggerContainer className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((task) => (
              <StaggerItem key={task._id}>
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="glass-card-hover p-4 flex items-center gap-4 group"
                >
                  <motion.button
                    onClick={() => completeTask(task._id)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.85 }}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      task.status === 'pending_review'
                        ? 'border-purple-400 bg-purple-500/20'
                        : 'border-dark-400 hover:border-green-400 hover:bg-green-500/20'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full transition-colors ${
                      task.status === 'pending_review' ? 'bg-purple-400 animate-pulse' : 'hover:bg-green-400'
                    }`} />
                  </motion.button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-dark-400' : ''}`}>
                        {task.title}
                      </p>
                      {task.isAiGenerated && (
                        <motion.div
                          initial={{ rotate: -20, scale: 0 }}
                          animate={{ rotate: 0, scale: 1 }}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        </motion.div>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-dark-400 truncate mt-0.5">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`badge ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                      {task.goal && (
                        <span className="badge bg-dark-700 text-dark-300">{task.goal.title}</span>
                      )}
                      <span className="text-xs text-dark-400">{formatTimeAgo(task.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-purple-400/80">+{task.xpReward}XP</span>
                    <motion.button
                      onClick={() => deleteTask(task._id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </AnimatePresence>
        </StaggerContainer>
      )}

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
