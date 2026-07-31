'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { AnimatePresence, motion } from 'framer-motion';

const protectedRoutes = ['/dashboard', '/goals', '/tasks', '/groups', '/chat', '/leaderboard', '/settings'];
const authRoutes = ['/auth/login', '/auth/register'];

export function Providers({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, setAuth, setLoading, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const init = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const { data } = await authAPI.getProfile();
          setAuth(data.data, token, localStorage.getItem('refreshToken') || '');
        } catch {
          useAuthStore.getState().logout();
        }
      }
      setLoading(false);
    };
    init();
  }, [setAuth, setLoading]);

  useEffect(() => {
    if (!mounted || isLoading) return;
    const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
    const isAuth = authRoutes.includes(pathname);

    if (!isAuthenticated && isProtected) {
      router.push('/auth/login');
    } else if (isAuthenticated && isAuth) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, pathname, router, mounted]);

  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots-pattern opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/3 rounded-full blur-3xl" />
        <div className="flex flex-col items-center gap-6 relative z-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20"
          >
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-sm text-dark-400 font-medium"
          >
            Loading...
          </motion.p>
        </div>
      </div>
    );
  }

  const isAuthPage = authRoutes.includes(pathname);

  const toastStyle = {
    background: '#1e293b',
    color: '#f1f5f9',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    backdropFilter: 'blur(12px)',
  } as const;

  if (isAuthPage) {
    return (
      <>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ErrorBoundary>{children}</ErrorBoundary>
          </motion.div>
        </AnimatePresence>
        <Toaster
          position="top-right"
          toastOptions={{
            style: toastStyle,
            success: { iconTheme: { primary: '#22c55e', secondary: '#f1f5f9' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <div className="flex lg:pt-0 pt-14 pb-16 lg:pb-0">
        <Sidebar />
        <main className="flex-1 min-h-screen p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <ErrorBoundary>{children}</ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: toastStyle,
          success: { iconTheme: { primary: '#22c55e', secondary: '#f1f5f9' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
        }}
      />
    </div>
  );
}
