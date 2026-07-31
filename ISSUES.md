# StakeMind — Project Issues (400)

> Auto-generated from the Stellar Wave Builder Phase 10 playbook.
> Format: `[TYPE] [PRIORITY] Title` — Summary — Acceptance Criteria

---

## Smart Contracts — Soroban (Rust) — Issues #1–50

### GoalStakingContract (#1–#15)
1. **[feat] [P0] Add deadline enforcement to goal staking** — Goals should auto-forfeit if deadline passes without completion. — Add `deadline: u64` to StakeInfo, add `check_deadline` function callable by anyone, emit `goal_expired` event, test with past/future deadlines.

2. **[feat] [P1] Support multiple token types for staking** — Allow staking with any Stellar token, not just XLM. — Add token whitelist storage, validate token on stake, test with SEP-41 tokens.

3. **[feat] [P1] Variable reward rates based on goal difficulty** — Higher difficulty goals should earn higher yield. — Add `difficulty: u32` param, calculate reward as basis points of difficulty, test with multiple difficulty tiers.

4. **[feat] [P2] Partial completion rewards** — Reward users who make significant progress even if not 100% complete. — Add `progress: u32` field, calculate proportional reward on forfeit, test edge cases.

5. **[feat] [P2] Stake boosting via streak multiplier** — Users with longer streaks get higher reward multipliers. — Read streak from cross-contract call, apply multiplier to reward calculation, test streak scenarios.

6. **[feat] [P2] Referral rewards on staking** — Reward users who refer others to stake goals. — Add referrer Address to StakeInfo, split reward bonus with referrer, test referral flow.

7. **[fix] [P1] Prevent double-staking on same goal ID** — Current check only catches exact duplicates. — Add user+goal composite key, validate uniqueness, update tests.

8. **[fix] [P1] Re-entrancy guard on complete_goal and forfeit_goal** — Prevent re-entrancy attacks on reward distribution. — Add mutex flag, test with re-entrant calls.

9. **[fix] [P2] Handle token transfer failures gracefully** — Current code panics if token transfer fails. — Use try_transfer pattern, return error instead of panic.

10. **[feat] [P2] Batch stake creation for group goals** — Allow admin to create stakes for multiple users in one tx. — Add `batch_stake` function, iterate users, emit per-user events.

11. **[test] [P1] Full coverage for all stake state transitions** — Test every path: stake→complete, stake→forfeit, expired→forfeit, double-stake rejection, unauthorized admin. — Write comprehensive test suite.

12. **[test] [P2] Fuzz testing for edge case amounts** — Test with 0, MAX_i128, negative amounts, very large amounts. — Add fuzz target, run with cargo-fuzz.

13. **[docs] [P2] Contract-level NatSpec comments** — Document every function, param, return, and panic condition. — Add /// comments throughout lib.rs.

14. **[chore] [P1] Extract common storage utilities to shared crate** — DataKey pattern is duplicated across contracts. — Create `stakemind-common` crate with shared types.

15. **[feat] [P2] Add events for all state changes with indexed fields** — Ensure all events have indexed topics for efficient filtering. — Review all `env.events().publish` calls, add indexed topics.

### GroupEscrowContract (#16–#30)
16. **[feat] [P0] Time-locked prize distribution** — Prizes should have a distribution window. — Add `distribution_start` and `distribution_end` to GroupPool, validate on distribute.

17. **[feat] [P1] Multi-winner prize splits** — Support splitting pool among top N winners. — Add winner addresses array, split amount proportionally, test multi-winner.

18. **[feat] [P1] Minimum pool threshold before distribution** — Prevent distributing tiny pools. — Add `min_threshold` config, check before distribute.

19. **[feat] [P2] Automatic forfeit-to-pool routing** — When GoalStaking forfeits, auto-route to associated group pool. — Cross-contract call from GoalStaking to GroupEscrow, test integration.

20. **[feat] [P2] Pool contribution tiers with weighted rewards** — Higher contributors get proportionally larger prize shares. — Add contributor tracking, weighted distribution, test tier math.

21. **[fix] [P1] Prevent pool depletion attacks** — Malicious admin could drain pool. — Add cooldown period between distributions, multi-sig requirement.

22. **[fix] [P1] Validate token consistency across deposits** — All deposits to a pool must use same token. — Check token on deposit, reject mismatches.

23. **[fix] [P2] Member count overflow protection** — u32 could overflow on very active pools. — Add safe math, cap at u32::MAX.

24. **[test] [P1] Integration tests with GoalStaking contract** — Test forfeit→pool flow end-to-end. — Deploy both contracts, simulate full lifecycle.

25. **[test] [P2] Load test with 1000 concurrent deposits** — Verify performance under load. — Write benchmark test, measure gas usage.

26. **[feat] [P2] Pool metadata storage** — Store name, description, icon URL on-chain. — Add metadata struct, validate size limits.

27. **[feat] [P3] Pool discovery via events index** — Make pools discoverable via event filtering. — Add `pool_created` event with metadata.

28. **[chore] [P1] Refactor to use shared admin validation** — Admin check logic is duplicated 3x. — Extract to stakemind-common crate.

29. **[docs] [P2] Document pool lifecycle with sequence diagram** — Visual documentation of pool states. — Add to contract README.

30. **[feat] [P3] Recurring pool support** — Auto-reset pool after distribution for recurring challenges. — Add `recurring: bool` flag, reset logic.

### MilestoneContract (#31–#40)
31. **[feat] [P0] Multi-party milestone verification** — Allow multiple verifiers for higher trust. — Add verifier set, require N-of-M signatures.

32. **[feat] [P1] Timestamp range validation** — Prevent backdating milestone receipts. — Check timestamp >= goal creation, <= current ledger.

33. **[feat] [P1] Milestone proof storage** — Store IPFS hash or proof URL alongside receipt. — Add `proof_uri: Bytes` field to MilestoneReceipt.

34. **[feat] [P2] Batch milestone verification** — Verify multiple milestones in one transaction. — Add `batch_verify` function.

35. **[feat] [P2] Receipt revocation by admin** — Allow admin to revoke incorrect receipts. — Add `revoke_receipt` function, mark as revoked.

36. **[fix] [P1] Prevent duplicate receipt creation** — Race condition could create duplicates. — Use storage check before write.

37. **[test] [P1] Test all receipt lifecycle states** — Verify active→revoked, double-verify rejection, unauthorized verify. — Comprehensive test suite.

