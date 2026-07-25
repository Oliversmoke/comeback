'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Target, Users, ListTodo, Trophy, Bot, MessageSquare, Settings, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn, calculateXpProgress } from '@/lib/utils';
import { ThemeToggleButton } from '@/components/ui/ThemeToggle';
import { useBranding } from '@/hooks/useBranding';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/ai-coach', label: 'AI Coach', icon: Bot },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { logoUrl, hasCustomLogo } = useBranding();
  const xpProgress = calculateXpProgress(user?.xp || 0);

  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen bg-dark-800/50 border-r border-dark-700/50 backdrop-blur-xl">
      <div className="p-6 border-b border-dark-700/50">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/30 transition-shadow overflow-hidden">
            {hasCustomLogo ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Target className="w-5 h-5 text-white" />
            )}
          </div>
          <span className="text-xl font-bold gradient-text">comeback.AI</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative',
                  isActive
                    ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                    : 'text-dark-300 hover:text-dark-100 hover:bg-dark-700/50'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-500/20 text-accent-400 border border-accent-500/30 font-medium">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <>
                    <motion.div
                      layoutId="activeTab"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary-400"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/5 to-transparent pointer-events-none" />
                  </>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-dark-700/50 space-y-4">
        <div className="flex items-center justify-between px-4 py-2">
          <Link href="/settings" className="flex items-center gap-3 text-dark-300 hover:text-dark-100 transition-all group">
            <Settings className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="text-sm">Settings</span>
          </Link>
          <ThemeToggleButton />
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2 rounded-xl text-dark-300 hover:text-red-400 hover:bg-red-500/10 transition-all w-full active:scale-[0.98]"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Logout</span>
        </button>

        <div className="glass-card-hover p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 p-0.5 flex-shrink-0">
              <div className="w-full h-full rounded-full bg-dark-800 overflow-hidden">
                <img
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=00A8FF&color=fff`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark-100 truncate">{user?.displayName || user?.username}</p>
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
          <div className="flex items-center gap-2 mt-3 text-xs text-dark-400">
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
