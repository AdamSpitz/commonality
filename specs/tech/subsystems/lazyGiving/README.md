# LazyGiving

Individual crowdfunding projects. See [docs/end-user/lazyGiving/assurance-contracts.md](/docs/end-user/lazyGiving/assurance-contracts.md) and [docs/end-user/lazyGiving/retroactive-funding.md](/docs/end-user/lazyGiving/retroactive-funding.md) for the user-facing explanations.

  - Kickstarter-style assurance contracts (ERC-1155 tokens), with contribution NFTs that are resellable: VCs identify promising projects early, then exit by selling to altruistic donors later.

## Smart contracts

`AssuranceContract` and `ERC1155PrimaryMarket` — ERC-1155 project contracts with threshold-based funding, deadlines, and refunds. Located in `hardhat/contracts/individual-projects/`.

Design decisions:
  - **Buying is always allowed**, even after the deadline. A "failed" project can still succeed later if more people buy in. Refunds are only allowed when the deadline has passed *and* the threshold hasn't been reached.

## Secondary market (Marketplace)

`ERC1155SecondaryMarket` — generic order book for any ERC-1155 tokens, in `hardhat/contracts/marketplace/`. This is generic peer-to-peer trading infrastructure (not LazyGiving-specific, but in practice it's primarily used for LazyGiving tokens).

Secondary-market indexing is folded into the LazyGiving SDK subsystem since it shares the same project context.

## SDK

Fold functions reconstruct project state, contributions, refunds, and secondary market orders from raw events. On-chain view functions provide current balances, thresholds, and deadlines.

## Composability

`AssuranceContract` separates measurement (`IProgressSource`), judgment (`IAssuranceCondition`), and money, which makes contracts composable. See [composability.md](composability.md) for the seams, combinator semantics, and invariants (product view: [specs/product/composability.md](/specs/product/composability.md)).

## Matching funds

[matching.md](matching.md) — "we'll put up half if you raise the other half." Fixed gap-fill works today with zero new code (a matcher is just a buyer; the all-or-nothing refund logic supplies the conditionality); partial-proportional matching is an additive `MatchingPool` pledger contract (seam 4). Strategy/framing: [credible-solution/matching-funds.md](/docs/end-user/commonality/vision-and-strategy/credible-solution/matching-funds.md).

## UI

See [ui.md](ui.md).