38. **[feat] [P2] Receipt query by user address** — Allow querying all receipts for a user. — Add `get_user_receipts` with pagination.

39. **[docs] [P2] Document receipt verification trust model** — Explain who verifies, trust assumptions, revocation. — Add to contract docs.

40. **[chore] [P1] Standardize error messages across contracts** — Use consistent error codes. — Create error enum, use throughout.

### New Contracts (#41–#50)
41. **[feat] [P0] AchievementNFT contract** — Mint soulbound achievement badges on milestone completion. — Define badge tiers, mint function, metadata storage.

42. **[feat] [P1] LeaderboardOracle contract** — On-chain leaderboard state for trustless prize distribution. — Settle scores via admin, query rankings.

43. **[feat] [P1] StakingRewards contract** — Distribute protocol rewards from yield pool. — Calculate APY, distribute proportionally.

44. **[feat] [P2] GovernanceToken contract** — Token for platform governance voting. — SEP-41 compliant, mintable by admin.

45. **[feat] [P2] ReputationRegistry contract** — Portable on-chain reputation across dapps. — Store scores, allow external reads.

46. **[feat] [P2] ChallengeFactory contract** — Factory pattern for creating new challenge pools. — Deploy new GroupEscrow instances per challenge.

47. **[feat] [P3] SocialRecovery contract** — Multi-sig wallet recovery for lost keys. — Guardian set, recovery threshold.

48. **[feat] [P3] SubscriptionManager contract** — On-chain premium subscription management. — Track expiry, auto-renew.

49. **[feat] [P3] DisputeResolution contract** — Arbitration for contested goal completions. — Evidence submission, arbiter vote.

50. **[feat] [P3] CrossChainBridge adapter** — Bridge reputation/receipts to other chains. — Message format, verifier.

---

## SDK — TypeScript (#51–#80)

51. **[feat] [P0] Real Soroban XDR builders for all contract calls** — Replace stub strings with actual XDR encoding. — Build stake_goal, complete_goal, forfeit_goal, deposit_pool, distribute_prize, verify_milestone.

52. **[feat] [P0] Transaction simulation before submission** — Simulate txn to check for errors before signing. — Add SorobanRpc simulateTransaction call.

53. **[feat] [P1] Wallet adapter abstraction layer** — Support Freighter, Albedo, xBull, Lobstr. — Common interface, auto-detect installed wallets.

54. **[feat] [P1] SEP-10 authentication helper** — One-call SEP-10 challenge + sign + verify. — Challenge fetch, sign, token return.

55. **[feat] [P1] Contract event subscription helpers** — Filter and subscribe to contract events. — Poll-based and SSE-based options.

56. **[feat] [P1] Token balance and transfer utilities** — BalanceOf, transfer, approve helpers for SEP-41 tokens. — Wrap token::Client calls.

57. **[feat] [P2] React hooks for contract interactions** — useStake, usePool, useReceipt hooks. — React context, loading/error states.

58. **[feat] [P2] Transaction history and receipt tracking** — Track submitted transactions with status. — Store in localStorage, poll for completion.

59. **[feat] [P2] Fee estimation and gas optimization** — Estimate fees before submission. — Simulate with fee bump, suggest optimal fee.

60. **[feat] [P2] Multi-contract batch transaction builder** — Build transactions spanning multiple contracts. — Atomic batch, error rollback.

61. **[fix] [P1] Handle Soroban RPC errors with typed responses** — Parse error codes, provide human-readable messages. — Error type enum, user-friendly messages.

62. **[fix] [P1] Network switching support** — Switch between testnet/mainnet/futurenet at runtime. — Reinitialize clients on network change.

63. **[fix] [P2] Rate limiting on RPC calls** — Prevent hitting RPC rate limits. — Token bucket rate limiter.

64. **[test] [P1] Integration tests against testnet** — All SDK functions tested against live testnet. — Deploy test contracts, run full integration suite.

65. **[test] [P1] Unit tests for all XDR encoding/decoding** — Verify correct ScVal encoding. — Test each contract function's param encoding.

66. **[test] [P2] Mock Soroban RPC for offline testing** — Test without network dependency. — Mock server with preset responses.

67. **[docs] [P1] Full SDK API reference with examples** — Document every class, method, type. — JSDoc comments, usage examples.

68. **[docs] [P1] Quick-start guide for SDK usage** — 5-minute getting started. — Install, configure, first transaction.

69. **[docs] [P2] Migration guide from v0.1 to v1.0** — Breaking changes documentation. — Before/after code examples.

70. **[chore] [P1] Publish to npm as @stakemind/sdk** — Publish package with semantic versioning. — npm publish, CI auto-publish on tag.

71. **[chore] [P1] TypeScript strict mode and full type coverage** — Enable strict, no implicit any. — Fix all type errors, add missing types.

72. **[chore] [P2] Bundle size optimization** — Minimize SDK bundle size. — Tree-shaking, code splitting.

73. **[feat] [P2] Account creation and funding helpers** — Friendbot for testnet, createAccount for mainnet. — One-call account setup.

74. **[feat] [P2] Multi-signature transaction support** — Build and coordinate multi-sig txns. — Signer collection, threshold validation.

75. **[feat] [P3] Ledger entry parsing utilities** — Parse ledger entries from contract storage. — Type-safe parsers for all storage types.

76. **[feat] [P3] Webhook server for contract events** — Self-hosted event webhook relay. — Express server, event filtering.

77. **[feat] [P3] CLI tool for contract interactions** — stake, unstake, verify from terminal. — Commander.js CLI with subcommands.

78. **[test] [P2] E2E tests with Playwright** — Full browser-based integration tests. — Connect wallet, stake, verify, check receipt.

79. **[chore] [P2] Add CHANGELOG.md with semantic versioning** — Track all changes per version. — Keep a Changelog format.

80. **[docs] [P3] Video tutorial series scripts** — Scripts for 5-part YouTube tutorial. — Setup, first stake, groups, receipts, advanced.

---

## Frontend — Next.js / React (#81–#140)

### Wallet & Auth (#81–#90)
81. **[feat] [P0] Freighter wallet connection button** — Detect Freighter, connect, show address. — Wallet detection hook, connect/disconnect UI.

82. **[feat] [P0] SEP-10 authentication flow integration** — Sign challenge, get JWT, link to Supabase session. — Full auth flow with error handling.

83. **[feat] [P1] Multi-wallet support dropdown** — Freighter, Albedo, xBull, Lobstr options. — Wallet selector modal, persistence.

