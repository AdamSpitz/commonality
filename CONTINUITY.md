# Continuity notes for ephemeral AI instances

## 2026-04-12: Multi-currency phase 1 completed

- Implemented the first phase from `TODO.md` / `specs/currency.md`: the non-smart-contract layers are now explicit about currency while behavior remains effectively ETH-only.
- Added shared SDK currency/value types in [sdk/src/utils/currency.ts](/home/adam/Projects/commonality/sdk/src/utils/currency.ts).
- Pubstarter folded/query-returned monetary fields now carry explicit currency metadata:
  [sdk/src/subsystems/pubstarter/types.ts](/home/adam/Projects/commonality/sdk/src/subsystems/pubstarter/types.ts)
  [sdk/src/subsystems/pubstarter/folds.ts](/home/adam/Projects/commonality/sdk/src/subsystems/pubstarter/folds.ts)
- Funding-portal aggregates are now currency-grouped instead of a single implicit-ETH scalar:
  [sdk/src/subsystems/fundingportals/types.ts](/home/adam/Projects/commonality/sdk/src/subsystems/fundingportals/types.ts)
  [sdk/src/subsystems/fundingportals/queries.ts](/home/adam/Projects/commonality/sdk/src/subsystems/fundingportals/queries.ts)
- Added shared UI formatting helpers in [ui/src/shared/currency.ts](/home/adam/Projects/commonality/ui/src/shared/currency.ts) and switched the main pubstarter/funding-portal displays to format explicit currency values.
- Updated the integration test that checked funding-portal note aggregates:
  [integration-tests/src/fundingportal/fundingportal-aggregated-metrics.test.ts](/home/adam/Projects/commonality/integration-tests/src/fundingportal/fundingportal-aggregated-metrics.test.ts)

## If picking this up next

- The next intended step is still phase 2 from `specs/currency.md`: generalize smart contracts and transaction flows so assurance contracts / notes can settle in arbitrary ERC-20s.
- Some UI copy and form labels still say `ETH` where the actual transaction flow is still ETH-specific by design in this phase, especially create/deposit flows and content-funding escrow displays. That is acceptable for now, but once contract/action support is generalized those strings and parse/submit paths will need another pass.
- Current verification status: `npm run build` from repo root passed after these changes.

## 2026-04-14: Fresh-clone development setup + pre-commit validation

- Fresh clone setup completed from `README.md`: `npm install`, `npm run build`, `./services.sh --start`, and `./data.sh --seed`.
- The first startup attempt exposed stale machine-level Docker state, not a repo dependency issue: fixed by removing old `commonality-*` containers that were colliding with this checkout's fixed `container_name` values in `docker-compose.yml`.
- Current local stack came up cleanly after that cleanup, including IPFS UI publish and fake-data generation.
- Reproduced the pre-commit failure in `./scripts/run-integration-tests.sh`: `mocha` sometimes started while `ui-ipfs-publisher` was still running `npm install` against the repo bind mount, which raced against the host `node_modules` tree and surfaced as `ERR_MODULE_NOT_FOUND` for `get-tsconfig/index.js` from `tsx`.
- Fixed `scripts/run-integration-tests.sh` to start only the services integration tests actually need (`hardhat-node`, `hardhat-deploy`, `ipfs`, `indexer`, `platform-api-service`) instead of all services.
- Verification after the fix: `./scripts/run-integration-tests.sh` passed (`107 passing, 1 pending`).
- Follow-up root-cause fix for full-system startup: `ui-ipfs-publisher` no longer bind-mounts the repo and no longer runs `npm ci` against the host workspace at runtime. Its dependencies are now baked into the image, artifacts are written through a dedicated `/artifacts` mount, and `./services.sh --start` now uses `docker-compose up -d --build` so the self-contained publisher image is rebuilt when needed.
- Verification after the root-cause fix: `./services.sh --start` completed successfully, published the UI bundle to local IPFS, and `./services.sh --stop` cleanly brought the stack back down.

## 2026-04-14: Funding-portal scalability follow-up

