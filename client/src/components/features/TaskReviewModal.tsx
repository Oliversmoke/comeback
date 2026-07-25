'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, CheckCircle, Sparkles, AlertTriangle } from 'lucide-react';
import { tasksAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Task } from '@/types';

interface TaskReviewModalProps {
  task: Task;
  questions: string[];
  isOpen: boolean;
  onClose: () => void;
  onApproved: (taskId: string) => void;
}

export default function TaskReviewModal({ task, questions, isOpen, onClose, onApproved }: TaskReviewModalProps) {
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ''));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ approved: boolean; feedback: string } | null>(null);

  const handleSubmit = async () => {
    const filled = answers.filter((a) => a.trim().length > 0);
    if (filled.length < questions.length) {
      toast.error('Please answer all questions');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await tasksAPI.submitProof(task._id, {
        answers: questions.map((q, i) => ({ question: q, answer: answers[i] })),
      });
      setResult({ approved: data.data.approved, feedback: data.data.feedback });
      if (data.data.approved) {
        setTimeout(() => {
          onApproved(task._id);
          onClose();
        }, 2500);
      }
    } catch {
      toast.error('Failed to submit proof');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          whileHover={{ cursor: 'pointer' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            whileHover={{ scale: 1.005 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {!result ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg font-bold">AI Task Review</h2>
                  </div>
                  <motion.button
                    onClick={onClose}
                    className="text-dark-400 hover:text-dark-200"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <p className="text-sm text-dark-300 mb-1">
                  Task: <span className="text-dark-100 font-medium">{task.title}</span>
                </p>
                <p className="text-xs text-dark-400 mb-4">
                  Answer these questions to verify you completed the task
                </p>

                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <div key={i}>
                      <label className="block text-sm font-medium text-dark-200 mb-1.5">{q}</label>
                      <div className="focus-within:scale-[1.005] transition-transform duration-200">
                        <textarea
                          value={answers[i]}
                          onChange={(e) => {
                            const next = [...answers];
                            next[i] = e.target.value;
                            setAnswers(next);
                          }}
                          className="input-field h-20 resize-none text-sm"
                          placeholder="Write your answer..."
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-6 group relative overflow-hidden"
                >
                  {submitting ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    </motion.div>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Proof
                    </>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
              </>
            ) : (
              <motion.div
                className="text-center py-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                {result.approved ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-lg font-bold text-green-400 mb-2">Proof Approved!</h3>
                    <p className="text-sm text-dark-300 mb-4">{result.feedback}</p>
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-dark-400 mt-2">Completing task...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-4">
                      <AlertTriangle className="w-8 h-8 text-orange-400" />
                    </div>
                    <h3 className="text-lg font-bold text-orange-400 mb-2">Needs More Detail</h3>
                    <p className="text-sm text-dark-300 mb-6">{result.feedback}</p>
                    <motion.button
                      onClick={() => { setResult(null); setAnswers(questions.map(() => '')); }}
                      className="btn-primary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Try Again
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
