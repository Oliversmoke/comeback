#!/usr/bin/env node
/**
 * watch-usdc-seed.mjs — Poll the seed account until testnet USDC arrives,
 * then automatically run the full USDC smoke test.
 *
 * The Circle testnet faucet (faucet.circle.com) delivers asynchronously (no
 * API), so this watches Horizon every POLL_INTERVAL_MS until the seed holds
 * >= MIN_USDC, then spawns smoke-test-stake-usdc.mjs (which reads the same
 * gitignored .usdc-seed-secret file). Exits 0 if the E2E passes, 1 if the
 * watch window expires or the smoke test fails.
 *
 * Usage:
 *   cd packages/sdk && node scripts/watch-usdc-seed.mjs
 *
 * Env overrides (all optional):
 *   USDC_SEED_SECRET    — override the seed secret (default: .usdc-seed-secret file)
 *   POLL_INTERVAL_MS    — default 30000
 *   MIN_USDC            — default 10
 *   MAX_WAIT_MS         — default 25 minutes
 *   USDC_ISSUER         — default canonical testnet USDC issuer
 *   STELLAR_HORIZON_URL — default testnet Horizon
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Keypair, Horizon } from '@stellar/stellar-sdk';
import { makeLogger } from './lib/smoke-helpers.mjs';

const { log, fail } = makeLogger('watch-usdc-seed');

const __dirname = dirname(fileURLToPath(import.meta.url));
const SECRET_FILE = join(__dirname, '.usdc-seed-secret');

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = process.env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const POLL_MS = Number(process.env.POLL_INTERVAL_MS || '30000');
const MIN_USDC = Number(process.env.MIN_USDC || '10');
const MAX_WAIT_MS = Number(process.env.MAX_WAIT_MS || 25 * 60 * 1000);

const horizon = new Horizon.Server(HORIZON_URL);

function seedSecret() {
  const fromEnv = process.env.USDC_SEED_SECRET;
  if (fromEnv) return fromEnv;
  if (existsSync(SECRET_FILE)) return readFileSync(SECRET_FILE, 'utf8').trim();
  fail('No seed secret. Run `node scripts/setup-usdc-seed.mjs` first (or export USDC_SEED_SECRET).');
}

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
  const seedPub = Keypair.fromSecret(seedSecret()).publicKey();
  log(`watching ${seedPub} for >= ${MIN_USDC} USDC (poll every ${POLL_MS / 1000}s, up to ${MAX_WAIT_MS / 60000} min)`);
  log('If the faucet has not been submitted yet: https://faucet.circle.com → Stellar Testnet → ' + seedPub);

  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    let bal;
    try {
      bal = await usdcBalanceOf(seedPub);
      log(`seed USDC: ${bal.toFixed(7)}`);
    } catch (err) {
      // Transient Horizon/RPC errors (rate limits, 5xx, blips) must not kill
      // the watch — the whole point is resilience while the faucet delivers.
      log(`balance poll errored (${err.message}) — continuing…`);
      await new Promise((r) => setTimeout(r, POLL_MS));
      continue;
    }
    if (bal >= MIN_USDC) {
      log(`faucet USDC landed (${bal.toFixed(2)} USDC) — running the USDC smoke test…`);
      // Run via the npm script so `tsc` rebuilds dist/ first (the smoke test
      // imports ../dist/index.js — a stale build would test old SDK code).
      const result = spawnSync('npm', ['run', 'smoke:stake-usdc'], {
        cwd: join(__dirname, '..'),
        env: process.env,
        stdio: 'inherit',
        timeout: 5 * 60 * 1000,
      });
      if (result.status !== 0) {
        const why = result.error ? ` (${result.error.message})` : '';
        fail(`USDC smoke test failed${why} (status ${result.status})`);
      }
      log('PASS — watch completed: USDC E2E verified.');
      return;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  fail(`watch window expired (${MAX_WAIT_MS / 60000} min) with no USDC on the seed. Retry the faucet and re-run.`);
}

main().catch((err) => {
  console.error(`[watch-usdc-seed] FATAL: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
