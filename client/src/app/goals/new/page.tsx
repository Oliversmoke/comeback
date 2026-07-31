'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ArrowLeft } from 'lucide-react';
import { goalsAPI } from '@/lib/api';
import { AnimatedPage, FadeIn } from '@/components/animations/MotionComponents';
import toast from 'react-hot-toast';

const CATEGORIES = ['fitness', 'learning', 'career', 'finance', 'health', 'social', 'creative', 'productivity', 'other'];

export default function NewGoalPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');

    setSaving(true);
    try {
      await goalsAPI.create(form);
      toast.success('Goal created!');
      router.push('/goals');
    } catch {
      toast.error('Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedPage>
      <FadeIn>
        <motion.button
          onClick={() => router.push('/goals')}
          className="flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-6 transition-colors"
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.97 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Goals
        </motion.button>
      </FadeIn>

      <div className="max-w-2xl mx-auto">
        <FadeIn>
            <div className="glass-card p-8 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Create Goal</h1>
                <p className="text-dark-400 text-sm">Define what you want to achieve</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">Goal Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Learn to code in 3 months"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field h-24 resize-none"
                  placeholder="Describe your goal..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Category</label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="input-field"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dark-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Priority</label>
                  <div className="relative">
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="input-field"
                    >
                      {['low', 'medium', 'high', 'critical'].map((p) => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dark-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <motion.button
                  type="submit"
                  disabled={saving}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="btn-primary flex-1"
                >
                  {saving ? 'Creating...' : 'Create Goal'}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => router.push('/goals')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </motion.button>
              </div>
            </form>
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/3 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-500/3 rounded-full blur-2xl pointer-events-none" />
          </div>
        </FadeIn>
      </div>
    </AnimatedPage>
  );
}
