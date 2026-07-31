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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
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
                  <button onClick={onClose} className="text-dark-400 hover:text-dark-200">
                    <X className="w-5 h-5" />
                  </button>
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
                  ))}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Proof
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="text-center py-6">
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
                    <button
                      onClick={() => { setResult(null); setAnswers(questions.map(() => '')); }}
                      className="btn-primary"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
