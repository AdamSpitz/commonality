# Continuity notes for ephemeral AI instances

Append new entries to the end of the file.


## 2026-06-09 — Testnet verifier browser journeys and config endpoint checks

- Continued `testnet-verifier-todo.md` work.
- Replaced the `testnet.website-journeys` placeholder with a real guarded Playwright/Chromium smoke: with `COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1` and `COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS=1`, it loads every configured deployed app URL, checks the React root/body renders, and fails on page errors, console errors, or obvious error-screen text. A live run passed for all 8 configured `*.testnet.commonality.works` app URLs.
- Strengthened `testnet.app-config`: it now fetches every deployed app's `/config.json`, requires valid JSON, checks `VITE_CHAIN_ID` against the manifest chain id, and still searches config + bundle text for required/forbidden deployment values.
- Fixed the UI IPFS/runtime config emitter to include `VITE_CHAIN_ID` in future `dist/<domain>/config.json` builds.
- Live `testnet.app-config` now surfaces a concrete deployed config problem: current deployed `config.json` files omit `VITE_CHAIN_ID`; the searchable deployed bundle/config still contains a forbidden `localhost` string and lacks the expected `commonality-indexer.onrender.com` text. This should be resolved by rebuilding/redeploying with the updated config emitter and then revisiting whether the manifest's expected indexer URL should remain direct Render or move to the service gateway.
- Checks run: `node --check verifier/checks/testnet/app-config.mjs`; `node --check verifier/checks/testnet/website-journeys.mjs`; direct no-opt-in runs of both checks emitted guarded error JSON; `verifier-run --workspace verifier known-bad.testnet-focused` passed; live `COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1 COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS=1 node verifier/checks/testnet/website-journeys.mjs` passed; live `COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1 node verifier/checks/testnet/app-config.mjs` failed as expected with the deployed config findings; LSP workspace diagnostics showed no errors (only an existing TS hint in known-bad fixture code).

## 2026-06-09 — Testnet verifier mutating canary and route journeys

- Continued `testnet-verifier-todo.md` work.
- Replaced the `testnet.onchain-to-indexer` placeholder with a real guarded mutating canary. With `COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1`, `COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION=1`, `COMMONALITY_TESTNET_RPC_URL`, and `COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY`, it checks the RPC chain id, submits a verifier-funded `AlignmentAttestations.attestAlignment` transaction using reserved verifier statement/topic IDs, waits for inclusion, then polls the deployed indexer event cache for the exact transaction hash/topic tuple.
- Extended `testnet.website-journeys` beyond one shell load per app: `verifier/environments/testnet.json` now has a `websiteJourneys` route inventory, and the Playwright check probes those configured hash routes while preserving the old app URL fallback.
- Updated `verifier/README.md` runbook/docs and `testnet-verifier-todo.md` status/follow-ups. Remaining live work: provision/fund the verifier wallet and run `testnet.onchain-to-indexer` against real testnet; rerun expanded browser route journeys against the deployed apps; eventually add wallet-backed/domain-specific website paths.
- Checks passed: `node --check verifier/checks/testnet/onchain-to-indexer.mjs`; `node --check verifier/checks/testnet/website-journeys.mjs`; JSON parse for edited testnet config/def; direct guarded no-opt-in runs of `testnet.onchain-to-indexer` and `testnet.website-journeys` emitted valid Result JSON; synthetic mutating run against an unreachable RPC failed safely before mutation; `verifier-run --workspace verifier coverage.guarded-check-policy`; `verifier-run --workspace verifier known-bad.testnet-focused`; `git diff --check`; LSP workspace diagnostics clean.

## 2026-06-09 — Testnet verifier live run and Ponder/runtime fixes

