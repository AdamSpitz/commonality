# Big review before deploying to testnet

(May 2026.)

The goal here is to do a giant test run in which we review of all the user-facing surfaces of the project, using the `intelligent-tester` skill and the `cofounder` skill.

For now, let's also use the `interactive-assistant` skill; I want to watch this step-by-step and get a feel for how well the ecosystem of skills is working.

---

## Round 1 — AI-driven review (May 1, 2026)

This round was done autonomously using the `noninteractive-assistant` + `real-ui-user` + `web-debugging` skills. The reviewer ran the full build, all tests, started local services, seeded demo data, and manually explored the UI using a headless browser.

### Test results

- **Build:** ✅ 18 packages, all succeeded. Minor chunk-size warnings (some bundles >500KB) but nothing blocking.
- **Fast test suite:** ✅ 1568 tests across 86 test files, all passed.
- **Demo seed data:** ✅ 101 actions seeded; all invariant checks (contract state, economic conservation, graph algorithm, indexer consistency) passed.

---

### Critical bug found: Ponder indexer stale-state problem

**Severity: High** — This caused a completely blank UI on first launch.

**What happened:** The first time services were started (from a saved hardhat `state.json`), the Ponder indexer's persistent database (`data/ponder/`) contained event records from a *previous* chain run. The indexer's internal "last-synced block" pointer said it was current, so Ponder skipped re-indexing historical blocks from the new chain. Result: the UI queried the indexer for events at the *current* contract addresses and got zero results. Every page showed empty state ("No statements found", etc.).

**Root cause:** `data/ponder/` persists across service restarts. When `services.sh --start` deploys fresh contracts (which get new addresses each run), the indexer sees zero events at those new addresses because the historical blocks were "already processed" from the old run.

**Workaround used:** `rm -rf data/ponder/*` before `services.sh --start`.

**Recommendation:** 
- Add a warning to `services.sh` if the indexer DB is from a different chain run (different deployment addresses).
- Consider setting `PONDER_EPHEMERAL=true` for local dev, or document `rm -rf data/ponder/*` in `local-development.md` as part of the reset flow.
- Or: detect a chain reset and automatically clear ponder state.

---

### UI observations (pages visited)

#### Home page (`/`)
- ✅ Loads cleanly. Good intro copy. Clear CTAs: "Start with Docs", "Browse Statements", "Browse Projects", "Explore Creator Funding".
- ✅ Four focused domains are described (Commonality, Content Funding, Noninflammatory Content, Common Sense Majority).
- No obvious bugs.

#### Browse Statements (`/statements`)
- ✅ Loads and shows statements once indexer is working.
- **UX issue:** Each statement card shows the statement text *twice* — once as a bold title, and once as a lighter description directly below it. They're identical. Looks like a card component showing both `title` and `description` fields when they contain the same text. This is redundant and confusing.
- Sorting by "Most Supporters" and "Newest" buttons are present. Looks correct.
- Statement cards show a "supporters" badge (e.g., "3 supporters") — good.
- Date shown in format "01/05/2026" — ambiguous (January 5 or May 1?). Since this project is US-focused but date is May 1, 2026, this should probably be "May 1, 2026" to avoid ambiguity.

#### Statement Detail (`/statement/<cid>`)
- ✅ Shows statement text, metadata, support metrics.
- **UX issue:** The raw metadata table (showing `createdDate`, `domain`, `position`, `references`, `statementType`, `topic`) is shown to the user. This is very developer-facing. Users don't need to see `statementType: simple` or `domain: fundable-projects`. The CID is also shown inline. Consider hiding this behind a "Developer info" collapsible or removing it from the non-developer view.
- ✅ Support metrics section works: shows "3 supporters", "3 signers", "0 indirect supporters". Good breakdown.
- ✅ "Your Opinion" section correctly prompts wallet connection.
- ✅ Funding Portal section shows "0 ETH", "0 ETH", "0 projects" with a "VIEW FUNDING PORTAL" button.
- ✅ "Submit Content for Evaluation" form is present with Content URL and Perspective fields.
- ✅ "High-Profile Supporters" section is empty but explains what would appear there.

