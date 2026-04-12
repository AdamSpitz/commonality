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
