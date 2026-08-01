import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchStellarBalances } from '@/lib/stellar';
import { useBalancesStore } from '@/store/balancesStore';
import type { StellarBalances } from '@/lib/stellar';

// Auto-mock the whole stellar lib — the store only depends on
// fetchStellarBalances, which we control per-test.
vi.mock('@/lib/stellar');

const fetchMock = vi.mocked(fetchStellarBalances);

const ADDRESS = 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ';

const balance = (xlm: string, usdc = '0'): StellarBalances => ({ xlm, usdc });

describe('balancesStore', () => {
  beforeEach(() => {
    useBalancesStore.setState({ entries: {} });
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches and caches balances for an address', async () => {
    fetchMock.mockResolvedValue(balance('10.5'));
    const store = useBalancesStore.getState();

    await store.fetch(ADDRESS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const entry = useBalancesStore.getState().entries[ADDRESS];
    expect(entry?.balances).toEqual(balance('10.5'));
    expect(entry?.loading).toBe(false);
    expect(entry?.error).toBe(false);
  });

  it('serves fresh cache hits within the TTL without another network call', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    fetchMock.mockResolvedValue(balance('10'));
    const store = useBalancesStore.getState();

    await store.fetch(ADDRESS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Immediately after, still within TTL (30s) — must hit the cache.
    await store.fetch(ADDRESS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('re-fetches once the cached entry is older than the TTL', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    fetchMock.mockResolvedValue(balance('10'));
    const store = useBalancesStore.getState();

    await store.fetch(ADDRESS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Advance past the 30s TTL and fetch again — must hit the network.
    vi.advanceTimersByTime(31_000);
    await store.fetch(ADDRESS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('dedupes concurrent fetches for the same address into one request', async () => {
    let resolveFetch!: (b: StellarBalances) => void;
    fetchMock.mockImplementation(
      () => new Promise<StellarBalances>((resolve) => { resolveFetch = resolve; })
    );
    const store = useBalancesStore.getState();

    // Two concurrent callers (e.g. Sidebar + Navbar badges mounting together).
    const first = store.fetch(ADDRESS);
    const second = store.fetch(ADDRESS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch(balance('7'));
    await Promise.all([first, second]);

    const entry = useBalancesStore.getState().entries[ADDRESS];
    expect(entry?.balances).toEqual(balance('7'));
    expect(entry?.loading).toBe(false);
  });

  it('force-refreshes even when the cache is still fresh', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    fetchMock.mockResolvedValueOnce(balance('10')).mockResolvedValueOnce(balance('12'));
    const store = useBalancesStore.getState();

    await store.fetch(ADDRESS);
    expect(useBalancesStore.getState().entries[ADDRESS]?.balances).toEqual(balance('10'));

    // Same tick — still within TTL — but force bypasses the cache.
    await store.fetch(ADDRESS, { force: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(useBalancesStore.getState().entries[ADDRESS]?.balances).toEqual(balance('12'));
  });

  it('keeps previously cached balances and flags an error when a refresh fails', async () => {
    fetchMock.mockResolvedValueOnce(balance('20')).mockRejectedValueOnce(new Error('Horizon down'));
    const store = useBalancesStore.getState();

    await store.fetch(ADDRESS);
    expect(useBalancesStore.getState().entries[ADDRESS]?.balances).toEqual(balance('20'));

    // Store never rejects — the failure is surfaced through the entry flags.
    await store.fetch(ADDRESS, { force: true });
    const entry = useBalancesStore.getState().entries[ADDRESS];
    expect(entry?.balances).toEqual(balance('20'));
    expect(entry?.error).toBe(true);
    expect(entry?.loading).toBe(false);
  });

  it('flags an error without balances when the very first fetch fails', async () => {
    fetchMock.mockRejectedValue(new Error('Horizon down'));
    const store = useBalancesStore.getState();

    await store.fetch(ADDRESS);

    const entry = useBalancesStore.getState().entries[ADDRESS];
    expect(entry?.balances).toBeUndefined();
    expect(entry?.error).toBe(true);
    expect(entry?.loading).toBe(false);
  });
});
