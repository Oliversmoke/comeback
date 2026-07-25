'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Target, ListTodo, Users, MessageSquare, Trophy, Bot, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { ThemeToggleButton } from '@/components/ui/ThemeToggle';
import { useBranding } from '@/hooks/useBranding';

const mobileNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/goals', icon: Target, label: 'Goals' },
  { href: '/tasks', icon: ListTodo, label: 'Tasks' },
  { href: '/groups', icon: Users, label: 'Groups' },
  { href: '/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/leaderboard', icon: Trophy, label: 'Rank' },
  { href: '/ai-coach', icon: Bot, label: 'AI' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { logoUrl, hasCustomLogo } = useBranding();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-dark-800/95 backdrop-blur-xl border-t border-dark-700/50 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all relative',
                  isActive ? 'text-primary-400' : 'text-dark-400 hover:text-dark-200'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary-400"
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </motion.div>
                {(item as any).badge && (
                  <span className="absolute -top-0.5 -right-1 text-[8px] px-1 py-0.5 rounded-full bg-accent-500/20 text-accent-400 border border-accent-500/30 font-medium leading-none">
                    {(item as any).badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile top header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-dark-800/95 backdrop-blur-xl border-b border-dark-700/50 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center overflow-hidden">
            {hasCustomLogo ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Target className="w-4 h-4 text-white" />
            )}
          </div>
          <span className="text-lg font-bold gradient-text">comeback.AI</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-dark-400">
            <span className="text-orange-400">🔥</span>
            <span>{user?.streak || 0}</span>
          </div>
          <div className="text-xs text-dark-400">
            Lv.{user?.level || 1}
          </div>
          <ThemeToggleButton />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-dark-700 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-dark-800 border-l border-dark-700 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 p-0.5 flex-shrink-0">
                  <div className="w-full h-full rounded-full bg-dark-800 overflow-hidden">
                    <img
                      src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=00A8FF&color=fff`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{user?.displayName}</p>
                  <p className="text-sm text-dark-400 truncate">@{user?.username}</p>
                </div>
              </div>
              <div className="space-y-1">
                {mobileNavItems.map((item, i) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                          isActive ? 'bg-primary-500/10 text-primary-400' : 'hover:bg-dark-700/50 text-dark-200'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