#### Explore Causes (`/explore`)
- ✅ Shows a categorized list of seed statements grouped by topic/domain.
- **UX issue (significant):** Each statement card is *expanded* showing the full raw metadata table (same issue as Statement Detail but worse here because there are many cards and they're all expanded). The Explore page is supposed to be user-friendly discovery; showing JSON-like metadata for every statement makes it look like a developer debug view. Users see `createdDate`, `domain`, `position`, `references`, `statementType`, `topic`, and `Statement CID` for every statement.
- **UX issue:** Statement text is truncated in the title with "..." but fully shown in the expanded body — so users see the truncated version and the full version right next to each other.
- Each card has SIGN, NAVIGATE, and FUNDING PORTAL buttons — that's good.

#### Browse Projects (`/projects`)
- ✅ Loads with seed data — 9 projects visible.
- ✅ Sorting (Newest, Deadline, Most Funded, Closest to Goal) and Status (All, Funding, Succeeded, Refunding) filters present.
- ✅ Shows progress bars, funding amounts, deadlines. Looks clean.
- **Minor note:** Some projects show "0 ETH / 0 ETH" with "Succeeded" status — this is technically correct for fan-backed contracts with no minimum, but looks strange. Worth considering whether to display differently.

#### Project Detail (`/projects/<address>`)
- ✅ Shows project name, description, recipient address, funding status, contributor leaderboard.
- ✅ "Connect your wallet to buy tokens" prompt shown for unauthenticated users.
- ✅ Content Funding section shows channel info when applicable.
- ✅ "Project Endorsements" section shows "No alignment attestations yet" — this is expected for seed data without that specific link.

#### Creators / Content (`/content`)
- ✅ Loads. Shows three platform buckets: Twitter/X, YouTube, Substack.
- ✅ Description text is clear and user-friendly.
- **Note:** Nav shows "CREATORS" but the route is `/content`, not `/creators`. Navigating to `/creators` gives a 404. Not a functional issue but slightly surprising.

#### Funding Portal (`/portal/<cid>`)
- ✅ Loads correctly, shows the statement, funding summary (0 ETH, 0 projects for the longevity statement).
- ✅ "Aligned Projects" section with sort/filter controls.
- ✅ "SHOW AVAILABLE DELEGATABLE NOTES" button present.
- ✅ Leaderboard linked via "VIEW LEADERBOARD" button.
- Seed data creates `attestProjectAlignment: 9` actions, but the specific longevity statement didn't have aligned projects in this run. Worth checking with a statement that has aligned projects.

#### Cause Leaderboard
- ✅ Loads. Shows "Available in Delegated Funds: 0 ETH". Explains that delegated notes are aggregate, not per-person.

#### My Profile (`/profile`)
- ✅ Shows "Connect your wallet to view your profile." — appropriate fallback for unauthenticated users.

#### Mutable Refs (`/refs`)
- ✅ Shows "Connect your wallet to view and manage your mutable refs." — appropriate for unauthenticated users.

#### Docs / Start Here (`/docs`)
- ✅ Very readable. Shows the Commonality pitch, then "See it in action" with three concrete walkthrough scenarios. Links seem present.

#### MORE menu
- ✅ Dropdown opens. Contains: My Delegated Funds, My Trust Network, Creator Dashboard, Twitter Creators, YouTube Creators, Substack Creators, Saved Refs.
- `/delegation` returns 404 — delegation is accessed via "My Delegated Funds" in the MORE menu, not a top-level route.

---

### Overall assessment

**The basics work.** Build passes, tests pass, seed data loads, all major pages load with data. The core flows (browse statements, browse projects, funding portal, creator pages) are functional.

**The main concern before testnet** is the raw metadata exposure in the Explore and Statement pages. Seeing `statementType: simple`, `domain: content-funding`, `position: right-to-left-translation` as raw table rows is very developer-facing. A real user landing on the Explore page will be confused.

**The indexer stale-state bug** is worth fixing before handing this to testers — it creates a completely blank app that's hard to diagnose.

---

### Suggested next steps for the review

This was a first pass by an AI reviewer who couldn't connect a wallet. Many flows require wallet connection:
- Signing a statement
- Creating a project
- Buying project tokens
- Claiming a channel (Twitter/YouTube/Substack)
- Depositing to delegatable notes
- Setting trust scores
- Creating mutable refs

**Recommended follow-on tasks:**

1. ✅ **Fix the metadata display issue** — raw statement metadata/CIDs were removed from successfully loaded user-facing statement renders.
2. ✅ **Fix the statement card duplication** — Browse Statements no longer shows an excerpt when it is the same text as the title.
3. ✅ **Fix or document the ponder stale-state issue** — `services.sh --start` clears stale Ponder data when the saved local chain is absent, `data.sh --seed` warns if indexer events already exist, and `local-development.md` documents the clean reset flow.
4. ✅ **Do a wallet-connected test session** — completed Round 2 below.
5. ✅ **Test the other three UI domains** — all three load and display correctly.
6. **Try the cofounder skill** to evaluate readiness from a product/strategy angle.

---

## Round 2 — Wallet-connected session (May 1, 2026)

### How wallet connection was achieved

The app exposes `window._setupTestWallet(addressOrPrivateKey)` for E2E testing (see `ui/src/main.tsx`). After calling it and clicking "Mock Connector" in the ConnectKit modal, the wallet connects with Hardhat account #0 (`0xf39F...2266`).

**Important note on transaction signing:** wagmi's mock connector does not support private-key signing through the browser wallet client. This is a known, documented limitation; the project's own E2E tests work around it by calling the SDK directly and then verifying UI state (see `ui/e2e/utils/blockchain.ts`). Flows that require a blockchain transaction (BUY tokens, create project) were tested this way: transaction sent via SDK CLI, UI state verified in browser.

---

### Test results by flow

#### 1. Connect wallet ✅
- `window._setupTestWallet("0xac0974...80")` + Mock Connector works.
- Nav switches from "Connect Wallet" to `0xf39F••••2266`.

#### 2. Sign/support a statement ✅
- Navigated to a statement detail page, clicked AGREE.
- Supporter count went from 3 → 4. "You agree with this statement." appeared.
- CLEAR OPINION button appeared. Works correctly.

#### 3. Buy project tokens ✅ (via SDK; UI correctly reflects result)
- BUY button renders correctly, quantity input works.
- Transaction signed via `npx tsx tmp/buy-tokens-direct.ts` (2 tokens, 0.016 ETH).
- UI updated immediately: funding went from 0.144 → 0.160 ETH; account #0 appeared in the Contributor Leaderboard.
- **Note:** The BUY button onClick silently returns early when `walletClient` is null (no user-visible error). A connected user with a real MetaMask wallet should work fine; this is a mock-connector limitation.

#### 4. Creator claim flow — unclaimed Twitter channel ⚠️ (UX issue found)
- Channel page for `twitter:uid:111111111` (@civicbuilder, Unclaimed) loads correctly.
- Total Funding shows 0.11 ETH.
- "Share with creator" section is clear and helpful.
- **Bug:** The "Suggested message" says "your supporters have pooled **0 ETH**" but the page itself shows 0.11 ETH. The suggested message is not showing the actual pooled amount.
- No wallet-connected claim flow is reachable without actual Twitter OAuth — which is expected for a local test environment.

#### 5. My Profile ✅ (with minor regression)
- Shows wallet address, BELIEFS count, and the signed statement.
- **Regression:** Statement card on profile page still shows duplicate text (title + same text as excerpt). The Round 1 fix for Browse Statements did not extend to the Profile page. Same root cause.

#### 6. Explore page ✅
- Shows "No curated collection is available yet" — seed data doesn't include Explorer/nudger output, which is expected for small seed.
- No raw metadata displayed. Round 1 fix is working.

#### 7. My Delegated Funds ✅
- Shows Fund #1 with 0.18 ETH (from seed).
- ADD FUNDS, DELEGATE, RECLAIM buttons all present.

#### 8. My Trust Network ✅
- Shows Twitter linking form and trusted-source settings.
- GET VERIFICATION TWEET button present.

#### 9. Creator Dashboard ✅
- "You don't have any channels yet." — correct for account #0.

#### 10. Saved Refs ✅
- Empty state with create form. Loads correctly.

---

### Other domain UIs

All three other domains loaded cleanly with correct copy and navigation:

- **Content Funding** (`/content-funding-ui`) ✅ — focused entry for content contracts. Nav has BROWSE CONTENT, STATEMENTS, CREATORS, MY PROFILE, MORE. Copy is clean.
- **Noninflammatory Content** (`/noninflammatory-ui`) ✅ — bridge-building surface. Nav has BROWSE CONTENT, I'M A CREATOR, STATEMENTS, MY PROFILE, MORE. Copy is coherent and opinionated in the right direction.
- **Common Sense Majority / Movement** (`/movement-ui`) ✅ — organizing framing. Nav has ORGANIZE, BROWSE CONTENT, PROJECTS, STATEMENTS, MORE. Copy is compelling.

No 404s or broken pages in any of the three other domains.

---

### Issues found in Round 2

| Severity | Issue | Location |
|----------|-------|----------|
| Medium | **Duplicate statement text on My Profile** — same text shown as both title and excerpt in the belief cards. Round 1 fix for Browse Statements didn't cover the Profile page. | `/profile` |
| Low | **"Suggested message" shows 0 ETH** instead of actual pooled amount when sharing an unclaimed channel link with its creator. | `/content/twitter/<channel>` |
| Info | **BUY button silent no-op with mock connector** — `handleBuy` silently returns when `walletClient` is null; no user-visible error or explanation. Will work correctly with a real MetaMask wallet but gives confusing behavior in test sessions. Consider adding an error message. | Project detail page |

---

### Recommended next steps

1. ✅ **Fix duplicate text on My Profile** — covered by a regression test; the profile belief cards suppress excerpts that are the same as the title.
2. ✅ **Fix "Suggested message" ETH amount** — the unclaimed-channel share message now uses the escrowed amount when present and falls back to total funding.
3. ✅ **Improve BUY button test-session feedback** — direct ETH purchases now show a wallet-not-ready error instead of silently no-oping when wagmi has no wallet client.
4. **Try the cofounder skill** to evaluate readiness from a product/strategy angle.
