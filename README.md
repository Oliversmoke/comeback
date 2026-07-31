# comeback.ai — AI Operating System on Stellar

<div align="center">

[![Stellar Wave Builder](https://img.shields.io/badge/Stellar-Wave%20Builder-blue?style=for-the-badge&logo=stellar)](https://stellar.org)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Soroban](https://img.shields.io/badge/Soroban-Smart%2C%20Fast%2C%20Secure-purple?style=for-the-badge)](https://soroban.stellar.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Comeback AI Operating System** is an advanced AI-powered productivity, social, and goal-tracking platform integrated with verifiable web3 primitives on the **Stellar network (Soroban)**.

</div>

---

## Architecture & Tiers

Comeback AI is structured as a robust multi-tier monorepo:
- **`client/`** — Next.js 15 App Router frontend (React 19, TypeScript, Tailwind CSS v4, Zustand, Framer Motion) featuring Stellar wallet auth (Freighter / SEP-10).
- **`server/`** — Node.js Express API with Supabase / Postgres integration, real-time Socket.io synchronization, AI psychology, and memory engines.
- **`server-go/`** — Go 1.22 high-performance concurrent API microservice tier.
- **`core/` & `*-service/`** — 18 Kotlin 2.1 / Ktor microservices providing resilient modular services with pgvector, Redis, and Qdrant memory.
- **`comeback-contract/`** — Rust Soroban smart contracts workspace (`goal-staking`, `group-escrow`, `milestone`).
- **`packages/sdk/`** — TypeScript SDK for Stellar Soroban contract interactions.
- **`indexer/`** — Real-time event indexer syncing on-chain events with Postgres / Supabase.

---

## Web3 Integration (Stellar Wave Builder)

- **On-Chain Goal Staking (`goal-staking`):** Stake tokens against productivity goals; successfully completed goals return stakes plus yield bonuses, while forfeits fund group escrow pools.
- **Group Escrow (`group-escrow`):** Transparent pooled stakes and prize distributions for team challenges and leaderboards.
- **Verifiable Milestone Receipts (`milestone`):** Milestone completions generate cryptographic on-chain receipts and event streams.
- **Wallet Authentication:** Seamless sign-in with Freighter and Stellar wallets alongside traditional JWT and Supabase authentication.

---

## Complete Rebrand & De-Branding

- Fully rebranded to **comeback.ai** / **Comeback AI Operating System**.
- All legacy references (`rickchat` / `RickChat`) have been completely purged across codebases, packages (`com.comeback.*`), Dockerfiles, docker-compose, Kubernetes manifests, and documentation (`grep -ri rickchat .` returns zero results).

---

## Quick Start

### 1. Web2 & API Tier
```bash
# Start Node backend server
cd server && npm install && npm run dev

# Start Next.js frontend client
cd client && npm install && npm run dev
```

### 2. Soroban Smart Contracts (`comeback-contract`)
```bash
cd comeback-contract
cargo build --target wasm32-unknown-unknown --release
cargo test
```

---

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and contribution guidelines.

## Security

Please see [SECURITY.md](SECURITY.md) for vulnerability disclosure procedures.

## License

MIT License © 2026 comeback.ai