84. **[feat] [P1] Wallet balance display in navbar** — Show XLM + token balances. — Poll balances, format display.

85. **[feat] [P2] Transaction signing confirmation modal** — Show tx details before wallet signs. — Gas, amount, contract, confirm/cancel.

86. **[feat] [P2] Transaction history panel** — List recent transactions with status. — Filter by type, view on explorer.

87. **[fix] [P1] Handle wallet disconnection gracefully** — Clear session, reset state, prompt reconnect. — Clean state machine.

88. **[fix] [P2] Handle wallet network mismatch** — Detect wrong network, prompt switch. — Network check on connect.

89. **[feat] [P3] Hardware wallet support (Ledger)** — Ledger Stellar app integration. — Transport layer, signing flow.

90. **[test] [P2] Wallet auth E2E tests** — Connect wallet, sign in, verify session. — Playwright test with mock wallet.

### Goal Staking UI (#91–#105)
91. **[feat] [P0] Create goal with stake amount** — Form: title, description, deadline, token, amount. — Validation, preview, confirm, submit.

92. **[feat] [P0] Goal detail page with stake status** — Show stake info, progress, deadline countdown. — Real-time updates from contract/API.

93. **[feat] [P0] Complete goal flow with on-chain receipt** — Submit completion evidence, trigger complete_goal. — Proof upload, txn submission, receipt display.

94. **[feat] [P1] Goal progress tracker with milestone checklist** — Visual progress bar, milestone toggle. — Animated progress, celebration on 100%.

95. **[feat] [P1] Forfeit goal warning and confirmation** — Show what's at stake, confirm forfeit. — Loss calculation, confirmation dialog.

96. **[feat] [P1] Stake amount suggestions based on history** — AI-recommended stake amounts. — Analyze past performance, suggest optimal.

97. **[feat] [P2] Goal templates with pre-set stakes** — Common goal templates (fitness, learning, work). — One-click create from template.

98. **[feat] [P2] Share goal to social media** — Generate share card with goal + stake. — Twitter/X, Discord, copy link.

99. **[feat] [P2] Goal completion celebration animation** — Confetti, reward display. — Framer Motion animation, sound effect.

100. **[fix] [P1] Handle transaction pending states** — Show spinner during tx confirmation. — Loading state, success/error toast.

101. **[fix] [P1] Handle insufficient balance errors** — Warn before staking if balance too low. — Balance check, error message.

102. **[fix] [P2] Handle deadline edge cases** — Past deadlines, timezone issues. — Client-side validation, server-side enforcement.

103. **[feat] [P3] Goal calendar view** — Calendar showing all goal deadlines. — Month/week/day views, color-coded.

104. **[feat] [P3] Recurring goal support** — Daily/weekly/monthly recurring goals with stake. — Auto-renew, skip option.

105. **[test] [P2] Goal staking flow E2E tests** — Create goal, stake, complete, verify receipt. — Full flow with contract interaction.

### AI Coach UI (#106–#115)
106. **[feat] [P0] AI coach chat interface** — Chat-like interface for AI accountability coach. — Message bubbles, streaming responses, typing indicator.

107. **[feat] [P0] Daily check-in prompt from AI coach** — AI asks about goal progress daily. — Notification, quick reply options.

108. **[feat] [P1] AI-generated goal suggestions** — AI analyzes profile and suggests goals. — Personalized suggestions with stake recommendations.

109. **[feat] [P1] AI progress analysis and insights** — AI reviews progress data, gives actionable feedback. — Charts, patterns, recommendations.

110. **[feat] [P2] AI-generated motivation messages** — Personalized encouragement based on progress. — Scheduled or trigger-based delivery.

111. **[feat] [P2] Voice input for AI coach** — Speak to AI coach via microphone. — Speech-to-text, response read aloud.

112. **[feat] [P2] AI coach personality customization** — Choose coach style (supportive, tough, funny). — Different prompt templates per style.

113. **[fix] [P1] Handle AI streaming errors gracefully** — Show error state, retry option. — Fallback to non-streaming.

114. **[fix] [P2] Reduce AI response latency** — Optimize prompt size, use shorter context. — Token counting, caching.

115. **[test] [P1] AI coach chat E2E tests** — Send message, receive response, verify streaming. — Mock AI responses.

### Groups & Leaderboard UI (#116–#130)
116. **[feat] [P0] Group creation with pool staking** — Create group, set challenge rules, deposit pool. — Form, invite members, pool settings.

117. **[feat] [P0] Group dashboard with member progress** — See all members' goal progress side by side. — Progress bars, rankings, activity feed.

118. **[feat] [P0] Leaderboard with on-chain verification** — Rankings from LeaderboardOracle contract. — Sortable, filterable, paginated.

119. **[feat] [P1] Group chat with real-time messaging** — Socket.io chat within group. — Messages, typing indicators, read receipts.

120. **[feat] [P1] Prize distribution UI** — Admin distributes pool to winners. — Winner selection, amount input, confirm txn.

121. **[feat] [P1] Join group via invite code/link** — Shareable invite, one-click join. — Invite generation, join flow.

122. **[feat] [P2] Group challenge templates** — Pre-built challenge types (30-day fitness, book club). — Template gallery, customize.

123. **[feat] [P2] Group activity feed** — Timeline of member actions. — Stake, complete, forfeit, chat events.

124. **[feat] [P2] Group analytics dashboard** — Completion rates, engagement metrics. — Charts, export.

125. **[fix] [P1] Handle group member limits** — Enforce max_members on join. — Error message, waitlist option.

126. **[fix] [P2] Optimize leaderboard loading for 1000+ users** — Pagination, virtual scrolling. — Infinite scroll, cursor-based pagination.

127. **[feat] [P3] Group role management (admin/moderator/member)** — Assign roles, permissions. — Role badges, action gating.

128. **[feat] [P3] Group notifications (email/push)** — Notify members of activity. — Configurable per user.

129. **[feat] [P3] Cross-group competitions** — Groups compete against each other. — Multi-group leaderboard.

130. **[test] [P2] Group flow E2E tests** — Create group, invite members, stake, complete, distribute. — Full multi-user flow.

### Dashboard & Settings (#131–#140)
131. **[feat] [P0] Main dashboard with stake overview** — Active stakes, total staked, earnings, streaks. — Widget grid, responsive.

132. **[feat] [P1] User profile with on-chain reputation** — Display receipts, achievements, stats. — Public profile, shareable.

