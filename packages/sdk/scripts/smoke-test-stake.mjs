#!/usr/bin/env node
/**
 * smoke-test-stake.mjs — End-to-end StakeMind smoke test on Stellar testnet.
 *
 * Flow:
 *   1. Config from env (deployed testnet contract IDs by default).
 *   2. Generate + fund a fresh testnet keypair via friendbot (or reuse
 *      STAKE_SECRET if provided).
 *   3. Build the `stake_goal` invocation with the real SDK
 *      (StakeMindSDK.buildStakeGoalXdr), set the correct account sequence
 *      (the SDK builds with seq 0 — fine for wallets that fix it on sign,
 *      but a server-side keypair must set it explicitly), prepare/simulate,
 *      sign, submit, and confirm.
 *   4. Verify the `goal_staked` event via Soroban RPC `getEvents` — the same
 *      event API the indexer polls — asserting contract ID, topic, goal_id,
 *      and amount.
 *   5. Optional: if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, check
 *      the indexer's `event_log` table for the stake (runs when the indexer
 *      is implemented and pointing at that project).
 *
 * Exit code 0 on success, 1 on failure.
 *
 * Usage:
 *   cd packages/sdk && npm run build   # once, so dist/ is fresh
 *   node scripts/smoke-test-stake.mjs
 *
 * Env overrides (all optional; defaults target the deployed testnet set):
 *   GOAL_STAKING_CONTRACT_ID, GROUP_ESCROW_CONTRACT_ID, MILESTONE_CONTRACT_ID
 *   STAKING_TOKEN, STELLAR_RPC_URL, STELLAR_HORIZON_URL, NETWORK_PASSPHRASE
 *   STAKE_SECRET, GOAL_ID, STAKE_AMOUNT_XLM, DEADLINE, FRIENDBOT_URL
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { randomBytes } from 'node:crypto';
import { StakeMindSDK, signInvocationXdr } from '../dist/index.js';
import { Asset, Keypair, xdr, scValToNative } from '@stellar/stellar-sdk';

const PASSPHRASE = process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = process.env.FRIENDBOT_URL || 'https://friendbot.stellar.org';

// Deployed testnet contracts (see v0.1.0 tag / .env.example).
const GOAL_STAKING = process.env.GOAL_STAKING_CONTRACT_ID || 'CD4IITXUDTML3VGTGK5UBMA4JHYILBDHOVMIDQGH6HUU4FCJRZ6TA2F7';
const GROUP_ESCROW = process.env.GROUP_ESCROW_CONTRACT_ID || 'CCX736W2FX4ETKPBKKXEANQO4KP43FVMKTLFVN3JWDCTIIHDIYCS25PI';
const MILESTONE = process.env.MILESTONE_CONTRACT_ID || 'CDRNQD45NSHVRXYMXCANN7M2W4SIZRLDEW4S4LTUNDI2QAULC7HVYS7T';

// Native XLM SAC on testnet (the default staking token). Computed from the
// asset + passphrase rather than hardcoded, so it can't drift out of date.
const TOKEN = process.env.STAKING_TOKEN || Asset.native().contractId(PASSPHRASE);

const AMOUNT_XLM = Number(process.env.STAKE_AMOUNT_XLM || '5');
const AMOUNT = BigInt(Math.round(AMOUNT_XLM * 1e7)).toString(); // XLM → stroops (i128 decimal string)
const DEADLINE = BigInt(process.env.DEADLINE || '0');
const GOAL_ID = process.env.GOAL_ID ? Number(process.env.GOAL_ID) : randomBytes(4).readUInt32BE(0) + 1;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const log = (msg) => console.log(`[smoke] ${msg}`);
const fail = (msg) => {
  console.error(`[smoke] FAIL: ${msg}`);
  process.exit(1);
};

const sdk = new StakeMindSDK({
  networkPassphrase: PASSPHRASE,
  rpcUrl: RPC_URL,
  horizonUrl: HORIZON_URL,
  goalStakingContractId: GOAL_STAKING,
  groupEscrowContractId: GROUP_ESCROW,
  milestoneContractId: MILESTONE,
});

/** Account from RPC; funds via friendbot if it does not exist yet. */
async function fundedAccount(keypair) {
  const pub = keypair.publicKey();
  try {
    const account = await sdk.rpc.getAccount(pub);
    log(`account already funded: ${pub} (seq ${account.sequenceNumber()})`);
    return account;
  } catch (err) {
    log(`funding ${pub} via friendbot…`);
    const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(pub)}`);
    if (!res.ok) {
      fail(`friendbot funding failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }
    const account = await sdk.rpc.getAccount(pub);
    log(`funded: ${pub} (seq ${account.sequenceNumber()})`);
    return account;
  }
}

/**
 * Set the real account sequence on an SDK-built invocation XDR. The SDK
 * builds with `new Account(source, '0')` (wallets fix the seq at sign time);
 * a server-side keypair needs the live sequence before prepare+submit.
 *
 * On testnet, a freshly friendbot-funded account's Horizon/RPC sequence is
 * one behind the sequence the network accepts for the next transaction, so
 * we add 1 (verified empirically: seq rejected with txBadSeq, seq+1 settles).
 * The same +1 is applied when STAKE_SECRET reuses an existing account.
 */
