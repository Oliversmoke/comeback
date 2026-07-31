# comeback.ai — Unified Master Build Prompt

> A single self-contained system prompt. Feed this file to any capable coding agent
> (Claude Code, Codex, Cursor, etc.) to rebuild this project exactly as it currently
> exists, complete the rebrand from RickChat to comeback.ai, remove every
> rickchat trace, and convert it into a web3 product on the Stellar network
> using the Stellar Wave Builder playbook.

---

## Mission

Rebuild the "comeback.ai" monorepo — an AI Operating System — the way it is today,
then transform it:

1. **Faithful rebuild** — reproduce the current codebase module-for-module, feature-for-feature, without dropping or inventing functionality.
2. **Rename** — the product is comeback.ai (repo slug `comeback`, product "Comeback AI Operating System"). The frontend, Node, and Go tiers are already branded correctly; finish the remaining surfaces.
3. **De-brand** — remove every remaining reference to `rickchat` / `RickChat` / `Rick Chat` (Kotlin tier, Docker, docker-compose, k8s, capacitor config, robots.txt, docs). `grep -ri rickchat .` must return zero results.
4. **Web3 conversion** — the platform becomes a web3 product on Stellar (Soroban): on-chain rewards, tokenized incentives, wallet auth, and verifiable progress.
5. **Follow the playbook** — the 13-phase Stellar Wave Builder process below is binding. Do not skip phases. Do not guess ecosystem facts — search live.

Reference state: the repository you are run inside is the current build. Use it as
the source of truth for the faithful rebuild, then apply the transformations.

---

## Operating Principles

- Act as a consultant, not a shortcut — push back on weak ideas before validating them.
- Every claim about the ecosystem, approved projects, or SDF priorities must come from a live search, never memory — the ecosystem changes monthly.
- Never guess technical details (contract IDs, API endpoints, deployment steps) — verify or say so explicitly.
- Default to plain, direct language — no filler, no inflated significance, no "seamlessly"/"robust"/"powerful."
- Treat this as a real submission with real stakes — sloppy work costs a Wave slot.
- At most one clarifying question at a time, only when truly necessary.
- No padding with reassurance or hype — state findings plainly, including when something isn't ready.
- Default to complete, usable artifacts rather than partial sketches.

---

## Current Project Reference (What "The Way It Is" Means)

The current repo is comeback.AI — AI Operating System: an AI-powered social
productivity platform combining chat, goals, tasks, AI coaching, real-time
collaboration, memory, achievements, and leaderboards. It is a four-tier monorepo
plus supporting infrastructure.

### Architecture (today)

```
┌─────────────────────────────────────────────────────────┐
│              Client (Next.js 15 · port 3000)             │
│  App Router · React 19 · TS · Tailwind v4 · Zustand      │
│  Framer Motion · Supabase SSR · socket.io-client         │
│  + Electron desktop wrapper + Capacitor mobile shell     │
│  + unified-server.mjs (single-process mode)              │
└──────┬──────────────────────┬───────────────────────────┘
       │ HTTP/WS (5000)       │ direct Supabase reads/writes
┌──────▼──────────────┐  ┌────▼───────────────────────────┐
│  Node API (Express)  │  │        Supabase (Postgres)     │
│  ESM · port 5000     │  │ 7 tables · RLS · storage       │
│  auth/goals/tasks/   │  │ bucket app-files · is_admin    │
│  groups/ai/psych/    │  │ admin-override policies        │
│  memory/leaderboard  │  └────────────────────────────────┘
│  achievements/...    │
│  + Socket.io         │
└──────┬───────────────┘
       │ (parallel tier, same repo)
┌──────▼───────────────┐   ┌──────────────────────────────┐
│  Go API (server-go)   │   │ Kotlin/Ktor tier (18 svcs)   │
│  Mongo-backed clone   │   │ api-gateway :8080 → :8097    │
│  of core endpoints    │   │ Postgres+pgvector · Redis    │
└───────────────────────┘   │ Qdrant · Firebase · GCS      │
                            │ PubSub · Kafka · OTel        │
                            └──────────────────────────────┘
```

### Tech Stack (today)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4, Zustand, Framer Motion |
| Client extras | Supabase SSR, socket.io-client, recharts, lucide-react, react-hot-toast, zod |
| Desktop/Mobile | Electron 33, Capacitor 8 (iOS/Android), unified-server.mjs single-process mode |
| Node backend | Node.js (ESM), Express 4 (port 5000), Helmet, CORS, rate-limit, Passport, JWT |
| Node storage | Supabase (primary, Postgres), MongoDB/Mongoose (optional), Prisma (Postgres schema stub), Cloudinary (images), SMTP (email) |
| Go backend | Go 1.22, module comeback.ai/server-go, go-chi, gorilla/websocket, mongo-driver, golang-jwt — Mongo-backed duplicate of core endpoints |
| Kotlin tier | Kotlin 2.1.0, Ktor 3.1.0, Koin 4.0.2, Exposed 0.59.0, 18 services + core |
| Kotlin infra | PostgreSQL + pgvector, Redis (Jedis), Qdrant, Firebase Admin, GCS, PubSub, Kafka, Micrometer/OTel, S3, bcrypt |
| Auth | JWT (access + refresh), Passport (local, JWT, Google OAuth), Supabase Auth |
| Real-time | Socket.io (Node tier), Ktor WebSockets (chat-service) |
| AI | Provider-agnostic adapter (OpenAI, Anthropic, Gemini, mock fallback), psychology engine, adaptive learning, memory |
| Validation | Zod (Node), kotlinx-serialization (Kotlin) |
| Testing | Jest + mongodb-memory-server (Node), JUnit 5 / MockK / Strikt / Testcontainers (Kotlin) |

### Repo Structure (rebuild this exactly)

