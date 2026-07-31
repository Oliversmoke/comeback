# Contributing to comeback.ai

Thank you for your interest in contributing to **comeback.ai**!

## Development Workflow

1. Fork the repository and create your feature branch from `main`.
2. Ensure all tests and builds pass across respective tiers:
   - Frontend: `cd client && npm run build`
   - Backend: `cd server && npm run build:backend && npm test`
   - Contracts: `cd comeback-contract && cargo test`
3. Follow conventional commit messages (e.g., `feat(contracts): add goal staking rewards`, `fix(client): resolve wallet auth state`).
4. Submit a Pull Request with a clear description of changes and test verification.

## Code Standards
- **No floats** in financial or token arithmetic; use integer basis points or fixed-precision types.
- **No `unwrap()`** outside test suites in Rust smart contracts.
- Maintain strict TypeScript types and Kotlin package naming (`com.comeback.*`).