- Continued `testnet-verifier-todo.md` work by running the focused deployed-testnet checks against the live Base Sepolia/testnet environment.
- Fixed `testnet.indexer` for the live Ponder GraphQL shape: deployed `_meta` exposes JSON `status` keyed by `base-sepolia`, not `_meta.block.number`.
- Fixed the shared testnet probe helper so JSON parsing uses the full raw response body while stored evidence remains truncated; this made `testnet.contracts` correctly parse large `eth_getCode` results.
- Updated the expanded browser route inventory to use real deployed routes instead of stale paths (`/docs`, `/founders`, `/delegation/notes`, `/explore`, `/content`).
- Updated the known-bad testnet indexer fixture so it still proves stale-lag rejection against the current `_meta.status` shape.
- Live results: DNS, HTTP, RPC, indexer, app-shell, and contracts passed. `testnet.app-config` correctly fails because deployed config lacks a chain id and still points event-cache/runtime text at localhost; `testnet.website-journeys` now fails only on routes that hit that localhost config (`lazygiving#/projects`, `alignment#/explore`). `testnet.onchain-to-indexer` was recorded as skipped by guarded mutation policy when run without mutation opt-in.
- Checks run: `node --check` for touched verifier scripts, `jq empty verifier/environments/testnet.json`, live `verifier-run` for focused testnet leaves and `testnet.environment`, `verifier-run known-bad.testnet-focused`, `git diff --check`, LSP diagnostics clean on touched verifier scripts.

## 2026-06-12 — Project-wide review completed (tech-debt, previous-action-items, synthesis)

- Finished the project-wide review in `workflow/reviews/architecture-2026-06-12.md` (all 9 chunks done; synthesis at the top of that file). Overall health: Good — the review's consistent theme is that the project's self-knowledge (verifier reports, coverage maps, TODO/PLAN lists) is trustworthy.
- Tech-debt chunk (findings 21–23): one TODO comment in the entire non-test codebase; `npm audit` 2 critical/15 high (mostly cheap fixes — `npm audit fix` item in TODO.md); hardhat 2→3 timing decision recorded in TODO.md; removed stale `output/`, `test-results/`, accidental `.codex`; `automated.dependency-audit` candidate check recorded in verifier/PLAN.md P2; `fable-critique.md` disposition in inbox.md; testnet-verifier-todo.md fold-in item in TODO.md.
- Previous-action-items chunk (findings 24–26): before-testnet items 4 (stale-cache verification) and 6 (wallet-connected smoke test) remain open but tracked — both want the same wallet-equipped deployed-testnet session; item 5 was the dropped ball: testnet still runs `PAYMENT_TOKEN_SYMBOL=USDZZZ` while deployment.md says USDC, untracked anywhere — now in inbox.md (Ask tier, finding 25).
- For whoever works next: start from `npm run verifier:report` (the root report is the living priority list), or from TODO.md for the review's queued cleanups.
- Addendum (same session, requested by Adam): a first-principles "Architecture quality — simplicity & robustness" chunk (findings 27–30). Verdict: Client-Side Folding holds up under would-we-build-it-again scrutiny. Three cheap robustness fixes queued in TODO.md: UI never uses the SDK's read-your-writes sync helper (post-write refetch races the indexer), service-host supervisor has no restart backoff (fixed 1s forever), and global queries truncate silently at limit 10000.

## 2026-06-12 — Service-host env bundling cleanup

- Completed the TODO.md service-bundling cleanup pass.
- Moved recurring-pledge-scheduler env parsing out of service-host/src/envConfig.ts into service-host/src/recurringPledgeScheduler.ts, matching the other logical services that own their loadConfigFromEnv implementation.
- Kept/verified lazy env loading for enabled services only, renamed remaining service-host internals/log messages away from worker terminology, and added instance-specific ROUTE_PREFIX handling so SERVICE_HOST_INSTANCES can run multiple instances of the same kind with distinct routes.
- Updated service-host tests for instance-specific route prefixes and terminology. Checks passed: npm run test --workspace=@commonality/service-host; npm run typecheck --workspace=@commonality/service-host; npm run lint --workspace=@commonality/service-host.

## 2026-06-12 — Code-quality cleanup partial pass