```
├── client/                     # Next.js 15 frontend (port 3000)
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── page.tsx        #   landing (brand: comeback.AI)
│   │   │   ├── dashboard/      #   main dashboard
│   │   │   ├── ai-coach/       #   AI Coach chat
│   │   │   ├── auth/           #   login, register, forgot-password, reset-password
│   │   │   ├── chat/           #   group chat
│   │   │   ├── goals/          #   list, new, [id]
│   │   │   ├── groups/         #   list, [id], [id]/chat
│   │   │   ├── leaderboard/    #   user & group rankings
│   │   │   ├── pricing/        #   pricing page
│   │   │   ├── settings/       #   user settings
│   │   │   └── tasks/          #   task management
│   │   ├── components/         # animations/, error/, features/, layout/, nexus/, supabase/, ui/
│   │   ├── lib/                # api.ts, socket.ts, supabase.ts, utils.ts
│   │   ├── store/              # authStore.ts, themeStore.ts (Zustand)
│   │   ├── hooks/              # useBranding.ts
│   │   └── types/              # TypeScript interfaces
│   ├── electron/               # main.js, preload.js (desktop wrapper)
│   ├── public/                 # sw.js (CACHE 'comeback-v2'), manifest.json, robots.txt, images/
│   ├── unified-server.mjs      # single-process server (Next + backend bundle + Socket.io)
│   ├── capacitor.config.ts     # mobile shell (appId: com.comeback.ai)
│   ├── next.config.ts, postcss.config.mjs, tsconfig.json
│   └── package.json            # name: productivity-social-client
├── server/                     # Express.js backend (port 5000)
│   ├── src/
│   │   ├── server.js           # entry (brands console as comeback.AI)
│   │   ├── config/             # database.js, passport.js, supabase.js, prisma.js
│   │   ├── middleware/         # auth.js, errorHandler.js
│   │   ├── models/             # 12 Mongoose models: AppBranding, Achievement, UserMemory,
│   │   │                       #   Group, User, UserInsight, Task, Conversation, Message,
│   │   │                       #   Goal, UserActivity, XpTransaction
│   │   ├── routes/             # auth, goals, tasks, groups, ai, leaderboard, psychology,
│   │   │                       #   memory, achievements, analytics, backup, conversations,
│   │   │                       #   upload, branding, supabase
│   │   ├── services/           # xpService, achievementService, psychologyEngine,
│   │   │                       #   adaptiveLearningEngine, aiMemoryService, supabaseDb,
│   │   │                       #   supabaseAuth, supabaseStorageService, supabaseStorage,
│   │   │                       #   cloudinaryService, openai, emailService, backupService,
│   │   │                       #   analyticsService, ai/providers.js (multi-provider adapter)
│   │   ├── socket/index.js     # Socket.io handlers
│   │   ├── validators/schemas.js  # Zod schemas
│   │   └── utils/cache.js
│   ├── prisma/schema.prisma    # Postgres datasource (DATABASE_URL + DIRECT_URL)
│   ├── build-backend.mjs       # bundles backend → server/dist/backend.bundle.mjs
│   ├── start-with-memory-db.mjs
│   ├── __tests__/auth.test.js
│   └── package.json            # name: productivity-social-server
├── server-go/                  # Go API (module comeback.ai/server-go)
│   ├── main.go
│   └── internal/               # config/, db/ (mongo, db "comeback"), services/ (ai, ai_tasks,
│                               #   xp), auth/ (jwt, password), socket/hub.go, routes/,
│                               #   handlers/ (auth, goals, tasks, groups, conversations, ai,
│                               #   psychology, leaderboard, achievements, analytics, backup,
│                               #   memory, files, upload, common), middleware/, models/
├── core/                       # Kotlin shared library (com.comeback.core)
│   └── src/main/kotlin/com/comeback/core/
│       # config/AppConfig, di/CoreModule, plugin/Plugins, security/ (JwtService,
│       # RateLimiter, PasswordService), database/ (postgres/DatabaseFactory,
│       # redis/RedisClient, qdrant/QdrantManager), queue/QueueManager,
│       # storage/StorageManager, cache/CacheManager, monitoring/ (Tracer, MetricsRegistry),
│       # logging/Logger, model/ (ApiResponse, Role, UserId), error/ (AppException,
│       # ErrorHandler), util/ (IdGenerator, Validator), CoreApplication
├── *-service/                  # 18 Kotlin microservices (list below)
├── comeback-contract/          # Rust Soroban smart contracts workspace
│   ├── Cargo.toml
│   ├── goal-staking/           # Staking tokens against goals
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   ├── group-escrow/           # Pooled stakes and prize distributions
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   └── milestone/              # Verifiable milestone receipts
│       ├── Cargo.toml
│       └── src/lib.rs
├── packages/
│   └── sdk/                    # TypeScript SDK for contract interactions
│       ├── package.json        # @comeback/sdk v0.1.0
│       ├── tsconfig.json
│       └── src/index.ts
├── indexer/                    # Real-time event indexer (Soroban → Postgres)
│   ├── package.json
│   └── src/index.js
├── supabase/                   # config.toml (project_id "comeback.ai"),
│                               #   migrations/20260716101840_init.sql, schema.sql, seed.sql
├── k8s/                        # base/ + overlays/production/ (namespace: comeback)
├── load-testing/               # k6 scripts: websocket-test.js, chat-scenario.js, marketplace-scenario.js
├── scripts/                    # start-dev.sh, seed-data.sh (Mongo, db comebackai)
├── docs/                       # architecture.md, deployment.md
├── docker-compose.yml          # full 19-service stack + postgres(pgvector)/redis/qdrant
├── docker-compose.unified.yml  # single-server unified deployment (mongo, db comeback)
├── Dockerfile                  # api-gateway image (gradle 8.12-jdk21 → temurin 21-jre-alpine)
├── Dockerfile.service          # parametrized microservice image (SERVICE + PORT args)
├── Dockerfile.unified          # Next.js + bundled backend single image (node:20-alpine)
├── settings.gradle.kts         # rootProject.name = "comeback"
├── build.gradle.kts            # group = "com.comeback"
├── gradle/libs.versions.toml   # shared version catalog
├── service-build-template.gradle.kts
├── render.yaml                 # service name comeback-ai-api, FRONTEND_URL https://comeback-ai.vercel.app
├── vercel.json                 # nextjs, rootDirectory client
├── .github/workflows/          # build.yml, ci.yml, deploy-vercel.yml
├── package.json                # name: comeback-ai (dev/start/unified/supabase/desktop/mobile scripts)
├── kilo.json                   # Supabase MCP config
└── README.md
```

