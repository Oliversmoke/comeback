# StakeMind — Wave Playbook, Phases 10–12 (Repo Hygiene & Submission)

> Grounded in the actual repo state (remote: `github.com/Oliversmoke/comeback`, tag `v0.1.0` exists, CI job names below).

---

## Phase 10 — Repo Hygiene for Program Approval

### Verified present
- **README.md** — rewritten per Wave pattern: banner/badges, architecture summary, quick-start, env table, contributing, security, license, maintainer note.
- **CONTRIBUTING.md** — dev workflow, code standards (no floats, no `unwrap()` outside tests), testing commands, review process, git rules.
- **SECURITY.md** — disclosure contact, scope, audit disclaimer ("testnet only until formal audit"), supported versions.
- **ISSUES.md** — 400 auto-generated issues, categorized with type/priority labels, summary + acceptance criteria.
- **CI:** `.github/workflows/ci.yml` (jobs: `server-lint`, `client-lint`, `client-build`) and `.github/workflows/build.yml`.
- **Release tag:** `v0.1.0` exists.
- **Contracts:** compile against `soroban-sdk 22.0.0`, release profile tuned (lto, opt-level z, overflow-checks).

### Gaps to close (actionable checklist)
1. **Branch protection:** enable on GitHub matching CI job names — require `client-build`, `client-lint`, `server-lint` to pass before merge; require PR review; protect `main` from force-push.
2. **README enhancements:** add maintainer contact table + community link + `contrib.rocks` contributor image (per approved-repo pattern).
3. **GitHub topics:** add for discoverability — e.g. `stellar`, `soroban`, `stellar-blockchain`, `smart-contracts`, `rust`, `accountability`, `defi`, `nextjs`, `typescript`.
4. **Release tag body:** v0.1.0 should carry deployed **testnet contract addresses** (GoalStaking, GroupEscrow, Milestone) + link to on-chain verification.
5. **Pre-submission gates (from Phase 3):** reward funding model fix, deadline auto-forfeit, real SDK XDR builders, real indexer, full contract test suite. These are currently the honest blockers.
6. **Repo split decision (Phase 4):** if splitting to `stakemind-contract` + `stakemind-app`, do it before submission and update all links/CI/remotes.

---

## Phase 11 — Documentation Site

Separate from the README, a full docs site (Nextra or Docusaurus) covering:
- **Introduction** — with real cited figures (Stellar RWA >$1B on-chain, stablecoin payment volume records, Soroban fee reductions — all from live research, cited).
- **Protocol mechanics** — state machine: created → staked → (completed | forfeited | expired), with worked numbers (stake 100 XLM → complete → receive stake + funded bonus; forfeit → flows to group pool).
- **Smart contract reference** — the Phase 5 spec, function by function.
- **Per-persona guides** — end-user (stake a goal, join a group, AI coach), developer (setup, env vars, SDK/API reference with real examples), maintainer.
- **Contributing guide** — expanded from CONTRIBUTING.md.

This content is deliverable as a Phase 6/7-style agent prompt; the site itself is a post-approval build item.

---

## Phase 12 — Submission

### Confirm not already approved
- A live search of drips.network/wave/stellar/repos did **not surface StakeMind or any personal commitment-staking product** in the approved repo directory (verified in Phase 1 research). Re-confirm by direct search of the live directory at submission time.

### Supporting links (placeholders marked where not yet live)
- **Live app URL:** not deployed yet (deployment configs were removed; re-deploy per Phase 8-9 before submission). Needed: `https://stakemind.app` (or Vercel URL).
- **Repo URLs:** `https://github.com/Oliversmoke/comeback` (+ future `stakemind-contract`/`stakemind-app` if split).
- **On-chain verification:** Stellar Expert links for the three testnet contracts (from `scripts/deploy-contracts.sh` output).
- **Docs site:** not built yet (Phase 11).
- **Demo video:** short end-to-end: connect wallet → stake goal → AI coach check-in → complete → receipt shown.

### Repo relationship description (if split)
> `stakemind-contract` holds the Soroban smart contracts (GoalStaking, GroupEscrow, Milestone) that escrow and finalize stakes on-chain. `stakemind-app` holds the SDK, API, indexer, and web client that let users interact with those contracts. The app depends on the contracts' deployed addresses; the contracts are standalone and auditable.

### "Planned issues" description
> Grounded in the 400 created issues (ISSUES.md): 50 contract issues (P0: deadline enforcement, bonus funding, integration tests), 30 SDK issues (P0: real XDR builders, transaction simulation), 60 frontend issues (P0: wallet connect, SEP-10 auth, stake/complete flows), 50 backend issues (contract endpoints, SEP-10 verification), 20 indexer issues (P0: event polling, decoding, Supabase sync), plus docs, testing, DevOps, and security workstreams.

### Plain-English project description (with scale figures where available)
> StakeMind puts real money behind personal goals: stake XLM or USDC, hit your deadline, and get your stake back plus a funded reward bonus; miss it, and your stake funds community challenge pools. An AI coach drives accountability, and every milestone produces a verifiable on-chain receipt. Built on Stellar Soroban (5-second finality, ~4× lower Soroban fees after Protocol 23/25), it rides SDF's push toward consumer apps and agentic payments. The accountability/commitment niche is unoccupied in the current 668-repo approved list. Contracts are testnet-only pending a formal audit.

---

## Post-Approval Iteration (Phase 13)
- For every new gap found after approval: scope honestly (quick fix vs. core architecture change).
- If cross-repo (contract + app), write coordinated issues with explicit `Depends on` references.
- Same issue rigor as the original batch; never build a fix before confirming repo/architecture dependencies.
