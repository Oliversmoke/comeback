# StakeMind — Wave Playbook, Phases 4–5 (Naming, Scoping, Contract Spec)

---

## Phase 4 — Naming, Scoping, Repo Structure

### Name
**StakeMind** — confirmed (already used across README, contracts, ISSUES.md).

### Plain-English description (for a non-technical person and a grant reviewer)

> StakeMind puts real money behind personal goals. You stake XLM or USDC on a goal you commit to — hit the deadline and you get your stake back plus a reward bonus; miss it and your stake flows into community challenge pools that reward people who actually follow through. An AI coach checks in on your progress, reviews evidence, and keeps you accountable. Every completed milestone produces a verifiable receipt on the Stellar network, so your track record is provable and portable. It's a productivity app with real consequences and real rewards, built on Stellar's Soroban smart contracts.

### Repo structure

Current repo is a **single monorepo** (`Oliversmoke/comeback`). The playbook's preferred shape is a split:

```
{name}-contract   ← pure Rust Soroban workspace (goal-staking, group-escrow, milestone)
{name}-app        ← monorepo: packages/sdk, apps/web (client), indexer/, server/
```

**Decision:** StakeMind's contracts are small and currently colocated under `comeback-contract/`. **Recommend splitting** `comeback-contract/` into `stakemind-contract/` (its own GitHub repo) and the rest into `stakemind-app/`, maximizing Wave program surface area (two approved repos). This is a structural change — deferred until the user confirms the split (it touches CI, git remotes, and deploy scripts).

---

## Phase 5 — Contract Architecture

### Contracts and single responsibilities

| Contract | Single responsibility |
|---|---|
| **GoalStakingContract** | Escrow a user's stake against a goal; finalize as completed (return stake + bonus) or forfeited (stake stays in contract for redistribution). |
| **GroupEscrowContract** | Pool community stakes for group challenges and distribute prizes to winners. |
| **MilestoneContract** | Emit and store verifiable on-chain receipts for completed milestones. |

### Dependency graph (build/deploy order)

```
GoalStaking  ──(independent)──▶ deploy first
GroupEscrow  ──(independent)──▶ deploy anytime
Milestone    ──(independent)──▶ deploy anytime
```

All three contracts are currently **independent** (no cross-contract calls in source). Deploy order is therefore arbitrary; the playbook's deploy script uses GoalStaking → GroupEscrow → Milestone.

### GoalStakingContract — full spec (from source)

**Storage:**
- Instance: `Admin: Address`
- Persistent: `Stake(goal_id: u64) -> StakeInfo { user: Address, token: Address, amount: i128, deadline: u64, completed: bool, forfeited: bool }`

**Functions:**
| Function | Params | Return | Auth |
|---|---|---|---|
| `initialize` | `admin: Address` | — | — (panics if already initialized) |
| `stake_goal` | `user: Address, goal_id: u64, token_address: Address, amount: i128, deadline: u64` | — | `user.require_auth()`; transfers `amount` from user to contract; panics if amount ≤ 0 or goal already staked; `deadline` (0 = none) enables auto-forfeit via `expire_goal` |
| `expire_goal` | `goal_id: u64` | — | anyone, when `env.ledger().timestamp() > deadline`; auto-forfeit path — marks stake forfeited and emits `goal_expired` |
| `complete_goal` | `admin: Address, goal_id: u64` | — | `admin.require_auth()` + equals stored admin; pays back `amount + amount/10` to user |
| `forfeit_goal` | `admin: Address, goal_id: u64` | — | `admin.require_auth()` + equals stored admin; marks forfeited |
| `get_stake` | `goal_id: u64` | `StakeInfo` | public read |

**Events:** `("goal_staked", goal_id) -> amount`, `("goal_completed", goal_id) -> return_amount`, `("goal_forfeited", goal_id) -> amount`, `("goal_expired", goal_id) -> amount`

### GroupEscrowContract — full spec (from source)

**Storage:**
- Instance: `Admin: Address`
- Persistent: `Pool(group_id: u64) -> GroupPool { token: Address, total_balance: i128, member_count: u32 }`

**Functions:**
| Function | Params | Return | Auth |
|---|---|---|---|
| `initialize` | `admin: Address` | — | — (panics if already initialized) |
| `deposit_pool` | `user: Address, group_id: u64, token_address: Address, amount: i128` | — | `user.require_auth()`; transfers to contract; increments balance + member_count |
| `distribute_prize` | `admin: Address, group_id: u64, winner: Address, amount: i128` | — | `admin.require_auth()` + equals stored admin; panics if pool balance < amount |
| `get_pool` | `group_id: u64` | `GroupPool` | public read |

**Events:** `("pool_deposit", group_id) -> amount`, `("prize_distributed", group_id) -> amount`

> Note: `member_count` increments per deposit, not per unique member address (a member depositing twice counts twice). A pool is denominated in a single token — deposits in any other token are rejected (`token mismatch`).

### MilestoneContract — full spec (from source)

**Storage:**
- Instance: `Admin: Address`
- Persistent: `Receipt(goal_id: u64, milestone_id: u64) -> MilestoneReceipt { user: Address, goal_id: u64, milestone_id: u64, timestamp: u64 }`

**Functions:**
| Function | Params | Return | Auth |
|---|---|---|---|
| `initialize` | `admin: Address` | — | — (panics if already initialized) |
| `verify_milestone` | `admin: Address, user: Address, goal_id: u64, milestone_id: u64` | — | `admin.require_auth()` + equals stored admin; panics if already verified; `timestamp = env.ledger().timestamp()` |
| `get_receipt` | `goal_id: u64, milestone_id: u64` | `MilestoneReceipt` | public read |

**Events:** `("milestone_verified", goal_id) -> milestone_id`

### Known gaps (must-fix before submission — see Phase 3 gates)

1. **No reward funding source** for the +10% bonus in `complete_goal` (drains contract balance).
2. ~~No deadline in `StakeInfo` — goals can't auto-forfeit.~~ **Implemented:** `deadline` field + `expire_goal` (anyone, past deadline) + `goal_expired` event. (ISSUES.md #1, P0 — close on merge.)
3. **Admin-trusted finalization** — all state-changing functions are admin-gated. State the trust model; multi-verifier is the upgrade path.
4. ~~No tests~~ **Implemented:** `#[cfg(test)]` integration suites for all three contracts — goal-staking (stake/complete/forfeit/expire + deadline enforcement), group-escrow (deposit/distribute/insufficient pool/auth), milestone (verify/duplicate/unauthorized/readback). (ISSUES.md #251-253, P0 — close on merge.)

### SDK + indexer spec (for the app repo)

- **SDK** (`packages/sdk`): `StakeMindSDK` class with real Soroban invocation XDR builders (`buildStakeGoalXdr`, `buildVerifyMilestoneXdr`, `prepareInvocation`, `submitAndConfirm`) — implemented and tested (9 unit tests) since commit `e4c8514`. (ISSUES.md #51, P0 — now closed.)
- **Indexer** (`indexer/`): currently a stub (`setInterval(pollEvents, 10000)` that does nothing) — must implement real RPC event polling, ScVal decoding, and Supabase sync. (ISSUES.md #191-193, P0.)