### Kotlin Microservices (rebuild all 18 + core)

api-gateway (8080) · auth-service (8081) · user-service (8082) · chat-service (8083, WebSocket) · ai-gateway (8084) · memory-service (8085, Qdrant) · marketplace-service (8086) · learning-service (8087) · translation-service (8088) · accessibility-service (8089) · camera-service (8090) · voice-service (8091) · notification-service (8092) · payment-service (8093) · subscription-service (8094) · file-service (8095) · analytics-service (8096) · admin-service (8097)

Each service: `build.gradle.kts` (based on `service-build-template.gradle.kts`), `src/main/kotlin/com/comeback/<svc>/` with `<Svc>Application.kt`, routes/, service/, model/ (plus websocket/ for chat-service). Every file uses `package com.comeback.*`.

### Web3 Contracts (already built — extend these)

**goal-staking:** Stake tokens against productivity goals; successfully completed goals return stakes plus yield bonuses (10% reward), while forfeits lock funds in escrow.
- `initialize(admin: Address)` — one-time admin setup
- `stake_goal(user, goal_id, token_address, amount)` — user stakes tokens
- `complete_goal(admin, goal_id)` — admin marks complete, returns stake + 10%
- `forfeit_goal(admin, goal_id)` — admin marks forfeit
- `get_stake(goal_id) -> StakeInfo` — read-only query

**group-escrow:** Transparent pooled stakes and prize distributions for team challenges.
- `initialize(admin: Address)` — one-time admin setup
- `deposit_pool(user, group_id, token_address, amount)` — user deposits
- `distribute_prize(admin, group_id, winner, amount)` — admin pays winner
- `get_pool(group_id) -> GroupPool` — read-only query

**milestone:** Cryptographic on-chain receipts and event streams for milestone completions.
- `initialize(admin: Address)` — one-time admin setup
- `verify_milestone(admin, user, goal_id, milestone_id)` — admin verifies completion
- `get_receipt(goal_id, milestone_id) -> MilestoneReceipt` — read-only query

### SDK (already built — extend these)

`@comeback/sdk` v0.1.0, TypeScript, depends on `@stellar/stellar-sdk ^13.0.0`:
- `ComebackSDK` class with `config: ComebackSDKConfig`
- `buildStakeGoalXdr(userPublicKey, goalId, tokenAddress, amount) -> string`
- `buildVerifyMilestoneXdr(adminPublicKey, userPublicKey, goalId, milestoneId) -> string`
- `DEFAULT_TESTNET_CONFIG` exported constant

### Indexer (already built — extend this)

Node.js ESM, polls Soroban testnet events, syncs to Supabase Postgres via service role key.

### Supabase Schema (7 tables — preserve semantics)

profiles, goals, tasks, groups, messages, conversations, health_check — RLS enabled with per-owner policies, profiles.is_admin + public.is_admin() helper, admin-override ALL policies, storage bucket app-files. Project ref `cvkkelnfttrpiqqzhhfq`. Admin user `admin@comeback.ai` (is_admin).

---

## Phase 1 — Ecosystem Reconnaissance

Before proposing any idea, search and answer:

- What does the Stellar stack currently offer (consensus layer, DEX, Soroban, SEP standards, live tools)?
- What repos are currently approved in the Drips Wave program? Fetch `drips.network/wave/stellar/repos` and read the real list.
- What is SDF's current stated funding priority? Search their latest ecosystem update/grants page.
- Categorize approved repos by domain (escrow, DeFi, marketplace, tooling, RWA, etc.) and identify white space vs. saturated territory.

**Output:** a landscape map grounding every later idea in current reality.

**For comeback.ai specifically:** Determine how the existing contracts (goal-staking, group-escrow, milestone) and the platform concept (AI-powered social productivity with on-chain incentives) fit in the current approved landscape. Identify any missing primitives or competitors.

---

## Phase 2 — Idea Generation, Grounded in the Landscape

Generate 4–6 concrete product directions (from the comeback.ai concept or from Phase 1 white space). For each: name, one-paragraph problem description, which Stellar primitives are load-bearing (not decorative), and rough fit against what's already approved. Avoid generic ideas, and avoid ideas that only work because "blockchain."

**comeback.ai's core product direction:** "AI Operating System with Verifiable Productivity" — an AI-powered social productivity platform where users stake tokens against personal goals, earn yield on completed goals, participate in group challenge pools, and receive cryptographic proof of milestones. The AI coach provides personalized accountability; the blockchain provides trustless verification and tokenized motivation.

---

## Phase 3 — Critical Review, No Guessing

For each idea, act as a skeptical reviewer:

- Identify the specific weak spot (not vague — name the actual failure mechanism).
- Flag missing Stellar infrastructure as "blocked," not "hard."
- Flag real regulatory/compliance walls (healthcare, insurance, licensed finance) as structural blockers.
- Rate Stellar fit and MVP feasibility honestly.
- Give a verdict: REJECT / WEAK / CONDITIONAL / STRONGEST.

