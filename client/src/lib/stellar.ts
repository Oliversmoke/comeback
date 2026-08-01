/**
 * Client-side Stellar wiring for StakeMind.
 * Builds the SDK from NEXT_PUBLIC_* env vars and drives the wallet stake flow
 * (build XDR → simulate via RPC → sign in Freighter → submit & confirm).
 */
import { StakeMindSDK, type StakeMindSDKConfig, type GroupPool, type MilestoneReceipt } from '@stakemind/sdk';
import { connectFreighter, signFreighterTransaction, getFreighterNetwork } from '@/lib/freighter';

export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

/**
 * Native XLM token contract on Stellar testnet (the SAC for the network's
 * native asset). Override with NEXT_PUBLIC_STAKING_TOKEN when staking a
 * different asset (e.g. USDC).
 */
export const TESTNET_XLM_TOKEN = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

const DEFAULT_RPC = 'https://soroban-testnet.stellar.org';
const DEFAULT_HORIZON = 'https://horizon-testnet.stellar.org';

export const isStakingConfigured = (): boolean => {
  return Boolean(
    process.env.NEXT_PUBLIC_GOAL_STAKING_CONTRACT_ID &&
      process.env.NEXT_PUBLIC_GROUP_ESCROW_CONTRACT_ID &&
      process.env.NEXT_PUBLIC_MILESTONE_CONTRACT_ID
  );
};

export const getStakeMindSDK = (): StakeMindSDK => {
  const goalStakingContractId = process.env.NEXT_PUBLIC_GOAL_STAKING_CONTRACT_ID;
  const groupEscrowContractId = process.env.NEXT_PUBLIC_GROUP_ESCROW_CONTRACT_ID;
  const milestoneContractId = process.env.NEXT_PUBLIC_MILESTONE_CONTRACT_ID;
  if (!goalStakingContractId || !groupEscrowContractId || !milestoneContractId) {
    throw new Error(
      'StakeMind contracts are not configured. Set NEXT_PUBLIC_GOAL_STAKING_CONTRACT_ID, ' +
        'NEXT_PUBLIC_GROUP_ESCROW_CONTRACT_ID and NEXT_PUBLIC_MILESTONE_CONTRACT_ID.'
    );
  }
  const config: StakeMindSDKConfig = {
    networkPassphrase: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || TESTNET_PASSPHRASE,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || DEFAULT_RPC,
    horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL || DEFAULT_HORIZON,
    goalStakingContractId,
    groupEscrowContractId,
    milestoneContractId,
  };
  return new StakeMindSDK(config);
};

/**
 * Stable on-chain goal id (u64) derived from a Mongo ObjectId — the first 15
 * hex chars fit a 60-bit integer, safely inside u64 without float precision
 * loss. Deterministic, so the same app goal always maps to the same stake.
 */
export const goalIdFromObjectId = (objectId: string): number => {
  const hex = objectId.replace(/[^0-9a-fA-F]/g, '').slice(0, 15);
  if (!hex) throw new Error('Invalid goal id');
  return Number(BigInt(`0x${hex}`));
};

/** XLM decimal → stroops as an i128 decimal string (7 decimal places). */
export const xlmToStroops = (amount: string | number): string => {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new Error('Enter an amount greater than 0');
  return BigInt(Math.round(n * 1e7)).toString();
};

export interface StakeResult {
  hash: string;
  result?: unknown;
}

export interface StakeGoalParams {
  publicKey: string;
  goalId: number;
  amountXlm: string;
  token?: string;
  /** Ledger timestamp (unix seconds) after which the goal can be auto-forfeited. */
  deadline?: bigint;
}

/**
 * Full wallet stake flow: build → simulate → Freighter sign → submit.
 * Throws a human-readable error on any step (wallet missing, network
 * mismatch, simulation failure, rejection).
 */
export const stakeGoalWithWallet = async (params: StakeGoalParams): Promise<StakeResult> => {
  const sdk = getStakeMindSDK();
  const token = params.token || TESTNET_XLM_TOKEN;
  const amount = xlmToStroops(params.amountXlm);
  const deadline = params.deadline ?? BigInt(0);

  await assertWalletNetworkMatches(sdk);

  const xdr = sdk.buildStakeGoalXdr(params.publicKey, params.goalId, token, amount, deadline);
  const prepared = await sdk.prepareInvocation(params.publicKey, xdr);
  const signed = await signFreighterTransaction(prepared, sdk.getNetworkPassphrase());
  const result = await sdk.submitAndConfirm(signed);
  return { hash: result.hash, result: result.result };
};

/**
 * Resolve the wallet public key to act from: the logged-in wallet user's key
 * if present, otherwise prompt the user to connect Freighter.
 */
export const resolveStakePublicKey = async (loggedInStellarKey?: string): Promise<string> => {
  if (loggedInStellarKey) return loggedInStellarKey;
  return connectFreighter();
};

