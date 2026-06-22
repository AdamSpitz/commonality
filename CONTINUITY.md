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

## 2026-06-18 — Page mobile-usability verifier check

- Completed the remaining TODO.md per-page LLM analysis kind: added `review.page-mobile-usability`, a manual/cost-guarded LLM leaf that evaluates whether sampled UI pages work well on mobile devices (responsive layout, touch targets, navigation adaptation, content stacking).
- Follows the same pattern as the other three LLM per-page checks (`page-copy-sense`, `page-usability`, `page-visual-appeal`): same `derivePageInventory()` loop, same severity-gated status mapping, same fixture env vars.
- Prompt covers: fixed-width layouts, small touch targets, unresponsive navigation, content density, nested horizontal scroll, unusable forms/grids, and non-mobile-friendly overlays.
- Wired into `product.messaging` alongside the other product-judgment leaves.
- Marked the per-page LLM verifier-checks item in TODO.md as complete (all four analysis kinds: copy sense, usability, visual appeal, mobile usability).
- Checks passed: `node --check verifier/checks/review/page-mobile-usability.mjs`; `jq empty verifier/checks/review/page-mobile-usability.def.json verifier/checks/product/messaging.def.json`; direct fixture run (`COMMONALITY_VERIFIER_PAGE_MOBILE_USABILITY_FIXTURE_RESPONSE`); fixture run via `npx verifier-run --workspace verifier review.page-mobile-usability`; LSP workspace diagnostics clean.

## 2026-06-18 — Foolproof LazyGiving recipient field