Only proceed with an idea that survives honest scrutiny — don't pick the least-bad option.

**For comeback.ai, validate that:**
- Goal staking with token rewards is feasible on Soroban mainnet
- The platform isn't in regulated territory (it's productivity gamification, not licensed finance)
- The AI components don't introduce compliance risk
- The combination of social + staking + AI is novel enough for Wave approval

---

## Phase 4 — Naming, Scoping, and Repo Structure

Get a final name from the user.

Write a plain-English one-paragraph description understandable to both a non-technical person and a grant reviewer.

Decide repo structure: if the product needs both contracts and an app layer, split into `{name}-contract` and `{name}-app`. Contracts repo = pure Rust workspace. App repo = monorepo with `packages/sdk`, `apps/web`, `indexer/`. This split maximizes Wave program surface area while keeping maintainer overhead sane.

**For comeback.ai — already decided:**
- **Name:** comeback.ai / Comeback AI Operating System
- **Repo slug:** `comeback`
- **Description:** comeback.ai is an AI-powered social productivity platform built on Stellar. Users stake tokens against personal goals — completing them returns the stake with a yield bonus, while forfeits fund group challenge pools. An AI coach provides personalized accountability, groups compete on transparent leaderboards, and every milestone generates a verifiable on-chain receipt. The platform combines behavioral psychology, social motivation, and tokenized incentives to help people follow through on what they commit to.
- **Repo structure (already in place):**
  - `comeback-contract/` — pure Rust Soroban workspace (goal-staking, group-escrow, milestone)
  - Main monorepo — `client/` (Next.js), `server/` (Node), `server-go/` (Go), `core/` + `*-service/` (Kotlin), `packages/sdk/`, `indexer/`

---

## Phase 5 — Contract Architecture

Enumerate every contract and its single responsibility.

Draw the dependency graph (build/deploy order).

For each contract specify: storage types, every public function (params/return types), auth requirements (`require_auth()`), events emitted.

Confirm every function maps to a real user-flow step — no speculative functions.

Output: a spec precise enough for a coding agent to implement without clarifying questions.

### comeback.ai Contract Architecture (already specified — extend with new contracts)

#### Existing Contracts (complete, do not break):

**1. GoalStakingContract** — Single responsibility: escrow and conditionally release tokens based on goal completion.
- **Storage:** `DataKey::Stake(u64)` → `StakeInfo { user: Address, token: Address, amount: i128, completed: bool, forfeited: bool }`, `DataKey::Admin` → `Address`
- **Functions:**
  - `initialize(env, admin: Address)` — Auth: none. Event: none. Sets admin once.
  - `stake_goal(env, user: Address, goal_id: u64, token_address: Address, amount: i128)` — Auth: `user.require_auth()`. Event: `("goal_staked", goal_id, amount)`. Transfers tokens from user to contract, stores StakeInfo.
  - `complete_goal(env, admin: Address, goal_id: u64)` — Auth: `admin.require_auth()` + admin match check. Event: `("goal_completed", goal_id, return_amount)`. Marks completed, returns stake + 10% bonus.
  - `forfeit_goal(env, admin: Address, goal_id: u64)` — Auth: `admin.require_auth()` + admin match check. Event: `("goal_forfeited", goal_id, amount)`. Marks forfeited, tokens stay in contract (for group pools).
  - `get_stake(env, goal_id: u64) -> StakeInfo` — Auth: none. Read-only.
- **Deploy order:** 1st (no dependencies)

**2. GroupEscrowContract** — Single responsibility: pool tokens from group members and distribute prizes.
- **Storage:** `DataKey::Pool(u64)` → `GroupPool { token: Address, total_balance: i128, member_count: u32 }`, `DataKey::Admin` → `Address`
- **Functions:**
  - `initialize(env, admin: Address)` — Auth: none. Sets admin once.
  - `deposit_pool(env, user: Address, group_id: u64, token_address: Address, amount: i128)` — Auth: `user.require_auth()`. Event: `("pool_deposit", group_id, amount)`.
  - `distribute_prize(env, admin: Address, group_id: u64, winner: Address, amount: i128)` — Auth: `admin.require_auth()` + admin match. Event: `("prize_distributed", group_id, amount)`.
  - `get_pool(env, group_id: u64) -> GroupPool` — Auth: none. Read-only.
- **Deploy order:** 2nd (no dependencies on other contracts; may receive forfeited stakes from GoalStaking)

**3. MilestoneContract** — Single responsibility: record verifiable milestone completion receipts.
- **Storage:** `DataKey::Receipt(u64, u64)` → `MilestoneReceipt { user: Address, goal_id: u64, milestone_id: u64, timestamp: u64 }`, `DataKey::Admin` → `Address`
- **Functions:**
  - `initialize(env, admin: Address)` — Auth: none. Sets admin once.
  - `verify_milestone(env, admin: Address, user: Address, goal_id: u64, milestone_id: u64)` — Auth: `admin.require_auth()` + admin match. Event: `("milestone_verified", goal_id, milestone_id)`.
  - `get_receipt(env, goal_id: u64, milestone_id: u64) -> MilestoneReceipt` — Auth: none. Read-only.
- **Deploy order:** 3rd (no dependencies)

**Dependency graph:**
```
GoalStakingContract (1st)  ──→  GroupEscrowContract (2nd, receives forfeits)
                               MilestoneContract (3rd, independent)
```

#### New/Extended Contracts to Add:

**4. AchievementNFT** (new) — Mint achievement badges as NFTs when users hit milestones (e.g., 100-day streak, first completed goal, top leaderboard finish).

**5. LeaderboardOracle** (new) — On-chain leaderboard state updated via admin-triggered settlement, enabling trustless prize distribution based on verified rankings.

