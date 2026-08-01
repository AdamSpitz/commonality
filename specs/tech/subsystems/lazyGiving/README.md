# LazyGiving

Individual crowdfunding projects. See [docs/end-user/lazyGiving/assurance-contracts.md](/docs/end-user/lazyGiving/assurance-contracts.md) and [docs/end-user/lazyGiving/retroactive-funding.md](/docs/end-user/lazyGiving/retroactive-funding.md) for the user-facing explanations.

  - Kickstarter-style assurance contracts with non-transferable ERC-1155 recognition receipts. Later donations to successful projects reimburse early contributors pro rata at cost; no one receives interest, a premium, or a profit.

## Smart contracts

`AssuranceContract` and `ERC1155PrimaryMarket` — ERC-1155 project contracts with threshold-based funding, deadlines, and refunds. Located in `hardhat/contracts/individual-projects/`.

Design decisions:
  - **Buying is always allowed**, even after the deadline. A "failed" project can still succeed later if more people buy in. Refunds are only allowed when the deadline has passed *and* the threshold hasn't been reached.

## Retroactive reimbursement

LazyGiving projects do not deploy or use a secondary marketplace. Receipt transfers are disabled. Successful projects accept later donations through a pull-based, pro-rata reimbursement pool capped by each early contributor's original contribution. The generic `ERC1155SecondaryMarket` contract remains in the repository for legacy or non-LazyGiving uses, but it is not part of this product flow.

## SDK

Fold functions reconstruct project state, contributions, assurance refunds, reimbursement donations, claims, and withdrawals from raw events. On-chain view functions provide current balances, thresholds, deadlines, and reimbursement state.

## Composability

`AssuranceContract` separates measurement (`IProgressSource`), judgment (`IAssuranceCondition`), and money, which makes contracts composable. See [composability.md](composability.md) for the seams, combinator semantics, and invariants (product view: [specs/product/composability.md](/specs/product/composability.md)).

## Matching funds

[matching.md](matching.md) — "we'll put up half if you raise the other half." Fixed gap-fill works today with zero new code (a matcher is just a buyer; the all-or-nothing refund logic supplies the conditionality); partial-proportional matching is an additive `MatchingPool` pledger contract (seam 4). Strategy/framing: [credible-solution/matching-funds.md](/docs/end-user/commonality/vision-and-strategy/credible-solution/matching-funds.md).

## UI

See [ui.md](ui.md).
