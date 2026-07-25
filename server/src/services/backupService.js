import User from '../models/User.js';
import Task from '../models/Task.js';
import Goal from '../models/Goal.js';
import Group from '../models/Group.js';
import XpTransaction from '../models/XpTransaction.js';
import { sendBackupReport, sendLogDump, notifyOwner } from './emailService.js';

const BACKUP_INTERVAL = 24 * 60 * 60 * 1000;

let backupTimer = null;

const getSystemStats = async () => {
  const [userCount, taskCount, goalCount, groupCount, recentUsers, recentTasks] = await Promise.all([
    User.countDocuments(),
    Task.countDocuments(),
    Goal.countDocuments(),
    Group.countDocuments(),
    User.find().sort({ createdAt: -1 }).limit(10).select('email username displayName createdAt provider').lean(),
    Task.find().sort({ createdAt: -1 }).limit(10).select('title status user createdAt').populate('user', 'email').lean(),
  ]);

  const completedToday = await Task.countDocuments({
    status: 'completed',
    completedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
  });

  return {
    timestamp: new Date().toISOString(),
    stats: { users: userCount, tasks: taskCount, goals: goalCount, groups: groupCount, completedToday },
    recentRegistrations: recentUsers.map((u) => ({
      email: u.email, username: u.username, name: u.displayName, provider: u.provider, joined: u.createdAt,
    })),
    recentActivity: recentTasks.map((t) => ({
      task: t.title, status: t.status, user: t.user?.email || 'unknown', date: t.createdAt,
    })),
  };
};

const activityLog = [];
const MAX_LOG = 1000;

export const logActivity = (message, level = 'INFO') => {
  activityLog.push({ timestamp: new Date().toISOString(), level, message });
  if (activityLog.length > MAX_LOG) activityLog.shift();
};

export const getLogs = (limit = 100) => activityLog.slice(-limit);

export const runBackup = async () => {
  try {
    logActivity('Running scheduled backup...');
    const stats = await getSystemStats();
    await sendBackupReport(stats);
    logActivity('Backup report sent successfully');
    return true;
  } catch (error) {
    logActivity(`Backup failed: ${error.message}`, 'ERROR');
    console.error('Backup failed:', error);
    return false;
  }
};

export const sendLogs = async () => {
  try {
    const logs = getLogs(200);
    await sendLogDump(logs);
    logActivity('Log dump sent successfully');
    return true;
  } catch (error) {
    logActivity(`Log dump failed: ${error.message}`, 'ERROR');
    return false;
  }
};

export const startBackupSchedule = () => {
  if (backupTimer) return;
  logActivity('Backup scheduler started (24h interval)');
  backupTimer = setInterval(runBackup, BACKUP_INTERVAL);
};

export const stopBackupSchedule = () => {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
    logActivity('Backup scheduler stopped');
  }
};

export const getSystemStatsForResponse = getSystemStats;