133. **[feat] [P1] Notification settings** — Email, push, in-app notification preferences. — Toggle per type, frequency.

134. **[feat] [P2] Dark/light theme with system detection** — Auto-switch, manual toggle, persist. — CSS variables, smooth transition.

135. **[feat] [P2] Mobile-responsive layout optimization** — All pages work on mobile. — Responsive grid, bottom nav.

136. **[fix] [P1] Loading skeletons for all data-fetching pages** — Prevent layout shift. — Skeleton components, consistent sizing.

137. **[fix] [P1] Error boundaries for all route segments** — Graceful error handling. — Per-route error boundaries.

138. **[feat] [P2] Onboarding wizard for new users** — Step-by-step tutorial. — Connect wallet, first stake, AI coach intro.

139. **[feat] [P3] Accessibility audit and fixes** — WCAG 2.1 AA compliance. — Screen reader, keyboard nav, contrast.

140. **[feat] [P3] PWA support with offline mode** — Service worker, offline goal tracking. — Cache strategies, sync on reconnect.

---

## Backend API — Node.js / Express (#141–#190)

### Core API (#141–#155)
141. **[feat] [P0] Contract interaction endpoints** — POST /api/contracts/stake, /complete, /forfeit. — Proxy to SDK, validate inputs, return tx hash.

142. **[feat] [P0] SEP-10 auth verification endpoint** — POST /api/auth/stellar/verify. — Verify challenge signature, issue JWT.

143. **[feat] [P1] Webhook endpoint for contract events** — POST /api/webhooks/soroban. — Receive events, process, notify users.

144. **[feat] [P1] Goal CRUD with on-chain sync** — Sync API goals with contract stakes. — Create goal → stake on-chain, update status from events.

145. **[feat] [P1] Leaderboard aggregation endpoint** — GET /api/leaderboard with sorting/filtering. — Cache results, paginate.

146. **[feat] [P2] Achievement calculation engine** — Compute achievements from on-chain receipts. — Rules engine, badge assignment.

147. **[feat] [P2] Analytics data aggregation** — Aggregate platform metrics for dashboards. — Daily/weekly aggregates, caching.

148. **[fix] [P1] Rate limiting per user per endpoint** — Prevent abuse of contract endpoints. — Per-user rate limits, exponential backoff.

149. **[fix] [P1] Input validation with Zod schemas** — Validate all request bodies. — Zod schemas for every endpoint.

150. **[fix] [P2] Request logging with correlation IDs** — Trace requests across services. — UUID per request, log middleware.

151. **[test] [P1] API integration tests** — Test all endpoints with Supabase + mock contracts. — Jest + supertest.

152. **[test] [P2] API load testing** — Verify performance under 1000 RPS. — k6 scripts, report.

153. **[docs] [P1] OpenAPI/Swagger documentation** — Auto-generated API docs. — Swagger UI, endpoint descriptions.

154. **[chore] [P1] Error response standardization** — Consistent error format across all endpoints. — Error codes, messages, HTTP status mapping.

155. **[chore] [P2] Request/response compression** — Gzip/brotli for large responses. — Compression middleware.

### AI Services (#156–#165)
156. **[feat] [P0] AI coach conversation endpoint** — POST /api/ai/coach with streaming. — Multi-provider, context management.

157. **[feat] [P1] AI goal generation endpoint** — POST /api/ai/generate-goals. — Analyze profile, suggest personalized goals.

158. **[feat] [P1] AI progress analysis endpoint** — POST /api/ai/analyze-progress. — Review data, generate insights.

159. **[feat] [P2] AI evidence verification** — AI reviews goal completion proof images. — Multi-modal analysis, confidence score.

160. **[feat] [P2] AI group challenge generation** — Generate group challenge ideas. — Based on group interests, difficulty.

161. **[fix] [P1] AI provider failover** — Auto-switch to backup provider on failure. — OpenAI→Anthropic→Gemini chain.

162. **[fix] [P2] AI response caching** — Cache common AI responses. — Redis cache, TTL per query type.

163. **[feat] [P3] Multi-language AI coach** — Support 10+ languages. — Translation layer, locale detection.

164. **[feat] [P3] AI coach fine-tuning pipeline** — Fine-tune on user interaction data. — Data collection, training scripts.

165. **[test] [P1] AI response quality tests** — Evaluate accuracy, relevance, safety. — Automated eval suite, human review samples.

### Memory & Psychology (#166–#175)
166. **[feat] [P1] User memory persistence** — Store user preferences, history, patterns. — Supabase-backed, queryable.

167. **[feat] [P1] Psychology engine integration** — Analyze behavior patterns, predict outcomes. — ML model, actionable insights.

168. **[feat] [P2] Adaptive difficulty adjustment** — Adjust goal difficulty based on history. — Too easy→harder, too hard→easier.

169. **[feat] [P2] Behavioral nudge scheduling** — Optimal timing for reminders. — Time-of-day analysis, engagement patterns.

170. **[fix] [P1] Memory data pruning for GDPR** — User data export and deletion. — Export endpoint, cascade delete.

171. **[fix] [P2] Memory query performance optimization** — Index commonly queried fields. — Query analysis, composite indexes.

172. **[feat] [P3] Cross-user behavior comparison** — Compare user to similar cohort. — Anonymized, opt-in.

173. **[feat] [P3] Habit formation tracking** — Track habit streaks, predict formation. — Streak algorithm, milestone detection.

174. **[test] [P2] Psychology engine accuracy validation** — Compare predictions to outcomes. — A/B test framework.

175. **[docs] [P2] Psychology model documentation** — Explain how models work. — Model cards, fairness assessment.

### Real-time & Socket.io (#176–#185)
176. **[feat] [P1] Real-time stake status updates** — Push stake status changes to connected clients. — Socket.io room per user.

177. **[feat] [P1] Group chat real-time messaging** — Messages, typing, read receipts. — Room per group, persistence.

178. **[feat] [P2] Live leaderboard updates** — Push ranking changes in real-time. — Throttled updates, batched.

179. **[feat] [P2] Presence indicators** — Show online/offline status. — Heartbeat, last seen.

180. **[fix] [P1] Socket reconnection with state recovery** — Recover missed messages on reconnect. — Last message ID, catch-up.

181. **[fix] [P2] Socket authentication and authorization** — Verify JWT on connection. — Auth middleware per namespace.

182. **[feat] [P3] Typing indicators in group chat** — Show who's typing. — Debounced events.

183. **[feat] [P3] File sharing in chat** — Image/file upload in messages. — Supabase storage, preview.

