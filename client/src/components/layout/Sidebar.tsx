'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Target, Users, ListTodo, Trophy, Bot, MessageSquare, Settings, LogOut, Crown,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn, calculateXpProgress } from '@/lib/utils';
import { ThemeToggleButton } from '@/components/ui/ThemeToggle';
import { useBranding } from '@/hooks/useBranding';
import { glowHex } from '@/components/nexus/NexusPrimitives';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; color?: string }>;
  badge?: string;
  glow?: 'blue' | 'red' | 'cyan' | 'violet' | 'green';
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, glow: 'blue' },
  { href: '/goals', label: 'Goals', icon: Target, glow: 'cyan' },
  { href: '/tasks', label: 'Tasks', icon: ListTodo, glow: 'green' },
  { href: '/groups', label: 'Groups', icon: Users, glow: 'blue' },
  { href: '/chat', label: 'Chat', icon: MessageSquare, glow: 'cyan' },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, glow: 'red' },
  { href: '/ai-coach', label: 'AI Coach', icon: Bot, glow: 'cyan' },
  { href: '/pricing', label: 'Eternal', icon: Crown, glow: 'red' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { logoUrl, hasCustomLogo } = useBranding();
  const xpProgress = calculateXpProgress(user?.xp || 0);

  return (
    <aside className="nexus-panel hidden h-screen w-72 flex-col rounded-none border-y-0 border-l-0 lg:flex">
      <div className="border-b border-white/5 p-6">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/20 transition-shadow group-hover:shadow-primary-500/30">
            {hasCustomLogo ? (
              <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Target className="h-5 w-5 text-white" />
            )}
          </div>
          <span className="text-xl font-bold gradient-text">comeback.AI</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          const glow = item.glow ?? 'blue';
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                style={{ ['--glow']: glowHex(glow) } as React.CSSProperties}
                className={cn(
                  'nexus-item relative flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200',
                  isActive ? 'nexus-item-active text-primary-300' : 'text-dark-300 hover:text-dark-100'
                )}
              >
                <Icon className="h-5 w-5" color={isActive ? glowHex(glow) : undefined} />
                <span className="flex-1 font-medium">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full border border-accent-500/30 bg-accent-500/20 px-1.5 py-0.5 text-[10px] font-medium text-accent-400">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <>
                    <motion.div
                      layoutId="activeTab"
                      className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full"
                      style={{ background: glowHex(glow), boxShadow: `0 0 8px ${glowHex(glow)}` }}
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/5 to-transparent" />
                  </>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-4 border-t border-white/5 p-4">
        <div className="flex items-center justify-between px-4 py-2">
          <Link href="/settings" className="group flex items-center gap-3 text-dark-300 transition-all hover:text-dark-100">
            <Settings className="h-5 w-5 transition-transform group-hover:rotate-12" />
            <span className="text-sm">Settings</span>
          </Link>
          <ThemeToggleButton />
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-dark-300 transition-all hover:bg-red-500/10 hover:text-error active:scale-[0.98]"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm">Logout</span>
        </button>

        <div className="nexus-panel p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 p-0.5">
              <div className="h-full w-full overflow-hidden rounded-full bg-dark-800">
                <img
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=00A8FF&color=fff`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-dark-100">{user?.displayName || user?.username}</p>
              <p className="text-xs text-dark-400">Level {user?.level || 1}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-dark-400">
              <span>XP Progress</span>
              <span>{user?.xp || 0} XP</span>
            </div>
            <div className="xp-bar">
              <motion.div
                className="xp-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-dark-400">
            <span className="inline-flex items-center gap-1">
              <span className="text-orange-400">🔥</span>
              <span>{user?.streak || 0} day streak</span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}


