'use client';

import { create } from 'zustand';
import { fetchStellarBalances, type StellarBalances } from '@/lib/stellar';

/** How long a cached balance is considered fresh before a re-fetch (ms). */
const TTL_MS = 30_000;
/** Single shared refresh cadence — one timer serves every wallet badge (ms). */
const REFRESH_MS = 30_000;

interface BalancesEntry {
  balances?: StellarBalances;
  fetchedAt?: number;
  loading: boolean;
  error: boolean;
}

interface BalancesState {
  /** Cached balances keyed by Stellar public key. */
  entries: Record<string, BalancesEntry>;
  /**
   * Fetch (and cache) balances for a public key. Concurrent callers for the
   * same key share one in-flight request; a fresh cache hit resolves without
   * a network call unless `force` is set. Resolves even on failure — read the
   * resulting `entry.error` flag instead of relying on a rejection.
   */
  fetch: (publicKey: string, opts?: { force?: boolean }) => Promise<void>;
}

/** Dedupes concurrent fetches for the same address. */
const inFlight = new Map<string, Promise<void>>();

let intervalId: ReturnType<typeof setInterval> | null = null;
/** One shared timer force-refreshes every known address. Browser-only. */
const ensureRefreshTimer = () => {
  if (intervalId !== null || typeof window === 'undefined') return;
  intervalId = setInterval(() => {
    const { entries, fetch } = useBalancesStore.getState();
    for (const publicKey of Object.keys(entries)) {
      fetch(publicKey, { force: true }).catch(() => {});
    }
  }, REFRESH_MS);
};

export const useBalancesStore = create<BalancesState>()((set, get) => ({
  entries: {},

  fetch: async (publicKey, opts) => {
    const force = opts?.force ?? false;
    const current = get().entries[publicKey];
    const isFresh = Boolean(
      current?.balances && current.fetchedAt && Date.now() - current.fetchedAt < TTL_MS
    );
    if (!force && isFresh) return;

    const pending = inFlight.get(publicKey);
    if (pending) return pending;

    set((s) => ({
      entries: {
        ...s.entries,
        [publicKey]: { ...s.entries[publicKey], loading: true, error: false },
      },
    }));

    const promise = (async () => {
      try {
        const balances = await fetchStellarBalances(publicKey);
        set((s) => ({
          entries: {
            ...s.entries,
            [publicKey]: { balances, fetchedAt: Date.now(), loading: false, error: false },
          },
        }));
      } catch {
        // Keep any previously cached balances on failure.
        set((s) => ({
          entries: {
            ...s.entries,
            [publicKey]: { ...s.entries[publicKey], loading: false, error: true },
          },
        }));
      } finally {
        inFlight.delete(publicKey);
      }
    })();

    inFlight.set(publicKey, promise);
    ensureRefreshTimer();
    return promise;
  },
}));
