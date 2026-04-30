# Continuity notes for ephemeral AI instances

## 2026-04-30 — Finished pre-generated worker-output replay for before-testnet Finding 8

Converted the `--seed=demo` one-shot Explorer/nudge fixtures into checked-in pre-generated worker outputs. New files/scripts: `fake-data-generation/seedWorkerOutputs.ts`, `generateSeedWorkerOutputs.ts`, and `data/seed-worker-outputs.json`; package scripts `gen:seed:worker-outputs` and `test:seed:worker-outputs`. `runSimulation.ts` now maps stored seed statement refs to uploaded CIDs, publishes the stored Explorer collection and nudge batch, signs Explorer statements, and replays stored implication-finder pairs as implication attestations. Updated fake-data README, the pregenerated-worker-outputs spec, before-testnet Finding 8, and TODO.

Validation: `npm run gen:seed:worker-outputs --workspace=fake-data-generation`, `npm run test:seed:worker-outputs --workspace=fake-data-generation`, `npm run typecheck --workspace=fake-data-generation`, and `npm run lint --workspace=fake-data-generation` passed. I did not re-run a live Docker `./scripts/data.sh --seed=demo` smoke in this session.

## 2026-04-30 — Added seed-content demo seeding for before-testnet Finding 8

Added an easy local-dev command for the seed-content/Explorer first-run gap: `./scripts/data.sh --seed=demo`. It runs `fake-data-generation` against a generated seed-content universe (`gen:seed:universe -- --exclude-proliferation`) and publishes deterministic one-shot Explorer/nudge publications to `NudgePublications` using local Hardhat account #0 as the seed nudger. Local deployment now writes that account to `VITE_DEFAULT_NUDGERS`, including the already-deployed-contracts fast path, so the UI trusts those publications by default after rebuild/publish. Updated TODO, fake-data/local-dev docs, and the before-testnet review note.

Validation: `npm run typecheck --workspace=fake-data-generation`, `npm run lint --workspace=fake-data-generation`, `npm run test --workspace=fake-data-generation`, `cd fake-data-generation && npm run gen:seed:universe -- --exclude-proliferation --output=output/test-seed-universe.json` (then removed the temp output), plus full `npm run lint` and `npm run build` passed. Build still emits existing third-party Rollup annotation/chunk-size warnings.

Live test follow-up: wiped local data and ran `./scripts/services.sh --start && ./scripts/data.sh --seed=demo`. This exposed that the indexer was not indexing `NudgePublications:NudgesPublished`, so Explorer/nudge publications were invisible to SDK event-cache queries. Added the NudgePublications ABI/config/handler in `indexer/`, rebuilt/restarted, reseeded, and verified via SDK that the local seed nudger has 1 curated collection, 40 Explorer entries, and nudges for the first entry. Also changed seed worker publication to have the local seed nudger sign the 40 curated Explorer statements, so curated entries resolve through normal statement queries. Additional validation: `npm run typecheck --workspace=indexer`, `npm run lint --workspace=indexer`, `npm run typecheck --workspace=fake-data-generation`, `npm run lint --workspace=fake-data-generation` passed.

Important boundary for the next LLM: Finding 8's "easy command" is done and live-tested. The broader TODO item "Pre-generate worker outputs (explorer curator, nudgers, implication finder)" is still open; `--seed=demo` currently publishes deterministic local fixtures, not checked-in LLM-generated worker outputs with metadata/fingerprints. If continuing that larger task, start from `specs/dev/testing/pregenerated-worker-outputs.md`.

## 2026-04-30 — Enforced channel metadata config for before-testnet Finding 13

Channel metadata lookup is now allowed to be disabled only for local UI runtime config. Runtime config validation and `useContentFundingState` both read `COMMONALITY_ENVIRONMENT`, `VITE_ENABLE_CHANNEL_METADATA_LOOKUP`, and `VITE_PLATFORM_API_URL`; testnet/mainnet throw a visible startup/loading error unless lookup is enabled and a platform API URL is configured. Vite now emits those values into `config.json`, and `scripts/setup-env.sh` writes `COMMONALITY_ENVIRONMENT` (`local`/`testnet`/`mainnet`) plus the lookup flag into `ui/.env`. Updated `.env.example`, `.env.secrets.example`, and `ui/README.md` with the deployment requirement.

Validation: `npm run test:vitest --workspace=ui -- channelMetadataLookupConfig` passed; `npm run build --workspace=ui` passed with existing third-party Rollup annotation and large-chunk warnings.

## 2026-04-30 — Implemented route-level UI code-splitting for before-testnet Finding 5

