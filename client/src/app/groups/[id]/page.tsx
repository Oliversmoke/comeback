'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users, Trophy, Zap, ArrowLeft, Hash, Globe, Lock,
  Calendar, Target, MessageSquare, Crown, Shield, User,
} from 'lucide-react';
import { groupsAPI } from '@/lib/api';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from '@/components/animations/MotionComponents';
import { getCategoryColor, formatTimeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Group, GroupMember } from '@/types';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroup();
  }, [params.id]);

  const loadGroup = async () => {
    try {
      const { data } = await groupsAPI.get(params.id as string);
      setGroup(data.data);
    } catch {
      toast.error('Failed to load group');
      router.push('/groups');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    try {
      await groupsAPI.leave(params.id as string);
      toast.success('Left group');
      router.push('/groups');
    } catch {
      toast.error('Failed to leave group');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) return null;

  const members = (group.members || []) as GroupMember[];

  return (
    <AnimatedPage>
      <FadeIn>
        <button
          onClick={() => router.push('/groups')}
          className="flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Groups
        </button>
      </FadeIn>

      <FadeIn>
        <div className="glass-card p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{group.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`badge ${getCategoryColor(group.category)}`}>{group.category}</span>
                  {group.isPrivate ? (
                    <span className="flex items-center gap-1 text-xs text-dark-400"><Lock className="w-3 h-3" /> Private</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-dark-400"><Globe className="w-3 h-3" /> Public</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={handleLeave} className="btn-secondary text-sm">Leave Group</button>
          </div>

          {group.description && (
            <p className="text-dark-300 mt-4">{group.description}</p>
          )}

          <div className="flex flex-wrap gap-6 mt-6 pt-4 border-t border-dark-700">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-primary-400" />
              <span className="text-dark-400">{members.length} / {group.maxMembers} members</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-dark-400">{group.totalXp} XP</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-dark-400">{group.streak} day streak</span>
            </div>
            {group.inviteCode && (
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-green-400" />
                <span className="text-dark-400">Code: <span className="font-mono text-dark-200">{group.inviteCode}</span></span>
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      <div className="grid lg:grid-cols-2 gap-6">
        <FadeIn>
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-400" /> Members ({members.length})
            </h2>
            <StaggerContainer className="space-y-2">
              {members.map((member) => {
                const userData = typeof member.user === 'object' ? member.user : null;
                return (
                  <StaggerItem key={member.user.toString()}>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white">
                          {userData?.displayName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            {userData?.displayName || 'Unknown'}
                            {member.role === 'admin' && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                            {member.role === 'moderator' && <Shield className="w-3.5 h-3.5 text-blue-400" />}
                          </p>
                          <p className="text-xs text-dark-400">{member.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-dark-400">{member.xpInGroup} XP</p>
                        <p className="text-xs text-dark-500">{formatTimeAgo(member.joinedAt)}</p>
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </FadeIn>

        <FadeIn>
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-400" /> Group Goals ({group.goals?.length || 0})
            </h2>
            {(group.goals && group.goals.length > 0) ? (
              <StaggerContainer className="space-y-2">
                {group.goals.map((goalId: any) => (
                  <StaggerItem key={goalId.toString()}>
                    <div className="p-3 rounded-xl bg-dark-800/50 flex items-center gap-3">
                      <Target className="w-4 h-4 text-primary-400 shrink-0" />
                      <span className="text-sm text-dark-200">{typeof goalId === 'object' ? (goalId as any).title : 'Shared Goal'}</span>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            ) : (
              <p className="text-dark-400 text-sm">No shared goals yet</p>
            )}
          </div>
        </FadeIn>
      </div>
    </AnimatedPage>
  );
}
