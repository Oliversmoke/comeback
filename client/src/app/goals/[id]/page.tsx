'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Target, ArrowLeft, Clock, CheckCircle2, Trash2, Plus, HandCoins, Loader2, ExternalLink, Wallet, RefreshCw, ShieldCheck, Shield, Flag, Trophy } from 'lucide-react';
import { goalsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useBalancesStore } from '@/store/balancesStore';
import { isStakingConfigured, stakeGoalWithWallet, verifyMilestoneWithWallet, fetchMilestoneReceipt, fetchGoalStake, completeGoalWithWallet, forfeitGoalWithWallet, goalIdFromObjectId, resolveStakePublicKey, formatStellarBalance } from '@/lib/stellar';
import type { StakeInfo } from '@stakemind/sdk';
import { isFreighterAvailable } from '@/lib/freighter';
import { AnimatedPage, FadeIn } from '@/components/animations/MotionComponents';
import { getCategoryColor, getStatusColor, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Goal, Milestone } from '@/types';

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
  // On-chain milestone verification (MilestoneContract, admin-gated).
  const [verifiedMilestones, setVerifiedMilestones] = useState<Record<string, { timestamp: string }>>({});
  const [verifyingMilestone, setVerifyingMilestone] = useState<string | null>(null);
  // On-chain stake lifecycle (GoalStakingContract, admin-gated finalize).
  const [stakeInfo, setStakeInfo] = useState<StakeInfo | null>(null);
  const [stakeInfoLoading, setStakeInfoLoading] = useState(false);
  const [finalizing, setFinalizing] = useState<'complete' | 'forfeit' | null>(null);
  const [finalizeTx, setFinalizeTx] = useState<{ hash: string } | null>(null);

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

  /**
   * Load on-chain verification receipts for each milestone (MilestoneContract
   * get_receipt). A missing receipt means "not verified on-chain yet" — the
   * contract panics on reads of unverified milestones, so we treat that as
   * unverified rather than an error.
   */
  const loadVerifiedMilestones = async () => {
    if (!goal || !walletKey || !isStakingConfigured()) return;
    const goalId = goalIdFromObjectId(goal._id);
    const receipts: Record<string, { timestamp: string }> = {};
    for (const ms of goal.milestones || []) {
      const milestoneId = ms._id ? goalIdFromObjectId(ms._id) : undefined;
      if (milestoneId === undefined) continue;
      try {
        const receipt = await fetchMilestoneReceipt(goalId, milestoneId, walletKey);
        receipts[ms._id!] = { timestamp: String(receipt.timestamp) };
      } catch {
        // not verified on-chain yet — leave unset
      }
    }
    setVerifiedMilestones(receipts);
  };

  useEffect(() => {
    loadVerifiedMilestones();
  }, [goal?._id, walletKey]);

  /**
   * Load the goal's on-chain stake (GoalStakingContract.get_stake). A missing
   * stake means "not staked on-chain yet" — the contract panics on reads of
   * unstaked goals, so we treat that as unset rather than an error.
   */
  const loadStakeInfo = async () => {
    if (!goal || !walletKey || !isStakingConfigured()) return;
    setStakeInfoLoading(true);
    try {
      const info = await fetchGoalStake(goalIdFromObjectId(goal._id), walletKey);
      setStakeInfo(info);
    } catch {
      setStakeInfo(null); // not staked on-chain yet
    } finally {
      setStakeInfoLoading(false);
    }
  };

  useEffect(() => {
    loadStakeInfo();
  }, [goal?._id, walletKey]);

  /** Verify a milestone on-chain (MilestoneContract.verify_milestone). */
  const handleVerifyMilestone = async (milestone: Milestone) => {
    if (!goal) return;
    if (!milestone._id) return toast.error('This milestone has no id to verify');
    setVerifyingMilestone(milestone._id);
    try {
      if (!isStakingConfigured()) {
        throw new Error('On-chain verification is not live yet — set the NEXT_PUBLIC_*_CONTRACT_ID env vars.');
      }
      const adminKey = await resolveStakePublicKey(user?.stellarPublicKey);
      const { hash } = await verifyMilestoneWithWallet({
        adminPublicKey: adminKey,
        userPublicKey: adminKey,
        goalId: goalIdFromObjectId(goal._id),
        milestoneId: goalIdFromObjectId(milestone._id),
      });
      setVerifiedMilestones((prev) => ({
        ...prev,
        [milestone._id!]: { timestamp: String(Math.floor(Date.now() / 1000)) },
      }));
      toast.success(
        <span>
          Milestone verified on-chain!{' '}
          <a href={`https://stellar.expert/explorer/testnet/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="underline">
            View tx
          </a>
        </span>
      );
    } catch (err) {
      const message =
        (err as any)?.response?.data?.message || (err as Error)?.message || 'Verification failed';
      toast.error(message);
    } finally {
      setVerifyingMilestone(null);
    }
  };

  /** Complete or forfeit the goal on-chain (GoalStakingContract, admin-gated). */
  const handleFinalize = async (action: 'complete' | 'forfeit') => {
    if (!goal) return;
    setFinalizing(action);
    try {
      if (!isStakingConfigured()) {
        throw new Error('On-chain finalization is not live yet — set the NEXT_PUBLIC_*_CONTRACT_ID env vars.');
      }
      const adminKey = await resolveStakePublicKey(user?.stellarPublicKey);
      const { hash } =
        action === 'complete'
          ? await completeGoalWithWallet({ adminPublicKey: adminKey, goalId: goalIdFromObjectId(goal._id) })
          : await forfeitGoalWithWallet({ adminPublicKey: adminKey, goalId: goalIdFromObjectId(goal._id) });
      setFinalizeTx({ hash });
      await loadStakeInfo();
      if (walletKey) fetchBalances(walletKey, { force: true });
      toast.success(
        <span>
          {action === 'complete'
            ? 'Goal completed on-chain! Stake + 10% bonus returned.'
            : 'Goal forfeited on-chain. Stake sent to community pools.'}{' '}
          <a href={`https://stellar.expert/explorer/testnet/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="underline">
            View tx
          </a>
        </span>
      );
    } catch (err) {
      const message =
        (err as any)?.response?.data?.message || (err as Error)?.message || 'Finalization failed';
      toast.error(message);
    } finally {
      setFinalizing(null);
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
      await loadStakeInfo();
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
                      {ms._id && verifiedMilestones[ms._id] && (
                        <span
                          className="flex items-center gap-1 text-xs text-emerald-400 font-medium"
                          title={`Verified on-chain at ${new Date(
                            Number(verifiedMilestones[ms._id].timestamp) * 1000
                          ).toLocaleString()}`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          On-chain
                        </span>
                      )}
                      {ms.completedAt && !verifiedMilestones[ms._id!] && (
                        <span className="text-xs text-dark-400">{formatDate(ms.completedAt)}</span>
                      )}
                      {ms._id && isStakingConfigured() && (
                        <button
                          onClick={() => handleVerifyMilestone(ms)}
                          disabled={verifyingMilestone === ms._id || Boolean(verifiedMilestones[ms._id])}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-dark-600 text-dark-300 hover:text-primary-300 hover:border-primary-400/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          title={
                            verifiedMilestones[ms._id]
                              ? 'Verified on-chain'
                              : 'Verify on-chain (admin-gated — requires the contract admin wallet)'
                          }
                        >
                          {verifyingMilestone === ms._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : verifiedMilestones[ms._id] ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <Shield className="w-3 h-3" />
                          )}
                          {verifyingMilestone === ms._id
                            ? 'Verifying…'
                            : verifiedMilestones[ms._id]
                              ? 'Verified'
                              : 'Verify on-chain'}
                        </button>
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

          <FadeIn>
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold">On-chain status</h3>
              </div>

              {stakeInfoLoading ? (
                <div className="space-y-2">
                  <div className="skeleton h-4 w-3/4 rounded-sm" />
                  <div className="skeleton h-4 w-1/2 rounded-sm" />
                </div>
              ) : !stakeInfo ? (
                walletKey ? (
                  <p className="text-sm text-dark-400">
                    Not staked on-chain yet — stake this goal to lock it in the
                    GoalStaking contract.
                  </p>
                ) : (
                  <p className="text-sm text-dark-400">Connect wallet to view on-chain status.</p>
                )
              ) : stakeInfo.completed ? (
                <div className="text-center py-2">
                  <div className="inline-flex items-center gap-2 text-green-400 font-medium mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Completed on-chain
                  </div>
                  <p className="text-sm text-dark-400 mb-3">
                    Stake + 10% bonus returned to {stakeInfo.user.slice(0, 8)}…{stakeInfo.user.slice(-4)}.
                  </p>
                  {finalizeTx && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${finalizeTx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      View transaction <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ) : stakeInfo.forfeited ? (
                <div className="text-center py-2">
                  <div className="inline-flex items-center gap-2 text-amber-400 font-medium mb-2">
                    <Flag className="w-5 h-5" />
                    Forfeited on-chain
                  </div>
                  <p className="text-sm text-dark-400 mb-3">
                    The stake flowed into community challenge pools.
                  </p>
                  {finalizeTx && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${finalizeTx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      View transaction <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark-400">Staked</span>
                    <span className="font-medium text-emerald-400/90">
                      {formatStellarBalance((Number(stakeInfo.amount) / 1e7).toString())} XLM
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark-400">Staker</span>
                    <span className="font-mono text-xs text-dark-300">
                      {stakeInfo.user.slice(0, 8)}…{stakeInfo.user.slice(-4)}
                    </span>
                  </div>
                  {Number(stakeInfo.deadline) > 0 && (
                    <div className="flex justify-between text-sm mb-3">
                      <span className="text-dark-400">Deadline</span>
                      <span className="font-medium">
                        {formatDate(new Date(Number(stakeInfo.deadline) * 1000).toISOString())}
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-dark-400 mt-3 mb-3">
                    Complete returns the stake plus a 10% bonus; forfeit sends it
                    to community challenge pools. Both are admin-gated — the
                    connected wallet must be the contract admin.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      onClick={() => handleFinalize('complete')}
                      disabled={finalizing !== null || !isStakingConfigured()}
                      whileHover={finalizing === null && isStakingConfigured() ? { scale: 1.02 } : undefined}
                      whileTap={finalizing === null && isStakingConfigured() ? { scale: 0.98 } : undefined}
                      title="Complete on-chain (admin-gated — requires the contract admin wallet)"
                      className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {finalizing === 'complete' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trophy className="w-4 h-4" />
                      )}
                      Complete
                    </motion.button>
                    <motion.button
                      onClick={() => handleFinalize('forfeit')}
                      disabled={finalizing !== null || !isStakingConfigured()}
                      whileHover={finalizing === null && isStakingConfigured() ? { scale: 1.02 } : undefined}
                      whileTap={finalizing === null && isStakingConfigured() ? { scale: 0.98 } : undefined}
                      title="Forfeit on-chain (admin-gated — requires the contract admin wallet)"
                      className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {finalizing === 'forfeit' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Flag className="w-4 h-4" />
                      )}
                      Forfeit
                    </motion.button>
                  </div>
                </>
              )}
            </div>
          </FadeIn>
        </div>
      </div>
    </AnimatedPage>
  );
}