function fixSequence(xdrBase64, sequenceNumber) {
  const envelope = xdr.TransactionEnvelope.fromXDR(xdrBase64, 'base64');
  const tx = envelope.v1().tx();
  tx.seqNum(xdr.SequenceNumber.fromString(sequenceNumber));
  return envelope.toXDR('base64').toString();
}

/** Scan RPC events for our goal_staked event (the indexer's data source). */
async function findStakedEvent(startLedger, goalId, amount, maxTries = 15) {
  for (let i = 0; i < maxTries; i++) {
    try {
      const res = await sdk.rpc.getEvents({
        startLedger,
        filters: [{ type: 'contract', contractIds: [GOAL_STAKING] }],
        pagination: { limit: 20 },
      });
      const hit = (res.events || []).find((evt) => {
        if (evt.inSuccessfulContractCall === false) return false;
        if (evt.contractId.toString() !== GOAL_STAKING) return false;
        const topic = (evt.topic || []).map((t) => scValToNative(t));
        if (topic[0] !== 'goal_staked') return false;
        if (BigInt(topic[1]) !== BigInt(goalId)) return false;
        return BigInt(scValToNative(evt.value)) === BigInt(amount);
      });
      if (hit) return hit;
    } catch (err) {
      log(`getEvents attempt ${i + 1} errored: ${err.message}`);
    }
    await sleep(2000);
  }
  return undefined;
}

/** Optional indexer-DB verification: check Supabase event_log for the stake. */
async function checkSupabaseEvent(goalId, hash) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    log('Supabase event_log check skipped (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set).');
    return;
  }
  try {
    const res = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/event_log?goal_id=eq.${goalId}&select=*`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    if (!res.ok) {
      log(`event_log query failed (${res.status}) — indexer may not be running.`);
      return;
    }
    const rows = await res.json();
    if (rows.length === 0) {
      log('event_log has no rows for this goal yet — indexer may be lagging or not running.');
    } else {
      log(`event_log row found: ${JSON.stringify(rows[0])}`);
    }
  } catch (err) {
    log(`event_log check errored: ${err.message}`);
  }
}

async function main() {
  log(`goalId=${GOAL_ID} amount=${AMOUNT} stroops (${AMOUNT_XLM} XLM) deadline=${DEADLINE}`);
  log(`goal-staking contract: ${GOAL_STAKING}`);
  log(`token: ${TOKEN}`);

  const secret = process.env.STAKE_SECRET;
  const keypair = secret ? Keypair.fromSecret(secret) : Keypair.random();
  const account = await fundedAccount(keypair);
  const pub = keypair.publicKey();

  // 1. Build + fix sequence + prepare + sign + submit. The friendbot-funded
  //    account's reported sequence needs +1 to be accepted by testnet (see
  //    fixSequence docs; verified empirically — plain seq fails with txBadSeq).
  const seq = (BigInt(account.sequenceNumber()) + 1n).toString();
  const rawXdr = sdk.buildStakeGoalXdr(pub, GOAL_ID, TOKEN, AMOUNT, DEADLINE);
  const fixedXdr = fixSequence(rawXdr, seq);
  const prepared = await sdk.prepareInvocation(pub, fixedXdr);
  const signed = signInvocationXdr(prepared, keypair.secret(), PASSPHRASE);

  const latestLedger = await sdk.rpc.getLatestLedger();
  const startLedger = latestLedger.sequence;

  log('submitting stake_goal…');
  const { hash, status, result } = await sdk.submitAndConfirm(signed);
  log(`tx ${status}: ${hash}`);
  log(`stellar.expert: https://stellar.expert/explorer/testnet/tx/${hash}`);
  if (result !== undefined) log(`contract result: ${JSON.stringify(result)}`);

  // 2. Verify the event via Soroban RPC (the indexer's source of truth).
  const evt = await findStakedEvent(startLedger, GOAL_ID, AMOUNT);
  if (!evt) {
    fail(`goal_staked event for goal ${GOAL_ID} not found in RPC events (ledger ${startLedger}+)`);
  }
  // Strongest verification: the event must have come from OUR transaction.
  if (String(evt.txHash) !== hash) {
    fail(`goal_staked event tx ${evt.txHash} does not match submitted tx ${hash}`);
  }
  log(`goal_staked event verified: ${JSON.stringify({
    ledger: evt.ledger,
    txHash: evt.txHash,
    contract: evt.contractId.toString(),
    topic: (evt.topic || []).map((t) => String(scValToNative(t))),
    value: scValToNative(evt.value).toString(),
  })}`);

  // 3. Read the stake back from the contract (optional sanity check).
  const stake = await sdk.readStake(GOAL_ID, pub);
  log(`get_stake: user=${stake.user} amount=${stake.amount} deadline=${stake.deadline} completed=${stake.completed} forfeited=${stake.forfeited}`);
  if (stake.user !== pub || BigInt(stake.amount) !== BigInt(AMOUNT)) {
    fail('on-chain stake does not match the submitted stake');
  }

  // 4. Optional indexer-DB check.
  await checkSupabaseEvent(GOAL_ID, hash);

  log('PASS — stake submitted and goal_staked event verified via RPC.');
}

main().catch((err) => {
  console.error(`[smoke] FATAL: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
