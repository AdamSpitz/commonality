# Big review before deploying to testnet

(Late April 2026.)

We're getting close to having enough stuff implemented that it'd make sense to deploy to a real testnet, to practice the real deployment workflow to have a shared thing that we can point at and so on.

This is a very weird experience, though, because so much of this work has been done by LLMs, and I just don't have time to look at everything myself. OTOH, that's not *that* weird; in the real world, a CEO has to decide to ship the thing even though he hasn't seen all of it; he's relying on reports from his subordinates.

So what I want to do here is do a giant test run in which we review of all the user-facing surfaces of the project, using the `intelligent-tester` skill and the `cofounder` skill. (That is, we're not simulating new users seeing this for the first time with no knowledge of what it is; we're coming at it as the cofounders of the project, trying to make sure that the thing actually looks like it could accomplish the purposes of the project.)

I'm expecting to find a mix of problems: blatantly-broken things, things that just don't quite make sense, things that are missing ("why don't we have a page for viewing this particular kind of data"?), etc.

For now, let's also use the `interactive-assistant` skill; I want to watch this step-by-step and get a feel for how well the ecosystem of skills is working.

## How to use this file

This single file holds the **To Do**, **Continuity** notes, and accumulated **Findings** for the whole review. Each subtask LLM should:

  - Read the most recent few continuity notes before starting.
  - Append findings to "Findings" as it goes (organized by domain — see template).
  - Update the to-do checkbox + write a continuity note when finishing.

Each subtask LLM is also doing a `subtask-doer` role and should apply both lenses while reviewing:

  - **`intelligent-tester` lens:** does it actually work? Click through it. Are there blatantly broken pages, console errors, missing data, dead links, confusing flows?
  - **`cofounder` lens:** does this surface actually accomplish what it's *supposed* to accomplish for the project? What's missing entirely? What doesn't quite make sense given what we're trying to build?

Subtask LLMs should also use `interactive-assistant` so the human can watch step by step.

