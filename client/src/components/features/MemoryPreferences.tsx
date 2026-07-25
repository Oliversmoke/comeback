'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Heart, Target, Zap, AlertTriangle, Trophy, BookOpen, RefreshCw, Check, X, Clock, TrendingUp, Settings } from 'lucide-react';
import { memoryAPI, psychologyAPI } from '@/lib/api';
import { UserMemory, AdaptationReport } from '@/types';
import toast from 'react-hot-toast';
import { FadeIn } from '@/components/animations/MotionComponents';

const toneOptions = [
  { value: 'encouraging', label: 'Encouraging', description: 'Warm, supportive, and motivating' },
  { value: 'direct', label: 'Direct', description: 'Straightforward and no-nonsense' },
  { value: 'analytical', label: 'Analytical', description: 'Data-focused and logical' },
  { value: 'warm', label: 'Warm', description: 'Friendly and conversational' },
  { value: 'minimalist', label: 'Minimalist', description: 'Short, simple, and efficient' },
];

const challengeOptions = [
  { value: 'stretch', label: 'Stretch', description: 'Pushes your limits' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced challenge' },
  { value: 'gentle', label: 'Gentle', description: 'Comfortable pace' },
];

const reflectionOptions = [
  { value: 'daily', label: 'Daily', description: 'Reflect every day' },
  { value: 'weekly', label: 'Weekly', description: 'Reflect once a week' },
  { value: 'never', label: 'Never', description: 'No reflection prompts' },
];

const feedbackOptions = [
  { value: 'detailed', label: 'Detailed', description: 'In-depth analysis' },
  { value: 'concise', label: 'Concise', description: 'Short and sweet' },
  { value: 'actionable', label: 'Actionable', description: 'Focus on next steps' },
];

export default function MemoryPreferences() {
  const [memory, setMemory] = useState<UserMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<AdaptationReport | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const [form, setForm] = useState({
    tone: 'encouraging',
    challengePreference: 'moderate',
    reflectionFrequency: 'weekly',
    feedbackStyle: 'actionable',
    notificationTime: '09:00',
    reflectionPromptTime: '20:00',
    wantsAccountability: false,
    wantsGroupChallenges: true,
  });

  useEffect(() => {
    loadMemory();
  }, []);

  const loadMemory = async () => {
    setLoading(true);
    try {
      const { data } = await memoryAPI.get();
      setMemory(data.data);
      const m = data.data;
      setForm({
        tone: m.coachingStyle?.preferredTone || 'encouraging',
        challengePreference: m.coachingStyle?.challengePreference || 'moderate',
        reflectionFrequency: m.coachingStyle?.reflectionFrequency || 'weekly',
        feedbackStyle: m.coachingStyle?.feedbackStyle || 'actionable',
        notificationTime: m.preferences?.notificationTime || '09:00',
        reflectionPromptTime: m.preferences?.reflectionPromptTime || '20:00',
        wantsAccountability: m.preferences?.wantsAccountability || false,
        wantsGroupChallenges: m.preferences?.wantsGroupChallenges ?? true,
      });
    } catch {
      toast.error('Failed to load memory profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await memoryAPI.update({
        coachingStyle: {
          preferredTone: form.tone,
          challengePreference: form.challengePreference,
          reflectionFrequency: form.reflectionFrequency,
          feedbackStyle: form.feedbackStyle,
        },
        preferences: {
          notificationTime: form.notificationTime,
          reflectionPromptTime: form.reflectionPromptTime,
          wantsAccountability: form.wantsAccountability,
          wantsGroupChallenges: form.wantsGroupChallenges,
        },
      });
      toast.success('AI Memory preferences updated');
      await loadMemory();
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const runAnalysis = async () => {
    setLoadingAnalysis(true);
    setShowAnalysis(true);
    try {
      const { data } = await psychologyAPI.getAnalysis();
      setAnalysis(data.data);
    } catch {
      toast.error('Failed to run analysis');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-dark-600 rounded" />
          <div className="h-4 w-64 bg-dark-600 rounded" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-dark-600 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">AI Memory & Coaching Preferences</h2>
        <div className="flex items-center gap-2 text-sm text-dark-400">
          <Brain className="w-4 h-4" />
          <span>{memory?.interactionCount || 0} interactions</span>
        </div>
      </div>
      <p className="text-dark-400 mb-6">
        Your AI coach learns from every interaction. Adjust how it communicates with you.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-5">
          <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
            <Heart className="w-4 h-4 text-accent-400" />
            Coaching Style
          </h3>

          <div>
            <label className="block text-sm text-dark-300 mb-2">Preferred Tone</label>
            <div className="flex flex-wrap gap-2">
              {toneOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setForm({ ...form, tone: opt.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.tone === opt.value
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                      : 'bg-dark-700/50 text-dark-300 border border-dark-600 hover:border-dark-500'
                  }`}
                  title={opt.description}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-2">Challenge Level</label>
            <div className="flex flex-wrap gap-2">
              {challengeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setForm({ ...form, challengePreference: opt.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.challengePreference === opt.value
                      ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30'
                      : 'bg-dark-700/50 text-dark-300 border border-dark-600 hover:border-dark-500'
                  }`}
                  title={opt.description}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-2">Reflection Frequency</label>
            <div className="flex flex-wrap gap-2">
              {reflectionOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setForm({ ...form, reflectionFrequency: opt.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.reflectionFrequency === opt.value
                      ? 'bg-success-500/20 text-success-300 border border-success-500/30'
                      : 'bg-dark-700/50 text-dark-300 border border-dark-600 hover:border-dark-500'
                  }`}
                  title={opt.description}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-2">Feedback Style</label>
            <div className="flex flex-wrap gap-2">
              {feedbackOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setForm({ ...form, feedbackStyle: opt.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.feedbackStyle === opt.value
                      ? 'bg-info-500/20 text-info-300 border border-info-500/30'
                      : 'bg-dark-700/50 text-dark-300 border border-dark-600 hover:border-dark-500'
                  }`}
                  title={opt.description}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary-400" />
            Behavior & Routine
          </h3>

          <div>
            <label className="block text-sm text-dark-300 mb-2">Notification Time</label>
            <input
              type="time"
              value={form.notificationTime}
              onChange={e => setForm({ ...form, notificationTime: e.target.value })}
              className="input-field w-32"
            />
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-2">Reflection Prompt Time</label>
            <input
              type="time"
              value={form.reflectionPromptTime}
              onChange={e => setForm({ ...form, reflectionPromptTime: e.target.value })}
              className="input-field w-32"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl border border-dark-600">
            <div>
              <p className="text-sm font-medium text-dark-200">Accountability Partner</p>
              <p className="text-xs text-dark-400">Match me with an accountability partner</p>
            </div>
            <button
              onClick={() => setForm({ ...form, wantsAccountability: !form.wantsAccountability })}
              className={`w-12 h-6 rounded-full transition-all flex items-center ${
                form.wantsAccountability ? 'bg-primary-500 justify-end' : 'bg-dark-600 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white mx-0.5" />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl border border-dark-600">
            <div>
              <p className="text-sm font-medium text-dark-200">Group Challenges</p>
              <p className="text-xs text-dark-400">Participate in AI-generated group challenges</p>
            </div>
            <button
              onClick={() => setForm({ ...form, wantsGroupChallenges: !form.wantsGroupChallenges })}
              className={`w-12 h-6 rounded-full transition-all flex items-center ${
                form.wantsGroupChallenges ? 'bg-primary-500 justify-end' : 'bg-dark-600 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white mx-0.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? 'Saving...' : <><Check className="w-4 h-4" /> Save Preferences</>}
        </motion.button>

        <motion.button
          onClick={runAnalysis}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="btn-secondary flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Analyze My Patterns
        </motion.button>
      </div>

      <AnimatePresence>
        {showAnalysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-dark-600 pt-6">
              {loadingAnalysis ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-48 bg-dark-600 rounded" />
                  <div className="h-20 bg-dark-600 rounded-xl" />
                </div>
              ) : analysis ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-accent-400" />
                    Adaptation Analysis
                  </h3>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 bg-dark-700/50 rounded-xl border border-dark-600">
                      <p className="text-xs text-dark-400">Performance</p>
                      <p className="text-lg font-semibold capitalize">{analysis.currentState.performance}</p>
                    </div>
                    <div className="p-3 bg-dark-700/50 rounded-xl border border-dark-600">
                      <p className="text-xs text-dark-400">Completion Rate</p>
                      <p className="text-lg font-semibold">{analysis.currentState.completionRate}%</p>
                    </div>
                    <div className="p-3 bg-dark-700/50 rounded-xl border border-dark-600">
                      <p className="text-xs text-dark-400">Peak Time</p>
                      <p className="text-lg font-semibold">{analysis.currentState.peakHour ? `${analysis.currentState.peakHour}:00` : 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-dark-700/50 rounded-xl border border-dark-600">
                      <p className="text-xs text-dark-400">Adaptation Score</p>
                      <p className="text-lg font-semibold">{analysis.adaptationScore}/100</p>
                    </div>
                  </div>

                  {analysis.adaptations && (
                    <div className="p-4 bg-primary-500/10 rounded-xl border border-primary-500/20">
                      <p className="text-sm font-medium text-primary-300 mb-1">AI Adaptation Applied</p>
                      <p className="text-xs text-dark-300">
                        Task difficulty: <span className="text-dark-200 font-medium capitalize">{analysis.adaptations.taskDifficulty}</span>
                        {' | '}
                        Coaching focus: <span className="text-dark-200 font-medium capitalize">{analysis.adaptations.coachingStyle.focus}</span>
                        {' | '}
                        Tone: <span className="text-dark-200 font-medium capitalize">{analysis.adaptations.coachingStyle.tone}</span>
                      </p>
                    </div>
                  )}

                  {memory && (memory.wins.length > 0 || memory.obstacles.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {memory.wins.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-success-400 mb-2 flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> Recent Wins
                          </p>
                          <div className="space-y-1">
                            {memory.wins.slice(-3).reverse().map((win, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-dark-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-success-400 flex-shrink-0" />
                                <span className="capitalize">{win.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {memory.obstacles.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-warning-400 mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Known Obstacles
                          </p>
                          <div className="space-y-1">
                            {memory.obstacles.sort((a, b) => b.frequency - a.frequency).slice(0, 3).map((obs, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-dark-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-warning-400 flex-shrink-0" />
                                <span className="capitalize">{obs.pattern} (x{obs.frequency})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-dark-400">Not enough data to analyze patterns yet. Keep using the platform!</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}