#!/usr/bin/env node
/**
 * setup-usdc-seed.mjs — One-time helper for the USDC smoke test.
 *
 * Generates a fresh testnet keypair, funds it with XLM via friendbot, and
 * creates a USDC trustline on the canonical testnet USDC issuer. After this,
 * request free testnet USDC at https://faucet.circle.com for the printed
 * public key, then run the smoke test with the printed secret:
 *
 *   USDC_SEED_SECRET=S... npm run smoke:stake-usdc
 *
 * The secret is also written to the gitignored .usdc-seed-secret file so the
 * smoke test can be re-run without re-pasting it.
 *
 * Usage:
 *   cd packages/sdk && node scripts/setup-usdc-seed.mjs
 *
 * Env overrides (all optional):
 *   USDC_ISSUER, STELLAR_HORIZON_URL, NETWORK_PASSPHRASE, FRIENDBOT_URL
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Keypair, Horizon, TransactionBuilder, Operation, Asset } from '@stellar/stellar-sdk';
import { makeLogger, fundedAccount } from './lib/smoke-helpers.mjs';
import { StakeMindSDK } from '../dist/index.js';

const { log, fail } = makeLogger('setup-usdc-seed');

const __dirname = dirname(fileURLToPath(import.meta.url));
const SECRET_FILE = join(__dirname, '.usdc-seed-secret');

const PASSPHRASE = process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const FRIENDBOT_URL = process.env.FRIENDBOT_URL || 'https://friendbot.stellar.org';

// Canonical testnet USDC (verified on Horizon; SAC mint is Circle-admin-only).
const USDC_ISSUER = process.env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const USDC_ASSET = new Asset('USDC', USDC_ISSUER);

// Placeholder contract IDs — only needed to construct the SDK for the
// friendbot-fundedAccount helper; the seed setup itself uses Horizon.
const SDK = new StakeMindSDK({
  networkPassphrase: PASSPHRASE,
  rpcUrl: RPC_URL,
  horizonUrl: HORIZON_URL,
  goalStakingContractId: 'CD4IITXUDTML3VGTGK5UBMA4JHYILBDHOVMIDQGH6HUU4FCJRZ6TA2F7',
  groupEscrowContractId: 'CCX736W2FX4ETKPBKKXEANQO4KP43FVMKTLFVN3JWDCTIIHDIYCS25PI',
  milestoneContractId: 'CDRNQD45NSHVRXYMXCANN7M2W4SIZRLDEW4S4LTUNDI2QAULC7HVYS7T',
});

const horizon = new Horizon.Server(HORIZON_URL);

async function main() {
  const keypair = Keypair.random();
  const pub = keypair.publicKey();
  log(`generated seed keypair: ${pub}`);

  // 1. Fund with XLM via friendbot.
  await fundedAccount({ sdk: SDK, friendbotUrl: FRIENDBOT_URL, keypair, log, fail });

  // 2. USDC trustline.
  log('creating USDC trustline…');
  const account = await horizon.loadAccount(pub);
  const trustTx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset: USDC_ASSET }))
    .setTimeout(120)
    .build();
  trustTx.sign(keypair);
  await horizon.submitTransaction(trustTx);
  log('USDC trustline created.');

  // 3. Persist the secret (gitignored) for the smoke test.
  writeFileSync(SECRET_FILE, `${keypair.secret()}\n`, { mode: 0o600 });
  log(`secret saved to .usdc-seed-secret (gitignored).`);

  log('══════════════════════════════════════════════════════════');
  log('PUBLIC KEY  (use at faucet.circle.com):');
  log(pub);
  log('SECRET KEY  (for USDC_SEED_SECRET):');
  log(keypair.secret());
  log('══════════════════════════════════════════════════════════');
  log('Next: paste the PUBLIC KEY at https://faucet.circle.com');
  log('      (network: Stellar Testnet), then run:');
  log('      USDC_SEED_SECRET=' + keypair.secret() + ' npm run smoke:stake-usdc');
  log('      (or just: npm run smoke:stake-usdc — the secret is on disk)');
}

main().catch((err) => {
  console.error(`[setup-usdc-seed] FATAL: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
