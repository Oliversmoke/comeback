'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useBranding } from '@/hooks/useBranding';

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  username: z.string().min(3, 'Must be at least 3 characters').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores'),
  password: z.string().min(8, 'Must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { setAuth } = useAuthStore();
  const router = useRouter();
  const { logoUrl, hasCustomLogo, backgroundUrl, hasCustomBackground } = useBranding();

  const updateField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { data } = await authAPI.register({
        email: form.email,
        username: form.username,
        password: form.password,
      });
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      toast.success('Account created! Welcome to comeback.AI.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const requirements = [
    { label: 'At least 8 characters', met: form.password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(form.password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(form.password) },
    { label: 'Number', met: /\d/.test(form.password) },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-dots-pattern opacity-50" />
      {hasCustomBackground ? (
        <img src={backgroundUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
      ) : (
        <>
          <div className="absolute top-1/3 -left-40 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute bottom-1/3 -right-40 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '-2s' }} />
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-4 shadow-lg shadow-primary-500/25"
          >
            <motion.div
              animate={{ boxShadow: ['0 0 0 0 rgba(0,168,255,0.3)', '0 0 20px 4px rgba(0,168,255,0.15)', '0 0 0 0 rgba(0,168,255,0.3)'] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="rounded-2xl"
            >
              {hasCustomLogo ? (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
              ) : (
                <Target className="w-8 h-8 text-white" />
              )}
            </motion.div>
          </motion.div>
          <h1 className="text-3xl font-bold gradient-text">Join comeback.AI</h1>
          <p className="text-dark-400 mt-2">Start achieving your goals today</p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={`input-field ${errors.email ? 'input-field-error' : ''}`}
                placeholder="you@example.com"
              />
              <AnimatePresence>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-red-400 text-xs mt-1.5 flex items-center gap-1"
                  >
                    <span className="w-1 h-1 rounded-full bg-red-400" /> {errors.email}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                className={`input-field ${errors.username ? 'input-field-error' : ''}`}
                placeholder="cooluser123"
              />
              <AnimatePresence>
                {errors.username && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-red-400 text-xs mt-1.5 flex items-center gap-1"
                  >
                    <span className="w-1 h-1 rounded-full bg-red-400" /> {errors.username}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className={`input-field pr-10 ${errors.password ? 'input-field-error' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-red-400 text-xs mt-1.5 flex items-center gap-1"
                  >
                    <span className="w-1 h-1 rounded-full bg-red-400" /> {errors.password}
                  </motion.p>
                )}
              </AnimatePresence>
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
                className="mt-3 space-y-1.5"
              >
                {requirements.map((req, i) => (
                  <motion.div
                    key={i}
                    variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${req.met ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'}`}>
                      {req.met ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-dark-400" />}
                    </div>
                    <span className={`transition-colors ${req.met ? 'text-green-400' : 'text-dark-400'}`}>{req.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                className={`input-field ${errors.confirmPassword ? 'input-field-error' : ''}`}
                placeholder="••••••••"
              />
              <AnimatePresence>
                {errors.confirmPassword && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-red-400 text-xs mt-1.5 flex items-center gap-1"
                  >
                    <span className="w-1 h-1 rounded-full bg-red-400" /> {errors.confirmPassword}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6 group relative overflow-hidden"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Create Account <ArrowRight className="w-4 h-4" />
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-dark-400 text-sm">
              Already have an account?{' '}
              <motion.span whileHover={{ scale: 1.02 }} className="inline-block">
                <Link href="/auth/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                  Sign in
                </Link>
              </motion.span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
