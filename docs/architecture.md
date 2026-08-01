# StakeMind Architecture

## Overview

StakeMind is a blockchain-backed accountability platform that puts real money behind personal goals. Users stake XLM or USDC via Stellar Soroban smart contracts; hit the deadline and you get your stake back plus a funded bonus, miss it and the stake flows into community challenge pools. An AI coach drives accountability and every milestone produces a verifiable on-chain receipt.

The stack is deliberately small: a TypeScript SDK, a Node/Express API, a Soroban event indexer, and a Next.js web client — with a separate Rust workspace for the Soroban contracts.

## Components

| Component | Path | Role |
|---|---|---|
| **Soroban contracts** | `comeback-contract/` | Rust workspace: `goal-staking`, `group-escrow`, `milestone` |
| **TypeScript SDK** | `packages/sdk/` | Real Soroban invocation XDR builders + decoders (`@stakemind/sdk`) |
| **API server** | `server/` | Node/Express: auth (JWT + SEP-10 wallet auth), goals, Supabase data layer |
| **Indexer** | `indexer/` | Soroban RPC event polling → Supabase Postgres sync |
| **Web client** | `client/` | Next.js 14 App Router frontend (wallet connect, staking UI, AI coach) |
| **Database** | Supabase | PostgreSQL + storage (avatars, proofs, attachments) |

## Architecture Diagram

```
┌──────────────┐        ┌──────────────────┐        ┌─────────────────┐
│  Web client   │───────▶│    API server     │──────▶│     Supabase    │
│   (Next.js)   │ REST   │   (Node/Express)  │  SQL  │   (PostgreSQL)  │
└──────┬───────┘        └────────┬─────────┘        └─────────────────┘
       │                         │
       │  Freighter (SEP-10)     │  Soroban RPC
       ▼                         ▼
┌─────────────────────┐   ┌──────────────────┐
│  Stellar network    │   │     Indexer      │
│  (testnet/mainnet)  │   │  (event poller)  │
│  Soroban contracts  │◀──┘       │           │
└─────────────────────┘           ▼           │
                          ┌─────────────────┐ │
                          │     Supabase    │◀┘ (upsert events)
                          │   event_log     │
                          └─────────────────┘
```

- **Writes** (stake, complete, forfeit, deposit, distribute, verify): the client builds transactions with the SDK and signs via Freighter, submitting directly to Soroban RPC.
- **Reads** (balances, goal state, receipts): via Horizon / Soroban RPC and the API server.
- **Events**: the indexer polls the RPC for contract events (10s interval, cursor-based) and upserts them to Supabase.

## Data Flow

1. **Wallet auth** — client connects Freighter, completes SEP-10 challenge against the API, receives JWT.
2. **Stake a goal** — SDK builds the `stake_goal` invocation XDR → user signs in Freighter → submitted to Soroban RPC.
3. **Goal lifecycle** — `goal_staked` / `milestone_verified` / `goal_completed` / `goal_forfeited` events are emitted by the contracts and picked up by the indexer.
4. **State sync** — the indexer decodes ScVal events and upserts them to Supabase, keeping the API's view consistent with on-chain state.
5. **AI coach** — the API proxies conversational requests to the AI provider, using goal/milestone context from Supabase.

## Key Design Decisions

- **Client-side XDR assembly** — the SDK builds invocation XDR with `@stellar/stellar-sdk` v13 (prepare/assemble/`submitAndConfirm`), so the client can submit directly without a backend for signing.
- **SEP-10 authentication** — wallet-verified identity is the primary auth path; email+password remains for legacy users.
- **Separation of contracts and app** — the Rust contracts are a standalone, auditable workspace; the app layer depends only on deployed contract addresses.
- **Polyglot persistence** — Postgres (relational state), Supabase Storage (files), on-chain (escrowed value + receipts).