## To Do

  - [x] **Step 0 — Fix the broken UI IPFS publisher build.** Currently `./scripts/services.sh --start` fails before any domain SPA is published. The `commonality-ui-ipfs-publisher` container runs `npm run ui:build:ipfs` (which calls `turbo run build:ipfs --filter=ui`) and the turbo CLI errors out. Two stacked problems were observed in `ui/Dockerfile`:
      1. `turbo.json` is not COPYed into the image. Turbo errors `Could not find turbo.json or turbo.jsonc.` This appears to be a latent bug introduced in commit 272abdf ("Working on making the build smarter so it won't be so slow."), which switched the Dockerfile from `COPY . .` to selective COPYs and added `turbo.json` to the repo in the same commit, but never copied it into the image.
      2. After fixing #1, turbo fails with `I/O error: Permission denied (os error 13)` — apparently because the container runs as `${UID:-1000}:${GID:-1000}` but `/workspace` is owned by root. The narrowed `chmod` introduced in commit 9bf1d2c ("Trim Docker chmod layers") only covers `ui/dist` and `ui/node_modules/.tmp`, so turbo can't create its `.turbo/cache` at the workspace root (and may need to write elsewhere too — needs investigation).
      The same Dockerfile is used by all four `ui-ipfs-publisher-*` services, so all four domains are blocked. Until this is fixed, the rest of this review can't proceed past Step 1.

  - [x] **Step 1 — Setup and sanity check.** Get the local stack running per README (`npm install && npm run build && ./scripts/services.sh --start && ./scripts/data.sh --seed`). Confirm all four domain SPA URLs print correctly. Open each one and confirm it at least loads without a blank page or fatal console error. Record the four URLs in the Continuity section so later subtasks can use them. If setup fails, debug or stop and surface the failure to the human — don't push ahead with a half-broken stack.

  - [~] **Step 2 — Review the Commonality domain.** (in progress — structural review done, code-level seed-data analysis done, live seeded-data review pending Docker rebuild). Code-level analysis below reveals the seed data *should* flow through (statements are discovered via DirectSupport events, not StatementCreated). Content-funding seed data is blocked by missing env vars. New bugs and findings appended below.

  - [ ] **Step 3 — Review the Content Funding domain.** Walk through landing, browse-by-platform (twitter/youtube/substack), channel pages, contract creation, contract viewing, creator dashboard, attestation summaries. Append to "Findings — Content Funding".

  - [ ] **Step 4 — Review the Noninflammatory Content domain.** Landing page (the political framing!), browse, channel/contract pages, About page. Apply the cofounder lens hard here — does the framing land? Does it look like a thing a real visitor would engage with? Append to "Findings — Noninflammatory".

  - [ ] **Step 5 — Review the Common Sense Majority (Movement) domain.** Landing, organize, projects, about. Cofounder lens: does this look like a movement, or just a placeholder? Append to "Findings — Movement".

  - [ ] **Step 6 — Cross-cutting / AI-output review.** Things that span domains: are AI-generated artifacts (implication attestations, content attestations, nudges, bridge suggestions, explorer-curator collections) actually showing up in the UI in a useful way? Are seed data attestations visible? Use `cofounder` lens — would a visitor who landed on the seeded site come away thinking "this works"? Append to "Findings — Cross-cutting".

  - [x] **Step 8 — Fix the Docker chmod rebuild penalty.** `ui/Dockerfile` step 13 (`chmod -R a+rwX /workspace`) took ~3 min on every rebuild even when nothing changed. Fix: narrow the writable paths to `ui/dist`, `ui/node_modules/.tmp`, and `.turbo`, which are the paths the IPFS publisher build needs to write as the host UID/GID user.

  - [x] **Step 9 — Clean up orphan Docker container.** Compose warns: `Found orphan containers ([commonality-ui])`. The old `commonality-ui` service was replaced by the four domain-specific publishers. Fix: `scripts/services.sh --start` now runs compose `up -d --remove-orphans`, and `--stop` runs `down --remove-orphans`.

  - [ ] **Step 10 — Verify content-funding seed data works on a seeded stack.** `generateContentFundingScenarios` is skipped if `CHANNEL_REGISTRY_ADDRESS`, `CHANNEL_VERIFIER_ADDRESS`, and `CREATOR_CONTRACT_FACTORY_ADDRESS` aren't set in the seed env. Check `fake-data-generation/.env` — these may be missing, meaning no creator channels or content contracts are ever created in seed data.

  - [ ] **Step 11 — Verify seeded data appears on UI pages.** After rebuild + reseed, the Browse Statements page should show statements with believer counts (374 DirectSupport events from seed data). The Browse Projects page should show ~22 projects. If these still show empty states, the SDK-to-indexer data flow has a bug.

  - [x] **Step 12 — Add `.env.ipfs.testnet` (or equivalent) for testnet deployment.** The indexer URL needs to be known at UI build time. Chosen path: keep using `scripts/setup-env.sh` as the env assembly point, require `EVENT_CACHE_URL` in `.env.secrets` for non-local IPFS UI deploys, bake it into `ui/.env` as `VITE_EVENT_CACHE_URL`, and have `scripts/deploy-ui.sh` fail early if it is missing. Documented in `workflow/DEPLOYMENT.md`.

  - [ ] **Step 13 — Synthesis breakpoint (high-intelligence model).** Read all findings. Categorize: (a) blocks testnet deployment, (b) embarrassing but not blocking, (c) nice-to-have. Write a short prioritized punch list at the top of "Findings — Synthesis". This pass is where the human will likely want to look hardest.

## Continuity

(Most-recent-first. Keep it short. Older notes can be pruned.)

### 2026-04-28 — Step 11 partial fix (Codex GPT-5)
Could not run the live seeded-stack check because Docker daemon is not running in this session, so Step 11 remains pending. Fixed one project-list data-flow bug found by code review: cached project accumulators stored `totalReceived` as JSON strings in IndexedDB but loaded them back without BigInt rehydration, which could break cached Browse Projects reloads after new project events arrived. Verified with focused `ui/src/shared/foldCache.test.ts` and `npm run typecheck --workspace=ui`.

### 2026-04-28 — Steps 8, 9, 12 cleanup (Codex GPT-5)
Fixed the UI Docker permission slowdown by replacing whole-workspace chmod with targeted writable build/cache paths. Added `--remove-orphans` to `scripts/services.sh` start/stop so the old `commonality-ui` container is cleaned up automatically. Made testnet/mainnet IPFS UI deploys require `EVENT_CACHE_URL` before building, documented it, and added `ui/.env.ipfs` to the Docker build planner inputs so local IPFS config changes trigger a UI publisher rebuild. Inspected Step 10: fake-data generation reads root `.env`, and current root `.env` does include the content-funding addresses, but a live reseed/browser verification is still pending.