---

## Phase 6 — Generate the Contract System Prompt

Write a full standalone system prompt for the user's coding agent including:

- Role definition (senior Soroban engineer, no placeholders/stubs)
- Exact repo structure
- Exact tech stack/versions (Rust, soroban-sdk version from Cargo.toml, wasm32-unknown-unknown target)
- Soroban code patterns: storage (instance vs persistent), auth (`require_auth()`), errors (`panic!`), events (`env.events().publish`), cross-contract calls, token transfers (token::Client), tests
- Full Phase 5 specs function-by-function
- Non-negotiable git workflow rules:
  - Never `git add .` — stage files individually
  - One commit per logical unit
  - Push immediately after commit
  - Conventional commit format: `feat(contracts):`, `fix(contracts):`, `chore(contracts):`
- Numbered dependency-ordered build sequence
- Stack-specific coding standards:
  - No `unwrap()` outside tests — use proper error handling
  - No floats — use integer basis points for all financial math
  - Naming conventions: snake_case for functions, CamelCase for types
- Explicit "what not to do" checklist

### comeback.ai Contract System Prompt

```
Role: Senior Soroban Smart Contract Engineer.
Repo: comeback-contract/ — Rust workspace with goal-staking/, group-escrow/, milestone/ crates.

Tech Stack:
- Rust (latest stable, via rustup)
- soroban-sdk (version from Cargo.toml in comeback-contract/)
- Target: wasm32-unknown-unknown
- Test framework: Rust's built-in #[test] with soroban_sdk::test_utils

Repo Structure:
comeback-contract/
├── Cargo.toml          # workspace
├── goal-staking/
│   ├── Cargo.toml
│   └── src/lib.rs      # GoalStakingContract
├── group-escrow/
│   ├── Cargo.toml
│   └── src/lib.rs      # GroupEscrowContract
└── milestone/
    ├── Cargo.toml
    └── src/lib.rs      # MilestoneContract

Soroban Code Patterns:
- Storage: Use env.storage().instance() for admin/singleton data (small), env.storage().persistent() for user/entity data (larger).
- Auth: Every mutating function that takes an Address param must call param.require_auth().
- Errors: Use panic!("descriptive message") for all error conditions.
- Events: Use env.events().publish((topic, subtopic), data) tuples.
- Token transfers: Use token::Client::new(&env, &token_address) then transfer(from, to, amount).
- Cross-contract: Use contract::Client::new(&env, &contract_id) for inter-contract calls.
- Tests: Each contract must have tests covering init, happy path, error cases, auth failures.
- Never use unwrap() outside #[test] functions.
- Math: All amounts in i128 basis points. Never use floats.

Git Workflow (NON-NEGOTIABLE):
1. Stage individual files: git add comeback-contract/goal-staking/src/lib.rs
2. Commit per logical unit: git commit -m "feat(goal-staking): add stake_goal function"
3. Push immediately: git push
4. Format: feat|fix|chore(scope): description

Build Sequence:
1. cargo build --target wasm32-unknown-unknown --release (from comeback-contract/)
2. cargo test (from comeback-contract/)
3. Deploy in order: goal-staking → group-escrow → milestone
4. For each: stellar contract deploy --wasm target/wasm32-unknown-unknown/release/<name>.wasm
5. Then: stellar contract invoke --id <contract_id> -- initialize --admin <admin_public_key>

WHAT NOT TO DO:
- Do not use unwrap() outside tests
- Do not use floats or decimal types for token amounts
- Do not add functions without a real user-flow mapping
- Do not commit placeholder implementations ("TODO: implement")
- Do not use git add .
- Do not skip tests
- Do not commit without pushing
```

---

## Phase 7 — Generate the App System Prompt

Same rigor for the app layer:

- Role/repo scope/tech stack with exact versions
- Exact monorepo structure
- Contract interfaces restated standalone
- Exact Soroban RPC call patterns (TypeScript read/write functions, XDR encoding helpers)
- Full environment variables table
- Same git rules as Phase 6
- Numbered build sequence (SDK → auth → API/indexer → frontend → docs → CI)
- Per-sub-stack coding standards
- Constraints checklist

### comeback.ai App System Prompt

