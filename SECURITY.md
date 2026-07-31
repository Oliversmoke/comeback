# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability within **StakeMind**, please report it responsibly. Do not disclose public issues for unpatched vulnerabilities.

- **Email:** security@stakemind.ai
- **Scope:** Includes Soroban smart contracts (`comeback-contract/`), Node backend services, API endpoints, wallet auth mechanisms, and client-side auth flows.

## Audit Disclaimer

Smart contracts in `comeback-contract/` are provided as-is under the MIT License and are **currently pending formal third-party security audits**. 

- **Do not deploy to Stellar Mainnet** until a formal audit is complete.
- Test on Stellar Testnet only.
- All token amounts use i128 integer arithmetic — no floating-point vulnerabilities.
- Admin functions use `require_auth()` with explicit address matching.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x (testnet) | ⚠️ Pre-audit, testnet only |
| 1.0.x (future) | 🔒 Post-audit, mainnet |

## Disclosure Process

1. Reporter sends details to security@stakemind.ai
2. We acknowledge within 48 hours
3. We investigate and patch within 14 days
4. Public disclosure after patch is deployed
