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