184. **[test] [P2] Socket.io load testing** — 1000 concurrent connections. — k6 WebSocket test, metrics.

185. **[docs] [P1] Socket event documentation** — All events, payloads, rooms. — Event reference table.

### Authentication & Security (#186–#190)
186. **[feat] [P1] JWT refresh token rotation** — Rotate refresh tokens on use. — Blacklist old tokens.

187. **[feat] [P2] OAuth provider expansion** — Add GitHub, Discord, Twitter OAuth. — Passport strategies.

188. **[fix] [P1] CORS configuration audit** — Restrict to known origins. — Env-based allowlist.

189. **[fix] [P1] Helmet security headers audit** — Apply all recommended headers. — CSP, HSTS, X-Frame.

190. **[test] [P1] Auth security penetration tests** — Test for common vulnerabilities. — OWASP top 10 checklist.

---

## Indexer (#191–#210)

191. **[feat] [P0] Soroban RPC event polling** — Poll for contract events every 10 seconds. — Cursor-based pagination, dedup.

192. **[feat] [P0] Event parsing and decoding** — Parse ScVal event data into typed objects. — Type mapping per contract.

193. **[feat] [P0] Supabase Postgres sync** — Upsert events into Supabase tables. — event_log table, conflict resolution.

194. **[feat] [P1] Historical event backfill** — Backfill events from ledger start. — Range-based fetching, progress tracking.

195. **[feat] [P1] Event processing pipeline** — Transform raw events into application state. — Update goals, stakes, pools from events.

196. **[feat] [P2] Real-time event streaming to frontend** — Push events to connected clients. — SSE endpoint, filtering.

197. **[fix] [P1] Handle RPC failures with exponential backoff** — Retry on network errors. — Jitter, max retries, dead letter queue.

198. **[fix] [P1] Deduplication for at-least-once delivery** — Prevent duplicate event processing. — Event ID tracking.

199. **[fix] [P2] Handle chain reorganizations** — Detect and handle reorgs. — Ledger sequence tracking.

200. **[feat] [P2] Multiple contract monitoring** — Monitor many contracts simultaneously. — Config-driven contract list.

201. **[feat] [P2] Custom event filter expressions** — Filter events by type, contract, data. — Configurable filter rules.

202. **[test] [P1] Indexer integration tests** — Full event→DB pipeline test. — Mock RPC with known events.

203. **[chore] [P1] Indexer health check and metrics** — /health endpoint, Prometheus metrics. — Uptime, event count, lag.

204. **[feat] [P3] Webhook notifications on events** — Call external webhook on specific events. — Configurable webhook URLs.

205. **[feat] [P3] Event archiving to cold storage** — Archive old events to S3/GCS. — Configurable retention.

206. **[docs] [P1] Indexer architecture documentation** — Data flow, deployment, scaling. — Diagram, configuration guide.

207. **[chore] [P2] Indexer Docker container** — Dockerfile for indexer. — Multi-stage build.

208. **[feat] [P3] Multi-network indexer (testnet + mainnet)** — Run indexer for both networks. — Per-network config.

209. **[test] [P2] Indexer performance benchmarks** — Measure events/sec throughput. — Benchmark script, report.

210. **[chore] [P3] Indexer migration to Rust for performance** — Rewrite in Rust with soroban-sdk. — Comparison benchmark.

---

## Documentation (#211–#250)

### Core Docs (#211–#230)
211. **[docs] [P0] Protocol mechanics documentation** — How goal staking works with worked examples. — Stake 100 XLM → complete → receive 110 XLM. diagrams.

212. **[docs] [P0] Smart contract reference** — All contracts, functions, params, storage. — Per-contract page with examples.

213. **[docs] [P0] Developer quick-start guide** — Setup, install, first transaction in 5 min. — Step-by-step with code.

214. **[docs] [P1] SDK API reference** — Every class, method, type documented. — Generated from JSDoc.

215. **[docs] [P1] REST API reference** — All endpoints with request/response examples. — OpenAPI generated.

216. **[docs] [P1] Deployment guide** — Deploy contracts, app, indexer. — Per-environment instructions.

217. **[docs] [P1] Environment variables reference** — All env vars with defaults, descriptions. — Table format.

218. **[docs] [P2] Architecture decision records (ADRs)** — Document key technical decisions. — Context, decision, consequences.

219. **[docs] [P2] Contributing guide** — How to contribute, code standards, PR process. — Expanded from CONTRIBUTING.md.

220. **[docs] [P2] Security policy and audit status** — Vulnerability reporting, audit timeline. — From SECURITY.md.

221. **[docs] [P2] Tokenomics documentation** — Reward rates, fee structure, inflation. — Formulas, simulations.

222. **[docs] [P2] Governance documentation** — Voting process, proposal lifecycle. — If governance token exists.

223. **[docs] [P2] User guide — Getting started** — Create account, connect wallet, first stake. — Screenshots, video.

224. **[docs] [P2] User guide — Groups and challenges** — Create group, invite, compete. — Walkthrough with visuals.

225. **[docs] [P2] User guide — AI coach** — How the AI coach works, what to expect. — Feature overview.

226. **[docs] [P3] Troubleshooting FAQ** — Common issues and solutions. — Wallet, staking, rewards.

227. **[docs] [P3] Glossary of terms** — Stake, pool, receipt, SEP, Soroban. — Alphabetical.

228. **[docs] [P3] Comparison to traditional productivity apps** — Why blockchain matters. — Comparison table.

229. **[docs] [P3] Integration guide for partner dapps** — How to use StakeMind reputation elsewhere. — SDK examples.

230. **[docs] [P3] Brand assets and guidelines** — Logo, colors, fonts, usage. — Download links.

### Documentation Site (#231–#250)
231. **[feat] [P1] Docs site with Nextra/Docusaurus** — Full docs site separate from app. — Search, sidebar, dark mode.

232. **[feat] [P1] Interactive API playground** — Try API calls from docs. — Swagger UI or custom.

233. **[feat] [P2] Live contract state viewer** — Show current contract state in docs. — Read from testnet RPC.

234. **[feat] [P2] Code examples in multiple languages** — JS, Python, Rust examples. — Language tabs.

235. **[feat] [P2] Search with Algolia/Pagefind** — Full-text search across docs. — Indexed, fast.

236. **[feat] [P3] Video tutorials embedded** — YouTube embeds for key flows. — Chapter markers.