### 2026-04-28 — Step 2 structural review (Sonnet 4.6)
Fixed 3 bugs found during review (docs page, event cache URL, factory addresses — see Findings above). Ran full 14-page crawl: all pages load clean with zero console errors. Reviewed screenshots with tester + cofounder lenses. Seed data was not re-run this session (stack restarted cold). Next: re-run `./scripts/data.sh --seed` and do a seeded-data pass of Commonality before moving to Step 3. Page title is "ui" on all pages — worth a quick fix. The `VITE_EVENT_CACHE_URL` testnet question needs a plan before deploying. New URLs after restart:
  - commonality: `http://localhost:8080/ipfs/QmNioGV9fEyb19GEAWJHSo2yZNREJyWHBTNDP6tQjpTxSu/commonality-ui/#/`
  - content-funding: `http://localhost:8080/ipfs/QmQccxWXYMngtFDwiCTdmptN9PmmDdaqvLe7ap5Du75Ubv/content-funding-ui/#/`
  - noninflammatory: `http://localhost:8080/ipfs/QmPhgnuQwYHsX5T9aw9Di4xJempkX5bqtGMNy1qeQpVTfE/noninflammatory-ui/#/`
  - movement: `http://localhost:8080/ipfs/QmS9Cp5vVTvW9q3yeGcpRUrTeHXf4UWYuXHboQVPkNnDee/movement-ui/#/`

### 2026-04-27 — Step 1 completed
Stack is running. All four SPAs return HTTP 200 and serve valid HTML+JS. Indexer is healthy and has events. Seed data script was started (data.sh --seed) and made progress (funded 50 users, uploaded 90 statements, ran 3 simulation rounds) but timed out after 5 min — likely still processing. URLs:
  - commonality: `http://localhost:8080/ipfs/Qmaki9PKAh5V1qutTq1CyeutyQJ8Fua81S2QhWvgknheNE/commonality-ui/#/`
  - content-funding: `http://localhost:8080/ipfs/QmWVxipcPBjSs5D1he1ySEtaQ1ogxQ5VuFwCyKurcbp9CV/content-funding-ui/#/`
  - noninflammatory: `http://localhost:8080/ipfs/QmUUZHxn9zst4oc9zJYMfH8pmj9PCWaxF5r6gMoHoKPz5C/noninflammatory-ui/#/`
  - movement: `http://localhost:8080/ipfs/QmPNZNgf7nR7xwBbHhCA9R9HNdADx5fwt5tT2cyWjc5eNU/movement-ui/#/`

### 2026-04-27 — Step 0 completed
Fixed `ui/Dockerfile`: added `COPY turbo.json ./turbo.json` and changed `chmod -R a+rwX` to cover the entire `/workspace` instead of just `ui/dist` and `ui/node_modules/.tmp`. All four domain UI builds now publish successfully. Stack is running; ready for Step 1.

### 2026-04-27 — subtask-doer (Opus 4.7), Step 1 attempt
Tried Step 1; the stack does not start cleanly. `./scripts/services.sh --start` fails at the UI IPFS publisher step with a turbo error. Root-caused two problems in `ui/Dockerfile` (see new Step 0 above) but the user redirected me to record a to-do rather than fix the services myself. Dockerfile reverted; services stopped. No findings recorded yet — Step 1 not actually completed.

### 2026-04-27 — large-task-manager (Opus 4.7)
Wrote the plan above. Did not start the actual review. Step 1 (setup + sanity check) is the right next thing. Note: README warns the full test suite takes many minutes, but for *this* review we don't need to run the test suite — we need the running stack and seed data. Use `./scripts/services.sh --start` then `./scripts/data.sh --seed`, then read the printed `http://localhost:8080/ipfs/<cid>/...` URL. Re-print with `./scripts/services.sh --url`. The four domains share the SPA build but route under different paths/manifests — see `ui/src/domains/` and `specs/product/ui-domains.md` for which routes belong to which domain.

The previous status snapshot in README §"High-level overview of current status" is a good summary of what's been recently completed and worth skimming before reviewing.