- Started the TODO.md code-quality cleanup sweep.
- Removed the SDK generated GraphQL output and SDK codegen build step (`sdk/src/generated`, `sdk/codegen.ts`, SDK `build` now runs `tsc`, SDK `clean` no longer mentions generated files), dropped the SDK `@graphql-codegen/*` devDependencies, and updated the `machinery.indexerUrl` docstring away from "GraphQL indexer" language.
- Renamed the SDK write-path type from `TestClients` to `WriteClients` across SDK/UI/integration source, and renamed the local private-key helper to `createWriteClients`.
- Added `ui/src/shared/hooks/useWriteClients.ts`; note that the UI call sites still need to be migrated to the hook to remove the remaining `walletClient as any` / `publicClient as any` casts.
- Consolidated address truncation into `ui/src/shared/utils/address.ts`, re-exported it from `delegation/utils.ts`, and removed duplicate local implementations from `PrivyWalletButtonImpl`, lazyGiving `Leaderboard`, and `CauseLeaderboardPage`.
- Checks passed: `npm run typecheck --workspace=@commonality/sdk`; `npm run typecheck --workspace=ui`; `npm run build --workspace=@commonality/sdk`.
- Remaining from the same TODO section: migrate UI write call sites to `useWriteClients`, split `SettingsPage.tsx`, and decide whether/when to do the cosmetic cross-package naming drift.

## 2026-06-12 — UI write-client cast cleanup

- Continued the TODO.md code-quality cleanup sweep.
- Migrated production UI write paths from hand-built `{ walletClient: walletClient as any, publicClient: publicClient as any, account }` objects to the shared `useWriteClients()` hook across conceptspace, delegation, fundingportal, lazyGiving, content-funding, and mutablerefs UI files.
- Marked the `TestClients`/`WriteClients` + `useWriteClients()` TODO item complete. Remaining code-quality TODOs are the larger SettingsPage file split and optional cosmetic package naming drift.
- Checks passed: `npm run build --workspace=ui` (with existing third-party Rollup PURE-comment/chunk-size warnings).

## 2026-06-12 — SettingsPage section split

- Completed the remaining non-cosmetic Code-quality cleanup for `ui/src/conceptspace/pages/SettingsPage.tsx`.
- Replaced the monolithic SettingsPage component with a small page shell and four per-section components under `ui/src/conceptspace/components/settings/`: linked social accounts, trusted statement sources, trusted content attesters, and nudger settings. Each section now owns its own form/transient state and persistence handlers.
- Also completed the cosmetic cross-package path naming cleanup: renamed UI folders to `mutable-refs`, `fundingportals`, and `lazy-giving`, renamed the SDK `lazy-giving` subsystem folder, and updated imports/verifier path references. Domain IDs/routes/user-facing names were intentionally left unchanged.
- Checks passed: `npm run typecheck --workspace=ui`; `npm run typecheck --workspace=@commonality/sdk`; `cd ui && ../node_modules/.bin/eslint src/conceptspace/pages/SettingsPage.tsx src/conceptspace/components/settings`.

## 2026-06-12 — Service-host supervisor backoff

- Completed the TODO.md architecture robustness item for service-host supervisor restart behavior.
- Added exponential restart backoff capped at 60s, plus per-service restart counts reported in supervisor logs.
- Added supervisor tests for delay calculation, cap behavior, restart count logging, and repeated crash-loop backoff.
- Checks passed: `npm run test --workspace=@commonality/service-host`; `npm run typecheck --workspace=@commonality/service-host`; `npm run lint --workspace=@commonality/service-host`.

## 2026-06-12 — Cause board terminology sweep

