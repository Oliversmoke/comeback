'use client';

import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';

export function ThemeToggleButton({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={`p-1.5 rounded-lg hover:bg-dark-700 transition-colors ${className}`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-dark-400" />
      ) : (
        <Moon className="w-4 h-4 text-dark-400" />
      )}
    </motion.button>
  );
}

export function ThemeToggleCard() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="space-y-4">
      <p className="text-sm text-dark-400">Choose your preferred appearance</p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes at night' },
          { id: 'light', label: 'Light', icon: Sun, desc: 'Bright and clean' },
        ].map(({ id, label, icon: Icon, desc }) => (
          <motion.button
            key={id}
            onClick={() => setTheme(id as 'dark' | 'light')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`p-5 rounded-xl border-2 text-left transition-all ${
              theme === id
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-dark-700 bg-dark-800/50 hover:border-dark-500'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              id === 'dark' ? 'bg-dark-700 text-dark-100' : 'bg-dark-100 text-dark-800'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="font-medium text-sm mb-1">{label}</p>
            <p className="text-xs text-dark-400">{desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
