'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Target, ListTodo, Users, MessageSquare, Trophy, Bot, Menu, X, Crown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { ThemeToggleButton } from '@/components/ui/ThemeToggle';
import { useBranding } from '@/hooks/useBranding';
import { glowHex } from '@/components/nexus/NexusPrimitives';

const mobileNavItems: { href: string; icon: React.ComponentType<{ className?: string; color?: string }>; label: string; glow: 'blue' | 'red' | 'cyan' | 'violet' | 'green' }[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home', glow: 'blue' },
  { href: '/goals', icon: Target, label: 'Goals', glow: 'cyan' },
  { href: '/tasks', icon: ListTodo, label: 'Tasks', glow: 'green' },
  { href: '/groups', icon: Users, label: 'Groups', glow: 'blue' },
  { href: '/chat', icon: MessageSquare, label: 'Chat', glow: 'cyan' },
  { href: '/leaderboard', icon: Trophy, label: 'Rank', glow: 'red' },
  { href: '/ai-coach', icon: Bot, label: 'AI', glow: 'cyan' },
  { href: '/pricing', icon: Crown, label: 'Eternal', glow: 'red' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { logoUrl, hasCustomLogo } = useBranding();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="nexus-panel fixed bottom-0 left-0 right-0 z-50 rounded-none border-x-0 border-b-0 safe-area-bottom lg:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ ['--glow']: glowHex(item.glow) } as React.CSSProperties}
                className={cn(
                  'nexus-item relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-all',
                  isActive ? 'nexus-item-active' : 'text-dark-400 hover:text-dark-200'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute -top-2 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full"
                    style={{ background: glowHex(item.glow), boxShadow: `0 0 8px ${glowHex(item.glow)}` }}
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <Icon className="h-5 w-5" color={isActive ? glowHex(item.glow) : undefined} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile top header */}
      <header className="nexus-panel fixed left-0 right-0 top-0 z-50 flex items-center justify-between rounded-none border-x-0 border-t-0 px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary-500 to-accent-500">
            {hasCustomLogo ? (
              <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Target className="h-4 w-4 text-white" />
            )}
          </div>
          <span className="text-lg font-bold gradient-text">comeback.AI</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-dark-400">
            <span className="text-orange-400">🔥</span>
            <span>{user?.streak || 0}</span>
          </div>
          <div className="text-xs text-dark-400">Lv.{user?.level || 1}</div>
          <ThemeToggleButton />
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-lg p-1.5 transition-colors hover:bg-white/5">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="nexus-panel absolute bottom-0 right-0 top-0 w-72 rounded-none border-y-0 border-r-0 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-8 flex items-center gap-3">
                <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 p-0.5">
                  <div className="h-full w-full overflow-hidden rounded-full bg-dark-800">
                    <img
                      src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=00A8FF&color=fff`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{user?.displayName}</p>
                  <p className="truncate text-sm text-dark-400">@{user?.username}</p>
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
                        style={{ ['--glow']: glowHex(item.glow) } as React.CSSProperties}
                        className={cn(
                          'nexus-item flex items-center gap-3 rounded-xl px-4 py-3 transition-all',
                          isActive ? 'nexus-item-active text-primary-300' : 'text-dark-200 hover:text-dark-100'
                        )}
                      >
                        <Icon className="h-5 w-5" color={isActive ? glowHex(item.glow) : undefined} />
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


