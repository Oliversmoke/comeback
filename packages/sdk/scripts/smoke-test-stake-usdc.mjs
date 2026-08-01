#!/usr/bin/env node
/**
 * smoke-test-stake-usdc.mjs — End-to-end StakeMind smoke test staking a
 * NON-NATIVE asset (USDC) on Stellar testnet.
 *
 * Why a seed account? The canonical testnet USDC SAC is admin-gated — only
 * Circle can `mint` it (verified live: Error(Auth, InvalidAction)). The
 * Circle testnet faucet (https://faucet.circle.com) is an interactive web
 * form, not a public API. So this test funds a fresh stake keypair from a
 * SEED account that already holds testnet USDC.
 *
 * One-time seed setup (minutes):
 *   1. Generate a keypair, fund it with XLM via friendbot, and create a USDC
 *      trustline: https://lab.stellar.org (or stellar CLI).
 *   2. Request free testnet USDC at https://faucet.circle.com (network:
 *      Stellar Testnet, address: your G... public key).
 *   3. Export the seed secret: export USDC_SEED_SECRET=S...
 *
 * Flow:
 *   1. Config from env (deployed testnet contract IDs by default).
 *   2. Generate + fund a fresh testnet keypair via friendbot.
 *   3. Create a USDC trustline (changeTrust) on the fresh keypair.
 *   4. Verify the seed account holds testnet USDC, then transfer a stake
 *      amount of USDC seed → fresh keypair (classic payment).
 *   5. Build the `stake_goal` invocation with the real SDK using the USDC SAC
 *      as the token, set the account sequence (friendbot +1 quirk), prepare,
 *      sign, submit, and confirm.
 *   6. Verify the `goal_staked` event via Soroban RPC `getEvents` (the API
 *      the indexer polls) — contract, topic, goal_id, amount, and tx-hash.
 *   7. Read the stake back and assert the stored token is the USDC SAC.
 *   8. Optional: check the indexer's Supabase `event_log` when configured.
 *
 * Exit code 0 on success, 1 on failure.
 *
 * Usage:
 *   cd packages/sdk && npm run build
 *   USDC_SEED_SECRET=S... node scripts/smoke-test-stake-usdc.mjs
 *
 * Env overrides (all optional; defaults target the deployed testnet set):
 *   USDC_SEED_SECRET      — REQUIRED: secret key of an account holding testnet USDC
 *   USDC_ISSUER           — default canonical testnet USDC issuer
 *   USDC_SAC              — default derived from asset + passphrase
 *   GOAL_STAKING_CONTRACT_ID, GROUP_ESCROW_CONTRACT_ID, MILESTONE_CONTRACT_ID
 *   STELLAR_RPC_URL, STELLAR_HORIZON_URL, NETWORK_PASSPHRASE, FRIENDBOT_URL
 *   GOAL_ID, STAKE_AMOUNT_USDC, DEADLINE
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StakeMindSDK, signInvocationXdr } from '../dist/index.js';
import { Asset, Keypair, Horizon, TransactionBuilder, Operation, scValToNative } from '@stellar/stellar-sdk';
import { makeLogger, fixSequence, fundedAccount, findStakedEvent, checkSupabaseEvent } from './lib/smoke-helpers.mjs';

const { log, fail } = makeLogger('smoke-usdc');

const PASSPHRASE = process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = process.env.FRIENDBOT_URL || 'https://friendbot.stellar.org';

// Canonical testnet USDC (verified on Horizon; SAC mint is Circle-admin-only).
const USDC_ISSUER = process.env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const USDC_ASSET = new Asset('USDC', USDC_ISSUER);
// Derive the SAC from asset + passphrase so it can't drift from the trustline
// asset (matches how the XLM smoke test derives the native SAC).
const USDC_SAC = process.env.USDC_SAC || USDC_ASSET.contractId(PASSPHRASE);

// Deployed testnet contracts (see v0.1.0 tag / .env.example).
const GOAL_STAKING = process.env.GOAL_STAKING_CONTRACT_ID || 'CD4IITXUDTML3VGTGK5UBMA4JHYILBDHOVMIDQGH6HUU4FCJRZ6TA2F7';
const GROUP_ESCROW = process.env.GROUP_ESCROW_CONTRACT_ID || 'CCX736W2FX4ETKPBKKXEANQO4KP43FVMKTLFVN3JWDCTIIHDIYCS25PI';
const MILESTONE = process.env.MILESTONE_CONTRACT_ID || 'CDRNQD45NSHVRXYMXCANN7M2W4SIZRLDEW4S4LTUNDI2QAULC7HVYS7T';

const AMOUNT_USDC = Number(process.env.STAKE_AMOUNT_USDC || '10');
const AMOUNT = BigInt(Math.round(AMOUNT_USDC * 1e7)).toString(); // USDC (7 dp) → i128 decimal string
const DEADLINE = BigInt(process.env.DEADLINE || '0');
const GOAL_ID = process.env.GOAL_ID ? Number(process.env.GOAL_ID) : randomBytes(4).readUInt32BE(0) + 1;

const horizon = new Horizon.Server(HORIZON_URL);

const sdk = new StakeMindSDK({
  networkPassphrase: PASSPHRASE,
  rpcUrl: RPC_URL,
  horizonUrl: HORIZON_URL,
  goalStakingContractId: GOAL_STAKING,
  groupEscrowContractId: GROUP_ESCROW,
  milestoneContractId: MILESTONE,
});

/** USDC balance of an account from Horizon (0 if none/not funded). */
async function usdcBalanceOf(publicKey) {
  try {
    const account = await horizon.loadAccount(publicKey);
    const bal = account.balances.find(
      (b) => b.asset_type === 'credit_alphanum4' && b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER
    );
    return bal ? Number(bal.balance) : 0;
  } catch (err) {
    if (err.response?.status === 404) return 0;
    throw err;
  }
}

