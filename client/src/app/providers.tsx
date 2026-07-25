'use client';

import { ReactNode, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { AnimatePresence, motion } from 'framer-motion';

const protectedRoutes = ['/dashboard', '/goals', '/tasks', '/groups', '/chat', '/leaderboard', '/ai-coach', '/settings'];
const authRoutes = ['/auth/login', '/auth/register'];

export function Providers({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, setAuth, setLoading, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
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
    if (isLoading) return;
    const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
    const isAuth = authRoutes.includes(pathname);

    if (!isAuthenticated && isProtected) {
      router.push('/auth/login');
    } else if (isAuthenticated && isAuth) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const isAuthPage = authRoutes.includes(pathname);

  if (isAuthPage) {
    return (
      <>
        <AnimatePresence mode="wait">
          <ErrorBoundary>{children}</ErrorBoundary>
        </AnimatePresence>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
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
            <ErrorBoundary>{children}</ErrorBoundary>
          </AnimatePresence>
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
        }}
      />
    </div>
  );
}
