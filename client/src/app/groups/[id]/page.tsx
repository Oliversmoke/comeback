'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users, Trophy, Zap, ArrowLeft, Hash, Globe, Lock,
  Calendar, Target, MessageSquare, Crown, Shield, User,
  HandCoins, Wallet, Loader2, ExternalLink, RefreshCw, CheckCircle2,
} from 'lucide-react';
import { groupsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useBalancesStore } from '@/store/balancesStore';
import {
  isStakingConfigured,
  depositPoolWithWallet,
  fetchGroupPool,
  goalIdFromObjectId,
  resolveStakePublicKey,
  formatStellarBalance,
} from '@/lib/stellar';
import { isFreighterAvailable } from '@/lib/freighter';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from '@/components/animations/MotionComponents';
import { getCategoryColor, formatTimeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Group, GroupMember } from '@/types';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const walletKey = user?.stellarPublicKey;
  const walletEntry = useBalancesStore((s) => (walletKey ? s.entries[walletKey] : undefined));
  const fetchBalances = useBalancesStore((s) => s.fetch);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  // Community pool (GroupEscrow contract)
  const [pool, setPool] = useState<{ totalBalance: string; memberCount: number } | null>(null);
  const [poolState, setPoolState] = useState<'idle' | 'loading' | 'missing' | 'error'>('idle');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [poolTx, setPoolTx] = useState<{ hash: string } | null>(null);

  useEffect(() => {
    loadGroup();
  }, [params.id]);

  useEffect(() => {
    if (walletKey) fetchBalances(walletKey);
  }, [walletKey, fetchBalances]);

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

  const groupId = group ? goalIdFromObjectId(group._id) : 0;

  const loadPool = async () => {
    if (!group || !walletKey) {
      setPool(null);
      setPoolState('idle');
      return;
    }
    setPoolState('loading');
    try {
      const p = await fetchGroupPool(groupId, walletKey);
      setPool({ totalBalance: p.total_balance, memberCount: p.member_count });
      setPoolState('idle');
    } catch (err) {
      // get_pool panics on-chain when the pool has never been created.
      if (String((err as Error)?.message).includes('failed to simulate')) {
        setPool(null);
        setPoolState('missing');
      } else {
        setPoolState('error');
      }
    }
  };

  useEffect(() => {
    loadPool();
  }, [group?._id, walletKey]);

  const handleDeposit = async () => {
    if (!group) return;
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return toast.error('Enter a deposit amount greater than 0');
    }
    if (walletKey && walletEntry?.balances && amount > Number(walletEntry.balances.xlm)) {
      return toast.error(
        `Insufficient XLM balance — you have ${formatStellarBalance(walletEntry.balances.xlm)} XLM available`
      );
    }
    setDepositing(true);
    try {
      if (!isStakingConfigured()) {
        throw new Error('On-chain pools are not live yet — set the NEXT_PUBLIC_*_CONTRACT_ID env vars.');
      }
      const publicKey = await resolveStakePublicKey(user?.stellarPublicKey);
      const { hash } = await depositPoolWithWallet({
        publicKey,
        groupId,
        amountXlm: depositAmount,
      });
      setPoolTx({ hash });
      setDepositAmount('');
      toast.success('Deposited to the community pool on-chain!');
      loadPool();
    } catch (err) {
      const message =
        (err as any)?.response?.data?.message || (err as Error)?.message || 'Deposit failed';
      toast.error(message);
    } finally {
      setDepositing(false);
    }
  };

  const refreshWalletBalance = async () => {
    if (refreshingBalance || !walletKey) return;
    setRefreshingBalance(true);
    await fetchBalances(walletKey, { force: true });
    setRefreshingBalance(false);
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

      <FadeIn>
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <HandCoins className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold">Community Pool</h3>
          </div>

          {poolTx ? (
            <div className="text-center py-2">
              <div className="inline-flex items-center gap-2 text-green-400 font-medium mb-2">
                <CheckCircle2 className="w-5 h-5" />
                Deposited to the pool on-chain
              </div>
              <p className="text-sm text-dark-400 mb-3">
                Tokens are locked in the GroupEscrow contract until a prize is distributed.
              </p>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${poolTx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                View transaction <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <>
              {/* Pool status */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-dark-800/50 p-3">
                  <p className="text-xs text-dark-400 mb-1">Pool balance</p>
                  {poolState === 'loading' ? (
                    <div className="skeleton inline-block h-4 w-16 rounded-sm" />
                  ) : poolState === 'error' ? (
                    <span className="text-sm text-red-400">unavailable</span>
                  ) : pool ? (
                    <p className="font-semibold text-emerald-400">
                      {/* total_balance is an i128 stroops string — convert to XLM. */}
                      {formatStellarBalance((Number(pool.totalBalance) / 1e7).toString())} XLM
                    </p>
                  ) : !walletKey ? (
                    <span className="text-sm text-dark-400">connect wallet to view</span>
                  ) : (
                    <p className="text-sm text-dark-400">No pool yet</p>
                  )}
                </div>
                <div className="rounded-xl bg-dark-800/50 p-3">
                  <p className="text-xs text-dark-400 mb-1">Contributors</p>
                  {poolState === 'loading' ? (
                    <div className="skeleton inline-block h-4 w-10 rounded-sm" />
                  ) : pool ? (
                    <p className="font-semibold">{pool.memberCount}</p>
                  ) : (
                    <p className="text-sm text-dark-400">—</p>
                  )}
                </div>
              </div>

              {!isStakingConfigured() && (
                <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mb-3">
                  On-chain pools aren't live yet — the Soroban contracts need to be
                  deployed and the NEXT_PUBLIC_*_CONTRACT_ID env vars set.
                </p>
              )}

              <div className="relative mb-2">
                <input
                  type="number"
                  min="0"
                  step="0.0000001"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={!isStakingConfigured() || depositing}
                  className="input-field pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-dark-400">
                  XLM
                </span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs text-dark-400">
                  Available:
                  {walletKey ? (
                    walletEntry?.balances ? (
                      <span className="font-medium text-emerald-400/90">
                        {formatStellarBalance(walletEntry.balances.xlm)} XLM
                      </span>
                    ) : walletEntry?.error ? (
                      <span className="text-dark-500">unavailable</span>
                    ) : (
                      <span className="skeleton inline-block h-2.5 w-16 rounded-sm" />
                    )
                  ) : (
                    <span className="text-dark-500">— connect wallet to view balance</span>
                  )}
                </span>
                {walletKey && (
                  <button
                    onClick={refreshWalletBalance}
                    className="text-dark-400 hover:text-primary-300 transition-colors flex-shrink-0"
                    title="Refresh balance"
                    aria-label="Refresh balance"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${refreshingBalance ? 'animate-spin' : ''}`}
                    />
                  </button>
                )}
              </div>

              <p className="text-xs text-dark-400 mb-4">
                Pooled tokens are held by the GroupEscrow contract. When the group
                reaches a milestone, an admin can distribute the pool as a prize.
              </p>

              <motion.button
                onClick={handleDeposit}
                disabled={!isStakingConfigured() || depositing || !depositAmount}
                whileHover={isStakingConfigured() && !depositing && depositAmount ? { scale: 1.02 } : undefined}
                whileTap={isStakingConfigured() && !depositing && depositAmount ? { scale: 0.98 } : undefined}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {depositing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing & submitting…
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    {user?.stellarPublicKey
                      ? 'Deposit to pool'
                      : isFreighterAvailable()
                        ? 'Connect wallet & deposit'
                        : 'Install Freighter to deposit'}
                  </>
                )}
              </motion.button>
            </>
          )}
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
