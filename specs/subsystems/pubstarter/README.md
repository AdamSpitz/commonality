# Pubstarter

Individual crowdfunding projects (Kickstarter-style primary market).

  - Contribution NFTs are resellable, creating a retroactive funding market: VCs identify promising projects early, then exit by selling to altruistic donors later.

## Smart contracts

`AssuranceContract` and `ERC1155PrimaryMarket` — ERC-1155 project contracts with threshold-based funding, deadlines, and refunds. Located in `hardhat/contracts/individual-projects/`.

Design decisions:
  - **Buying is always allowed**, even after the deadline. A "failed" project can still succeed later if more people buy in. Refunds are only allowed when the deadline has passed *and* the threshold hasn't been reached.

## Secondary market (Marketplace)

`ERC1155SecondaryMarket` — generic order book for any ERC-1155 tokens, in `hardhat/contracts/marketplace/`. This is generic peer-to-peer trading infrastructure (not Pubstarter-specific, but in practice it's primarily used for Pubstarter tokens).

Secondary-market indexing is folded into the Pubstarter SDK subsystem since it shares the same project context.

## SDK

Fold functions reconstruct project state, contributions, refunds, and secondary market orders from raw events. On-chain view functions provide current balances, thresholds, and deadlines.

## UI

See [ui.md](ui.md).
