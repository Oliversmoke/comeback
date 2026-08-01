'use client';

import { useEffect, useState } from 'react';
import { Wallet, Copy, Check, LogOut, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useBalancesStore } from '@/store/balancesStore';
import { formatStellarBalance } from '@/lib/stellar';

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

interface WalletBadgeProps {
  address: string;
  /** Show the full address (used in Settings). Defaults to truncated. */
  full?: boolean;
  /** Show a "Disconnect" action that calls onDisconnect (logout). */
  showDisconnect?: boolean;
  onDisconnect?: () => void;
  /** Fetch and show XLM/USDC balances from Horizon (auto-refreshed). Defaults to true. */
  showBalances?: boolean;
  className?: string;
}

export default function WalletBadge({
  address,
  full,
  showDisconnect,
  onDisconnect,
  showBalances = true,
  className,
}: WalletBadgeProps) {
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const entry = useBalancesStore((s) => s.entries[address]);
  const fetchBalances = useBalancesStore((s) => s.fetch);
  const balances = showBalances ? entry?.balances : undefined;
  // Only hide the line when the initial load failed; refresh failures keep
  // the previously cached balances on screen.
  const failed = Boolean(showBalances && entry?.error && !entry?.balances);

  // Ensure a fetch exists for this address. The store dedupes concurrent
  // callers (Sidebar + Navbar badges share one request) and owns the refresh
  // timer, so each badge just subscribes to the shared entry.
  useEffect(() => {
    if (!showBalances) return;
    fetchBalances(address);
  }, [address, showBalances, fetchBalances]);

  const copyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Wallet address copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy address');
    }
  };

  const refreshBalances = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchBalances(address, { force: true });
      const latest = useBalancesStore.getState().entries[address];
      if (latest?.error) toast.error('Failed to refresh balances');
      else toast.success('Balances refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-300">
          <Wallet className="w-3.5 h-3.5 flex-shrink-0" />
          <span
            className={cn('font-mono', full ? 'text-sm break-all' : 'text-xs truncate')}
            title={address}
          >
            {full ? address : truncateAddress(address)}
          </span>
          <button
            onClick={copyAddress}
            className="text-dark-400 hover:text-primary-300 transition-colors flex-shrink-0"
            title="Copy address"
            aria-label="Copy wallet address"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        {showBalances && !failed && (
          <span className="flex items-center gap-1 pl-1">
            {balances ? (
              <>
                <span
                  className="text-[10px] text-dark-400"
                  title="Stellar balances (via Horizon)"
                >
                  {formatStellarBalance(balances.xlm)} XLM · {formatStellarBalance(balances.usdc)} USDC
                </span>
                <button
                  onClick={refreshBalances}
                  disabled={refreshing}
                  className="text-dark-400 hover:text-primary-300 transition-colors flex-shrink-0"
                  title="Refresh balances"
                  aria-label="Refresh balances"
                >
                  <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
                </button>
              </>
            ) : (
              <span
                className="skeleton h-2.5 w-24 rounded-sm"
                title="Loading balances"
                aria-hidden="true"
              />
            )}
          </span>
        )}
      </div>
      {showDisconnect && onDisconnect && (
        <button
          onClick={onDisconnect}
          className="flex items-center gap-1 text-xs text-dark-400 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          Disconnect
        </button>
      )}
    </div>
  );
}