/** Shared wallet-network guard for every Soroban write (matches stake flow). */
const assertWalletNetworkMatches = async (sdk: StakeMindSDK): Promise<void> => {
  const walletNetwork = await getFreighterNetwork();
  if (walletNetwork.networkPassphrase !== sdk.getNetworkPassphrase()) {
    throw new Error(
      `Network mismatch: your wallet is on ${walletNetwork.network}, but the contract ` +
        `targets the ${sdk.getNetworkPassphrase()} network. Switch networks in Freighter.`
    );
  }
};

export interface PoolDepositParams {
  publicKey: string;
  groupId: number;
  amountXlm: string;
  token?: string;
}

/**
 * Full wallet deposit flow for the GroupEscrow contract: build → simulate →
 * Freighter sign → submit. User-gated on-chain (any connected wallet can
 * deposit into a pool).
 */
export const depositPoolWithWallet = async (params: PoolDepositParams): Promise<StakeResult> => {
  const sdk = getStakeMindSDK();
  const token = params.token || TESTNET_XLM_TOKEN;
  const amount = xlmToStroops(params.amountXlm);

  await assertWalletNetworkMatches(sdk);

  const xdr = sdk.buildDepositPoolXdr(params.publicKey, params.groupId, token, amount);
  const prepared = await sdk.prepareInvocation(params.publicKey, xdr);
  const signed = await signFreighterTransaction(prepared, sdk.getNetworkPassphrase());
  const result = await sdk.submitAndConfirm(signed);
  return { hash: result.hash, result: result.result };
};

export interface VerifyMilestoneParams {
  adminPublicKey: string;
  userPublicKey: string;
  goalId: number;
  milestoneId: number;
}

/**
 * Full wallet flow for MilestoneContract.verify_milestone — admin-gated
 * on-chain: only the contract's stored admin can verify. The connected wallet
 * must be that admin (surfaces "unauthorized admin" otherwise).
 *
 * Note: the contract records the passed `userPublicKey` as the receipt's
 * user. We pass the acting wallet (the verifier) since the app has no
 * goal-owner → Stellar-key mapping; wire a server-side admin flow later if
 * receipts must record the goal owner instead.
 */
export const verifyMilestoneWithWallet = async (params: VerifyMilestoneParams): Promise<StakeResult> => {
  const sdk = getStakeMindSDK();

  await assertWalletNetworkMatches(sdk);

  const xdr = sdk.buildVerifyMilestoneXdr(
    params.adminPublicKey,
    params.userPublicKey,
    params.goalId,
    params.milestoneId
  );
  const prepared = await sdk.prepareInvocation(params.adminPublicKey, xdr);
  const signed = await signFreighterTransaction(prepared, sdk.getNetworkPassphrase());
  const result = await sdk.submitAndConfirm(signed);
  return { hash: result.hash, result: result.result };
};

/**
 * Read a GroupEscrow pool. `source` is any wallet key used to simulate the
 * read. Throws when the pool has never been created (get_pool panics
 * on-chain) — callers should treat that as "no pool yet".
 */
export const fetchGroupPool = async (groupId: number, source: string): Promise<GroupPool> => {
  const sdk = getStakeMindSDK();
  return sdk.readPool(groupId, source);
};

/**
 * Read a MilestoneContract receipt. Throws when the milestone was never
 * verified on-chain — callers should treat that as "not verified".
 */
export const fetchMilestoneReceipt = async (
  goalId: number,
  milestoneId: number,
  source: string
): Promise<MilestoneReceipt> => {
  const sdk = getStakeMindSDK();
  return sdk.readReceipt(goalId, milestoneId, source);
};

export interface StellarBalances {
  /** Native XLM balance as a decimal string ("0" if absent). */
  xlm: string;
  /** USDC (asset code USDC) balance as a decimal string ("0" if absent). */
  usdc: string;
}

/**
 * Fetch a wallet's XLM and USDC balances from the Horizon accounts endpoint.
 * A single /accounts/{address} call returns every asset balance, so this
 * covers both the native asset and USDC without contract calls. Returns
 * zeros for accounts that have never been funded (Horizon 404).
 */
export const fetchStellarBalances = async (publicKey: string): Promise<StellarBalances> => {
  const horizonUrl = process.env.NEXT_PUBLIC_HORIZON_URL || DEFAULT_HORIZON;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${horizonUrl}/accounts/${publicKey}`, { signal: controller.signal });
    if (res.status === 404) return { xlm: '0', usdc: '0' }; // account not funded yet
    if (!res.ok) throw new Error(`Horizon error ${res.status}`);

    const data = (await res.json()) as {
      balances?: Array<{ asset_type: string; asset_code?: string; balance?: string }>;
    };

    let xlm = '0';
    let usdc = '0';
    for (const b of data.balances ?? []) {
      const balance = b.balance ?? '0';
      if (b.asset_type === 'native') xlm = balance;
      else if (b.asset_code === 'USDC') usdc = balance;
    }
    return { xlm, usdc };
  } finally {
    clearTimeout(timeout);
  }
};

/** Compact balance formatter: up to 4 significant digits, no trailing zeros. */
const stellarBalanceFormatter = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 });
export const formatStellarBalance = (value: string): string => {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '0';
  return stellarBalanceFormatter.format(n);
};
