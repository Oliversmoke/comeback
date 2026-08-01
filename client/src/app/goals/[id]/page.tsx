'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Target, ArrowLeft, Clock, CheckCircle2, Trash2, Plus, HandCoins, Loader2, ExternalLink, Wallet, RefreshCw } from 'lucide-react';
import { goalsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useBalancesStore } from '@/store/balancesStore';
import { isStakingConfigured, stakeGoalWithWallet, goalIdFromObjectId, resolveStakePublicKey, formatStellarBalance } from '@/lib/stellar';
import { isFreighterAvailable } from '@/lib/freighter';
import { AnimatedPage, FadeIn } from '@/components/animations/MotionComponents';
import { getCategoryColor, getStatusColor, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Goal } from '@/types';

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const walletKey = user?.stellarPublicKey;
  const walletEntry = useBalancesStore((s) => (walletKey ? s.entries[walletKey] : undefined));
  const fetchBalances = useBalancesStore((s) => s.fetch);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [staking, setStaking] = useState(false);
  const [stakeTx, setStakeTx] = useState<{ hash: string } | null>(null);

  useEffect(() => {
    loadGoal();
  }, [params.id]);

  // Ensure the shared balances store has this wallet's balance (the store
  // dedupes requests and owns the refresh timer, so this never duplicates
  // the Sidebar/Navbar badge fetches).
  useEffect(() => {
    if (walletKey) fetchBalances(walletKey);
  }, [walletKey, fetchBalances]);

  const loadGoal = async () => {
    try {
      const { data } = await goalsAPI.get(params.id as string);
      setGoal(data.data);
    } catch {
      toast.error('Goal not found');
      router.push('/goals');
    } finally {
      setLoading(false);
    }
  };

  const toggleMilestone = async (milestoneId: string) => {
    try {
      const { data } = await goalsAPI.toggleMilestone(goal!._id, milestoneId);
      setGoal(data.data);
    } catch {
      toast.error('Failed to update milestone');
    }
  };

  const addMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim()) return;
    try {
      const { data } = await goalsAPI.addMilestone(goal!._id, milestoneTitle);
      setGoal(data.data);
      setMilestoneTitle('');
      toast.success('Milestone added');
    } catch {
      toast.error('Failed to add milestone');
    }
  };

  const deleteGoal = async () => {
    if (!confirm('Delete this goal?')) return;
    try {
      await goalsAPI.delete(goal!._id);
      toast.success('Goal deleted');
      router.push('/goals');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleStake = async () => {
    if (!goal) return;
    const amount = Number(stakeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return toast.error('Enter a stake amount greater than 0');
    }
    if (walletKey && walletEntry?.balances && amount > Number(walletEntry.balances.xlm)) {
      return toast.error(
        `Insufficient XLM balance — you have ${formatStellarBalance(walletEntry.balances.xlm)} XLM available`
      );
    }
    setStaking(true);
    try {
      if (!isStakingConfigured()) {
        throw new Error('Staking is not live yet — deploy the contracts and set the NEXT_PUBLIC_*_CONTRACT_ID env vars.');
      }
      const publicKey = await resolveStakePublicKey(user?.stellarPublicKey);
      // Only set an on-chain auto-forfeit deadline when the target date is in
      // the future — a past deadline would let anyone forfeit the stake.
      const deadline =
        goal.targetDate && new Date(goal.targetDate).getTime() > Date.now()
          ? BigInt(Math.floor(new Date(goal.targetDate).getTime() / 1000))
          : BigInt(0);
      const { hash } = await stakeGoalWithWallet({
        publicKey,
        goalId: goalIdFromObjectId(goal._id),
        amountXlm: stakeAmount,
        deadline,
      });
      setStakeTx({ hash });
      toast.success('Goal staked on-chain!');
    } catch (err) {
      const message =
        (err as any)?.response?.data?.message || (err as Error)?.message || 'Stake failed';
      toast.error(message);
    } finally {
      setStaking(false);
    }
  };

  const refreshWalletBalance = async () => {
    if (refreshingBalance || !walletKey) return;
    setRefreshingBalance(true);
    await fetchBalances(walletKey, { force: true });
    setRefreshingBalance(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!goal) return null;

  return (
    <AnimatedPage>
      <FadeIn>
        <button
          onClick={() => router.push('/goals')}
          className="flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Goals
        </button>
      </FadeIn>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FadeIn>
            <div className="glass-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${getCategoryColor(goal.category)}`}>{goal.category}</span>
                    <span className={`badge ${getStatusColor(goal.status)}`}>{goal.status}</span>
                  </div>
                  <h1 className="text-2xl font-bold">{goal.title}</h1>
                  {goal.description && (
                    <p className="text-dark-400 mt-2">{goal.description}</p>
                  )}
                </div>
                <button
                  onClick={deleteGoal}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm text-dark-400 mb-1">
                  <span>Progress</span>
                  <span>{goal.progress}%</span>
                </div>
                <div className="xp-bar h-3">
                  <motion.div
                    className="xp-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-dark-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Created {formatDate(goal.createdAt)}
                </div>
                {goal.targetDate && (
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    Due {formatDate(goal.targetDate)}
                  </div>
                )}
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary-400" />
                Milestones
              </h2>

              <form onSubmit={addMilestone} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="Add a milestone..."
                  className="input-field flex-1"
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
              </form>

              <div className="space-y-2">
                {goal.milestones?.length === 0 ? (
                  <p className="text-dark-400 text-sm text-center py-4">No milestones yet</p>
                ) : (
                  goal.milestones?.map((ms) => (
                    <motion.div
                      key={ms._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-700/30 transition-all"
                    >
                      <button
                        onClick={() => toggleMilestone(ms._id!)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          ms.isCompleted
                            ? 'bg-green-500 border-green-500'
                            : 'border-dark-400 hover:border-primary-400'
                        }`}
                      >
                        {ms.isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </button>
                      <span className={`text-sm flex-1 ${ms.isCompleted ? 'line-through text-dark-400' : ''}`}>
                        {ms.title}
                      </span>
                      {ms.completedAt && (
                        <span className="text-xs text-dark-400">{formatDate(ms.completedAt)}</span>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </FadeIn>
        </div>

        <div className="space-y-6">
          <FadeIn>
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3">Quick Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Priority</span>
                  <span className="font-medium capitalize">{goal.priority}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Milestones</span>
                  <span className="font-medium">
                    {goal.milestones?.filter((m) => m.isCompleted).length || 0}/{goal.milestones?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">XP Awarded</span>
                  <span className="font-medium text-purple-400">{goal.xpAwarded || 0} XP</span>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <HandCoins className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold">Stake this goal</h3>
              </div>

              {stakeTx ? (
                <div className="text-center py-2">
                  <div className="inline-flex items-center gap-2 text-green-400 font-medium mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Goal staked on-chain
                  </div>
                  <p className="text-sm text-dark-400 mb-3">
                    {goal.title} is locked in the GoalStaking contract.
                  </p>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${stakeTx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    View transaction <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <>
                  {!isStakingConfigured() && (
                    <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mb-3">
                      Staking isn't live yet — the Soroban contracts need to be
                      deployed and the NEXT_PUBLIC_*_CONTRACT_ID env vars set.
                    </p>
                  )}

                  <div className="relative mb-2">
                    <input
                      type="number"
                      min="0"
                      step="0.0000001"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={!isStakingConfigured() || staking}
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

                  {walletKey && walletEntry?.balances && stakeAmount &&
                    Number(stakeAmount) > Number(walletEntry.balances.xlm) && (
                      <p className="text-xs text-red-400/90 mb-3">
                        Insufficient balance — you have{' '}
                        {formatStellarBalance(walletEntry.balances.xlm)} XLM available.
                      </p>
                    )}

                  <p className="text-xs text-dark-400 mb-4">
                    Your stake is locked in the GoalStaking contract — complete
                    the goal to get it back plus a 10% bonus; miss the deadline
                    and it flows into community challenge pools.
                  </p>

                  <motion.button
                    onClick={handleStake}
                    disabled={!isStakingConfigured() || staking || !stakeAmount}
                    whileHover={isStakingConfigured() && !staking && stakeAmount ? { scale: 1.02 } : undefined}
                    whileTap={isStakingConfigured() && !staking && stakeAmount ? { scale: 0.98 } : undefined}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {staking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing & submitting…
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4" />
                        {user?.stellarPublicKey
                          ? 'Stake this goal'
                          : isFreighterAvailable()
                            ? 'Connect wallet & stake'
                            : 'Install Freighter to stake'}
                      </>
                    )}
                  </motion.button>
                </>
              )}
            </div>
          </FadeIn>
        </div>
      </div>
    </AnimatedPage>
  );
}
