/**
 * smoke-helpers.mjs — shared helpers for the StakeMind E2E smoke tests
 * (smoke-test-stake.mjs and smoke-test-stake-usdc.mjs).
 */
import { xdr, scValToNative } from '@stellar/stellar-sdk';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Logger with a per-script prefix and a fail() that exits 1. */
export const makeLogger = (prefix) => {
  const log = (msg) => console.log(`[${prefix}] ${msg}`);
  const fail = (msg) => {
    console.error(`[${prefix}] FAIL: ${msg}`);
    process.exit(1);
  };
  return { log, fail };
};

/**
 * Set the real account sequence on an SDK-built invocation XDR. The SDK
 * builds with `new Account(source, '0')` (wallets fix the seq at sign time);
 * a server-side keypair needs the live sequence before prepare+submit.
 *
 * On testnet, a freshly friendbot-funded account's Horizon/RPC sequence is
 * one behind the sequence the network accepts for the next transaction, so
 * we add 1 (verified empirically: seq rejected with txBadSeq, seq+1 settles).
 */
export function fixSequence(xdrBase64, sequenceNumber) {
  const envelope = xdr.TransactionEnvelope.fromXDR(xdrBase64, 'base64');
  const tx = envelope.v1().tx();
  tx.seqNum(xdr.SequenceNumber.fromString(sequenceNumber));
  return envelope.toXDR('base64').toString();
}

/**
 * Account from RPC; funds via friendbot if it does not exist yet. Friendbot
 * rate-limits per IP and shared egress pools (e.g. GitHub runners) can flake,
 * so retry a few times with backoff before giving up.
 */
export async function fundedAccount({ sdk, friendbotUrl, keypair, log, fail, attempts = 3 }) {
  const pub = keypair.publicKey();
  try {
    const account = await sdk.rpc.getAccount(pub);
    log(`account already funded: ${pub} (seq ${account.sequenceNumber()})`);
    return account;
  } catch (err) {
    for (let i = 1; i <= attempts; i++) {
      log(`funding ${pub} via friendbot (attempt ${i}/${attempts})…`);
      const res = await fetch(`${friendbotUrl}?addr=${encodeURIComponent(pub)}`);
      if (res.ok) {
        const account = await sdk.rpc.getAccount(pub);
        log(`funded: ${pub} (seq ${account.sequenceNumber()})`);
        return account;
      }
      const body = (await res.text()).slice(0, 200);
      if (i === attempts) {
        fail(`friendbot funding failed after ${attempts} attempts (${res.status}): ${body}`);
      }
      log(`friendbot ${res.status} — retrying in ${i * 2}s`);
      await sleep(i * 2000);
    }
  }
}

/**
 * Scan RPC events for a `goal_staked` event (the indexer's data source).
 * Returns the matching event or undefined after maxTries.
 */
export async function findStakedEvent({
  sdk,
  contractId,
  startLedger,
  goalId,
  amount,
  log,
  maxTries = 15,
}) {
  for (let i = 0; i < maxTries; i++) {
    try {
      const res = await sdk.rpc.getEvents({
        startLedger,
        filters: [{ type: 'contract', contractIds: [contractId] }],
        pagination: { limit: 20 },
      });
      const hit = (res.events || []).find((evt) => {
        if (evt.inSuccessfulContractCall === false) return false;
        if (evt.contractId.toString() !== contractId) return false;
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
export async function checkSupabaseEvent({ goalId, hash, log }) {
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