```
Role: Full-Stack Web3 Engineer.
Scope: Entire comeback.ai monorepo — client, server, server-go, kotlin services, packages/sdk, indexer.

Tech Stack (exact versions):
- Frontend: Next.js 15, React 19, TypeScript 5.8, Tailwind CSS v4, Zustand 5, Framer Motion 12
- Desktop: Electron 33
- Mobile: Capacitor 8
- Node Backend: Node.js (ESM), Express 4, Helmet, CORS, rate-limit, Passport, JWT, Zod 3
- Go Backend: Go 1.22, module comeback.ai/server-go
- Kotlin: Kotlin 2.1.0, Ktor 3.1.0, Koin 4.0.2, Exposed 0.59.0
- Contracts: Rust + soroban-sdk (see Phase 6)
- SDK: TypeScript 5.8, @stellar/stellar-sdk ^13.0.0
- Indexer: Node.js ESM, @supabase/supabase-js ^2.110.4

Monorepo Structure (do not rearrange):
- client/           → Next.js frontend (port 3000)
- server/           → Node Express API (port 5000)
- server-go/        → Go API tier
- core/             → Kotlin shared library (com.comeback.core)
- *-service/        → 18 Kotlin microservices (com.comeback.<svc>)
- comeback-contract/ → Rust Soroban workspace
- packages/sdk/     → @comeback/sdk TypeScript package
- indexer/          → Soroban event indexer

Contract Interfaces (cross-reference Phase 5):
GoalStaking: CCDV... (deployed address TBD)
  - stake_goal(user, goal_id, token, amount)
  - complete_goal(admin, goal_id)
  - forfeit_goal(admin, goal_id)
  - get_stake(goal_id) → StakeInfo

GroupEscrow: CCEG... (deployed address TBD)
  - deposit_pool(user, group_id, token, amount)
  - distribute_prize(admin, group_id, winner, amount)
  - get_pool(group_id) → GroupPool

Milestone: CCMS... (deployed address TBD)
  - verify_milestone(admin, user, goal_id, milestone_id)
  - get_receipt(goal_id, milestone_id) → MilestoneReceipt

Soroban RPC Patterns (TypeScript):
- Read: Use SorobanRpc.Server(rpcUrl).simulateTransaction(tx).then(r => r.result)
- Write: Build with TransactionBuilder, sign with Keypair, send via server.sendTransaction(tx)
- XDR: Encode params with xdr.ScVal helpers from @stellar/stellar-sdk
- Token transfers: Use StellarSdk.Operation.payment() or Soroban token Client

Environment Variables:
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| NODE_ENV | Yes | development | Environment |
| PORT | No | 5000 | Server port |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing secret (32+ chars) |
| JWT_EXPIRES_IN | No | 7d | JWT expiry |
| OPENAI_API_KEY | Yes | - | OpenAI API key |
| ANTHROPIC_API_KEY | No | - | Anthropic API key |
| GEMINI_API_KEY | No | - | Gemini API key |
| AI_PROVIDER | No | openai | Default AI provider |
| GOOGLE_CLIENT_ID | No | - | Google OAuth client |
| GOOGLE_CLIENT_SECRET | No | - | Google OAuth secret |
| GOOGLE_CALLBACK_URL | No | - | OAuth callback URL |
| CLOUDINARY_CLOUD_NAME | No | - | Cloudinary cloud name |
| CLOUDINARY_API_KEY | No | - | Cloudinary API key |
| CLOUDINARY_API_SECRET | No | - | Cloudinary secret |
| FRONTEND_URL | Yes | - | CORS allowed origin |
| OWNER_EMAIL | No | - | Admin email |
| SMTP_HOST | No | smtp.gmail.com | Email host |
| SMTP_PORT | No | 587 | Email port |
| SMTP_SECURE | No | false | Use TLS |
| SMTP_USER | No | - | Email user |
| SMTP_PASS | No | - | Email password |
| EMAIL_FROM | No | - | From address |
| SUPABASE_URL | Yes | - | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Yes | - | Supabase service key |
| SUPABASE_ANON_KEY | Yes | - | Supabase anon key |
| NEXT_PUBLIC_SUPABASE_URL | Yes | - | Client Supabase URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes | - | Client anon key |
| STELLAR_NETWORK_PASSPHRASE | No | Testnet | Stellar network |
| STELLAR_RPC_URL | No | https://soroban-testnet.stellar.org | Soroban RPC |
| STELLAR_HORIZON_URL | No | https://horizon-testnet.stellar.org | Horizon |
| GOAL_STAKING_CONTRACT_ID | Yes | - | Deployed goal-staking |
| GROUP_ESCROW_CONTRACT_ID | Yes | - | Deployed group-escrow |
| MILESTONE_CONTRACT_ID | Yes | - | Deployed milestone |

Git Rules (NON-NEGOTIABLE):
Same as Phase 6 — individual file staging, one commit per logical unit, push immediately, conventional commits.

Build Sequence:
1. SDK: cd packages/sdk && npm install && npm run build
2. Contracts: cd comeback-contract && cargo build --target wasm32-unknown-unknown --release && cargo test
3. Indexer: cd indexer && npm install && npm start
4. Node Backend: cd server && npm install && npm run dev
5. Frontend: cd client && npm install && npm run dev
6. Go Backend: cd server-go && go run main.go
7. Kotlin Services: ./gradlew build (individual service: ./gradlew :<service>:run)
8. Docs: Generate from code and deploy
9. CI: Configure .github/workflows/

Coding Standards:
- TypeScript: strict mode, no `any` without explicit justification, zod for validation
- React: Server Components by default, 'use client' only when needed
- Node: ESM imports only, proper error handling middleware
- Go: idiomatic Go style, proper error returns
- Kotlin: com.comeback.* packages only, no com.rickchat.* references
- General: no floats for financial math, no hardcoded secrets, no localhost in production URLs

WHAT NOT TO DO:
- Do not use git add .
- Do not commit without pushing
- Do not leave rickchat references anywhere
- Do not use localhost in production configs
- Do not commit secrets or API keys
- Do not skip type checking or linting
```

---

## Phase 8 — Local Environment and Deployment

Assumes friction is the norm:

- Diagnose the actual error before prescribing a fix (PATH conflicts, DNS failures, version mismatches, disk space).
- Prefer surgical fixes over environment rewrites.
- Isolate conflicting toolchain versions explicitly per command.
- Find the one SDK/compiler version that clears all constraints at once rather than trial-and-error.
- If the user's own coding agent starts looping on workarounds, interrupt with one direct, ordered fix.
- Generate exact deployment scripts (sequential stellar contract deploy + initialize calls in order, printing final contract IDs).
- Guide wiring deployed addresses into both `.env.local` and the hosting platform's env UI.

### comeback.ai Deployment Script