Added `ui/src/domains/lazyRoute.tsx` and converted non-landing domain routes in the four domain manifests to lazy `import()` route elements. Landing pages stay eager so home routes remain immediate; deeper pages now build as separate chunks (statements, project pages, docs, settings, content funding, movement pages, etc.). Updated `domainRoutes.test.tsx` to await lazy-rendered secondary routes.

Validation: `npm run build --workspace=ui` passed. The largest Commonality build chunk dropped from ~2.5MB to ~1.6MB, though Vite still reports large third-party/vendor chunks (`core`, Privy/wallet chunks, and a 1.6MB shared chunk). Focused route tests passed: `npm run test:vitest --workspace=ui -- --run src/domains/domainRoutes.test.tsx src/domains/CrossDomainSmoke.test.tsx src/App.test.tsx`.

Follow-up: replaced remaining lazy imports through `delegation/pages` and `fundingportal/pages` barrels with individual page-module imports, so notes and portal routes no longer force their sibling page modules into the same lazy chunk. `npm run build --workspace=ui` still passes.


## 2026-04-30 — Implemented IPFS runtime UI config for before-testnet Finding 3

The UI now loads `./config.json` before rendering React (`ui/src/main.tsx`, `ui/src/shared/runtimeConfig.ts`). Vite emits `dist/<domain>/config.json` with the deployment config values, and IPFS mode fails startup if the config cannot be loaded instead of silently using a baked localhost URL. `useMachinery`, Browse Projects, and Project Detail now read the event-cache URL (plus related machinery URLs/contract addresses) through runtime config, which removes the immediate `VITE_EVENT_CACHE_URL` testnet blocker. `ui/README.md` and `workflow/reviews/before-testnet.md` were updated.

Validation: `npm run typecheck --workspace=ui`, `npm run lint --workspace=ui`, `npm run build --workspace=ui`, `npm run build:ipfs --workspace=ui`, and `npm run test:vitest --workspace=ui` all passed. Build still emits existing third-party Rollup annotation and large-chunk warnings.

## 2026-04-29 — Fixed E2E console failures from optional channel metadata lookup

Playwright HTML/test-results showed four otherwise-successful E2E tests failing because the shared console-error fixture captured Chromium "Failed to load resource" errors from background `POST http://localhost:3001/resolve/channel` calls. The platform API is healthy in E2E but has no real Twitter/YouTube credentials, so optional reverse channel metadata lookups returned 503 and polluted the browser console.

Changed `ui/src/content-funding/hooks/useContentFundingState.ts` so platform channel metadata lookup is opt-in via `VITE_ENABLE_CHANNEL_METADATA_LOOKUP=true`; the UI still falls back to canonical IDs/IPFS metadata. Validation: `npm run test:e2e --workspace=ui` passed (25/25), and `npm run build --workspace=ui` passed with existing third-party Rollup warnings.

## 2026-04-29 — Improved creator/channel display names

Completed the TODO item about content-funding creator/channel labels. `useContentFundingState()` now builds a `channelDisplayMetadata` map, preferring platform API `/resolve/channel` metadata for Twitter/YouTube canonical IDs and falling back to content-funding contract metadata from IPFS (notably the fake-data `creatorDisplayName`). Shared display logic in `ui/src/content-funding/channelDisplay.ts` renders human-friendly names/handles as primary labels and keeps canonical IDs as secondary technical details. Applied this across browse/detail/create/dashboard/content-funding project surfaces and funding-portal aligned-project cards. The platform API Twitter client now accepts `twitter:uid:<id>`/numeric user IDs so the UI can reverse-resolve Twitter canonical channel IDs through the existing resolver path.

Files changed: `ui/src/content-funding/channelDisplay.ts`, `ui/src/content-funding/hooks/useContentFundingState.ts`, content-funding/funding-portal UI consumers, `platform-api-service/src/twitterClient.ts`, tests, `TODO.md`.

Validation: focused UI Vitest for channel display/content-funding/funding-portal components passed; `npm run test --workspace=@commonality/platform-api-service` passed; `npm run build --workspace=ui` passed (with existing Rollup third-party annotation/chunk-size warnings).

## 2026-04-29 — Removed redundant pre-testnet smoke command

Folded the only unique smoke-test behavior (browser console/page error failure) into a shared Playwright fixture at `ui/e2e/fixtures/console-errors.ts`. `ui/e2e/fixtures/wallet.ts` now extends that base fixture, and the lone non-wallet E2E spec imports it directly. Removed `ui/e2e/pre-testnet-smoke.spec.ts` and the smoke scripts from both package.json files. Updated E2E setup to start `platform-api-service` for the full Playwright suite, and updated `testing-review.md` to say the full suite is the pre-testnet automated checkpoint.

