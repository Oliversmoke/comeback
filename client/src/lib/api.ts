import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function updatePersistedTokens(accessToken: string, refreshToken: string) {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state) {
        parsed.state.accessToken = accessToken;
        parsed.state.refreshToken = refreshToken;
        localStorage.setItem('auth-storage', JSON.stringify(parsed));
      }
    }
  } catch {}
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        const newAccessToken = data.data.accessToken;
        const newRefreshToken = data.data.refreshToken;
        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        updatePersistedTokens(newAccessToken, newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { email: string; username: string; password: string; displayName?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  googleLogin: (idToken: string) =>
    api.post('/auth/google', { idToken }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  logout: () =>
    api.post('/auth/logout'),
  getProfile: () =>
    api.get('/auth/me'),
  updateProfile: (data: Record<string, string>) =>
    api.put('/auth/profile', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

export const goalsAPI = {
  list: (params?: Record<string, string>) =>
    api.get('/goals', { params }),
  get: (id: string) =>
    api.get(`/goals/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post('/goals', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/goals/${id}`, data),
  delete: (id: string) =>
    api.delete(`/goals/${id}`),
  addMilestone: (id: string, title: string) =>
    api.post(`/goals/${id}/milestones`, { title }),
  toggleMilestone: (goalId: string, milestoneId: string) =>
    api.put(`/goals/${goalId}/milestones/${milestoneId}`),
};

export const groupsAPI = {
  list: (params?: Record<string, string>) =>
    api.get('/groups', { params }),
  getMy: () =>
    api.get('/groups/my'),
  get: (id: string) =>
    api.get(`/groups/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post('/groups', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/groups/${id}`, data),
  join: (inviteCode: string) =>
    api.post(`/groups/join/${inviteCode}`),
  leave: (id: string) =>
    api.post(`/groups/${id}/leave`),
  getMessages: (id: string, params?: Record<string, string>) =>
    api.get(`/groups/${id}/messages`, { params }),
};

export const tasksAPI = {
  list: (params?: Record<string, string>) =>
    api.get('/tasks', { params }),
  getToday: () =>
    api.get('/tasks/today'),
  get: (id: string) =>
    api.get(`/tasks/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post('/tasks', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/tasks/${id}`, data),
  delete: (id: string) =>
    api.delete(`/tasks/${id}`),
  complete: (id: string) =>
    api.post(`/tasks/${id}/complete`),
  submitProof: (id: string, data: { answers: { question: string; answer: string }[]; text?: string }) =>
    api.post(`/tasks/${id}/submit-proof`, data),
};

export const leaderboardAPI = {
  getUsers: (params?: Record<string, string>) =>
    api.get('/leaderboard/users', { params }),
  getGroups: (params?: Record<string, string>) =>
    api.get('/leaderboard/groups', { params }),
  getUserRank: () =>
    api.get('/leaderboard/user-rank'),
};

export const aiAPI = {
  generateTasks: (data?: { obstacle?: string }) =>
    api.post('/ai/generate-tasks', data || {}),
  getInsights: () =>
    api.post('/ai/insights'),
  chat: (data: { prompt: string; context?: any }) =>
    api.post('/ai/chat', data),
  getGroupAdaptations: (groupId: string) =>
    api.post('/ai/group-adapt', { groupId }),
  getRecoveryPlan: (daysMissed?: number) =>
    api.post('/ai/recovery-plan', { daysMissed }),
  getReflectionPrompt: (type?: string, index?: number) =>
    api.get('/ai/reflection-prompt', { params: { type, index } }),
  getChallenge: () =>
    api.get('/ai/challenge'),
  trackWin: (data: { description: string; category?: string; impact?: string }) =>
    api.post('/ai/track-win', data),
  getEncouragement: (type?: string, replacements?: Record<string, string>) =>
    api.post('/ai/encouragement', { type, replacements }),
};

export const memoryAPI = {
  get: () =>
    api.get('/memory'),
  update: (data: Record<string, unknown>) =>
    api.put('/memory', data),
  getTimeline: (days?: number) =>
    api.get('/memory/timeline', { params: { days } }),
  getTrends: (days?: number) =>
    api.get('/memory/trends', { params: { days } }),
  getInsights: (type?: string, limit?: number) =>
    api.get('/memory/insights', { params: { type, limit } }),
  markInsightRead: (id: string) =>
    api.put(`/memory/insights/${id}/read`),
  dismissInsight: (id: string) =>
    api.put(`/memory/insights/${id}/dismiss`),
  getUnreadInsightCount: () =>
    api.get('/memory/insights/unread-count'),
  getActivitySummary: (days?: number) =>
    api.get('/memory/activity/summary', { params: { days } }),
};

export const psychologyAPI = {
  getPrinciples: () =>
    api.get('/psychology/principles'),
  getPrinciple: (name: string) =>
    api.get(`/psychology/principle/${name}`),
  generateIntention: (goalTitle: string, obstacle?: string) =>
    api.post('/psychology/intention', { goalTitle, obstacle }),
  burnoutCheck: () =>
    api.get('/psychology/burnout-check'),
  growthMindset: (obstacle?: string) =>
    api.get('/psychology/growth-mindset', { params: { obstacle } }),
  consistencyPlan: () =>
    api.get('/psychology/consistency-plan'),
  reframe: (obstacle: string) =>
    api.post('/psychology/reframe', { obstacle }),
  getEncouragement: (type?: string, replacements?: Record<string, string>) =>
    api.get('/psychology/encouragement', { params: { type, ...replacements } }),
  getReflectionPrompt: (type?: string, index?: number) =>
    api.get('/psychology/reflection-prompt', { params: { type, index } }),
  getRecoveryStrategy: () =>
    api.get('/psychology/recovery-strategy'),
  getRecoveryPlan: (daysMissed?: number) =>
    api.post('/psychology/recovery-plan', { daysMissed }),
  getChallenge: () =>
    api.get('/psychology/challenge'),
  getAnalysis: () =>
    api.get('/psychology/analysis'),
  runLearningCycle: () =>
    api.post('/psychology/learning-cycle'),
  getAdaptiveInsights: () =>
    api.post('/psychology/adaptive-insights'),
};
