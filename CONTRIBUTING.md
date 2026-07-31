# Contributing to StakeMind

Thank you for your interest in contributing to **StakeMind** — AI-Powered Accountability on Stellar.

## Development Workflow

1. Fork the repository and create your feature branch from `main`.
2. Ensure all tests and builds pass across respective tiers:
   - Frontend: `cd client && npm run build`
   - Backend: `cd server && npm run build:backend && npm test`
   - Contracts: `cd comeback-contract && cargo test`
   - SDK: `cd packages/sdk && npm run build`
3. Follow conventional commit messages (e.g., `feat(contracts): add time-locked staking`, `fix(client): resolve wallet auth state`).
4. Submit a Pull Request with a clear description of changes and test verification.

## Code Standards

- **No floats** in financial or token arithmetic; use integer basis points or fixed-precision types (i128 in Soroban).
- **No `unwrap()`** outside test suites in Rust smart contracts. Use proper error handling.
- Maintain strict TypeScript types and Kotlin package naming (`com.stakemind.*`).
- **Git workflow:** Never `git add .` — stage files individually. One commit per logical unit. Push immediately after commit.
- All Soroban contract functions must map to a real user-flow step — no speculative functions.

## Testing

- Rust contracts: `cargo test` from `comeback-contract/`
- Node backend: `npm test` from `server/`
- Frontend: `npm run lint && npm run build` from `client/`

## Review Process

All PRs require:
- Passing CI (lint + build for all tiers)
- No breaking changes to deployed contract interfaces
- Conventional commit format in PR title
