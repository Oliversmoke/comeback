import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function calculateXpProgress(xp: number): number {
  const levels = [0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500, 10000, 13000, 16500, 20500, 25000, 30000, 36000, 43000, 51000, 60000];
  let currentLevel = 0;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i]) { currentLevel = i; break; }
  }
  const currentLevelXp = levels[currentLevel];
  const nextLevelXp = levels[currentLevel + 1] || currentLevelXp + 5000;
  return ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    fitness: 'bg-green-500/20 text-green-300',
    learning: 'bg-blue-500/20 text-blue-300',
    career: 'bg-purple-500/20 text-purple-300',
    finance: 'bg-yellow-500/20 text-yellow-300',
    health: 'bg-pink-500/20 text-pink-300',
    social: 'bg-orange-500/20 text-orange-300',
    creative: 'bg-cyan-500/20 text-cyan-300',
    productivity: 'bg-indigo-500/20 text-indigo-300',
    other: 'bg-gray-500/20 text-gray-300',
  };
  return colors[category] || colors.other;
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'bg-slate-500/20 text-slate-300',
    medium: 'bg-blue-500/20 text-blue-300',
    high: 'bg-orange-500/20 text-orange-300',
    critical: 'bg-red-500/20 text-red-300',
    urgent: 'bg-red-500/20 text-red-300',
  };
  return colors[priority] || colors.medium;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-300',
    pending: 'bg-yellow-500/20 text-yellow-300',
    in_progress: 'bg-blue-500/20 text-blue-300',
    completed: 'bg-green-500/20 text-green-300',
    paused: 'bg-orange-500/20 text-orange-300',
    archived: 'bg-gray-500/20 text-gray-300',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-300';
}

export function generateAvatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00A8FF&color=fff&bold=true`;
}