- Completed the TODO.md user-facing rename sweep from legacy portal wording to canonical “cause board” terminology.
- Updated UI copy/tests in fundingportals pages/components, related conceptspace/domain copy, end-user docs, and `specs/dev/testing/pregenerated-worker-outputs.md`. Internal code identifiers, routes, events/contracts, and the intentional convention note in `specs/tech/subsystems/fundingportals/README.md` were left unchanged.
- Checks passed: TypeScript LSP diagnostics clean; `npm run test:vitest --workspace=ui -- src/fundingportals/components/FundingPortalSummary.test.tsx src/fundingportals/pages/StatementFundingPortalPage.test.tsx src/fundingportals/pages/ExplorerPage.test.tsx`. `verifier-run review.docs-coherence` no longer reports the terminology issue; `verifier-run facet.docs` is still uncertain due to unrelated stale service-host/service-bundling/integration-test docs findings.

## 2026-06-12 — Folded testnet verifier scratch backlog

- Folded the remaining live-environment follow-ups from `testnet-verifier-todo.md` into `verifier/PLAN.md` under the P1 deep boot/testnet cadence item. The folded items are full harness validation, live reruns of focused `testnet.*` leaves after deployed config fixes, provisioning/funding the verifier wallet, running the mutating `testnet.onchain-to-indexer` canary, and extending deployed website journeys into wallet-backed/domain-specific paths.
- Deleted the now-obsolete `testnet-verifier-todo.md` scratch file and marked the TODO.md tech-debt item complete.
- No code/tests changed; documentation-only cleanup.

## 2026-06-12 — Security/recoverability verifier checks

- Worked from `workflow/security-recoverability.md` and completed the Detection verifier-check tasks.
- Added reviewed baselines under `verifier/security-baselines/` for trust-root deployment env values and current `package-lock.json` dependency package entries.
- Added verifier checks: `security.trust-roots`, `security.package-lock-dependencies`, `security.onchain-owners`, and advisory `security.agent-wallet-activity`; wired them into `facet.security`.
- Surfaced the remaining Adam-only security/recoverability tasks in `inbox.md`.
- Checks passed: JSON parse for new/edited verifier definitions/baselines; `VERIFIER_WORKSPACE=verifier npx verifier-run security.trust-roots`; `VERIFIER_WORKSPACE=verifier npx verifier-run security.package-lock-dependencies`; guarded no-opt-in runs of `security.onchain-owners` and `security.agent-wallet-activity` returned expected error Results; LSP workspace diagnostics clean.

## 2026-06-14 — Verifier report staleness warning and UI E2E triage

- Added direct-input staleness detection to `scripts/verifier-report.mjs`; `npm run verifier:report` now warns when the stored report is older than any direct input result and tells the reader to rerun `verifier-run --workspace verifier <checkId>`.
- Investigated the `automated.test-full-ui` failure. The initial failure mode was Playwright starting tests while Vite dev servers were temporarily unreachable after E2E setup rewrote `ui/.env`; added an explicit post-env-refresh wait for the Vite dev servers in `ui/e2e/global-setup.ts`.
- Verified that `npm run test:e2e --workspace=ui -- browse-statements.spec.ts` now passes (2 tests) and `npm run test:vitest --workspace=ui` passes (98 files / 1629 tests). Full `npm run test:e2e --workspace=ui` still fails with 13 substantive UI/data-display failures after the dev-server-refused issue is gone; this remains follow-up work.
- Checks: `npm run verifier:report`; LSP diagnostics clean for changed files; `npm run lint --workspace=ui` has only the pre-existing NetworkSwitchPrompt fast-refresh warning.

## 2026-06-15 — UI E2E verifier fixes

- Fixed `ui/e2e/global-setup.ts` so Playwright E2E rewrites stale local `.env` values for `VITE_EVENT_CACHE_URL`, `VITE_IPFS_API`, `VITE_CHAIN_ID`, and `COMMONALITY_ENVIRONMENT`. The failed UI E2E suite was reading remote/stale event-cache data while tests created fresh local chain state.
- Made `ui/e2e/ipfs-domain-artifact-smoke.spec.ts` less brittle: it no longer requires a semantic h1 on each artifact home page, and accepts the current Aligning/Alignment product naming while still checking brand text, non-empty rendered content, navigable links, deep-link reloads, wrong-domain 404s, and console errors.
- Verification: `npm run test:e2e --workspace=ui` passed (34/34). LSP diagnostics clean for changed files.

