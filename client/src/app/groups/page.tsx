'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Hash, Lock, Globe, Trophy } from 'lucide-react';
import { groupsAPI } from '@/lib/api';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from '@/components/animations/MotionComponents';
import { getCategoryColor, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Group } from '@/types';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', description: '', category: 'other' });

  useEffect(() => { loadGroups(); }, []);

  const loadGroups = async () => {
    try {
      const [allRes, myRes] = await Promise.all([groupsAPI.list({ limit: '30' }), groupsAPI.getMy()]);
      setGroups(allRes.data.data);
      setMyGroups(myRes.data.data);
    } catch { toast.error('Failed to load groups'); }
    finally { setLoading(false); }
  };

  const joinGroup = async () => {
    if (!inviteCode) return toast.error('Enter invite code');
    try {
      await groupsAPI.join(inviteCode);
      toast.success('Joined group!');
      setInviteCode('');
      loadGroups();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid code');
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await groupsAPI.create(createForm);
      toast.success('Group created!');
      setShowCreate(false);
      setCreateForm({ name: '', description: '', category: 'other' });
      loadGroups();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create');
    }
  };

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatedPage>
      <FadeIn>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Groups</h1>
            <p className="text-dark-400 text-sm mt-1">Collaborate and grow together</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Group
            </button>
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="input-field py-2 text-sm w-32"
            />
            <button onClick={joinGroup} className="btn-secondary text-sm py-2">Join</button>
          </div>
        </div>
      </FadeIn>

      {/* Create Group Modal */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowCreate(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="glass-card p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Create Group</h2>
            <form onSubmit={createGroup} className="space-y-4">
              <input
                type="text"
                placeholder="Group name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="input-field"
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="input-field h-20 resize-none"
              />
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                className="input-field"
              >
                {['fitness', 'learning', 'career', 'finance', 'health', 'social', 'creative', 'productivity', 'other'].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* My Groups */}
      {myGroups.length > 0 && (
        <FadeIn>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary-400" />
            My Groups
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {myGroups.map((group) => (
              <Link key={group._id} href={`/groups/${group._id}`}>
                <motion.div
                  whileHover={{ y: -2 }}
                  className="glass-card-hover p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{group.name}</h3>
                      <span className={`badge ${getCategoryColor(group.category)}`}>{group.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-dark-400">
                    <span>{group.memberCount || group.members?.length || 0} members</span>
                    <span className="text-purple-400">{group.totalXp || 0} XP</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </FadeIn>
      )}

      {/* All Groups */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.filter((g) => !myGroups.find((mg) => mg._id === g._id)).map((group) => (
            <StaggerItem key={group._id}>
              <Link href={`/groups/${group._id}`}>
                <motion.div
                  whileHover={{ y: -2 }}
                  className="glass-card-hover p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center">
                      {group.isPrivate ? <Lock className="w-6 h-6 text-dark-400" /> : <Globe className="w-6 h-6 text-primary-400" />}
                    </div>
                    <div>
                      <h3 className="font-semibold">{group.name}</h3>
                      <span className={`badge ${getCategoryColor(group.category)}`}>{group.category}</span>
                    </div>
                  </div>
                  {group.description && (
                    <p className="text-sm text-dark-400 line-clamp-2 mb-3">{group.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-dark-400">
                    <span>{group.memberCount || 0} members</span>
                    <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {group.totalXp || 0} XP</span>
                  </div>
                </motion.div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </AnimatedPage>
  );
}