237. **[chore] [P1] Docs CI/CD auto-deploy** — Deploy docs on merge to main. — Vercel/GitHub Pages.

238. **[chore] [P2] Broken link checker in CI** — Prevent broken doc links. — Link checker action.

239. **[chore] [P2] Spelling and grammar check in CI** — Vale or similar. — Style guide enforcement.

240. **[docs] [P2] Changelog auto-generation** — Generate from conventional commits. — Release Please or similar.

241. **[docs] [P3] Multi-language docs (i18n)** — Translate docs to 5+ languages. — Crowdin or similar.

242. **[docs] [P3] Interactive tutorials with live code** — Sandpack or similar embedded editor. — Step-by-step exercises.

243. **[docs] [P2] Case studies and success stories** — User testimonials, metrics. — Interview-based.

244. **[docs] [P3] White paper / litepaper** — Formal protocol specification. — LaTeX, academic style.

245. **[docs] [P3] Media kit for press** — Press release, screenshots, logos. — Downloadable zip.

246. **[docs] [P3] Community forum/Discord link integration** — Link docs to community. — Widget, FAQ redirects.

247. **[docs] [P2] Developer bounty program documentation** — How to earn by contributing. — Issue labeling, reward tiers.

248. **[docs] [P3] Academic research references** — Cite behavioral psychology papers. — Bibliography.

249. **[docs] [P2] Competitor analysis page** — How StakeMind differs. — Honest comparison.

250. **[docs] [P3] Roadmap and future features** — Public roadmap with timelines. — GitHub Projects embed.

---

## Testing (#251–#290)

### Unit Tests (#251–#265)
251. **[test] [P0] Contract unit tests — GoalStaking** — All functions, all states. — Init, stake, complete, forfeit, get, edge cases.

252. **[test] [P0] Contract unit tests — GroupEscrow** — All functions, all states. — Init, deposit, distribute, get, edge cases.

253. **[test] [P0] Contract unit tests — Milestone** — All functions, all states. — Init, verify, get, edge cases.

254. **[test] [P1] SDK unit tests — XDR encoding** — All builders produce valid XDR. — Per-function encoding tests.

255. **[test] [P1] SDK unit tests — Wallet adapters** — Each wallet adapter works. — Mock wallet responses.

256. **[test] [P1] API route unit tests** — Each endpoint handler tested. — Mock services, verify responses.

257. **[test] [P1] AI service unit tests** — Provider adapters, prompt building. — Mock API responses.

258. **[test] [P1] Psychology engine unit tests** — Behavior analysis functions. — Known inputs, expected outputs.

259. **[test] [P2] Frontend component unit tests** — React Testing Library. — Render, interact, assert.

260. **[test] [P2] Zustand store unit tests** — State transitions. — Actions, selectors, persistence.

261. **[test] [P2] Utility function unit tests** — All pure functions. — 100% coverage on utils.

262. **[test] [P2] Validation schema unit tests** — Zod schemas. — Valid/invalid inputs.

263. **[test] [P2] Indexer parsing unit tests** — Event decoders. — Known event data, expected output.

264. **[test] [P3] Performance unit tests** — Functions under load. — Benchmark assertions.

265. **[test] [P3] Accessibility unit tests** — jest-axe on components. — No violations.

### Integration Tests (#266–#280)
266. **[test] [P0] Contract integration test — Full lifecycle** — Stake→complete full flow. — Deploy contracts, run through all states.

267. **[test] [P0] Contract integration test — Forfeit to pool** — GoalStaking forfeit → GroupEscrow pool. — Cross-contract flow.

268. **[test] [P1] API + Supabase integration tests** — Full API→DB→response flow. — Test DB, real queries.

269. **[test] [P1] SDK + Testnet integration tests** — SDK calls against live testnet. — Deploy contracts, test all functions.

270. **[test] [P1] Indexer + RPC integration tests** — Indexer processes real events. — Deploy contracts, emit events, verify sync.

271. **[test] [P2] AI + Contract integration tests** — AI verifies goal, triggers contract. — Mock AI responses, verify contract state.

272. **[test] [P2] Wallet auth integration tests** — SEP-10 full flow. — Real Freighter in testnet mode.

273. **[test] [P2] Frontend + API integration tests** — Page loads, fetches data, renders. — MSW for mocking.

274. **[test] [P2] Socket.io integration tests** — Connect, send, receive. — Real socket connections.

275. **[test] [P3] Multi-service integration tests** — All services together. — Docker Compose test environment.

276. **[test] [P2] Error handling integration tests** — Network failures, timeout, invalid input. — Graceful degradation.

277. **[test] [P2] Concurrency integration tests** — Multiple simultaneous operations. — Race condition detection.

278. **[test] [P3] Upgrade/migration integration tests** — Contract upgrade, data migration. — Backward compatibility.

279. **[test] [P3] Cross-network integration tests** — Testnet→Mainnet migration path. — Deployment scripts.

280. **[test] [P3] Disaster recovery tests** — DB restore, contract state recovery. — Backup/restore procedures.

### E2E Tests (#281–#290)
281. **[test] [P0] E2E — User stakes and completes goal** — Full flow with real wallet. — Playwright, testnet.

282. **[test] [P0] E2E — User forfeits goal** — Forfeit flow end to end. — Wallet interaction, state verification.

283. **[test] [P1] E2E — Group challenge full lifecycle** — Create, invite, stake, complete, distribute. — Multi-user Playwright.

284. **[test] [P1] E2E — AI coach interaction** — Chat with AI, get suggestions. — Verify streaming, context.

285. **[test] [P2] E2E — Wallet switch mid-session** — Disconnect, reconnect different wallet. — State recovery.

286. **[test] [P2] E2E — Mobile responsive flow** — Stake goal on mobile viewport. — Touch interactions.

287. **[test] [P2] E2E — Offline→online sync** — Create goal offline, sync when online. — PWA behavior.

288. **[test] [P2] E2E — Performance under load** — 100 users simultaneously. — Artillery/Locust scripts.

289. **[test] [P3] E2E — Accessibility audit** — Full keyboard navigation test. — axe-core full site scan.

290. **[test] [P3] E2E — Cross-browser testing** — Chrome, Firefox, Safari, Edge. — BrowserStack or similar.

---

## DevOps & Infrastructure (#291–#330)

### CI/CD (#291–#305)
291. **[chore] [P0] Contract build and test CI** — cargo build + cargo test on PR. — GitHub Actions, wasm target.

292. **[chore] [P0] Frontend build and lint CI** — npm run build + lint on PR. — Already partially set up in ci.yml.