## 2026-06-15 — Alignment Explorer launch responsiveness

- Completed the TODO.md Alignment Explorer implementation item from specs/tech/subsystems/conceptspace/explorer.md.
- Lowered the explorer curator default interval from 6h to 15m, added POST /curate for on-demand curator cycles during low-activity launch/demo periods, and added an unchanged-input fingerprint fast-path to avoid repeat LLM calls when nothing changed.
- Updated Aligning /explore to handle trusted-but-empty curated collections and thin maps with explicit fallback/sparse-state UI.
- Follow-up filed in TODO.md: redesign the curator cadence into a tiered cheap-intake + infrequent/full-review system for real production cost control; the fingerprint fast-path is only an incremental guard.
- Files changed: explorer-curator/src/config.ts, explorer-curator/src/index.ts, explorer-curator/README.md, explorer-curator/test/app.test.ts, explorer-curator/test/config.test.ts, ui/src/fundingportals/pages/ExplorerPage.tsx, ui/src/fundingportals/pages/ExplorerPage.test.tsx, specs/tech/subsystems/conceptspace/explorer.md, TODO.md.

## 2026-06-18 — Contract event-shape review practice

- Completed the TODO.md contract-versioning process item.
- Documented event-shape stability in `workflow/reviews/README.md`: contract reviews should treat events as versioned public API, prefer additive events, and rename breaking event changes (for example `NoteCreatedV2`).
- Classified the not-yet-wired `ProspectiveContentTokens` and `MaterializedContentTokens` families in `specs/tech/contract-versioning.md` as Class 2 factory + finite-lifetime children, with v2 handled by parallel factories/children while old contracts remain readable/usable.
- Removed the completed TODO item. Docs-only change; no automated tests run.

## 2026-06-18 — Alignment Explorer curator tiered cadence

- Completed the TODO.md Alignment Explorer cost-control cadence item.
- Added a cheap intake pass in explorer-curator that fingerprints resolvable statements/support signals, accumulates pending importance for new statements and support increases, and triggers a full review only when due (~6h by default) or when the pending threshold is crossed.
- Changed the service scheduler to run intake every 15m by default while preserving full reviews at 6h, and updated POST /curate to accept mode="intake" vs mode="full" (default full) for explicit operator forcing.
- Updated explorer-curator docs, the Alignment Explorer spec, config/tests, and removed the completed TODO item.
- Checks passed: npm run test --workspace=@commonality/explorer-curator; npm run typecheck --workspace=@commonality/explorer-curator; npm run lint --workspace=@commonality/explorer-curator; LSP workspace diagnostics clean.

## 2026-06-18 — Secondary-market contract-versioning fold keys

- Picked up part of the TODO.md contract-versioning prep item for SDK/indexer/UI keyed IDs.
- Updated `foldSecondaryMarket` so sale listings and buy orders are keyed internally by `(marketplaceAddress, id)` instead of bare `saleListingId`/`buyOrderId`, allowing events from multiple marketplace contract versions with restarted counters to be folded together safely. Public records still expose the original id plus marketplace address.
- Added SDK fold coverage for identical listing/order IDs across two marketplace addresses and updated TODO.md to note that secondary-market IDs are done while the broader audit remains.
- Checks passed: `npm run test --workspace=@commonality/sdk -- folds.test.ts`; `npm run typecheck --workspace=@commonality/sdk`; `npm run lint --workspace=@commonality/sdk`; LSP diagnostics clean for touched SDK files.

## 2026-06-18 — Delegation contract-versioning fold keys