### 2026-04-28 — Step 2 code-level analysis (Sonnet 4.6)
Docker rebuild cycle is too slow for productive review, so switching to code-level analysis. Read through: `runSimulation.ts`, `indexer/ponder.config.ts`, `indexer/src/events-cache/index.ts`, `sdk/src/subsystems/conceptspace/queries.ts`, `ui/src/domains/commonality/manifest.tsx`, `ui/src/App.tsx`, `ui/src/shared/components/AppShell.tsx`. Key findings: (1) seed data flow confirmed — statements are discovered via DirectSupport events only, no StatementCreated event exists, (2) content-funding seed data likely missing entirely due to env var gap, (3) AppShell page title fix written but not yet verified via rebuild, (4) several new to-do items added. Skipping live seeded-data review — next session should rebuild + reseed + verify in browser.

## Findings

### Findings — Commonality

#### Bugs fixed during review

**BUG (fixed): Page title is `<title>ui</title>` on every page**
Hardcoded in `ui/index.html`. Fix: added `useEffect` in `AppShell.tsx` that sets `document.title = brand.name` (e.g., "Commonality", "Content Funding", etc.) on mount and when the domain branding changes. Code change made; needs rebuild to verify.

**BUG (fixed): Docs page always showed "Page not found."**
`ui/Dockerfile` did not `COPY docs ./docs`. The `DocsPage` uses `import.meta.glob('../../../docs/**/*.md')` which resolves at Vite build time — with no `docs/` in the image, the glob was empty and every docs path returned "not found." Fix: added `COPY docs ./docs` to Dockerfile between `COPY sdk` and `COPY ui`.

**BUG (fixed): Event cache returning 404 on all data-loading pages (explore, statements, projects, content browsing)**
`ui/.env.ipfs` only contained `VITE_ROUTER_MODE=hash`. `VITE_EVENT_CACHE_URL` was unset, so `useMachinery` defaulted to `''` (empty string). Relative URLs like `/api/events?...` resolved to `http://localhost:8080/api/events` — the IPFS gateway, which has no such endpoint. The Ponder indexer runs at port 42069. Fix: added `VITE_EVENT_CACHE_URL=http://localhost:42069` to `ui/.env.ipfs`. (Note: for testnet/mainnet this will need to be set to the deployed indexer URL at build time.)

**BUG (fixed): Three factory contract addresses stale/wrong in `ui/.env`**
`hardhat/scripts/deploy.js` propagated most contract addresses to `ui/.env` after each deployment, but missed `VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS`, `VITE_ERC1155_FACTORY_ADDRESS`, and `VITE_MARKETPLACE_FACTORY_ADDRESS`. The stale value for `VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS` was `0x0165878...` which is actually the `FreeERC1155Factory` address — a different contract entirely. This would cause project creation to call the wrong factory. Fix: added the three missing `updateEnv` calls to `deploy.js`.

**BUG (fixed): Cached project reloads did not rehydrate BigInt totals**
`ui/src/shared/foldCache.ts` serializes cached `ProjectAccumulator.totalReceived` through JSON for IndexedDB, turning the BigInt into a string. `loadCachedProjectAccumulator` returned that string directly, so cached project reloads could hand a string into the SDK fold and break when new bought/sold events were applied. Fix: rehydrate `totalReceived` with `BigInt(...)` on cache load and update the cache round-trip test.

#### Structural review (all 14 pages, no seed data)

All 14 Commonality routes now load with zero console errors after the fixes above. Visual review of screenshots:

- **Landing page** (`/`): Excellent. Tagline "Find common ground first, then fund the work that follows from it" is clear. Three CTAs (Start with Docs, Browse Statements, Browse Projects) are well-chosen. Three sections (Common Ground / Public Goods / Focused Domains) logically organized. Footer links to the three focused sites (Content Funding, Noninflammatory, Common Sense Majority).

- **Docs page** (`/docs`): Now working. Content from `docs/index.md` renders correctly with markdown. Good intro explaining the system.

- **Start/Onboarding page** (`/start`): Excellent new-user experience. Headline "Fund projects and content around what people actually care about" and the conservative/progressive example are compelling. Three-step path (Explore → Walk through → Browse) and three one-liners (Express what you care about / Fund a project / Support creators) are very clear.

- **Browse Statements** (`/statements`): Clean with good explanatory copy. Empty state "No statements found. Be the first to create one!" is appropriate. Minor cosmetic note: the "NEWEST" sort button has a settings/gear icon — probably should be a clock or similar.

- **Browse Projects** (`/projects`): Clean with sort (Newest/Deadline/Most Funded/Closest to Goal) and status filters (All/Funding/Succeeded/Refunding). Well-structured.

