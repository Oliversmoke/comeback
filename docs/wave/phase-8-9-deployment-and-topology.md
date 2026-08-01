# StakeMind — Wave Playbook, Phases 8–9 (Local Environment, Deployment, Hosting Topology)

> Grounded in the current repo. Note: the repo was just stripped of all deployment configs (vercel.json, render.yaml, k8s/, docker-compose, Dockerfiles) at the user's request. This document is the playbook's re-deployment plan.

---

## Phase 8 — Local Environment & Deployment

### Diagnose first (known constraints in this repo)

- **Contract toolchain:** `stellar` CLI / `soroban-cli` not installed in the dev environment (`command -v stellar` → not installed). Install the **official Stellar CLI** matching the soroban-sdk version's expectations; do not mix old `soroban-cli` with new SDK — use one toolchain consistently.
- **Rust target:** contracts build with `wasm32-unknown-unknown`. Verify with: `rustup target add wasm32-unknown-unknown`.
- **Docker/supabase:** `supabase` CLI not installed. Local Supabase (Studio at :54323) requires Docker + `supabase start`. The `supabase/` config directory was deleted — **recreate it** from `server/prisma` or the documented schema if local DB work is needed, or use a hosted Supabase project.
- **Node:** Node 22 (matches CI). `npm ci` in `client/`, `server/`, `indexer/`, `packages/sdk`.

### Contract deployment (exact, dependency-ordered)

The repo already ships `scripts/deploy-contracts.sh` (Stellar testnet, Soroban). It deploys in order GoalStaking → GroupEscrow → Milestone and prints contract IDs. Required env: `STELLAR_ADMIN_SECRET`, `STELLAR_ADMIN_PUBLIC_KEY`, `STELLAR_NETWORK` (default testnet), `STELLAR_RPC_URL`.

Usage:
```bash
export STELLAR_ADMIN_SECRET=... STELLAR_ADMIN_PUBLIC_KEY=...
./scripts/deploy-contracts.sh
```

Post-deploy, wire the three printed contract IDs into:
- `client/.env.local` → `NEXT_PUBLIC_GOAL_STAKING_CONTRACT_ID`, `NEXT_PUBLIC_GROUP_ESCROW_CONTRACT_ID`, `NEXT_PUBLIC_MILESTONE_CONTRACT_ID` (client needs these for reads + wallet write simulation)
- `server/.env` → `GOAL_STAKING_CONTRACT_ID`, `GROUP_ESCROW_CONTRACT_ID`, `MILESTONE_CONTRACT_ID`, `ADMIN_SECRET_KEY`
- Hosting env UI (same values, scoped per service).

### Verification commands

```bash
# Contracts compile + tests
cd comeback-contract && cargo test --workspace
cargo build --workspace --target wasm32-unknown-unknown --release

# Server boots and health-checks
cd server && npm ci && npm test && npm run dev   # /health on :5000

# Client builds
cd client && npm ci && npm run lint && npm run build

# SDK builds
cd packages/sdk && npm install && npm run build
```

---

## Phase 9 — Hosting & Service Topology

### Topology (per playbook guidance)

```
                        ┌─────────────────────────────┐
                        │   Frontend (Next.js)        │
                        │   Vercel (or Netlify/CF)    │
                        │   reads: RPC (direct)       │
                        │   writes: wallet → RPC      │
                        └──────────┬──────────────────┘
                                   │ HTTP/WS (REST, socket.io)
                        ┌──────────▼──────────────────┐
                        │   API / Indexer (long-      │
                        │   running, stateful)        │
                        │   Render (or Railway/Fly)   │
                        │   - server :5000 (Express)  │
                        │   - indexer (event poller)  │
                        └──────────┬──────────────────┘
                                   │ internal conn (co-located region)
                        ┌──────────▼──────────────────┐
                        │   Database (Supabase        │
                        │   Postgres + RLS, 7 tables) │
                        └──────────┬──────────────────┘
                                   │ Soroban RPC (testnet/mainnet)
                        ┌──────────▼──────────────────┐
                        │   Stellar (contracts)       │
                        └─────────────────────────────┘
```

### Service roles (exact commands)

- **Frontend (Vercel):** framework preset `Next.js`, root dir `client`, build `npm run build`, output `.next`, install `npm install`. Env: `NEXT_PUBLIC_*` contract IDs, RPC URL, Supabase anon URL/key (client-safe only).
- **API (Render web service):** build `cd server && npm install`, start `cd server && node src/server.js`, health check `/health`, port 5000. Env: all server vars including `ADMIN_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, AI keys.
- **Indexer (Render background/cron worker or separate service):** start `cd indexer && node src/index.js`. Env: `STELLAR_RPC_URL`, contract IDs, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Database (Supabase):** same region as API; use the **internal connection string** when co-located on the same provider. RLS on all 7 tables; service-role key only on server/indexer.

### Failure-trace examples (root-cause fixes)

- **Frontend hitting `localhost` in prod:** caused by hardcoded `http://localhost:5000` in client API base. Fix at source: make the API base a `NEXT_PUBLIC_API_URL` env var; default to relative `/api` proxy in dev.
- **Indexer connecting to `dummy-key`:** the stub falls back to a dummy service-role key. Fix at source: fail fast with a clear error if `SUPABASE_SERVICE_ROLE_KEY` is unset; no silent dummy fallbacks.
- **Wallet writes failing in prod:** RPC URL must be the public testnet/mainnet RPC, not a local sandbox — set `STELLAR_RPC_URL` per environment, never default to localhost.

### Known follow-up (from Phase 4 decision)

If the repo is split into `stakemind-contract` + `stakemind-app`, deployment configs move into `stakemind-app` only (contracts are deployed via CLI, not hosted).
