# StakeMind — Manual Freighter E2E Test Runbook

> Browser-based manual test runbook for the StakeMind web client (`client/`) against **Stellar testnet**. Covers wallet connect, SEP-10 auth, live balances, staking a goal, group pool deposits, and on-chain milestone verification — all signed through the **Freighter** browser extension.
>
> This is the human-in-the-loop counterpart to the automated scripts (`packages/sdk/scripts/smoke-test-stake*.mjs`, `verify:client-env` CI gate). The automated scripts prove the contract + SDK path; this runbook proves the full UI → Freighter → on-chain loop that automation can't drive (Freighter signing requires a real extension and per-tx user approval).

---

## 1. Prerequisites

| Requirement | Detail |
|---|---|
| Browser | Chrome / Firefox / Brave (Freighter supports all three) |
| **Freighter extension** | Installed from [freighter.app](https://freighter.app) or the browser store |
| Freighter account | Created or imported, with at least **~10 XLM** on **Testnet** (friendbot: `https://friendbot.stellar.org?addr=<G...>`) |
| Freighter network | **Testnet** (see §3) |
| Backend | API server running (needed for goal CRUD + SEP-10 auth): `cd server && npm install && npm run dev` (:5000) |
| Frontend | Dev server: `cd client && npm install && npm run dev` (http://localhost:3000) |
| Database | Supabase (hosted or local) reachable by `server/` — goals load from here |

**Deployed testnet contracts (already wired in `client/.env.local`):**

| Contract | Address |
|---|---|
| GoalStaking | `CD4IITXUDTML3VGTGK5UBMA4JHYILBDHOVMIDQGH6HUU4FCJRZ6TA2F7` |
| GroupEscrow | `CCX736W2FX4ETKPBKKXEANQO4KP43FVMKTLFVN3JWDCTIIHDIYCS25PI` |
| Milestone | `CDRNQD45NSHVRXYMXCANN7M2W4SIZRLDEW4S4LTUNDI2QAULC7HVYS7T` |
| Token (default stake) | Native XLM SAC (testnet) — set as `NEXT_PUBLIC_STAKING_TOKEN` |

**Client env reference** (`client/.env.local`, mirror the keys in `client/.env.local.example`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000          # or relative /api proxy
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_STAKING_TOKEN=<native XLM SAC on testnet>
NEXT_PUBLIC_GOAL_STAKING_CONTRACT_ID=CD4IITXUDTML3VGTGK5UBMA4JHYILBDHOVMIDQGH6HUU4FCJRZ6TA2F7
NEXT_PUBLIC_GROUP_ESCROW_CONTRACT_ID=CCX736W2FX4ETKPBKKXEANQO4KP43FVMKTLFVN3JWDCTIIHDIYCS25PI
NEXT_PUBLIC_MILESTONE_CONTRACT_ID=CDRNQD45NSHVRXYMXCANN7M2W4SIZRLDEW4S4LTUNDI2QAULC7HVYS7T
```

> **Never** put `ADMIN_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `STELLAR_AUTH_SECRET` in the client — `NEXT_PUBLIC_*` values are exposed to the browser.

---

## 2. Freighter setup (once)

1. Install the **Freighter** extension and pin it in the browser toolbar.
2. Create a new account (or import a seed) — the extension shows a `G...` public key.
3. Fund it: open `https://friendbot.stellar.org?addr=G...` (testnet only) or use the "Get testnet XLM" flow in Freighter's Testnet view.
4. Keep the extension unlocked for the whole test session.

---

## 3. Set Freighter to Testnet

Freighter defaults to **Mainnet** — the app hard-fails writes on a network mismatch (`assertWalletNetworkMatches`), so this step is mandatory.

1. Click the Freighter extension icon → **Settings** (gear).
2. Under **Network**, select **Testnet**.
3. Confirm the extension now shows the Testnet badge.

> If you skip this and try to stake, you'll get: `Network mismatch: your wallet is on mainnet, but the contract targets the Test SDF Network ; September 2015 network. Switch networks in Freighter.`

---

## 4. Test matrix

| # | Flow | Page / component | Result expected |
|---|---|---|---|
| T1 | Wallet connect + SEP-10 auth | Navbar / Sidebar wallet button | Address shown; JWT issued; wallet badge populated |
| T2 | Live balances | WalletBadge (Navbar) | XLM + USDC balances, shimmer on first load, refresh works |
| T3 | Stake a goal (XLM) | Goal detail → "Stake this goal" | Freighter popup → approve → tx SUCCESS; `goal_staked` event; balance drops |
| T4 | Stake — network mismatch | Same, wallet on Mainnet | Friendly error; no tx submitted |
| T5 | Stake — insufficient balance | Same, amount > available | Inline error; no tx submitted |
| T6 | Deposit to group pool | Group detail → "Community Pool" | Deposit signed via Freighter; pool balance/contributors update |
| T7 | Verify milestone on-chain | Goal detail → per-milestone button | Admin wallet: receipt stored, "On-chain" badge. Non-admin: "unauthorized" error |
| T8 | Refresh balances | WalletBadge refresh button | Balances refetch via Horizon (shared store dedupes) |

---

## 5. Step-by-step

### T1 — Connect wallet + SEP-10 auth

1. Open http://localhost:3000. Expect the home page to render with the navbar.
2. Click the **Connect wallet** button (Navbar or Sidebar).
3. Freighter shows an **access request** popup → **Approve**.
4. The app runs the **SEP-10 challenge** against `server/` and exchanges it for a JWT.
5. **Pass criteria:** navbar now shows your truncated `G...` address; refresh the page — you stay logged in (JWT persisted); Sidebar shows the same connected state.

### T2 — Live balances

1. With the wallet connected, look at the **WalletBadge** in the Navbar.
2. **Pass criteria:**
   - Balance line shows **XLM** (and **USDC** if you hold any, e.g. after the §7 optional trustline step).
   - First load shows a **shimmer/skeleton** for a moment, then real numbers.
   - Click the **refresh** icon → spinner spins briefly, balances update.
   - Opening the same account on a goal page does **not** duplicate Horizon calls (shared `balancesStore` — check DevTools Network for a single fetch).

### T3 — Stake a goal (the core flow)

Prereq: have a goal in the app (create one if the list is empty — the API serves goal CRUD).

1. Go to **Goals → open a goal**.
2. In the right column, find **"Stake this goal"**.
3. The **Available** line shows your XLM balance (from T2's shared store).
4. Enter an amount, e.g. **5 XLM** (leave at least ~1 XLM for fees).
5. Click **Stake this goal** (label becomes "Connect wallet & stake" if not yet connected).
6. **Freighter popup appears** with the `stake_goal` invocation → review → **Approve**.
7. **Pass criteria:**
   - Toast: **"Goal staked on-chain!"** with a **View transaction** link.
   - The link resolves on Stellar Expert (testnet): `https://stellar.expert/explorer/testnet/tx/<hash>` → `SUCCESS`.
   - The stake card swaps to the **"Goal staked on-chain"** confirmation state.
   - Your XLM balance in the badge drops by the staked amount + fees.
   - (Optional) Check the `goal_staked` event via the indexer/Supabase `event_log`, or prove the identical on-chain path with the SDK: `cd packages/sdk && node scripts/smoke-test-stake.mjs`. Note: the smoke script funds its **own fresh keypair** and stakes its own test goal (not yours), so it validates the contract+SDK path — it does **not** verify the specific tx you just made from the UI.

### T4 — Network mismatch (negative test)

1. In Freighter settings, switch to **Mainnet**.
2. Try to stake again.
3. **Pass criteria:** an error toast matching the §3 message appears; **no** Freighter signing popup is shown (the guard runs before signing); no on-chain tx.
4. Switch back to **Testnet** before continuing.

### T5 — Insufficient balance (negative test)

1. Enter an amount larger than your available XLM (e.g. `999999`).
2. **Pass criteria:** inline red error "Insufficient balance — you have X XLM available"; the Stake button doesn't submit.

### T6 — Deposit to a group pool

Prereq: open a group (Groups → detail).

1. Find the **Community Pool** card.
2. If the pool exists on-chain, it shows **balance (XLM)** and **contributor count**; otherwise "No pool yet" (or "connect wallet to view" if not connected).
3. Enter a deposit amount (e.g. **2 XLM**), click **Deposit**.
4. Approve the **`deposit_pool`** invocation in Freighter.
5. **Pass criteria:** success toast with Stellar Expert tx link; the pool card refreshes showing the increased balance and `member_count ≥ 1`.
6. Verify on-chain: `https://stellar.expert/explorer/testnet/contract/CCX736W2FX4ETKPBKKXEANQO4KP43FVMKTLFVN3JWDCTIIHDIYCS25PI`.

### T7 — Verify a milestone on-chain

1. On a goal with milestones, click **Verify on-chain** on a milestone row (only shows when staking is configured).
2. **Admin wallet** — the contract's admin (the deployment key `GDUDNBEMAHWXDKW5MUUGAOVJ7EUZZUGGMPUKW6URBTKZPREI3AUY2PFE` that owns the contracts). The UI submits the **connected wallet** as the admin key, so you must actually be logged in with *that specific account* in Freighter:
   - Approve the `verify_milestone` invocation in Freighter.
   - **Pass criteria:** toast "Milestone verified on-chain!" + tx link; the milestone shows the green **On-chain** badge with timestamp.
3. **Any other wallet** (non-admin):
   - **Pass criteria:** error toast (contract rejects with unauthorized); the button returns to normal; no badge.

### T8 — Refresh balances

1. Click the **refresh** icon in the WalletBadge.
2. **Pass criteria:** icon spins, then balances update from Horizon; if a stake/deposit just landed, the numbers reflect it.

---

## 6. Troubleshooting

| Symptom | Cause → Fix |
|---|---|
| "Freighter is not installed" | Extension missing or page loaded before install → install, then hard-reload the tab |
| `Network mismatch: ... mainnet ...` | Freighter on wrong network → switch to **Testnet** (§3) |
| `Contract not found` / simulate fails | Wrong network (mainnet has no testnet contracts) → same fix |
| Staking disabled in UI (`isStakingConfigured()` false) | Missing `NEXT_PUBLIC_*_CONTRACT_ID` in `client/.env.local` → copy from `client/.env.local.example`, restart dev server |
| Goals list empty | `server/` or Supabase not reachable → check `server` logs, `/health` on :5000, `NEXT_PUBLIC_API_URL` |
| Balance shows `unavailable` / skeleton forever | Horizon unreachable or account brand-new with no history → check `NEXT_PUBLIC_HORIZON_URL`; fund via friendbot |
| Tx succeeds but UI still says staking | Indexer not running → `goal_staked` won't appear in Supabase; on-chain state is still correct (verify on Stellar Expert) |
| "Insufficient XLM" despite funding | XLM reserve (~1 XLM) + trustlines; stake less, or fund more |

---

## 7. Optional — USDC (non-native asset)

The default stake token is native XLM. To test a **non-native** asset end-to-end from the UI:

1. Add a **USDC trustline** (canonical testnet issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`) in Freighter.
2. Fund with testnet USDC (Circle faucet `faucet.circle.com` → Stellar Testnet; delivery is asynchronous — the repo's `packages/sdk/scripts/watch-usdc-seed.mjs` polls until it lands).
3. Set `NEXT_PUBLIC_STAKING_TOKEN` to the testnet USDC SAC, restart, then repeat T3.
4. Automated equivalent: `cd packages/sdk && USDC_SEED_SECRET=S... npm run smoke:stake-usdc` (funds a fresh keypair, trustline, transfer, stakes, verifies the `goal_staked` event with the USDC token).

---

## 8. Session checklist (sign-off)

- [ ] Freighter installed, unlocked, on **Testnet**, funded
- [ ] T1 wallet connect + SEP-10 auth
- [ ] T2 balances (skeleton → values → refresh)
- [ ] T3 stake a goal → tx SUCCESS on Stellar Expert → balance drops
- [ ] T4 network mismatch rejected before signing
- [ ] T5 insufficient balance rejected inline
- [ ] T6 group pool deposit → pool state updates
- [ ] T7 milestone verify (admin OK / non-admin rejected)
- [ ] T8 refresh balances
- [ ] No secrets in DevTools / Network tab (only `NEXT_PUBLIC_*` + anon Supabase key)

Mark all green → the client wallet integration is verified against testnet. For the Drips Wave submission, capture a short screen recording of T1–T3 + T6–T7 as the demo video.