- Implemented the first concrete funding-portal scalability optimization from `TODO.md` / `specs/scalability.md`.
- In [sdk/src/subsystems/fundingportals/queries.ts](/home/adam/Projects/commonality/sdk/src/subsystems/fundingportals/queries.ts), `getAllAlignedProjectsForCause()` now takes a lighter path when `publicClient` is available:
  it fetches only each project's `AssuranceContractInitialized` event to learn the condition address, then reads `totalReceived`, `threshold`, and `deadline` on-chain instead of folding each project's full event history just to build funding summaries.
- Added [readProjectFundingSnapshots()` in `sdk/src/utils/chain-reads.ts`](/home/adam/Projects/commonality/sdk/src/utils/chain-reads.ts), which batches these reads with `multicall` when the chain supports it and falls back to individual reads when it does not.
- This fallback mattered immediately in local testing: the Hardhat test setup here does not expose `multicall3`, so a graceful fallback was necessary for integration tests.
- Also parallelized the per-project contribution/refund fetches inside `getTopContributorsForCause()`. No server-side leaderboard projection was added; that remains a future optimization only if needed.
- Important caveat: the fast aligned-project summary path currently assumes ETH funding currency. That matches current smart-contract reality, but it will need revisiting once the multi-currency contract work happens.

## If picking this up next

- The funding-portal totals/aligned-project-summary optimization is done and verified; the next scalability task is the statement-browsing path (`browseStatementsByMostSupporters` / `browseStatementsByNewest`), which still does the global fetch-and-sort client-side pattern.
- Clean-state verification for the funding-portal work:
  1. `npm run build --workspace=sdk`
  2. `./services.sh --stop`
  3. `./data.sh --wipe`
  4. `./services.sh --start`
  5. `npm test --workspace=integration-tests -- --grep "Funding Portal"`
- Result after the clean reset: funding-portal integration slice passed (`12 passing, 1 pending`).
- Earlier failures before the reset were due to dirty accumulated local chain/indexer state, not the SDK change itself.

## 2026-04-16: Twitter / Ethereum association unification completed

- Completed the `TODO.md` task to unify the Twitter↔Ethereum association mechanisms between conceptspace and content-funding.
- Key decisions:
  - Kept ENS lookup support in `getUserSocialData`, but added an active channel-registry lookup path that uses a user-provided Twitter handle plus the existing platform API `/resolve/channel` endpoint.
  - Reused the existing content-funding verification flow in conceptspace Settings rather than inventing a second linking mechanism.
  - Persisted per-address Twitter handle hints in UI localStorage so a connected user's own conceptspace profile can continue to resolve the channel-registry association after linking.
- Files changed:
  - `sdk/src/utils/twitter.ts`
  - `sdk/src/config-node.ts`
  - `sdk/src/subsystems/conceptspace/queries.ts`
  - `sdk/src/subsystems/conceptspace/types.ts`
  - `sdk/src/subsystems/content-funding/queries.ts`
  - `sdk/src/subsystems/content-funding/queries.test.ts`
  - `ui/src/shared/hooks/useMachinery.ts`
  - `ui/src/shared/components/AddressDisplay.tsx`
  - `ui/src/conceptspace/pages/SettingsPage.tsx`
  - `ui/src/conceptspace/pages/SettingsPage.test.tsx`
  - `ui/src/conceptspace/pages/UserProfilePage.tsx`
  - `ui/src/conceptspace/twitterHandleHints.ts`
  - `README.md`
  - `TODO.md`
- Verification:
  - `npm run test --workspace=@commonality/sdk -- src/subsystems/content-funding/queries.test.ts`
  - `npm run test --workspace=ui -- src/conceptspace/pages/SettingsPage.test.tsx`
  - `npm run build --workspace=ui`
- Notes for the next iteration:
  - The channel-registry path is still an active lookup, not a reverse lookup. It works when conceptspace has a Twitter handle hint (for example from Settings/localStorage), but it still cannot derive arbitrary third-party handles from the on-chain channel hash alone.
- Interrupt point:
  - Yes. This is a clean stopping point after a coherent feature slice, so a broader review or another TODO task would fit well next.
