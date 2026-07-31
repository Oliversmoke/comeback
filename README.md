# StakeMind — AI-Powered Accountability on Stellar

<div align="center">

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-purple?style=for-the-badge&logo=stellar)](https://stellar.org)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Rust](https://img.shields.io/badge/Rust-Soroban-orange?style=for-the-badge&logo=rust)](https://soroban.stellar.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**StakeMind** puts your money where your goals are. Stake XLM on your commitments — hit them and earn yield. Fail and your stake funds community prize pools. An AI coach keeps you accountable. On-chain receipts prove your progress.

</div>

---

## The Problem

People set goals. People break goals. Traditional productivity apps have zero skin in the game — there's no real consequence for quitting. Research shows financial stakes increase goal completion rates by 2-3x. But existing solutions (betting sites, accountability partners) are either sketchy, manual, or don't scale.

## What StakeMind Does

1. **Stake on goals** — Commit XLM (or any Stellar token) against a goal with a deadline
2. **AI coach tracks progress** — Your AI accountability coach checks in, reviews evidence, and keeps you on track
3. **Complete → earn yield** — Finish your goal and get your stake back plus a 10% reward bonus
4. **Forfeit → fund the community** — Failed stakes flow into group challenge pools that reward top performers
5. **Verifiable on-chain proof** — Every milestone generates a cryptographic receipt on Soroban. Your track record is portable and provable.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Next.js 15 Frontend (port 3000)              │
│    React 19 · TS · Tailwind v4 · Zustand · Framer        │
│    Freighter Wallet · Supabase SSR · socket.io            │
└──────────┬───────────────────────────────┬───────────────┘
           │ HTTP/WS                        │ direct reads
┌──────────▼──────────────┐    ┌───────────▼───────────────┐
│  Node API (Express)     │    │    Supabase (Postgres)     │
│  port 5000 · Socket.io  │    │    7 tables · RLS · auth  │
│  AI Coach · Psychology  │    │    bucket: app-files      │
│  Goals · Groups · XP    │    └───────────────────────────┘
└──────────┬──────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│                    Soroban RPC                           │
│  GoalStakingContract · GroupEscrowContract · Milestone  │
│  Event Indexer → Supabase sync                          │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS v4, Zustand, Framer Motion |
| **Desktop/Mobile** | Electron 33, Capacitor 8 |
| **Backend** | Node.js (ESM), Express 4, Socket.io, Passport, JWT |
| **Database** | Supabase (Postgres + RLS), MongoDB (optional) |
| **AI** | Provider-agnostic (OpenAI, Anthropic, Gemini, mock fallback) |
| **Smart Contracts** | Rust + soroban-sdk, compiled to WASM |
| **SDK** | TypeScript, @stellar/stellar-sdk v13 |
| **Indexer** | Node.js, polls Soroban RPC, syncs to Postgres |

## Soroban Contracts

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| **GoalStaking** | Escrow tokens against goal completion | `stake_goal`, `complete_goal`, `forfeit_goal`, `get_stake` |
| **GroupEscrow** | Pool community stakes for challenges | `deposit_pool`, `distribute_prize`, `get_pool` |
| **Milestone** | Verifiable on-chain completion receipts | `verify_milestone`, `get_receipt` |

**Reward math:** Stake 100 XLM → complete goal → receive 110 XLM (10% yield). No floats, all i128 basis-points math.

## Quick Start

### Web2 Tier
```bash
# Backend
cd server && npm install && npm run dev

# Frontend  
cd client && npm install && npm run dev
```

### Web3 Tier (Soroban)
```bash
# Build contracts
cd comeback-contract && cargo build --target wasm32-unknown-unknown --release && cargo test

# Build SDK
cd packages/sdk && npm install && npm run build

# Deploy contracts (requires stellar CLI)
./scripts/deploy-contracts.sh
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STELLAR_NETWORK_PASSPHRASE` | No | Default: Testnet |
| `STELLAR_RPC_URL` | No | Soroban RPC endpoint |
| `GOAL_STAKING_CONTRACT_ID` | Yes | Deployed contract address |
| `GROUP_ESCROW_CONTRACT_ID` | Yes | Deployed contract address |
| `MILESTONE_CONTRACT_ID` | Yes | Deployed contract address |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `OPENAI_API_KEY` | Yes | AI provider key |

See `server/.env.example` and `client/.env.local.example` for full variable lists.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). No floats in financial math. No `unwrap()` outside Rust tests. Conventional commits only: `feat(contracts):`, `fix(client):`, `chore(repo):`.

## Security

See [SECURITY.md](SECURITY.md). Smart contracts are unaudited — testnet only until formal audit completes. Report vulnerabilities to `security@comeback.ai`.

## License

MIT License © 2026 StakeMind

---

*Built on Stellar Soroban. Part of the Stellar Wave Builder program.*