Validation: `npm run typecheck --workspace=ui`, `npm run lint --workspace=ui`, and `npx --workspace=ui playwright test --list` passed.

## 2026-04-29 — Added negative-path E2E coverage

Completed `testing-review.md` Priority #3. Added `ui/e2e/negative-paths.spec.ts` with browser tests for a valid-but-unindexed statement CID, an unknown project address, and a blocked delegatable-note purchase when the requested token cost exceeds the selected note balance. Updated `testing-review.md` to mark the priority done.

Validation: `npm run typecheck --workspace=ui` and `npm run test:e2e --workspace=ui -- e2e/negative-paths.spec.ts` passed. During development the first E2E run caught an invalid CID fixture and the second caught a brittle MUI combobox selector; both are fixed in the final test.

## 2026-04-29 — Added pre-testnet smoke test (superseded)

Historical note: this added a focused pre-testnet smoke spec and package command. That approach was later removed as redundant; the browser console/page-error check now lives in the shared Playwright fixture and the full suite is the pre-testnet automated checkpoint.

Historical note: `ui/e2e/global-setup.ts` was later changed to start `platform-api-service` for every full Playwright run, since browser console errors are now checked across the suite.

## 2026-04-29 — Started integration-test level audit

Tried `testing-review.md` Priority #5. Audited the integration test suite and found the remaining domain test directories are genuinely indexer/IPFS integration tests: they assert event-cache indexing and SDK folded query behavior, not just contract calls. Moved the one pure TypeScript behavior check out of the Docker-backed path: replaced `integration-tests/src/generic/action-framework-expected-failure.test.ts` with `integration-tests/src/actions/action-framework.unit.test.ts`, added `npm run test:unit --workspace=integration-tests`, and documented the level split in `integration-tests/README.md`.

Validation: `npm run test:unit --workspace=integration-tests`, `npm run typecheck --workspace=integration-tests`, and `npm run lint --workspace=integration-tests` passed. Note: the first attempt at `test:unit` accidentally read `.mocharc` and ran the full integration suite without services, producing expected localhost/IPFS connection failures; fixed by adding `--no-config`.

Follow-up in same session: added top-level `npm run test:fast` (SDK unit tests + Hardhat tests + integration-test harness unit tests + UI Vitest), added `npm run integration-tests:test:harness`, documented the fast command in README, renamed the workspace harness command to avoid the confusing phrase “integration-tests unit tests,” and changed the pre-commit hook to run `test:fast` instead of full `npm test`. Validation: `npm run integration-tests:test:harness`, `npm run test:fast`, and `bash -n .husky/pre-commit` passed.

## 2026-04-28 — Fixed several TODO findings

Fixed three findings from `TODO.md`:
- Browse Statements "Newest" now uses `AccessTimeIcon` instead of the gear-like `NewReleasesIcon`.
- Pubstarter project discovery now includes `CreatorContractCreated` events from `creatorContractFactory`, and per-project event fetches include the creator-factory creation event so content-funding assurance contracts can resolve normal project state/metrics.
- Content-funding canonical channel recovery now handles colon-separated Substack content IDs (`substack:pub:slug`) used by local seeded content, so `getAllChannelOverviews()` can recover `substack:smartwriter`.

Files changed: `ui/src/conceptspace/pages/BrowseStatementsPage.tsx`, `sdk/src/subsystems/pubstarter/queries.ts`, `sdk/src/utils/eventCacheClient.ts`, `sdk/src/subsystems/content-funding/canonicalization.ts`, `sdk/src/subsystems/content-funding/queries.test.ts`, `TODO.md`.

Validation: `npm run build --workspace=sdk`, `npm run typecheck --workspace=ui`, and SDK content-funding tests passed. I accidentally ran `npm test --workspace=ui -- BrowseStatementsPage.test.tsx --run`; Vitest passed all 83 UI test files, but the command then forwarded the filename to Playwright and failed with "No tests found" after starting/stopping Docker. Use `npm run test:vitest --workspace=ui -- src/conceptspace/pages/BrowseStatementsPage.test.tsx` for the focused UI unit test next time.

Good interrupt point: yes, this is a cohesive set of small TODO-finding fixes. A live seeded smoke check (`./scripts/services.sh --start`, `./scripts/data.sh --seed=tiny`, inspect SDK channel summaries) would still be valuable.

## 2026-04-28 — Step 11 partial fix; live verification still pending