- Continued the TODO.md contract-versioning prep item for SDK/indexer/UI keyed IDs.
- Updated delegation note folding so internal note state is keyed by `(contractAddress, noteId)` and events from two DelegatableNotes contract versions with the same numeric note ID do not collide. Public `Note.id` remains the numeric id, and the returned maps keep backwards-compatible bare-id entries only when that id is unambiguous.
- Updated recurring pledge folding so internal pledge records are keyed by `(contractAddress, pledgeId)`, with the same unambiguous bare-id compatibility behavior.
- Added regression coverage for same numeric IDs across two contract addresses in delegation folds and recurring pledge folds.
- Checks passed: `npm run test --workspace=@commonality/sdk -- src/subsystems/delegation/folds.test.ts src/subsystems/delegation/recurring-pledges.test.ts`; `npm run typecheck --workspace=@commonality/sdk`; `npm run lint --workspace=@commonality/sdk`; `git diff --check`; LSP workspace diagnostics clean.

## 2026-06-18 — SuccessAttestation indexer handler

- Completed the TODO.md Trust item to index successful-project attestations.
- Regenerated indexer AlignmentAttestations ABI from the Hardhat artifact so it includes SuccessAttestation/SuccessRevoked and related functions, then registered `AlignmentAttestations:SuccessAttestation` in the raw event cache next to `AlignmentAttestation`.
- Removed the completed TODO item. Note: `npm run sync-abis --workspace=commonality-indexer` also wanted to update several unrelated ABI files from current artifacts; those unrelated generated changes were reverted to keep this task focused.
- Checks passed: `npm run typecheck --workspace=commonality-indexer`; `npm run lint --workspace=commonality-indexer`; LSP workspace diagnostics clean.


## 2026-06-18 — Per-page verifier copy-sense LLM check

- Picked up the TODO.md per-page LLM verifier-check item and implemented the first bounded analysis kind: `review.page-copy-sense` (does sampled page copy make sense to a first-time user?).
- The check derives pages via `derivePageInventory()`, samples up to 10 non-redirect pages by default, collects route component source, writes prompt/raw/report artifacts, uses `llm-judgment.mjs`, and maps finding severities deterministically (`high` => fail, any other finding => uncertain, none => pass). It is manual-triggered for cost control.
- Wired `review.page-copy-sense` into `product.messaging` so it rolls up through `facet.product`/root once run.
- Updated TODO.md to leave the broader per-page LLM task open for future analysis kinds (usability, visual appeal, mobile) while noting copy-sense is done.
- Checks passed: `node --check verifier/checks/review/page-copy-sense.mjs`; `jq empty` on the new def and edited product messaging def; direct fixture run of the script; fixture `npx verifier-run --workspace verifier review.page-copy-sense`.

## 2026-06-18 — Per-page verifier usability LLM check

- Continued the TODO.md per-page LLM verifier-check item by adding `review.page-usability`, a sampled/manual LLM leaf that reuses the derived UI page inventory and source collection from `review.page-copy-sense` but prompts for first-time-user UX/usability problems rather than copy clarity.
- Wired `review.page-usability` into `product.messaging` so it rolls up alongside landing/copy/framing checks, and updated TODO.md to note that copy-sense and usability are done while visual appeal/mobile remain.
- Checks passed: `node --check verifier/checks/review/page-usability.mjs`; `jq empty` on the new def and edited product messaging def; fixture direct script run; fixture `npx verifier-run --workspace verifier review.page-usability`; `git diff --check`.

## 2026-06-18 — Page visual-appeal verifier check

- Completed one TODO.md verifier-analysis subtask: added the manual/cost-guarded `review.page-visual-appeal` LLM leaf, using the same source-derived UI page inventory and fixture/test pattern as `review.page-copy-sense` / `review.page-usability`.
- Wired `review.page-visual-appeal` into `product.messaging` so refreshed results roll up through the product facet/root dashboard.
- Updated TODO.md to note that visual appeal is now covered; mobile usability remains the outstanding per-page LLM analysis kind from that item.
- Checks passed: `node --check verifier/checks/review/page-visual-appeal.mjs`; `jq empty verifier/checks/review/page-visual-appeal.def.json verifier/checks/product/messaging.def.json`; direct fixture run of `node verifier/checks/review/page-visual-appeal.mjs`; fixture run via `npx verifier-run --workspace verifier review.page-visual-appeal`; LSP workspace diagnostics clean.