async function main() {
  // 0. Seed account is mandatory. Prefer the env var; fall back to the
  //    gitignored .usdc-seed-secret file written by setup-usdc-seed.mjs.
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const secretFile = join(__dirname, '.usdc-seed-secret');
  const seedSecret =
    process.env.USDC_SEED_SECRET ||
    (existsSync(secretFile) ? readFileSync(secretFile, 'utf8').trim() : '');
  if (!seedSecret) {
    fail(
      'USDC_SEED_SECRET is required. Run `node scripts/setup-usdc-seed.mjs` to ' +
        'create+fund a seed account, then request USDC at https://faucet.circle.com — ' +
        'or export USDC_SEED_SECRET=S...'
    );
  }
  const seedKeypair = Keypair.fromSecret(seedSecret);
  const seedPub = seedKeypair.publicKey();

  log(`goalId=${GOAL_ID} amount=${AMOUNT} units (${AMOUNT_USDC} USDC) deadline=${DEADLINE}`);
  log(`goal-staking contract: ${GOAL_STAKING}`);
  log(`USDC SAC: ${USDC_SAC}`);
  log(`seed account: ${seedPub}`);

  // 1. Fresh stake keypair + friendbot.
  const keypair = Keypair.random();
  await fundedAccount({ sdk, friendbotUrl: FRIENDBOT_URL, keypair, log, fail });
  const pub = keypair.publicKey();

  // 2. USDC trustline on the fresh keypair (classic changeTrust via Horizon).
  log('creating USDC trustline…');
  const freshAccount = await horizon.loadAccount(pub);
  const trustTx = new TransactionBuilder(freshAccount, {
    fee: '100',
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset: USDC_ASSET }))
    .setTimeout(120)
    .build();
  trustTx.sign(keypair);
  await horizon.submitTransaction(trustTx);
  log('USDC trustline created.');

  // 3. Seed must hold testnet USDC.
  const seedBalance = await usdcBalanceOf(seedPub);
  log(`seed USDC balance: ${seedBalance.toFixed(2)}`);
  if (seedBalance < AMOUNT_USDC) {
    fail(
      `seed account holds only ${seedBalance.toFixed(2)} USDC (need ${AMOUNT_USDC}). ` +
        'Request testnet USDC at https://faucet.circle.com for ' + seedPub
    );
  }

  // 4. Transfer stake amount seed → fresh keypair (classic payment).
  log(`transferring ${AMOUNT_USDC} USDC seed → ${pub}…`);
  const seedAccount = await horizon.loadAccount(seedPub);
  const payTx = new TransactionBuilder(seedAccount, {
    fee: '100',
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: pub,
        asset: USDC_ASSET,
        amount: AMOUNT_USDC.toFixed(7),
      })
    )
    .setTimeout(120)
    .build();
  payTx.sign(seedKeypair);
  await horizon.submitTransaction(payTx);
  const freshUsdc = await usdcBalanceOf(pub);
  log(`fresh keypair USDC balance: ${freshUsdc.toFixed(2)}`);
  if (freshUsdc < AMOUNT_USDC) {
    fail(`USDC transfer did not land on ${pub} (balance ${freshUsdc.toFixed(2)})`);
  }

  // 5. Build + fix sequence + prepare + sign + submit.
  //    NOTE on the +1: verified empirically for the FIRST tx on a fresh
  //    friendbot account (reported seq → txBadSeq, +1 → SUCCESS). After the
  //    changeTrust + payment above the account has already transacted, so if
  //    the network now accepts the reported seq as-is, the +1 would overshoot
  //    (txBadSeq). Both behaviors were observed on this network in different
  //    code paths, so this is a known-uncertain area — if the stake step fails
  //    with txBadSeq, drop the +1 (or re-verify against a funded seed).
  const seq = (BigInt((await sdk.rpc.getAccount(pub)).sequenceNumber()) + 1n).toString();
  const rawXdr = sdk.buildStakeGoalXdr(pub, GOAL_ID, USDC_SAC, AMOUNT, DEADLINE);
  const fixedXdr = fixSequence(rawXdr, seq);
  const prepared = await sdk.prepareInvocation(pub, fixedXdr);
  const signed = signInvocationXdr(prepared, keypair.secret(), PASSPHRASE);

  const latestLedger = await sdk.rpc.getLatestLedger();
  const startLedger = latestLedger.sequence;

  log('submitting stake_goal (USDC)…');
  const { hash, status, result } = await sdk.submitAndConfirm(signed);
  log(`tx ${status}: ${hash}`);
  log(`stellar.expert: https://stellar.expert/explorer/testnet/tx/${hash}`);
  if (result !== undefined) log(`contract result: ${JSON.stringify(result)}`);

  // 6. Verify the goal_staked event (RPC getEvents — the indexer's source).
  const evt = await findStakedEvent({ sdk, contractId: GOAL_STAKING, startLedger, goalId: GOAL_ID, amount: AMOUNT, log });
  if (!evt) {
    fail(`goal_staked event for goal ${GOAL_ID} not found in RPC events (ledger ${startLedger}+)`);
  }
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

  // 7. Read the stake back — the stored token must be the USDC SAC.
  const stake = await sdk.readStake(GOAL_ID, pub);
  log(`get_stake: user=${stake.user} token=${stake.token} amount=${stake.amount} deadline=${stake.deadline} completed=${stake.completed} forfeited=${stake.forfeited}`);
  if (stake.user !== pub || BigInt(stake.amount) !== BigInt(AMOUNT)) {
    fail('on-chain stake does not match the submitted stake');
  }
  if (stake.token !== USDC_SAC) {
    fail(`on-chain stake token ${stake.token} is not the USDC SAC ${USDC_SAC}`);
  }

  // 8. Optional indexer-DB check.
  await checkSupabaseEvent({ goalId: GOAL_ID, hash, log });

  log('PASS — USDC stake submitted and goal_staked event verified via RPC.');
}

main().catch((err) => {
  console.error(`[smoke-usdc] FATAL: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