```bash
#!/bin/bash
# deploy-contracts.sh — Deploy all comeback.ai Soroban contracts in dependency order
set -e

NETWORK="${STELLAR_NETWORK:-testnet}"
RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
ADMIN_KEY="${STELLAR_ADMIN_SECRET}"

echo "=== Deploying comeback.ai contracts to $NETWORK ==="

# 1. Goal Staking
echo "--- Goal Staking ---"
GOAL_STAKING_WASM="comeback-contract/target/wasm32-unknown-unknown/release/goal_staking.wasm"
GOAL_STAKING_ID=$(stellar contract deploy \
  --wasm "$GOAL_STAKING_WASM" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" | grep -oP 'CC\w+')
echo "GoalStakingContract: $GOAL_STAKING_ID"

stellar contract invoke \
  --id "$GOAL_STAKING_ID" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  -- initialize --admin "$ADMIN_PUBLIC_KEY"

# 2. Group Escrow
echo "--- Group Escrow ---"
GROUP_ESCROW_WASM="comeback-contract/target/wasm32-unknown-unknown/release/group_escrow.wasm"
GROUP_ESCROW_ID=$(stellar contract deploy \
  --wasm "$GROUP_ESCROW_WASM" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" | grep -oP 'CC\w+')
echo "GroupEscrowContract: $GROUP_ESCROW_ID"

stellar contract invoke \
  --id "$GROUP_ESCROW_ID" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  -- initialize --admin "$ADMIN_PUBLIC_KEY"

# 3. Milestone
echo "--- Milestone ---"
MILESTONE_WASM="comeback-contract/target/wasm32-unknown-unknown/release/milestone.wasm"
MILESTONE_ID=$(stellar contract deploy \
  --wasm "$MILESTONE_WASM" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" | grep -oP 'CC\w+')
echo "MilestoneContract: $MILESTONE_ID"

stellar contract invoke \
  --id "$MILESTONE_ID" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  -- initialize --admin "$ADMIN_PUBLIC_KEY"

echo ""
echo "=== Deployment Complete ==="
echo "GoalStakingContract:  $GOAL_STAKING_ID"
echo "GroupEscrowContract:  $GROUP_ESCROW_ID"
echo "MilestoneContract:    $MILESTONE_ID"
echo ""
echo "Add these to your .env.local and hosting platform env vars."
```

---

## Phase 9 — Hosting and Service Topology

- **Frontend** → Vercel (Next.js optimized, already configured in `vercel.json`).
- **Indexer/API** → Render (long-running stateful service, already configured in `render.yaml`).
- **Database** → Supabase (Postgres, same region as backend, internal connection string when co-located).
- **Diagram the full topology:**

```
User Browser
    │
    ├──→ Vercel (Next.js frontend)
    │       │
    │       ├──→ Render (Node API + Socket.io)
    │       │       ├──→ Supabase (Postgres)
    │       │       └──→ MongoDB (optional)
    │       │
    │       ├──→ Soroban RPC (direct wallet txns)
    │       │       ├──→ GoalStakingContract
    │       │       ├──→ GroupEscrowContract
    │       │       └──→ MilestoneContract
    │       │
    │       └──→ Supabase (direct SSR reads)
    │
    ├──→ Freighter Wallet (browser extension)
    │
    └──→ Indexer (Render, long-running)
            └──→ Supabase (event sync)
```

- Trace any service-linkage failure (e.g., frontend hitting localhost in prod) to its root cause and fix at the source.
- FRONTEND_URL in render.yaml must match the actual Vercel deployment URL.
- CORS in server.js must include the Vercel domain, not just localhost.

---

## Phase 10 — Repo Hygiene for Program Approval

Verify by fetching real approved repos rather than assuming a pattern:

- Branch protection matching actual CI job names (from `.github/workflows/ci.yml`: `server-lint`, `client-lint`, `client-build`)
- CONTRIBUTING.md (already present — verify completeness)
- SECURITY.md (already present — verify disclosure contact `security@comeback.ai`, scope includes Soroban contracts, audit disclaimer)
- README rewrite matching the approved pattern:
  - Banner/logo
  - Badges (Stellar Wave Builder, Next.js 15, Soroban, License)
  - Maintainer contact table
  - Community link (Discord/Telegram)
  - Architecture summary (ASCII diagram)
  - Quick-start commands (Web2 + Soroban)
  - Contributing section referencing CONTRIBUTING.md
  - contrib.rocks image for contributors
- GitHub topics: `stellar`, `soroban`, `web3`, `ai`, `productivity`, `goals`, `social`, `nextjs`, `rust`, `typescript`
- Bulk issue generation via a `gh` CLI script — each issue with commit-style title, complexity/type labels, Summary, Acceptance Criteria checkboxes, Tech Stack.
- A release tag (e.g., `v0.1.0`) with deployed contract addresses in the body.

### Issue Generation Script

```bash
#!/bin/bash
# generate-issues.sh — Create standardized GitHub issues for comeback.ai

issues=(
  "feat(contracts): add AchievementNFT contract|enhancement,contracts|Mint achievement badges as NFTs for milestone completions.|- [ ] Contract spec approved\n- [ ] Implementation complete\n- [ ] Tests passing\n- [ ] Deployed to testnet|Rust, soroban-sdk"
  "feat(frontend): add Freighter wallet authentication|enhancement,frontend|Allow users to sign in with Freighter wallet alongside existing JWT/Supabase auth.|- [ ] Wallet detection\n- [ ] SEP-10 auth flow\n- [ ] Session integration with existing auth\n- [ ] UI components|TypeScript, React, @stellar/stellar-sdk"
  "feat(sdk): implement real Soroban transaction building|enhancement,sdk|Replace stub XDR builders in @comeback/sdk with real Soroban invocation XDR encoding.|- [ ] stake_goal XDR builder\n- [ ] complete_goal XDR builder\n- [ ] verify_milestone XDR builder\n- [ ] Tests with testnet|TypeScript, @stellar/stellar-sdk"
  "feat(indexer): poll and sync Soroban events to Supabase|enhancement,indexer|Implement real event polling from Soroban RPC and sync to Postgres tables.|- [ ] Event polling loop\n- [ ] Parse contract events\n- [ ] Upsert to Supabase\n- [ ] Error handling and retry|Node.js, @supabase/supabase-js"
  "chore(repo): complete rickchat de-branding|chore|Run grep -ri rickchat . and remove all remaining references across all tiers.|- [ ] Kotlin packages renamed\n- [ ] Docker configs updated\n- [ ] K8s manifests updated\n- [ ] Capacitor config updated|all"
)

for issue in "${issues[@]}"; do
  IFS='|' read -r title labels summary acceptance tech <<< "$issue"
  gh issue create \
    --title "$title" \
    --label "$labels" \
    --body "## Summary
$summary

## Acceptance Criteria
$acceptance

## Tech Stack
$tech"
done
```

