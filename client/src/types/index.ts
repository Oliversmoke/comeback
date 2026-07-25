export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  completedTasks: number;
  goals: string[];
  groups: string[];
  isOnline: boolean;
  lastSeen?: string;
  createdAt: string;
}

export interface Goal {
  _id: string;
  user: string;
  title: string;
  description?: string;
  category: GoalCategory;
  priority: Priority;
  status: GoalStatus;
  startDate: string;
  targetDate?: string;
  completedDate?: string;
  progress: number;
  milestones: Milestone[];
  tags: string[];
  isAiGenerated: boolean;
  aiInsights?: AiInsights;
  sharedWithGroups: string[];
  xpAwarded: number;
  createdAt: string;
  updatedAt: string;
}

export type GoalCategory = 'fitness' | 'learning' | 'career' | 'finance' | 'health' | 'social' | 'creative' | 'productivity' | 'other';
export type Priority = 'low' | 'medium' | 'high' | 'critical' | 'urgent';
export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Milestone {
  _id?: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface AiInsights {
  difficulty: string;
  estimatedWeeks: number;
  breakdown: string[];
  suggestions: string[];
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  coverImage?: string;
  category: GoalCategory;
  createdBy: string;
  members: GroupMember[];
  goals: string[];
  isPrivate: boolean;
  inviteCode?: string;
  maxMembers: number;
  totalXp: number;
  streak: number;
  memberCount: number;
  tags: string[];
  createdAt: string;
}

export interface GroupMember {
  user: User | string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
  xpInGroup: number;
}

export interface Task {
  _id: string;
  user: string;
  goal?: { _id: string; title: string; category: string };
  group?: { _id: string; name: string };
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  scheduledDate?: string;
  completedAt?: string;
  xpReward: number;
  isAiGenerated: boolean;
  isDailyTask: boolean;
  dateFor?: string;
  aiContext?: {
    reasoning: string;
    difficulty: string;
    category: string;
    timeEstimate: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'expired' | 'pending_review';

export interface Message {
  _id: string;
  group: string;
  sender: {
    _id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  content: string;
  messageType: 'text' | 'image' | 'system' | 'task_completed' | 'milestone_reached' | 'ai_insight';
  attachments?: Array<{ url: string; type: string; name: string }>;
  readBy: string[];
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
  completedTasks?: number;
}

export interface GroupLeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  coverImage?: string;
  memberCount: number;
  totalXp: number;
  streak: number;
  category: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface DashboardData {
  todayTasks: Task[];
  goals: Goal[];
  insights: {
    insight: string;
    suggestion: string;
    encouragement: string;
  };
  userRank: { rank: number; totalUsers: number; percentile: number };
  recentActivity: Message[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
