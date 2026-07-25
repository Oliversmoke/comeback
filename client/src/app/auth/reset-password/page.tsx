'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Target, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { logoUrl, hasCustomLogo, backgroundUrl, hasCustomBackground } = useBranding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid reset link');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2 text-red-400">Invalid Link</h2>
        <p className="text-dark-400 mb-6">This password reset link is invalid or missing a token.</p>
        <Link href="/auth/forgot-password" className="text-primary-400 hover:text-primary-300 font-medium">
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        </motion.div>
        <h2 className="text-xl font-semibold mb-2">Password Reset!</h2>
        <p className="text-dark-400 mb-6">Your password has been successfully updated.</p>
        <Link
          href="/auth/login"
          className="btn-primary inline-flex items-center gap-2 px-6 py-3"
        >
          Sign In <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-dark-200 mb-2">New Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field pr-10"
            placeholder="••••••••"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-dark-200 mb-2">Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="input-field"
          placeholder="••••••••"
          required
        />
      </div>
      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          'Reset Password'
        )}
      </motion.button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { logoUrl, hasCustomLogo, backgroundUrl, hasCustomBackground } = useBranding();
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-dots-pattern opacity-50" />
      {hasCustomBackground ? (
        <img src={backgroundUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
      ) : (
        <>
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-4 shadow-lg shadow-primary-500/25">
            {hasCustomLogo ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <Target className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold gradient-text">Set New Password</h1>
          <p className="text-dark-400 mt-2">Choose a strong password for your account</p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-8"
        >
          <Suspense fallback={<div className="py-8 text-center text-dark-400">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </motion.div>
      </motion.div>
    </div>
  );
}