Could not run the seeded UI/browser check because Docker daemon is not running. Fixed a cached Browse Projects data-flow bug anyway: `ui/src/shared/foldCache.ts` now rehydrates cached `ProjectAccumulator.totalReceived` back to BigInt after IndexedDB JSON storage. Verified with `npm run test:vitest --workspace=ui -- src/shared/foldCache.test.ts` and `npm run typecheck --workspace=ui`.

Next useful move: start Docker, run `./scripts/services.sh --start`, run `./scripts/data.sh --seed`, then finish Step 11 by checking Browse Statements and Browse Projects against seeded/indexed data.

## 2026-04-28 — Step 2 structural review done; seed-data pass pending

Fixed 3 bugs during Commonality domain review (see before-testnet.md Findings — Commonality for full details). All 14 Commonality pages load with zero console errors. Seed data was not re-run this session (stack restarted cold — re-run `./scripts/data.sh --seed`).

**Where we are:** Step 2 in progress — structural review done, seeded-data review pending. After seed, do a pass on statements with believers, projects with funding, creator channels, and statement/implication-graph navigation before marking Step 2 complete and moving to Step 3.

**Key testnet concern noted:** `VITE_EVENT_CACHE_URL` is baked in at IPFS build time. For testnet/mainnet, this needs to point to the deployed indexer URL. Currently `.env.ipfs` uses `http://localhost:42069` (local only). Needs a plan before testnet deploy.

**Stack URLs (current session):**
- commonality: `http://localhost:8080/ipfs/QmNioGV9fEyb19GEAWJHSo2yZNREJyWHBTNDP6tQjpTxSu/commonality-ui/#/`
- content-funding: `http://localhost:8080/ipfs/QmQccxWXYMngtFDwiCTdmptN9PmmDdaqvLe7ap5Du75Ubv/content-funding-ui/#/`
- noninflammatory: `http://localhost:8080/ipfs/QmPhgnuQwYHsX5T9aw9Di4xJempkX5bqtGMNy1qeQpVTfE/noninflammatory-ui/#/`
- movement: `http://localhost:8080/ipfs/QmS9Cp5vVTvW9q3yeGcpRUrTeHXf4UWYuXHboQVPkNnDee/movement-ui/#/`

## 2026-04-29 — Fixed high-level-test findings

Addressed the two problems called out in `high-level-test.md`:
- UI IPFS publishing now reads freshly generated root/ui env files at runtime and maps deployment contract addresses into `VITE_*` build variables. The docker-compose UI publisher services bind-mount `.env` and `ui/.env`, and `scripts/services.sh` creates empty files on clean checkouts so the mounts are safe.
- Fake-data seeding now funds generated users with the mock payment ERC-20 as well as ETH. The `0xe450d38c` selector is `ERC20InsufficientBalance(address,uint256,uint256)`, so Pubstarter purchases were failing because random generated wallets had ETH but no payment tokens.

Files changed: `scripts/publish-ui-to-ipfs.mjs`, `docker-compose.yml`, `scripts/services.sh`, `fake-data-generation/runSimulation.ts`.

Validation: `bash -n scripts/services.sh`, `node --check scripts/publish-ui-to-ipfs.mjs`, `docker compose config --quiet`, and `npm run typecheck --workspace=fake-data-generation` passed. Live seeded browser verification still remains valuable: restart services, reseed, then confirm Browse Statements shows seeded statements from the current Beliefs address.

## 2026-04-29 — Fixed funding-portal cause leaderboard semantics

Completed the TODO item for `CauseLeaderboardPage`. The page still ranks only direct project purchases via `getTopContributorsForCause`, but it now also fetches `getTotalFundingForCause` and displays `totalAvailableFromNotes` as an aggregate delegated-funds stat. Copy now explicitly says delegated-note deposits are revocable pledges and are not ranked per person, and the empty state says "No direct project purchases yet" instead of "No contributions yet."

Files changed: `ui/src/fundingportal/pages/CauseLeaderboardPage.tsx`, `ui/src/fundingportal/pages/CauseLeaderboardPage.test.tsx`, `TODO.md`, `CONTINUITY.md`.

Validation: `npm run test:vitest --workspace=ui -- CauseLeaderboardPage.test.tsx`, `npm run build --workspace=ui`, and `npm run lint --workspace=ui -- src/fundingportal/pages/CauseLeaderboardPage.tsx src/fundingportal/pages/CauseLeaderboardPage.test.tsx` passed. An earlier `npm run test --workspace=ui -- CauseLeaderboardPage.test.tsx` run passed all UI Vitest tests but then failed because the filename was forwarded to Playwright, where no E2E test matched.