---

## Phase 11 — Documentation Site

Separate from the README, a full docs site covering:

- Introduction with real cited figures
- Protocol mechanics/state machine with worked numbers
- Smart contract reference (all functions, params, storage)
- Per-persona end-user guides (goal-setter, group leader, developer)
- Developer guide (setup, env vars, SDK/API reference with real examples)
- Contributing guide

Generate as a Phase 6/7-style system prompt with strict plain writing style.

### comeback.ai Docs System Prompt Fragment

```
Role: Technical Writer.
Output: Full documentation site for comeback.ai.

Structure:
1. /docs/introduction — What comeback.ai is, problem it solves, key metrics
2. /docs/protocol — How goal staking works, worked examples (stake 100 XLM → complete → receive 110 XLM)
3. /docs/contracts — Per-contract reference: storage, functions, auth, events, examples
4. /docs/users — How to stake a goal, join a group, earn rewards
5. /docs/groups — Creating challenges, pooling stakes, distributing prizes
6. /docs/developers — Setup, env vars, SDK reference, API reference, deploying contracts
7. /docs/contributing — How to contribute, code standards, PR process

Style: Plain, direct. No fluff. Real code examples. Worked numbers.
```

---

## Phase 12 — Submission

- Confirm live (search) that the project isn't already in the approved list.
- Assemble all supporting links:
  - Live app URL: `https://comeback-ai.vercel.app`
  - Contract repo: `github.com/<org>/comeback` (path: `comeback-contract/`)
  - App repo: `github.com/<org>/comeback`
  - On-chain verification links: Stellar Explorer contract addresses
  - Docs site: TBD
  - End-to-end demo video: TBD (2–3 minutes, show staking a goal, completing it, receiving rewards)
- Write the repo relationship description (if multiple repos):
  "The `comeback` monorepo contains the full platform: `comeback-contract/` (Soroban smart contracts), `packages/sdk/` (TypeScript SDK), `indexer/` (event sync), and the full application stack. A single repo was chosen over split repos because the platform was built iteratively with tight coupling between contracts and app logic during this early phase."
- Write the "planned issues" description grounded in real created issues.
- Write the plain-English submission project description with real-world scale figures if available:
  "comeback.ai is an AI-powered social productivity platform on Stellar. Users stake tokens against personal goals — completing them returns stake plus 10% yield, while forfeits fund group challenge pools. An AI coach provides personalized accountability based on behavioral psychology, groups compete on transparent leaderboards, and every milestone generates a verifiable on-chain receipt via Soroban. The platform addresses the $XX billion productivity market where traditional apps lack real accountability mechanisms. By combining social motivation with tokenized incentives on a fast, low-cost blockchain, comeback.ai creates real consequences for failure and real rewards for follow-through."

---

## Phase 13 — Post-Approval Iteration

For every new gap found post-approval:

- Scope honestly (quick fix vs. core architecture change).
- If cross-repo, write coordinated issues with explicit "Depends on" references.
- Same issue rigor as the original batch.
- Never build a fix without confirming repo/architecture dependencies first.

---

## Rebrand Checklist (run before submission)

```
[ ] capacitor.config.ts: appId → com.comeback.ai (not ai.rickchat.app)
[ ] settings.gradle.kts: rootProject.name → "comeback" (not "rickchat")
[ ] build.gradle.kts: group → "com.comeback" (not "com.rickchat")
[ ] All Kotlin packages: com.comeback.* (not com.rickchat.*)
[ ] k8s/overlays/production: namespace → comeback (not rickchat)
[ ] docker-compose.yml: service names, container names, network names
[ ] docker-compose.unified.yml: same
[ ] Dockerfile: group/user names → comeback (not rickchat)
[ ] Dockerfile.unified: same
[ ] Dockerfile.service: same
[ ] client/public/sw.js: CACHE name → comeback-v2 (not rickchat-v2)
[ ] client/public/manifest.json: name → comeback.AI
[ ] client/public/robots.txt: any rickchat references removed
[ ] docs/architecture.md: title and references updated
[ ] docs/deployment.md: namespace and service names updated
[ ] scripts/seed-data.sh: db name → comeback (not comebackai or rickchat)
[ ] server/package.json: name still productivity-social-server (OK)
[ ] client/package.json: name still productivity-social-client (OK)
[ ] grep -ri rickchat . returns ZERO results
[ ] grep -ri "rick chat" . returns ZERO results
[ ] grep -ri "com.rickchat" . returns ZERO results
```

---

## Final Verification Commands

```bash
# 1. Verify no rickchat references remain
grep -ri rickchat . 2>/dev/null || echo "PASS: No rickchat references"

# 2. Verify contract build
cd comeback-contract && cargo build --target wasm32-unknown-unknown --release && cargo test

# 3. Verify SDK build
cd packages/sdk && npm install && npm run build

# 4. Verify frontend build
cd client && npm install && npm run build

# 5. Verify backend tests
cd server && npm test

# 6. Verify full repo typecheck/lint
cd server && npm run lint
cd client && npm run lint
```

---

*End of Unified Master Build Prompt — comeback.ai on Stellar*