293. **[chore] [P0] Backend test CI** — npm test on PR. — MongoDB test instance.

294. **[chore] [P1] SDK build CI** — npm run build on PR. — TypeScript compilation check.

295. **[chore] [P1] Indexer CI** — Verify indexer starts and processes mock events. — Integration test in CI.

296. **[chore] [P1] E2E test CI** — Playwright tests on PR. — Headless browser, testnet RPC.

297. **[chore] [P2] Contract size check CI** — Fail if wasm exceeds limits. — Size gate in CI.

298. **[chore] [P2] Gas usage report on PR** — Comment with gas usage diff. — Compare to main branch.

299. **[chore] [P2] Automated dependency updates** — Renovate/Dependabot. — Weekly PRs, auto-merge patches.

300. **[chore] [P2] Code coverage reporting** — Upload to Codecov/Coveralls. — Per-PR coverage diff.

301. **[chore] [P2] Security vulnerability scanning** — npm audit, cargo audit. — Fail on critical.

302. **[chore] [P2] Lint all the things** — ESLint, Prettier, shellcheck, hadolint. — Pre-commit hooks.

303. **[chore] [P3] Performance regression detection** — Benchmark on PR. — Compare to baseline.

304. **[chore] [P3] Automated release notes generation** — From conventional commits. — Release Please.

305. **[chore] [P3] Canary deployment pipeline** — Deploy to staging, run tests, promote. — Progressive rollout.

### Docker & Containerization (#306–#315)
306. **[chore] [P1] Production Dockerfile for frontend** — Optimized Next.js build. — Multi-stage, minimal image.

307. **[chore] [P1] Production Dockerfile for backend** — Optimized Node.js build. — ESM bundle, minimal image.

308. **[chore] [P1] Production Dockerfile for indexer** — Long-running process container. — Health check, restart policy.

309. **[chore] [P2] Docker Compose for local dev** — All services in one compose. — Hot reload, volume mounts.

310. **[chore] [P2] Docker Compose for staging** — Production-like local env. — Separate DB, real RPC.

311. **[chore] [P2] Multi-arch container builds** — amd64 + arm64. — Buildx, push manifest.

312. **[chore] [P3] Kubernetes manifests** — Deploy to k8s cluster. — Deployment, service, ingress.

313. **[chore] [P3] Helm chart** — Package for Helm deployment. — Values.yaml, templates.

314. **[chore] [P3] Container security scanning** — Trivy or similar. — Per-image scan in CI.

315. **[chore] [P3] Container registry setup** — GitHub Container Registry or Docker Hub. — Tag strategy.

### Monitoring & Observability (#316–#325)
316. **[feat] [P1] Health check endpoints for all services** — /health returning status. — DB, RPC, contract connectivity.

317. **[feat] [P1] Structured logging with levels** — JSON logs, correlation IDs. — Winston/Pino.

318. **[feat] [P2] Prometheus metrics export** — Request count, latency, error rate. — /metrics endpoint.

319. **[feat] [P2] Grafana dashboard templates** — Pre-built dashboards. — JSON exports.

320. **[feat] [P2] Alerting rules** — Error rate spike, high latency, contract failure. — AlertManager config.

321. **[feat] [P2] Uptime monitoring** — External health check pings. — UptimeRobot or similar.

322. **[feat] [P3] Distributed tracing** — OpenTelemetry across services. — Jaeger/Tempo.

323. **[feat] [P3] Error tracking (Sentry)** — Capture and aggregate errors. — Source maps, release tracking.

324. **[feat] [P3] Real user monitoring (RUM)** — Frontend performance from real users. — Web Vitals.

325. **[feat] [P3] Cost monitoring and alerts** — Track RPC costs, hosting costs. — Budget alerts.

### Database (#326–#330)
326. **[chore] [P1] Database migration framework** — Versioned migrations for Supabase. — Already partially set up.

327. **[chore] [P2] Database backup automation** — Scheduled backups. — pg_dump, off-site storage.

328. **[chore] [P2] Database connection pooling** — PgBouncer or Supabase pooler. — Connection limits.

329. **[chore] [P2] Database index optimization** — Analyze slow queries, add indexes. — EXPLAIN ANALYZE review.

330. **[chore] [P3] Database read replica setup** — Scale reads for analytics. — Supabase read replicas.

---

## Security (#331–#360)

### Smart Contract Security (#331–#340)
331. **[security] [P0] Formal verification of contract logic** — Prove no stuck states, no fund loss. — Symbolic execution tool.

332. **[security] [P0] Third-party smart contract audit** — Professional audit firm. — Full report, fix findings.

333. **[security] [P1] Access control audit** — Verify only authorized callers can invoke admin functions. — Review all require_auth calls.

