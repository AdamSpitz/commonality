## UI to-dos

## Concept Space UI - MVP

Implementation is mostly done and well-tested.

## Pubstarter UI - MVP

  - Spec: specs/subsystems/pubstarter/ui.md
  - Chunked implementation plan: [ui/src/pubstarter/TODO.md](src/pubstarter/TODO.md) — all 6 chunks done.
  - Post-implementation cleanup:
    - [ ] Decompose ProjectDetailPage (~1130 lines, ~30 useState) into sub-components (BuyTokensSection, RefundSection, SecondaryMarketSection, etc.)
    - [ ] Deduplicate token-counting logic between `userRefundableTokens` and `userBurnableTokens` in ProjectDetailPage
    - [ ] Remove or populate empty `components/index.ts`

## Other subsystem UIs

Not even started yet, I think.

## Other TODO.md files

  - ui/e2e/TODO.md (but honestly maybe getting those tests working is not worth the trouble)