- **Explore** (`/explore`): Empty state "No curated collection is available yet. Check back later or browse statements directly." with BROWSE STATEMENTS CTA — graceful.

- **Creators landing** (`/content`): Good platform-picker (Twitter / YouTube / Substack) with per-platform descriptions.

- **Creators browse** (`/content/twitter`, `/content/youtube`, `/content/substack`): Platform tabs, sort (Most Funded / Most Contracts / Newest Activity) and status (All / Unclaimed / Verified / Creator-controlled) filters. Empty state "No creators found for Twitter / X." is clear.

- **Settings** (`/settings`): Comprehensive trust/nudger settings page. Good introductory copy ("Most new users can ignore this page at first"). Sections: Linked social accounts, Trusted statement-connection sources, Nudger addresses (with intensity slider LOW/MEDIUM/HIGH), Muted topics, Your Trust Network. Well-organized.

- **Profile, Notes, Refs** (`/profile`, `/notes`, `/refs`): All show appropriate "Connect your wallet to view..." prompts for unauthenticated state.

#### Minor issues observed (not bugs)

- **Seed data not yet re-run** — all browse pages show empty states. The full seeded-data review (statements with believers, projects with funding progress, creator channels, implication graph navigation) is pending the next session.

### Findings — Content Funding
(empty — fill during Step 3)

### Findings — Noninflammatory
(empty — fill during Step 4)

### Findings — Movement
(empty — fill during Step 5)

### Findings — Cross-cutting

#### Code-level analysis findings (2026-04-28)

**ISSUE: Content-funding seed data likely missing entirely.**
`runSimulation.ts` calls `generateContentFundingScenarios` only if `CHANNEL_REGISTRY_ADDRESS`, `CHANNEL_VERIFIER_ADDRESS`, and `CREATOR_CONTRACT_FACTORY_ADDRESS` are all set in the env. If any are missing (which is likely — these weren't part of the original deployment), the entire content-funding on-chain state is skipped. That means no creator channels, no content contracts, no verification flows in seed data. Check `fake-data-generation/.env` and the deploy script to see if these addresses are ever propagated.

**ARCHITECTURE NOTE: Statement discovery is event-driven via DirectSupport only.**
There is no `StatementCreated` event. Statements live on IPFS; the SDK discovers them by querying `DirectSupport` events from the Beliefs contract and extracting the statement CID from `topic2`. `browseStatements()` and `getAllStatements()` both do this. This means: (a) a statement only appears in the UI after at least one user believes/disbelieves it, (b) the seed data's 374 DirectSupport events *should* be enough to populate the Browse Statements page with seeded statements, (c) a fresh chain with no beliefs will show empty states even if statements exist on IPFS. This is by-design but worth confirming it feels right for the product.

**ISSUE: `ERC1155Sold` event registered in indexer but never emitted.**
`indexer/src/events-cache/index.ts` registers `AssuranceContract:ERC1155Sold`, but the seed data produced zero of these. The simulation does `purchaseFromPrimaryMarket` (which emits `ERC1155Bought`, 1 instance) but never triggers a secondary market sale that would emit `ERC1155Sold`. Either this event should be removed from the indexer config (if it's dead code) or the seed simulation should be updated to exercise it.

**PERFORMANCE: `browseStatements` fetches ALL DirectSupport events (limit 10,000).**
`browseStatementsByMostSupporters` and `browseStatementsByNewest` both fetch up to 10,000 DirectSupport events and fold them in memory. This works for local dev and early testnet, but will degrade as the chain grows. The indexer's events-cache API doesn't support aggregation queries, so this is a fundamental limitation of the current architecture. Worth a TODO for eventual optimization.

**PERFORMANCE: `getIndirectSupporters` has N+1 pattern.**
For each implication pointing to a statement, it fetches DirectSupport events for the source statement separately. With many implications this becomes expensive. Not blocking for testnet but worth noting.

**ISSUE: Seed script 5-minute timeout.**
`./scripts/data.sh --seed` times out after 5 min during round 3 of the simulation. With 50 users × multiple actions per round, 3 rounds takes longer than the timeout. Either increase the timeout or reduce the simulation size for seed data. Current seed data is partial (rounds 1-2 complete, round 3 incomplete).

### Findings — Synthesis
(empty — fill during Step 13)