334. **[security] [P1] Integer overflow/underflow audit** — All arithmetic operations. — Review all +/-/*/ operations.

335. **[security] [P1] Re-entrancy attack surface review** — All external calls (token transfers). — Checks-effects-interactions pattern.

336. **[security] [P2] Front-running attack analysis** — Can transactions be front-run? — Commit-reveal if needed.

337. **[security] [P2] Denial of service attack surface** — Can contract be stuck? — Gas limits, loops.

338. **[security] [P2] Storage collision analysis** — DataKey enum collisions. — Review all storage keys.

339. **[security] [P3] Upgrade mechanism security** — If contracts are upgradeable. — Proxy pattern security.

340. **[security] [P3] Emergency pause mechanism** — Ability to pause in emergency. — Admin-only pause.

### Application Security (#341–#350)
341. **[security] [P1] Authentication bypass testing** — All auth endpoints. — Token forgery, session hijack.

342. **[security] [P1] Authorization boundary testing** — Can users access others' data? — All endpoints tested.

343. **[security] [P1] Input validation bypass testing** — SQL injection, XSS, command injection. — All input vectors.

344. **[security] [P1] CSRF protection verification** — All state-changing endpoints. — Token check.

345. **[security] [P2] Rate limiting bypass testing** — Can rate limits be circumvented? — IP spoofing, header manipulation.

346. **[security] [P2] API key/token exposure audit** — Any secrets in client code? — NEXT_PUBLIC_ prefix audit.

347. **[security] [P2] Dependency vulnerability scanning** — npm audit, cargo audit. — Automated in CI.

348. **[security] [P2] CORS misconfiguration testing** — Test all origin combinations. — Verify strict allowlist.

349. **[security] [P3] Subdomain takeover check** — All configured domains. — DNS verification.

350. **[security] [P3] Penetration test** — Full external pentest. — Professional firm.

### Data Security (#351–#360)
351. **[security] [P1] Data encryption at rest audit** — All sensitive data encrypted. — DB, backups, logs.

352. **[security] [P1] Data encryption in transit audit** — All connections use TLS. — HSTS, cert validity.

353. **[security] [P2] PII data inventory and classification** — What PII is stored where. — Data map.

354. **[security] [P2] Data retention policy implementation** — Auto-delete old data. — Configurable retention.

355. **[security] [P2] User data export (GDPR/CCPA)** — Self-serve data export. — One-click download.

356. **[security] [P3] User data deletion (right to be forgotten)** — Cascade delete all user data. — Admin + self-serve.

357. **[security] [P3] Data breach response plan** — Document procedures. — Roles, communication, remediation.

358. **[security] [P3] Secrets management audit** — No hardcoded secrets. — Environment variables, secret manager.

359. **[security] [P3] Supply chain security** — Verify dependencies. — SBOM, signed commits.

360. **[security] [P3] Bug bounty program setup** — Invite security researchers. — Scope, rewards, safe harbor.

---

## Performance (#361–#380)

361. **[perf] [P1] Frontend bundle size optimization** — Analyze and reduce JS bundle. — Bundle analyzer, code splitting.

362. **[perf] [P1] Image optimization and lazy loading** — Next.js Image, blur placeholders. — WebP/AVIF format.

363. **[perf] [P1] API response time optimization** — Target <100ms p95. — Query optimization, caching.

364. **[perf] [P1] Soroban RPC call batching** — Batch multiple reads into one call. — Multicall pattern.

365. **[perf] [P2] Database query optimization** — Review slow queries. — Indexes, query rewriting.

366. **[perf] [P2] Redis caching layer** — Cache hot data. — Leaderboard, user profiles, AI responses.

367. **[perf] [P2] CDN for static assets** — All static files on CDN. — Cache headers, versioned URLs.

368. **[perf] [P2] Edge function for API routes** — Move to edge where possible. — Vercel Edge or Cloudflare Workers.

369. **[perf] [P2] WebSocket message compression** — Reduce message size. — Per-message deflate.

370. **[perf] [P3] Service worker caching strategy** — Offline-first for repeat visits. — Stale-while-revalidate.

371. **[perf] [P3] Font optimization** — Subset fonts, font-display swap. — Reduce CLS.

372. **[perf] [P2] Critical CSS extraction** — Inline above-the-fold CSS. — Reduce render blocking.

373. **[perf] [P3] WebAssembly for compute-heavy tasks** — Offload to WASM. — Event parsing, crypto.

374. **[perf] [P3] Load testing at scale (10k concurrent)** — Verify performance. — k6 cloud run.

375. **[perf] [P2] Memory leak detection** — All long-running processes. — Heap snapshots, analysis.

376. **[perf] [P3] Cold start optimization** — Reduce serverless cold starts. — Smaller bundles, warming.

377. **[perf] [P2] Network waterfall optimization** — Reduce request chains. — Parallel fetching, prefetching.

378. **[perf] [P3] Client-side rendering performance** — Reduce React re-renders. — React DevTools profiling.

379. **[perf] [P3] Animation performance (60fps)** — Framer Motion optimization. — will-change, GPU acceleration.

380. **[perf] [P3] Lighthouse score target 95+** — All pages score 95+. — Automated in CI.

---

## Mobile & Desktop (#381–#395)

381. **[feat] [P2] Capacitor iOS build configuration** — Xcode project setup. — Certificates, provisioning.

382. **[feat] [P2] Capacitor Android build configuration** — Gradle setup. — Keystore, Play Store metadata.

383. **[feat] [P2] Native wallet integration (iOS)** — Freighter mobile SDK. — In-app browser or native.

384. **[feat] [P2] Native wallet integration (Android)** — Freighter mobile SDK. — Deep linking.

385. **[feat] [P3] Push notifications (iOS)** — APNs setup. — Stake reminders, AI check-ins.

386. **[feat] [P3] Push notifications (Android)** — FCM setup. — Stake reminders, AI check-ins.

387. **[feat] [P3] Biometric auth for app unlock** — Face ID / fingerprint. — Capacitor plugin.

388. **[feat] [P3] Electron desktop app build** — Windows/Mac/Linux builds. — electron-builder config.

389. **[feat] [P3] Desktop wallet integration** — Freighter desktop extension. — Communication bridge.

390. **[feat] [P3] System tray notifications (desktop)** — Goal reminders in system tray. — Electron notifications.

391. **[fix] [P2] Mobile responsive layout fixes** — All pages ≤375px wide. — Flexbox/grid fixes.

392. **[fix] [P2] Touch interaction fixes** — Touch targets ≥44px. — Hover→touch alternatives.

393. **[test] [P3] Mobile E2E tests** — Playwright mobile emulation. — Key flows on mobile.

394. **[chore] [P3] App store listing screenshots** — Generate for iOS + Android. — Multiple device sizes.

395. **[chore] [P3] App store description and metadata** — Optimize for discovery. — Keywords, categories.

---

## Community & Growth (#396–#400)

396. **[docs] [P2] Community code of conduct** — Contributor Covenant. — Enforcement process.

397. **[chore] [P2] Discord server setup** — Channels, roles, bots. — Welcome flow, moderation.

398. **[chore] [P3] Ambassador program documentation** — How to become ambassador. — Rewards, responsibilities.

399. **[chore] [P3] Hackathon participation kit** — Starter templates, judging criteria. — Bounty list.

400. **[chore] [P3] Grant application templates** — SCF, Wave, ecosystem grants. — Pre-filled with project info.

---

## Summary

| Category | Issues | Priority |
|----------|--------|----------|
| Smart Contracts | #1–#50 | 50 |
| SDK | #51–#80 | 30 |
| Frontend | #81–#140 | 60 |
| Backend API | #141–#190 | 50 |
| Indexer | #191–#210 | 20 |
| Documentation | #211–#250 | 40 |
| Testing | #251–#290 | 40 |
| DevOps | #291–#330 | 40 |
| Security | #331–#360 | 30 |
| Performance | #361–#380 | 20 |
| Mobile/Desktop | #381–#395 | 15 |
| Community | #396–#400 | 5 |
| **Total** | **#1–#400** | **400** |

---

*Generated from the Stellar Wave Builder Phase 10 playbook for StakeMind.*
