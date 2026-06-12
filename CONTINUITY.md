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