- Completed TODO.md item (Tell tier): replaced the raw `0x…` recipient text box in `CreateProjectPage.tsx` with a layered `RecipientPicker` component.
- Three modes: (1) "Send to my account" default with truncated address, (2) saved contact list persisted in IndexedDB (`shared/contactStore.ts`), (3) ENS name resolution via viem's `getEnsAddress` with plain-language confirmation and auto-save to contacts.
- Added `fake-indexeddb` to test deps so IndexedDB-backed stores work in jsdom.
- Key decision: added `useRef` guard + `lastResolvedInput` to prevent infinite re-resolution loop when `publicClient` reference changes (as wagmi mock did per-render in tests).
- Did NOT build the embedded-wallet claim-later path (#4 in spec).
- Files: `ui/src/lazy-giving/components/RecipientPicker.tsx` (new), `RecipientPicker.test.tsx` (new), `shared/contactStore.ts` (new), `contactStore.test.ts` (new), modified `CreateProjectPage.tsx`/`.test.tsx`, `components/index.ts`, `test/setup.ts`.
- Checks: 1654/1654 tests pass across 100 files; `tsc --noEmit` clean; `eslint` clean.

## 2026-06-18 — Proof-of-progress updates channel link

- Completed TODO.md item (Tell tier): added a first-class optional `updatesUrl` field to LazyGiving project IPFS metadata.
- Project creation now has a prominent `Updates channel link (optional)` URL field, validates http(s) URLs, and stores the trimmed link in the uploaded metadata document.
- Project pages now render `metadata.updatesUrl` as a plain external `Progress updates` link in `ProjectHeader`; no hosted comments/feed embedding was added.
- Tests added/updated for create-form rendering, metadata upload, URL validation, and project-page link rendering.
- Checks passed: `npm run test:vitest --workspace=ui -- src/lazy-giving/pages/CreateProjectPage.test.tsx src/lazy-giving/components/ProjectHeader.test.tsx`; LSP clean for touched components.

## 2026-06-18 — Contract owner-lever shrink

- Completed TODO.md Tell-tier owner-lever shrink task.
- `DelegatableNotes.setRecurringPledgeRegistry` is now set-once: once `recurringPledgeRegistry` is nonzero, later owner calls revert with `RecurringPledgeRegistryAlreadySet`.
- `ChannelRegistry.setVetoWindowDuration` now rejects shortening via `VetoWindowDurationCannotDecrease`, while still permitting bounded lengthening.
- Added unit coverage in `RecurringPledges.test.js` and `ContentFunding.test.js`; marked the TODO item complete.
- Checks passed: `npm run test --workspace=hardhat -- test/RecurringPledges.test.js test/ContentFunding.test.js`; LSP workspace diagnostics show only existing JS unused-variable hints in `ContentFunding.test.js`.

## 2026-06-20 — ContentRegistry contract-versioning fold keys

- Continued the TODO.md contract-versioning prep item for SDK/indexer/UI keyed IDs.
- Updated `foldContentRegistry` so content items are keyed primarily by `(contentRegistryAddress, contentId)` instead of bare `contentId`, preventing collisions when a future ContentRegistry v2 restarts IDs at 1.
- Preserved backwards-compatible bare `contentId` lookup only when the numeric ID is unambiguous, matching the delegation/recurring-pledge compatibility pattern. Updated content-funding query helpers to dedupe compatibility aliases when iterating items.
- Added regression coverage for same numeric `contentId` across two registry addresses and fixed the content-funding test project fixture to include its required `fundingCurrency`.
- Checks passed: `npm run test --workspace=@commonality/sdk -- src/subsystems/content-funding/queries.test.ts`; `npm run typecheck --workspace=@commonality/sdk`; `npm run lint --workspace=@commonality/sdk`; LSP diagnostics clean for touched SDK files.

## 2026-06-20 — Secondary-market UI contract-versioning keys

- Continued the TODO.md contract-versioning prep item for SDK/indexer/UI keyed IDs.
- Updated LazyGiving SecondaryMarketSection so React row keys, quantity inputs, and in-flight action state for sale listings and buy orders are keyed by (marketplaceAddress, id) rather than bare listing/order IDs. This prevents UI state collisions if a future marketplace v2 restarts saleListingId/buyOrderId counters while old marketplace data is still displayed.
- Updated TODO.md to record this secondary-market UI piece as done; the broader contract-versioning audit item remains open.
- Checks passed: npm run typecheck --workspace=ui; LSP diagnostics clean for ui/src/lazy-giving/components/SecondaryMarketSection.tsx.

## 2026-06-20 — Content-funding UI contract-versioning keys

- Continued the TODO.md contract-versioning prep item for SDK/indexer/UI keyed IDs.
- Added `contentRegistryAddress` to folded content items and exported `getContentItemKey()` so UI code can key content items by `(contentRegistryAddress, contentId)` instead of bare `contentId` when data comes from the ContentRegistry fold, while retaining a bare-id fallback for older/mocked items.
- Updated content-funding channel/project content item lists and conceptspace supporting-content cards to use the scoped content-item key, preventing React key collisions when a future ContentRegistry v2 restarts content IDs.
- Updated TODO.md to record this content-funding UI piece as done; the broader contract-versioning audit item remains open.
- Checks passed: `npm run test --workspace=@commonality/sdk -- src/subsystems/content-funding/queries.test.ts`; `npm run typecheck --workspace=@commonality/sdk`; `npm run typecheck --workspace=ui`; `npm run lint --workspace=@commonality/sdk`; targeted UI eslint for touched files. LSP still shows stale export errors for `getContentItemKey` despite SDK build/typecheck passing; likely TS server cache against SDK dist.

## 2026-06-20 — Contract-versioning note-chain key prep

- Continued the TODO.md contract-versioning prep for SDK/UI id collision safety.
- Added `contractAddress` to public delegation `Note` records and `noteContract` to purchased-note events / batch delegation-chain links, preserving bare numeric `id` for compatibility while making the assigning DelegatableNotes contract explicit.
- Updated LazyGiving project contribution-chain enrichment to fetch/group delegation chains by `(noteContract, noteId)` rather than bare note ID, so future DelegatableNotes deployments with IDs restarting at 1 do not collide in leaderboard chain display.
- Added fold test assertions for contract address preservation on same numeric note IDs from different DelegatableNotes contracts.
- Checks passed: `npm run test --workspace=@commonality/sdk`; `npm run typecheck --workspace=@commonality/sdk`; `npm run typecheck --workspace=ui`.
- The broader TODO item is still open; remaining audit areas include route/API shapes that still accept bare note IDs for human deep links and any other UI/SDK call sites where a future multi-contract context needs an explicit contract selector.

## 2026-06-20 — Indexer deployment manifest support

- Completed the TODO.md contract-versioning prep item for indexer config.
- `indexer/ponder.config.ts` now accepts `INDEXER_DEPLOYMENT_MANIFEST` JSON keyed by chain/logical contract name with lists of `{address, startBlock}`. Legacy one-env-var-per-contract config remains supported as a fallback for local/backward-compatible deployments.
- Multiple versions are passed to Ponder as address arrays; the logical contract/factory start block is the earliest listed deployment start block so older versions are not missed. Factory-discovered child contracts inherit the factory deployment list/start block.
- Documented the manifest shape in `indexer/README.md`.
- Checks passed: `npm run typecheck --workspace=commonality-indexer`; `npm run lint --workspace=commonality-indexer`. LSP workspace diagnostics include stale/noisy diagnostics from opened `node_modules/ponder/src/*`, not project source errors.

## 2026-06-20 — Note-intent UI contract-versioning keys

- Continued the TODO.md contract-versioning prep item for SDK/indexer/UI keyed IDs.
- Updated note-intent-based UI paths to look up notes by scoped `(noteContract, noteId)` keys instead of bare note IDs: AvailableDelegatableFunding, fundingportals computeAvailableDelegatableFunding, and DelegatableNotesSection.
- Added shared UI helpers for note scoped keys and switched table row keys to `(contractAddress, id)` so duplicate note IDs from parallel DelegatableNotes versions do not collide.
- Updated TODO.md to record this note-intent UI piece as done; the broader contract-versioning audit item remains open.
- Checks passed: `npm run test:vitest --workspace=ui -- src/delegation/components/AvailableDelegatableFunding.test.tsx src/fundingportals/utils.test.ts src/fundingportals/components/DelegatableNotesSection.test.tsx`; `npm run typecheck --workspace=ui`; LSP workspace diagnostics clean.

## 2026-06-20 — Delegation note detail route contract-versioning keys

- Continued the TODO.md contract-versioning prep item for SDK/indexer/UI keyed IDs.
- Added delegation note route helpers so detail links encode `(noteContract, noteId)` as `/delegation/notes/<contract%3Aid>`; bare `/delegation/notes/:noteId` routes are intentionally rejected rather than preserved for compatibility.
- Updated My Notes, delegate profile, available-delegatable-funding, fundingportal delegatable notes, and post-deposit success links to use scoped note detail URLs when note/contract data is available.
- Updated NoteDetailPage to parse scoped route IDs, fetch note-intent attestations for the route's note contract, and send note actions to the loaded note's contract address rather than always using the current env contract.
- Checks passed: `npm run test:vitest --workspace=ui -- src/delegation/utils.test.ts src/delegation/pages/NoteDetailPage.test.tsx src/delegation/pages/MyNotesPage.test.tsx src/delegation/pages/DepositPage.test.tsx src/delegation/components/AvailableDelegatableFunding.test.tsx src/fundingportals/components/DelegatableNotesSection.test.tsx`; `npm run typecheck --workspace=ui`.
- The broader contract-versioning TODO remains open; remaining audit areas include other route/API shapes keyed by bare onchain IDs outside the delegation note detail path.

## 2026-06-20 — Successful projects card receipt price

- Completed the current-receipt-price slice of the TODO.md successful-projects-on-cause-boards polish item.
- SDK `getSuccessfulProjectsForCause` now includes `currentReceiptPrice` as the lowest currently offered primary-market token price, or `null` if unavailable.
- `SuccessfulProjectsList` surfaces that price on each card with a fallback, and its component tests cover both priced and unavailable cases.
- Updated TODO.md to remove the completed current-price/UI-test subpart while leaving the larger successful-projects item open for E2E verification, success-attestation branch tests, real buy-and-burn UX, and policy decisions.
- Checks passed: `npm run build --workspace=@commonality/sdk`; `npm run test:vitest --workspace=ui -- SuccessfulProjectsList.test.tsx`; LSP workspace diagnostics clean. Note: an initial `npm test --workspace=ui -- SuccessfulProjectsList.test.tsx` ran all Vitest tests successfully but then failed because the Playwright e2e phase found no matching e2e test file for that pattern.

## 2026-06-20 — AlignmentAttestationsSection success-branch UI tests

- Picked the TODO.md successful-projects polish subtask to add/confirm UI tests for the success-attestation branch of `AlignmentAttestationsSection`.
- Added tests covering displayed success attestations (statement title/fallback link, truncated attester, Delivered chip), opening the Attest Success dialog, and submitting through `attestSuccess` with the expected subject/topic arguments.
- Updated TODO.md to remove that subpart from the remaining successful-projects work.
- Checks passed: `npm run test:vitest --workspace=ui -- src/fundingportals/components/AlignmentAttestationsSection.test.tsx`; LSP diagnostics clean for the touched test file.

## 2026-06-21 — Recurring pledge fold alias dedupe

- Chose a small slice of the TODO.md contract-versioning prep item.
- Fixed `getStandingPledges` and `monthlyPledgedByCause` so the SDK keeps backwards-compatible bare pledge-id aliases in `foldStandingPledges` without double-returning/double-counting the same `StandingPledge` object in single-contract callers.
- Added a regression test proving monthly cause totals do not double-count the scoped + bare alias for one pledge.
- Checks passed: `npm run test --workspace=@commonality/sdk -- recurring-pledges` (Mocha ignored the pattern but ran the SDK suite, 313 passing); `npm run typecheck --workspace=@commonality/sdk`; LSP diagnostics clean for `sdk/src/subsystems/delegation/recurring-pledges.ts`.

## 2026-06-21 — Delegation note alias dedupe

- Continued the TODO.md contract-versioning prep item with another small SDK fold cleanup.
- Added `uniqueNotes()` and used it in `getNotesByOwner`/`getNotesByRoot` so the backwards-compatible bare note-id aliases exposed by `foldDelegationState` do not duplicate notes in list-query results for single-contract callers.
- Added a fold regression test proving scoped + bare aliases de-duplicate to one note for list callers.
- Checks passed: `npm run test --workspace=@commonality/sdk -- delegation/folds` (Mocha ignored the pattern but ran the SDK suite, 314 passing); `npm run typecheck --workspace=@commonality/sdk`; LSP diagnostics clean for `sdk/src/subsystems/delegation/folds.ts`.

## 2026-06-21 — My Notes contract-versioning action keys

- Continued the TODO.md contract-versioning prep item with a small UI/SDK slice.
- Added `contractAddress` to public `StandingPledge` records, populated from `StandingPledgeCreated` events, so recurring-pledge UI actions can target the RecurringPledges contract version that assigned the pledge id.
- Updated `MyNotesPage` management actions: delegate/revoke now fetch chains by scoped `(noteContract, noteId)` keys and delegate/revoke/reclaim calls use the note's own DelegatableNotes contract address; recurring pledge cancellation uses the pledge's own RecurringPledges contract address; React keys for notes/pledges are scoped.
- Updated MyNotesPage tests to assert scoped chain lookup and version-specific action contract addresses.
- Checks passed: `npm run typecheck --workspace=@commonality/sdk`; `npm run typecheck --workspace=ui`; `npm run build --workspace=@commonality/sdk`; `npm run test:vitest --workspace=ui -- src/delegation/pages/MyNotesPage.test.tsx`; `npm run test --workspace=@commonality/sdk -- recurring-pledges` (Mocha ignored the pattern and ran the SDK suite, 314 passing). LSP still reports stale `StandingPledge.contractAddress` errors in MyNotesPage despite SDK/UI typecheck and SDK dist being updated.

## 2026-06-21 — Content-funding scoped duplicate registration check

- Continued the TODO.md contract-versioning prep item with a small content-funding UI slice.
- Updated CreateContractPage duplicate-content detection to scan unique folded ContentRegistry item values by canonicalId/status instead of looking up the bare contentId key, so active registrations keyed only by scoped (ContentRegistry address, contentId) still block duplicate contract creation.
- Added a regression test covering scoped-only registry entries in CreateContractPage.
- Checks passed: npm run test:vitest --workspace=ui -- src/content-funding/pages/CreateContractPage.test.tsx; npm run typecheck --workspace=ui.

## 2026-06-21 — Deployment manifest onchain pointer tooling

- Picked the TODO.md contract-versioning item for publishing a deployment-manifest pointer via MutableRefUpdater/ENS.
- Added `scripts/deployment-manifest.mjs` to build a versioned `commonality.deployment-manifest.v1` JSON document from `deployments/<network>.env`; it writes `deployments/<network>.manifest.json` and prints the compact `INDEXER_DEPLOYMENT_MANIFEST` env value.
- Generated `deployments/base-sepolia.manifest.json` from current testnet addresses.
- Added `hardhat/scripts/publish-deployment-manifest-ref.js`, which publishes a pinned manifest URI under the default `commonality.deployment-manifest` MutableRefUpdater ref for the signer/trusted publisher.
- Documented the build/pin/publish flow in `indexer/README.md` and added the root `deployment-manifest:build` npm script.
- Checks passed: `npm run deployment-manifest:build -- --network base-sepolia`; `node --check scripts/deployment-manifest.mjs`; `node --check hardhat/scripts/publish-deployment-manifest-ref.js`; `npx --workspace=hardhat hardhat compile`. Note: the actual testnet ref update still needs operator secrets and a pinned manifest CID.

## 2026-06-21 — Note detail scoped route lookup

- Continued the TODO.md contract-versioning prep item with a small UI safety fix.
- `NoteDetailPage` already required scoped `/delegation/notes/<noteContract>:<noteId>` routes, but still loaded `getNote`/`getDelegationChain` with the bare numeric note ID. It now passes the scoped route key to both calls, so duplicate note IDs across DelegatableNotes versions cannot make the detail page ambiguous.
- Added a regression assertion in `NoteDetailPage.test.tsx` covering the scoped `getNote`/`getDelegationChain` calls while preserving note-intent lookup by `(noteContract, noteId)`.
- Checks passed: `npm run test:vitest --workspace=ui -- src/delegation/pages/NoteDetailPage.test.tsx`; `npm run typecheck --workspace=ui`.


## 2026-06-21 — Recurring pledge scheduler contract-scoped execution

- Picked a small slice of the TODO.md contract-versioning prep/indexer-SDK task.
- Fixed the recurring-pledge scheduler to use each folded pledge's `contractAddress` for `isFundable` and `executeDue`, instead of checking/executing every due pledge against the singleton configured RecurringPledges address. This matters when v2 RecurringPledges IDs restart at 1.
- Extended `isStandingPledgeFundable` with an optional explicit RecurringPledges address while preserving the old fallback to `machinery.contractAddresses.recurringPledges`.
- Added SDK coverage proving the explicit address is used for fundability checks.
- Updated TODO.md's contract-versioning prep progress note, but did not mark the whole item complete; more bare-ID audit work likely remains.
- Checks passed: `npm run test --workspace=@commonality/sdk`; `npm run build --workspace=@commonality/sdk`; `npm run typecheck --workspace=@commonality/service-host`; `npm run lint --workspace=@commonality/sdk`; `npm run lint --workspace=@commonality/service-host`.

## 2026-06-21 — Successful-projects policy decisions

- Completed the policy-decision slice of the TODO.md successful-projects polish item.
- Updated specs/product/successful-projects.md to replace the open-question list with explicit first-implementation decisions: success vouches start open, reputation/decay is deferred but event/data shapes should preserve accountability fields, and success confidence remains a separate claim type while initially reusing the same trusted-attester set.
- Updated TODO.md to remove that subtask from the remaining successful-projects work while leaving the e2e verification, buy-and-burn CTA, and trust-weighted scoring follow-ups open.
- Documentation-only change; no tests run.

## 2026-06-21 - Successful-projects buy-and-burn CTA

- Continued the TODO.md successful-projects polish item.
- Replaced the cause-board successful-project card placeholder CTA with a direct link to the project secondary-market section, with copy that accurately frames the flow: buy receipts from the marketplace, then burn them on the project page.
- Added stable section anchors for the LazyGiving secondary market and burn-receipts sections so cross-domain/card links can land on the real workflow.
- Updated TODO.md to remove the card-CTA subtask while leaving indexed e2e verification and trust-weighted scoring open.
- Checks passed: npm run test:vitest --workspace=ui -- src/fundingportals/components/SuccessfulProjectsList.test.tsx src/lazy-giving/components/BurnTokensSection.test.tsx; LSP workspace diagnostics showed only existing inputProps deprecation hints in touched components.

## 2026-06-21 — LazyGiving note-funded purchase contract-versioning keys

- Continued the TODO.md contract-versioning prep item with a small LazyGiving UI slice.
- Fixed `BuyTokensSection` note-funded primary-market purchases so the selected note value is the scoped `(noteContract, noteId)` key, delegation-chain lookup uses that scoped key, and `purchaseFromPrimaryMarketWithNotes` is sent to the selected note’s own DelegatableNotes contract rather than the singleton env contract.
- Added/updated BuyTokensSection tests to cover the version-specific note contract and scoped chain lookup.
- Checks passed: `npm run test:vitest --workspace=ui -- src/lazy-giving/components/BuyTokensSection.test.tsx`; `npm run typecheck --workspace=ui`.

## 2026-06-21 — Note-intent attestation contract-scoped row keys

- Continued the TODO.md contract-versioning prep item with a small UI safety fix.
- Updated NoteDetailPage intended-purpose rows to key note-intent attestations by `(attester, noteContract, noteId)` instead of `(attester, noteId)`, preventing React key collisions when two DelegatableNotes versions reuse the same note id.
- Added a regression test covering same-attester/same-note-id attestations from different note contracts.
- Checks passed: `npm run test:vitest --workspace=ui -- src/delegation/pages/NoteDetailPage.test.tsx`; LSP diagnostics clean for `ui/src/delegation/pages/NoteDetailPage.tsx`.

## 2026-06-21 — Content item status carries registry address

- Continued the TODO.md contract-versioning prep item with a small SDK content-funding slice.
- `getContentItemStatus` now returns `contentRegistryAddress` (or `null` for unregistered items), so callers that start from a status lookup can preserve the scoped `(ContentRegistry, contentId)` identity for follow-on links/actions instead of falling back to a bare content ID.
- Added assertions for registered, registry-scoped, and unregistered content-item status results, and updated TODO.md progress text.
- Checks passed: `npm run test --workspace=@commonality/sdk -- src/subsystems/content-funding/queries.test.ts`; `npm run typecheck --workspace=@commonality/sdk`; `npm run lint --workspace=@commonality/sdk`; LSP diagnostics clean for `sdk/src/subsystems/content-funding/queries.ts`.

## 2026-06-21 — Secondary-market fulfill actions use scoped marketplace

- Continued the TODO.md contract-versioning prep item with a small LazyGiving UI action-safety fix.
- `SecondaryMarketSection` already keyed listing/order rows and input state by `(marketplaceAddress, id)`, but fulfillment still submitted transactions to `project.marketplaceAddress`. It now fulfills each listing/order against that record’s own `marketplaceAddress`; buy-order fulfillment also approves the order marketplace address.
- Added regression tests for old-marketplace listing/order records displayed while the project has a different current marketplace.
- Checks passed: `npm run test:vitest --workspace=ui -- src/lazy-giving/components/SecondaryMarketSection.test.tsx`; LSP clean for touched UI files.

## 2026-06-22 — Contract-versioning closure audit

- Closed the long-running TODO.md auto-increment-ID contract-versioning prep item after a focused audit.
- Added `workflow/contract-versioning-closure-audit-2026-06-22.md` with searched patterns, subsystem verdicts, and remaining non-ID follow-ups.
- Hardened SDK event fetching for version-sensitive Class 2/3 surfaces: LazyGiving factory creation, DelegatableNotes, NoteIntent, and content-funding events now fetch by event name/topic across indexed versions rather than only current singleton addresses; `getAllProjectAddresses`/`getUserTokenBurns` now discover projects across indexed factory versions.
- Split out a new smaller TODO for future Class-1 log-contract v2 query-helper cleanup (`Beliefs`, `Implications`, `AlignmentAttestations`, etc.), which is not part of the ID-collision work.
- Checks passed: `npm run test --workspace=@commonality/sdk`; `npm run typecheck --workspace=@commonality/sdk`; `npm run lint --workspace=@commonality/sdk`; LSP clean for `sdk/src/utils/eventCacheClient.ts`.

## 2026-06-22 — Class-1 log contract v2 SDK query cleanup

- Completed TODO.md Class-1 log contract v2 cleanup.
- Updated SDK event-cache query paths for append-only/opinion log contracts so future v2 deployments merge same-name events across indexed versions instead of filtering to the current singleton address: Beliefs (`DirectSupport`), Implications (`ImplicationAttestation`), AlignmentAttestations (`AlignmentAttestation`/`SuccessAttestation`), TrustRegistry (`TrustSet`), and MutableRefUpdater (`RefUpdated`).
- Kept topic filters where applicable, so scoped queries still constrain by statement/user/subject/owner while allowing multiple contract versions.
- Updated fundingportal query tests to assert these Class-1 queries intentionally omit singleton `contractAddress`.
- Checks passed: `npm run test --workspace=@commonality/sdk`; `npm run lint --workspace=@commonality/sdk`; `npm run typecheck --workspace=@commonality/sdk`.

## 2026-06-22 — Smart-contract audit follow-up

- Completed the TODO.md smart-contract audit pass as a targeted follow-up to the 2026-05-07 content-funding findings.
- Added workflow/reviews/smart-contract-audit-2026-06-22.md with scope, Slither result, prior-finding status, and checks.
- Fixed CreatorAssuranceContractFactory funding-term validation: all content-funding contracts now reject zero thresholds and expired/current deadlines, and all third-party contracts (including unclaimed channels) require threshold > initialPurchaseValue so creation-time full funding cannot squat content IDs forever.
- Updated ContentFunding tests for the new guards and adjusted unclaimed-channel success/escrow tests to fund the remaining threshold after creation.
- Checks passed: npx verifier-run --workspace verifier review.security.slither; npm run test --workspace=hardhat -- test/ContentFunding.test.js.

## 2026-06-22 — Donation-first reframe task breakdown

- Chose the TODO.md item “Build the donation-first reframe of LazyGiving create + donate.” The full item is too large for one ephemeral LLM, so used the large-task-manager path rather than attempting a risky partial implementation.
- Added `workflow/donation-first-reframe-plan-2026-06-22.md`, breaking the work into six one-shot subtasks: create-form helper extraction, create-page goal/cap defaults, suggested levels + preview, donor allocation helper, donor UI reframe, and copy/compatibility sweep.
- Updated TODO.md to point at the plan and name the suggested next subtask.
- No product code changed; no automated tests run.

## 2026-06-22 — LazyGiving donation-first create defaults

- Continued the TODO.md donation-first reframe task for LazyGiving create/donate.
- CreateProjectPage now frames setup as a dollar funding goal plus an explicit cap choice (default: “Stop at goal”) and “Giving Options” rather than token-first setup.
- The default visible giving option is now `$1 Donation`; receipt token IDs are kept automatic/hidden in the normal form while the existing ERC-1155 token arrays still power submission.
- Updated CreateProjectPage tests for the new default option/cap choice and preserved the already-extracted token-capacity helper tests.
- Checks passed: `npm run test:vitest --workspace=ui -- src/lazy-giving/projectCreation.test.ts src/lazy-giving/pages/CreateProjectPage.test.tsx`; `npm run typecheck --workspace=ui`.
- Next suggested subtask: implement suggested giving levels plus the honest donor-eye/“what gets created” previews, including exact stop-at-goal capacity math and the removed-small-denomination warning.

## 2026-06-22 — LazyGiving create-page suggested giving levels

- Continued the TODO.md donation-first LazyGiving reframe item by completing plan step 3 on the create page.
- Added suggested giving-level helper logic: the button adds $25/$50/$100 tiers, sizes the visible $1 Donation supply to the exact stop-at-goal remainder when possible, and uses deliberately high visible supplies in keep-accepting mode.
- CreateProjectPage now shows a donor-eye preview, a collapsible literal “what gets created” token-capacity preview, and a warning when the $1 denomination is removed.
- Updated TODO.md to point the next one-shot subtask at plan step 4: donor-side amount-to-token allocation helper.
- Checks passed: npm run test:vitest --workspace=ui -- src/lazy-giving/projectCreation.test.ts src/lazy-giving/pages/CreateProjectPage.test.tsx; npm run typecheck --workspace=ui; targeted eslint from ui/.

## 2026-06-22 — LazyGiving donor-side give-amount UI

- Completed TODO.md donation-first reframe plan step 5 for `BuyTokensSection`.
- Direct primary-market contributions now lead with “Give to this project” and a single give-amount input instead of token quantity rows; optional higher-priced token tiers render as reward add-on cards.
- Wired the existing `allocatePurchaseAmount()` helper into the direct `buyProjectTokens` path, preserving the existing `buyERC1155` array call shape for exact donations and mixed reward+remainder contributions. Snapped/impossible allocations show friendly fallback/error copy instead of silently sending a different amount.
- Added refund-on-failure, permanence, and network-fee copy near the form. Delegatable-note purchase mode remains token-quantity based for now because that SDK path only supports one token type at a time.
- Files changed: `ui/src/lazy-giving/components/BuyTokensSection.tsx`, `ui/src/lazy-giving/components/BuyTokensSection.test.tsx`, `ui/src/lazy-giving/pages/ProjectDetailPage.test.tsx`, `TODO.md`.
- Checks passed: `npm run test:vitest --workspace=ui -- src/lazy-giving/components/BuyTokensSection.test.tsx`; `npm run typecheck --workspace=ui`.
- Suggested next task remains donation-first plan step 6: primary-market copy sweep/compatibility pass, preserving secondary-market marketplace wording.

## 2026-06-22 — LazyGiving donation-first copy sweep

- Completed TODO.md donation-first reframe plan step 6: swept remaining LazyGiving create/donate primary-market copy away from token-first/buy wording while preserving genuine secondary-market language.
- Updated create-project giving option labels/ARIA, wallet-connect prompt, browse-projects intro, and delegatable-note contribution mode copy. Internal contract/helper names remain token-shaped where they map to ERC-1155 mechanics.
- Updated targeted UI tests to assert the new giving/donation wording.
- Checks passed: npm run test:vitest --workspace=ui -- src/lazy-giving/pages/CreateProjectPage.test.tsx src/lazy-giving/components/BuyTokensSection.test.tsx src/lazy-giving/components/ConnectWalletPrompt.test.tsx src/lazy-giving/pages/ProjectDetailPage.test.tsx; npm run typecheck --workspace=ui. LSP diagnostics only showed existing deprecation hints for wagmi/MUI input props in touched files.

## 2026-06-22 — Donation-first LazyGiving TODO closure

- Picked the TODO.md item to build the donation-first reframe of LazyGiving create + donate.
- Verified the large-task implementation plan showed steps 1–6 already completed in prior sessions, then ran the targeted LazyGiving create/donate validation loop.
- Marked the TODO item complete and condensed its progress note into a completion summary, preserving the explicit out-of-scope embedded-wallet claim-later path.
- Checks passed: npm run test:vitest --workspace=ui -- src/lazy-giving/pages/CreateProjectPage.test.tsx src/lazy-giving/components/BuyTokensSection.test.tsx; npm run typecheck --workspace=ui.

## 2026-06-22 — Removed stale IPFS localhost event-cache default

- Completed the TODO.md localhost/42069 config check.
- Found one real stale deployment-adjacent default: `ui/.env.ipfs` hard-coded `VITE_EVENT_CACHE_URL=http://localhost:42069`, which could let IPFS/deployed builds bake the local indexer URL when operator env generation was skipped.
- Removed that default and left a comment requiring IPFS builds to take the event-cache URL from generated `ui/.env`, root `.env`/publish env, or explicit operator env.
- Removed the completed TODO item. Checks: `git diff --check`; LSP workspace diagnostics clean.

## 2026-06-22 — Product UI workflow checklist

- Completed the TODO.md item to identify main UX use cases/workflows for each site.
- Added `specs/product/ui-domains.md#primary-ux-workflows` with site-by-site workflows for Commonality, LazyGiving, Aligning, Tally, Content Funding, Civility, Common Sense Majority, and Conceptspace, plus mobile-priority notes.
- Added cross-ecosystem mobile UX emphasis: read/share/sign/contribute/status are mobile-critical; long forms/dashboards/trust setup/developer docs can be responsive but desktop-tolerant; funding flows must preserve context across wallet/on-ramp/login interruptions.
- Marked the TODO item complete. Documentation-only change; checked with `git diff --check`.

## 2026-06-22 — AI service watchlist for verifier

- Completed the TODO.md item to list what to watch as real AI services start running on testnet/social data.
- Added verifier/ai-service-watchlist.md with cross-service and per-service review questions for implication/content attesters, beat agent, finders, nudgers, bridge creator, explorer curator, and platform API.
- Linked the watchlist from verifier/manual-validation-plan.md AI-service validation roster and noted in verifier/PLAN.md how objective findings should be promoted into verifier checks/fixtures.
- Marked the TODO item complete. Documentation-only change; checked with git diff --check.

## 2026-06-22 — Testing inventory documentation

- Completed the TODO.md testing-inventory item.
- Added workflow/testing-inventory.md with a concise map of root feedback loops, per-workspace conventional test coverage, verifier coverage, what is already well-covered, and the main remaining testing gaps (whole-product E2E depth, dependency degradation canaries, uniform AI-service fixture harness, rendered-product judgment, performance beyond bundle size, and domain UI-state matrices).
- Linked the inventory from README.md and marked the TODO item complete.
- Documentation-only change; no runtime code changed.

## 2026-06-22 — Successful-projects success confidence score

- Continued the TODO.md successful-projects-on-cause-boards polish item.
- Replaced the card sorting metric from raw unique success-attester count to an explicit `successConfidenceScore` exposed by the SDK. Direct success vouches currently count 2 points and implication-derived vouches count 1 point; this is a bounded first-pass improvement while richer trust-graph/discovery-slider weighting remains a TODO follow-up.
- `SuccessfulProjectsList` now displays the confidence score alongside receipts, price, and voucher addresses.
- Updated TODO.md to record that raw attester-count sorting is no longer the current behavior while leaving indexed e2e verification and richer trust-weighted scoring open.
- Checks passed: `npm run test --workspace=@commonality/sdk -- src/subsystems/fundingportals/queries.test.ts`; `npm run test:vitest --workspace=ui -- src/fundingportals/components/SuccessfulProjectsList.test.tsx`; `npm run typecheck --workspace=@commonality/sdk`; `npm run typecheck --workspace=ui`; `git diff --check`; LSP workspace diagnostics clean.

## 2026-06-22 — Civility cross-site about links

- Picked a small slice of the TODO.md automation-backlog item for Civility route/link coverage.
- Added first-class about-page links from Civility to Content Funding, Tally, and Common Sense Majority, matching the explanatory copy about how those product surfaces relate.
- Extended `ui/src/domains/civility/ContentPages.test.tsx` to assert the related-product links, and updated the manual validation backlog note to record this partial coverage.
- Checks passed: `npm run test:vitest --workspace=ui -- src/domains/civility/ContentPages.test.tsx`; LSP diagnostics clean for `ui/src/domains/civility/ContentPages.tsx`.

## 2026-06-22 — CSM product signpost link coverage

- Did another small slice of the TODO.md automation-backlog domain-flow coverage.
- Tightened `CsmPages.test.tsx` so the CSM about-page product signposts explicitly cover all four focused product links: Civility, Tally, Aligning, and LazyGiving.
- Updated `verifier/manual-validation-plan.md` to record the CSM signpost-link coverage while leaving bridge publication/count propagation as the pending CSM automation work.
- Checks passed: `npm run test:vitest --workspace=ui -- src/domains/common-sense-majority/CsmPages.test.tsx`; LSP diagnostics clean for the touched test file.

## 2026-06-22 — CSM bridge-to-Tally publication link coverage

- Picked a small slice of TODO.md's automation-backlog item: CSM bridge-statement publication visibility on Tally.
- Added `getBridgeAnchorTallyPath()` so CSM bridge cards link published common-ground anchors directly to `/statement/<cid>` on Tally when a `tally_cid` is present, while falling back to `/statements` for unpublished seed anchors.
- Updated CSM page tests to lock the published-anchor URL encoding/fallback behavior and documented the partial coverage in `verifier/manual-validation-plan.md`; publication/count propagation remains pending.
- Checks passed: `npm run test:vitest --workspace=ui -- src/domains/common-sense-majority/CsmPages.test.tsx`; LSP diagnostics clean for `CsmPages.tsx`.

## 2026-06-22 — Automation backlog triage

- Completed the TODO.md automation-backlog triage/restructure pass for `verifier/manual-validation-plan.md` §11.
- Split the backlog into coherent chunks/harness projects, small standalone items, already adequately covered items, and defer/manual-only validation.
- Updated the TODO.md item so the remaining work is to pick and implement one coherent chunk next (operations/degradation canary expansion, AI-service fixture harness v1, CSM publication/count propagation, LazyGiving UI-state matrix, or per-domain explanatory-affordance gaps).
- Documentation-only change; validation run: `git diff --check -- verifier/manual-validation-plan.md TODO.md`.

## 2026-06-22 — CSM publication automation chunk

- Implemented the CSM publication-visibility half of the automation backlog chunk.
- Added seeded Tally CIDs for the four featured CSM common-ground bridge anchors in both `ui/src/domains/common-sense-majority/csmBridges.ts` and `bridge-creator/data/seed-anchors.json`. The CIDs were computed from `fake-data-generation/seed-content/hidden-majority.json` using the SDK mock IPFS document publisher, matching the seeded statement documents.
- Updated the CSM bridge page so published bridge links fall back to the local Tally statement path instead of `#` when runtime cross-domain URLs are not configured.
- Added UI/bridge-creator regression tests that every featured common-ground bridge is linked to its seeded Tally CID.
- Updated `verifier/manual-validation-plan.md` and TODO.md: CSM publication visibility is now covered; only movement-count propagation remains, once that feature exists.
- Checks passed: `npm run test:vitest --workspace=ui -- CsmPages`; `npm run test --workspace=bridge-creator -- anchors.test.ts` (Mocha warning: file glob argument ignored, but bridge-creator suite passed); LSP diagnostics clean for touched CSM UI files.

## 2026-06-22 — Per-domain explanatory-affordance automation slice

- Picked the per-domain explanatory-affordance automation backlog chunk and implemented a compact UI-facing slice rather than a broad matrix.
- Added Tally/Conceptspace support-metric copy and tests explaining that total support is direct signers plus indirect supporters from trusted statement-connection/implication sources.
- Added Aligning delegatable-note copy and tests explaining Root Owner, Current Leaf Owner, Direct, and Delegated labels so raw addresses/delegation states are not unexplained.
- Updated verifier/manual-validation-plan.md §11.1 to record this new partial coverage; broader targeted affordance checks remain open.
- Checks passed: npm run test:vitest --workspace=ui -- SupportMetrics.test.tsx DelegatableNotesSection.test.tsx; LSP workspace diagnostics clean. Note: an initial npm run test --workspace=ui invocation ran all Vitest tests successfully but then failed because Playwright received unit-test file filters and found no e2e tests.

## 2026-06-22 — Automation backlog: Content Funding explanatory affordance slice

- Continued the TODO.md automation backlog work under the per-domain explanatory-affordance chunk.
- Added a Content Funding channel-page explanation for canonical content IDs, duplicate/renamed-post matching, and the trusted-attested/uncovered labels.
- Added a focused UI test in `ui/src/content-funding/pages/ChannelPage.test.tsx` asserting that explanation.
- Updated `verifier/manual-validation-plan.md` section 11.1 so the backlog records this Content Funding slice as covered and narrows the remaining explanatory-affordance work.
- Checks: `npm run test:vitest --workspace=ui -- src/content-funding/pages/ChannelPage.test.tsx` passed. A broader `npm test --workspace=ui -- ChannelPage.test.tsx` ran all UI Vitest tests successfully, then failed only because the npm script forwarded `ChannelPage.test.tsx` to Playwright where no matching e2e test exists.

## 2026-06-22 — Automation backlog: Conceptspace indirect-support affordance slice

- Continued the per-domain explanatory-affordance backlog chunk.
- Added a Conceptspace profile-page info affordance explaining indirect support: the wallet directly signed another statement, trusted implication sources say it entails the listed statement, and the via list shows the directly signed statements used for inference.
- Added a focused UserProfilePage UI test for that explanation and updated verifier/manual-validation-plan.md §11.1 coverage notes.
- Checks passed: `npm run test:vitest --workspace=ui -- src/conceptspace/pages/UserProfilePage.test.tsx`.

## 2026-06-22 — Automation backlog: Aligning project-card affordance slice

- Continued the per-domain explanatory-affordance backlog chunk; it is close but not done, with remaining work now mostly deeper Conceptspace plus any uncovered deeper Aligning/Content Funding affordances.
- Added user-visible copy and an accessible chip label on `AlignedProjectCard` explaining Direct alignment (someone vouched this project serves the cause) versus Indirect alignment (connected through implication links; review evidence before funding).
- Added a focused `AlignedProjectCard` UI test for those explanations and updated `verifier/manual-validation-plan.md` §11.1 coverage notes.
- Checks passed: `npm run test:vitest --workspace=ui -- AlignedProjectCard.test.tsx`; LSP diagnostics clean for `ui/src/fundingportals/components/AlignedProjectCard.tsx`. A broader `npm test --workspace=ui -- AlignedProjectCard.test.tsx` ran all UI Vitest tests successfully, then failed only because the npm script forwarded the unit-test filename to Playwright where no e2e test matches.

## 2026-06-22 — Automation backlog: Conceptspace browse-list affordance slice

- Continued the per-domain explanatory-affordance backlog chunk.
- Added Conceptspace browse-page copy explaining that supporter chips count direct signatures, and that indirect support inferred through trusted implication sources is available on the statement detail page.
- Added accessible direct-supporter labels to the supporter chips and a focused BrowseStatementsPage UI test for the explanation.
- Updated verifier/manual-validation-plan.md §11.1 coverage notes.
- Checks passed: npm run test:vitest --workspace=ui -- BrowseStatementsPage.test.tsx; LSP diagnostics clean for ui/src/conceptspace/pages/BrowseStatementsPage.tsx.

## 2026-06-22 — Automation backlog: platform identity mapping fixtures

- Took one automation-backlog slice from `verifier/manual-validation-plan.md` small standalone items: platform identity mapping fixtures.
- Added platform API guards/tests for ambiguous or conflicting provider responses:
  - Twitter canonical `twitter:uid:<id>` channel resolution now rejects a provider response whose `data.id` differs from the requested stable ID.
  - YouTube canonical channel-ID resolution now rejects a provider response whose `items[0].id` differs from the requested stable channel ID.
  - YouTube channel resolution now rejects ambiguous multi-channel responses instead of silently choosing the first item.
- Marked the platform identity mapping fixture backlog row complete in `verifier/manual-validation-plan.md`.
- Checks passed: `npm test --workspace=platform-api-service`; LSP diagnostics clean for `platform-api-service/src/twitterClient.ts` and `platform-api-service/src/youtubeClient.ts`.

## 2026-06-22 — Automation backlog: Aligning duplicate-project display slice

- Took the small standalone `Aligning spam/duplicate display limit` item from `verifier/manual-validation-plan.md`.
- Added a UI-level guard in `AlignedProjectsList` so duplicate project rows collapse by address before rendering, with direct alignment evidence preferred over duplicate indirect evidence.
- Added a focused `AlignedProjectsList` test covering duplicate rows and direct-over-indirect precedence, then marked the manual-plan backlog row complete.
- Checks passed: `npm run test:vitest --workspace=ui -- src/fundingportals/components/AlignedProjectsList.test.tsx`; LSP diagnostics clean for `ui/src/fundingportals/components/AlignedProjectsList.tsx`.

## 2026-06-22 — Automation backlog: finder budget/flooding slice

- Took the small standalone `Finder budget/flooding` item from `verifier/manual-validation-plan.md`.
- Added a per-cycle implication-finder candidate cap (`maxCandidatePairs`, env `IMPLICATION_FINDER_MAX_CANDIDATE_PAIRS`, default 100) so a burst of new statements cannot make one poll cycle submit an unbounded candidate queue to the attester.
- Added adversarial `selectCandidatePairs` tests proving large candidate floods are capped deterministically and that a zero cap emits no pairs, then marked the manual-plan backlog row complete.
- Checks passed: `npm test --workspace=implication-finder`; `npm run typecheck --workspace=implication-finder`; `npm run lint --workspace=implication-finder`.

## 2026-06-22 — Operations/degradation canary coverage hardening

- Worked on TODO.md automation backlog, choosing the operations/degradation canary coherent chunk.
- Fixed stale/misspelled UI test paths in `operations.degradation-canary` after the previous folder rename (`lazy-giving`, `fundingportals`, and the fundingportals ExplorerPage test).
- Added optional `requireExistingPaths` support to the shared verifier command runner so path-based test canaries fail loudly if referenced files disappear or are misspelled instead of silently shrinking coverage.
- Expanded the canary filter to include Conceptspace StatementRenderer IPFS fallback/explanation tests.
- Checks passed: `VERIFIER_WORKSPACE=verifier npx verifier-run operations.degradation-canary`; focused UI Vitest subset for LazyGiving IPFS, Explorer empty-state, and Aligning RPC/wrong-chain degradation cases.

## 2026-06-22 — Operations/degradation canary expansion completion

- Finished the representative operations/degradation canary chunk from the automation backlog.
- Expanded `verifier/checks/operations/degradation-canary.def.json` to include funding-portal indexer degradation surfaces: `FundingPortalSummary`, `AlignedProjectsList`, and `SuccessfulProjectsList`, in addition to the existing IPFS/platform API/personalization/RPC/wrong-chain canaries.
- Renamed the SuccessfulProjectsList error test so the verifier `-t` filter actually selects the indexer-unavailable case instead of skipping the whole file.
- Marked the operations/degradation chunk complete in `verifier/manual-validation-plan.md` and removed it from the TODO candidate chunk list.
- Check passed: `verifier-run operations.degradation-canary`.

## 2026-06-22 — Automation backlog: Conceptspace profile identifier affordance

- Continued the `verifier/manual-validation-plan.md` automation backlog, choosing the per-domain explanatory-affordance chunk rather than another standalone tiny slice.
- Added an `explainAddress` affordance to the shared `AddressDisplay` component so profile surfaces can explain raw wallet addresses in user language: the address is a public onchain identifier, not a private key or payment request.
- Enabled that explanation on Conceptspace/Tally user profile pages and added component + page-level Vitest coverage.
- Updated the manual-plan backlog inventory to record profile wallet-address explanation coverage and narrow the remaining explanatory-affordance gap to deeper Aligning/Content Funding surfaces.
- Checks passed: `npm run test:vitest --workspace=ui -- src/shared/components/AddressDisplay.test.tsx src/conceptspace/pages/UserProfilePage.test.tsx`. A prior incorrectly targeted `npm test --workspace=ui -- --run ...` also ran the full UI Vitest suite successfully before failing only because Playwright received non-e2e file filters.

## 2026-06-22 — LazyGiving UI-state automation backlog chunk

- Completed the automation-backlog coherent chunk for the LazyGiving remaining UI-state matrix.
- Added explicit user-facing ProjectDetailPage states for: active project with no indexed giving options, refunding project where the connected wallet has no refundable tokens left, and succeeded project viewed by a connected non-recipient.
- Added ProjectDetailPage tests for those three compact matrix states and updated verifier/manual-validation-plan.md to mark the LazyGiving matrix chunk covered at representative UI level.
- Files changed: ui/src/lazy-giving/pages/ProjectDetailPage.tsx, ui/src/lazy-giving/pages/ProjectDetailPage.test.tsx, verifier/manual-validation-plan.md.

## 2026-06-22 — Successful-projects trust-graph-weighted confidence

- Did the trust-graph weighting half of the TODO.md "Finish/polish successful projects" Tell item.
- SDK: `calculateSuccessConfidenceScore` now accepts an optional `trustWeights` input (Map / entries / record of attester address -> transitive trust score 0-100). When weights are supplied, each vouch is scaled by the viewer's trust score for its attester, with the direct>indirect 2:1 prior preserved; the score stays on the same scale as the flat count-based score (fully-trusted attesters reproduce it exactly, weaker trust discounts proportionally). `getSuccessfulProjectsForCause` gained a `trustWeights` param and the returned `SuccessfulProjectForCause` gained `successConfidenceBasis: 'attester-count' | 'trust-weighted'`. Policy decision 3 honored: `success` scoring stays separate from `alignment`.
- UI plumbing: `subjectivTrustComputation` now calls `getTransitiveTrustMapping` (instead of `getTrustedSet`) and serializes the full address->score mapping; the worker protocol, worker client, IndexedDB cache (bumped cache version `v1`→`v2`), `useTrustedSet` hook (new `trustWeights` map), cause board page, and `SuccessfulProjectsList` all carry `trustWeights` end-to-end and pass them to the SDK query. Confidence tooltip is basis-aware. Logged-out / no-trust-network behavior unchanged (flat count-based fallback).
- Remaining successful-projects work: explicit discovery-slider UI control surfacing the existing `maxHops` traversal knob (recorded in TODO.md).
- Checks passed: `npm run test --workspace=@commonality/sdk` (321); `npm run typecheck --workspace=@commonality/sdk`; `npm run typecheck --workspace=ui`; `npm run test:vitest --workspace=ui` (1721); touched-package eslint; `npm run build` (19/19). Reported in `inbox.md` (Tell tier).
