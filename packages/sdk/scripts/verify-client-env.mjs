#!/usr/bin/env node
/**
 * verify-client-env.mjs — Verify the client's `.env.local` wiring end-to-end.
 *
 * This proves that the values the Next.js client ships (NEXT_PUBLIC_* in
 * client/.env.local) actually drive a working stake flow on Stellar testnet.
 *
 * Flow:
 *   1. Parse client/.env.local (simple KEY=VALUE parser — no deps).
 *   2. Validate: required NEXT_PUBLIC_* vars present, contract IDs + token are
 *      well-formed strkeys (56-char base32 starting with 'C').
 *   3. Cross-check the client config against the deployed set documented in
 *      the root .env.example — flag drift loudly.
 *   4. Re-run the canonical E2E smoke test (scripts/smoke-test-stake.mjs) with
 *      the client's values injected as env overrides: fund a fresh keypair via
 *      friendbot, build the stake XDR, prepare/sign/submit, verify the
 *      goal_staked event via RPC getEvents, and read the stake back.
 *
 * Exit code 0 on success, 1 on failure.
 *
 * Usage:
 *   cd packages/sdk && npm run verify:client-env
 *   # or: node scripts/verify-client-env.mjs
 *
 * Env overrides (all optional):
 *   CLIENT_ENV_PATH  — path to the client env file (default: ../../client/.env.local)
 *   GOAL_ID, STAKE_AMOUNT_XLM, STAKE_SECRET — passed through to the smoke test
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync as run } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const CLIENT_ENV_PATH = resolve(
  process.env.CLIENT_ENV_PATH || join(REPO_ROOT, 'client', '.env.local')
);
const SDK_DIR = resolve(__dirname, '..');
const SMOKE_SCRIPT = join(__dirname, 'smoke-test-stake.mjs');

const log = (msg) => console.log(`[verify-client-env] ${msg}`);
const fail = (msg) => {
  console.error(`[verify-client-env] FAIL: ${msg}`);
  process.exit(1);
};

/** Minimal dotenv parser: KEY=VALUE lines, # comments, optional quotes. */
function parseEnvFile(path) {
  if (!existsSync(path)) {
    throw new Error(`env file not found: ${path}`);
  }
  const env = {};
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) env[key] = value;
  }
  return env;
}

/** Strkey contract/account format: 56-char base32 starting with C. */
const STRKEY_RE = /^C[A-Z2-7]{55}$/;

// NEXT_PUBLIC_* → smoke-test env var mapping.
const MAPPING = {
  NEXT_PUBLIC_GOAL_STAKING_CONTRACT_ID: 'GOAL_STAKING_CONTRACT_ID',
  NEXT_PUBLIC_GROUP_ESCROW_CONTRACT_ID: 'GROUP_ESCROW_CONTRACT_ID',
  NEXT_PUBLIC_MILESTONE_CONTRACT_ID: 'MILESTONE_CONTRACT_ID',
  NEXT_PUBLIC_STAKING_TOKEN: 'STAKING_TOKEN',
  NEXT_PUBLIC_RPC_URL: 'STELLAR_RPC_URL',
  NEXT_PUBLIC_HORIZON_URL: 'STELLAR_HORIZON_URL',
  NEXT_PUBLIC_NETWORK_PASSPHRASE: 'NETWORK_PASSPHRASE',
};

const REQUIRED = Object.keys(MAPPING);

function main() {
  log(`reading client env from: ${CLIENT_ENV_PATH}`);
  const clientEnv = parseEnvFile(CLIENT_ENV_PATH);

  // 1. Required keys present.
  const missing = REQUIRED.filter((k) => !clientEnv[k]);
  if (missing.length > 0) {
    fail(
      `client/.env.local is missing required vars: ${missing.join(', ')}.\n` +
        `Copy client/.env.local.example and fill in the deployed contract addresses.`
    );
  }

  // 2. Well-formed strkeys for contract IDs + token.
  const strkeys = [
    'NEXT_PUBLIC_GOAL_STAKING_CONTRACT_ID',
    'NEXT_PUBLIC_GROUP_ESCROW_CONTRACT_ID',
    'NEXT_PUBLIC_MILESTONE_CONTRACT_ID',
    'NEXT_PUBLIC_STAKING_TOKEN',
  ];
  for (const key of strkeys) {
    if (!STRKEY_RE.test(clientEnv[key])) {
      fail(`${key}=${clientEnv[key]} is not a valid strkey (expected 56-char base32 starting with C).`);
    }
  }

  // 3. Cross-check against the deployed set in the root .env.example.
  const examplePath = join(REPO_ROOT, '.env.example');
  if (existsSync(examplePath)) {
    const exampleEnv = parseEnvFile(examplePath);
    for (const key of strkeys) {
      const example = exampleEnv[key];
      if (example && example !== clientEnv[key]) {
        log(
          `WARN: ${key} differs from the deployed set in .env.example ` +
            `(${clientEnv[key]} vs ${example}). If this is deliberate (a different ` +
            `deployment), ignore; otherwise sync them.`
        );
      }
    }
  }

  // 4. Run the real stake flow with the client's values.
  log('client env wiring looks valid — running the E2E stake flow…');
  const smokeEnv = { ...process.env };
  for (const [clientKey, smokeKey] of Object.entries(MAPPING)) {
    smokeEnv[smokeKey] = clientEnv[clientKey];
  }
  // Pass through test knobs if provided.
  for (const k of ['GOAL_ID', 'STAKE_AMOUNT_XLM', 'STAKE_SECRET', 'DEADLINE']) {
    if (process.env[k]) smokeEnv[k] = process.env[k];
  }

  const result = run(process.execPath, [SMOKE_SCRIPT], {
    cwd: SDK_DIR,
    env: smokeEnv,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    fail(`smoke test exited with status ${result.status} — client env cannot drive a stake.`);
  }
  log('PASS — client/.env.local drives a full stake flow on testnet.');
}

main();
