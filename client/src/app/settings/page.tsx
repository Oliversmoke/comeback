'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, User, Bell, Shield, Palette, LogOut, Image, Upload, Trash2, Target, Brain } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/api';
import { AnimatedPage, FadeIn } from '@/components/animations/MotionComponents';
import { ThemeToggleCard } from '@/components/ui/ThemeToggle';
import MemoryPreferences from '@/components/features/MemoryPreferences';
import { useBranding } from '@/hooks/useBranding';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'branding', label: 'Branding', icon: Image },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'memory', label: 'AI Memory', icon: Brain },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export default function SettingsPage() {
  const { user, setUser, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
  });
  const [saving, setSaving] = useState(false);
  const { logoUrl, backgroundUrl, hasCustomLogo, hasCustomBackground, loading: brandingLoading } = useBranding();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await authAPI.updateProfile(form);
      setUser(data.data);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedPage>
      <FadeIn>
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="page-header">Settings</h1>
              <p className="page-subtitle">Manage your account and preferences</p>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="flex gap-6 flex-col lg:flex-row">
        <div className="lg:w-56 flex-shrink-0">
          <nav className="flex lg:flex-col gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  layout
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                      : 'text-dark-300 hover:text-dark-100 hover:bg-dark-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div layoutId="settingsTab" className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400" />
                  )}
                </motion.button>
              );
            })}
            <motion.button
              onClick={logout}
              whileHover={{ scale: 1.02, x: 3 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all mt-4"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </motion.button>
          </nav>
        </div>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="glass-card p-6"
              >
                <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>
                <form onSubmit={handleSave} className="space-y-5 max-w-lg">
                  <div className="flex items-center gap-4 mb-6">
                    <motion.div
                      className="relative"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    >
                      <img
                        src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=00A8FF&color=fff`}
                        alt=""
                        className="w-20 h-20 rounded-full"
                      />
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-xs text-white">Change</span>
                      </div>
                    </motion.div>
                    <div>
                      <p className="font-medium text-lg">{user?.displayName || user?.username}</p>
                      <p className="text-sm text-dark-400">@{user?.username}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-200 mb-2">Display Name</label>
                    <input
                      type="text"
                      value={form.displayName}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                      className="input-field"
                      placeholder="Your display name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-200 mb-2">Bio</label>
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      className="input-field h-24 resize-none"
                      placeholder="Tell us about yourself..."
                      maxLength={500}
                    />
                    <p className="text-xs text-dark-400 mt-1">{form.bio.length}/500</p>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={saving}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="btn-primary relative overflow-hidden group"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </motion.button>
                </form>
              </motion.div>
            )}

            {activeTab === 'branding' && (
              <motion.div
                key="branding"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="glass-card p-6"
              >
                <h2 className="text-xl font-semibold mb-2">Custom Branding</h2>
                <p className="text-dark-400 mb-6">Upload your own logo and background image. Supported: PNG, JPEG, WebP, GIF (max 5MB).</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-dark-200 mb-3">Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center overflow-hidden shadow-lg flex-shrink-0">
                        {hasCustomLogo ? (
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Target className="w-8 h-8 text-white" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="btn-secondary text-xs px-3 py-1.5 cursor-pointer inline-flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingLogo ? 'Uploading...' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingLogo}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingLogo(true);
                              try {
                                const form = new FormData();
                                form.append('image', file);
                                await api.post('/branding/logo', form, {
                                  headers: { 'Content-Type': 'multipart/form-data' },
                                });
                                toast.success('Logo updated');
                                window.location.reload();
                              } catch { toast.error('Failed to upload logo'); }
                              finally { setUploadingLogo(false); }
                            }}
                          />
                        </label>
                        {hasCustomLogo && (
                          <button
                            onClick={async () => {
                              try {
                                await api.delete('/branding/logo');
                                toast.success('Logo reset to default');
                                window.location.reload();
                              } catch { toast.error('Failed to reset'); }
                            }}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Reset to default
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-200 mb-3">Background Image</label>
                    <div className="space-y-3">
                      <div className="w-full h-24 rounded-xl bg-dark-700/50 border border-dark-600 overflow-hidden flex items-center justify-center">
                        {hasCustomBackground ? (
                          <img src={backgroundUrl} alt="Background" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-dark-500">Default gradient background</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="btn-secondary text-xs px-3 py-1.5 cursor-pointer inline-flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingBg ? 'Uploading...' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingBg}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingBg(true);
                              try {
                                const form = new FormData();
                                form.append('image', file);
                                await api.post('/branding/background', form, {
                                  headers: { 'Content-Type': 'multipart/form-data' },
                                });
                                toast.success('Background updated');
                                window.location.reload();
                              } catch { toast.error('Failed to upload background'); }
                              finally { setUploadingBg(false); }
                            }}
                          />
                        </label>
                        {hasCustomBackground && (
                          <button
                            onClick={async () => {
                              try {
                                await api.delete('/branding/background');
                                toast.success('Background reset to default');
                                window.location.reload();
                              } catch { toast.error('Failed to reset'); }
                            }}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="glass-card p-6"
              >
                <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
                <p className="text-dark-400">Notification settings coming soon.</p>
              </motion.div>
            )}

            {activeTab === 'privacy' && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="glass-card p-6"
              >
                <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>
                <p className="text-dark-400">Privacy settings coming soon.</p>
              </motion.div>
            )}

            {activeTab === 'memory' && (
              <motion.div
                key="memory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <MemoryPreferences />
              </motion.div>
            )}

            {activeTab === 'appearance' && (
              <motion.div
                key="appearance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="glass-card p-6"
              >
                <h2 className="text-xl font-semibold mb-6">Appearance</h2>
                <ThemeToggleCard />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AnimatedPage>
  );
}
