# Continuity notes for ephemeral AI instances

## 2026-04-29 — Added negative-path E2E coverage

Completed `testing-review.md` Priority #3. Added `ui/e2e/negative-paths.spec.ts` with browser tests for a valid-but-unindexed statement CID, an unknown project address, and a blocked delegatable-note purchase when the requested token cost exceeds the selected note balance. Updated `testing-review.md` to mark the priority done.

Validation: `npm run typecheck --workspace=ui` and `npm run test:e2e --workspace=ui -- e2e/negative-paths.spec.ts` passed. During development the first E2E run caught an invalid CID fixture and the second caught a brittle MUI combobox selector; both are fixed in the final test.

## 2026-04-29 — Added pre-testnet smoke test

Completed `testing-review.md` Priority #2. Added `ui/e2e/pre-testnet-smoke.spec.ts` and top-level `npm run test:pre-testnet-smoke`; the smoke test starts the Docker-backed E2E stack, includes the platform API, then verifies core flows: browse statements, create/believe a statement, browse projects, fund a project, and delegation UI. It records browser console errors/page errors and fails if any appear.

Updated `ui/e2e/global-setup.ts` so smoke runs can opt into `platform-api-service` with `E2E_START_PLATFORM_API=true` and writes `VITE_PLATFORM_API_URL` only in that mode. This fixed the initial smoke failure where the browser logged `Error loading content-funding state: TypeError: Failed to fetch` because the platform API was not running.

Validation: `npm run typecheck --workspace=ui`, `npm run lint --workspace=ui`, and `npm run test:pre-testnet-smoke` passed.

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
