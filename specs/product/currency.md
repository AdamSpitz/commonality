# Currency design

The system uses ERC-20 stablecoins rather than native ETH. The reason: assurance contracts and delegatable notes hold funds in escrow for potentially long periods, making ETH's price volatility a problem. **For MVP production, USDC is the settlement token.**

## Design decisions

- **ERC-20 only** — No native ETH anywhere in the settlement path. All fund transfers use ERC-20 via OpenZeppelin `SafeERC20`. Dev and test environments use a mock ERC-20 (`PremintingERC20`) rather than wrapped ETH, so there's one code path everywhere.
- **One settlement token per contract** — Each assurance contract, marketplace, and escrow instance stores an immutable `paymentToken`. This keeps accounting simple: a single scalar threshold compares against a single scalar progress value, both denominated in the same token.
- **MVP production: USDC** — USDC is used in all production contracts.
- **Post-MVP** — Allow each assurance contract to choose its own settlement token (including DAI or ETH-backed stablecoins for censorship resistance).

## Safety constraints

Keep these in place whenever contract changes touch fund flows:

- Never special-case native ETH. The settlement path is ERC-20-only.
- Assume a vanilla ERC-20: no transfer fees, no rebasing, no blacklist/pause surprises in normal operation, no callbacks.
- Use `SafeERC20` everywhere funds move.
- Prefer pull-based settlement (`transferFrom`) for purchases; explicit transfers for withdrawals and refunds.
- For factory and note-backed purchase flows: grant only the exact approval amount needed, then clear the approval afterward.

## Current state

Fully implemented:

- `CurrencyAmount` / `CurrencyAmountBigInt` types tag every amount with its currency throughout the SDK and UI. Aggregation logic prevents accidentally mixing amounts in different currencies.
- Every contract that previously held or moved native ETH now stores an immutable `paymentToken` and uses `SafeERC20` for all fund transfers.
- No `msg.value` or `address(this).balance` patterns remain in any settlement path.
- `DelegatableNotes` validates that payment notes match the target market's settlement token, and uses `forceApprove()` with exact amounts for temporary approvals.
- Factory contracts thread the payment token through all child deployments.
- All contract test suites use `PremintingERC20` (a mock ERC-20) instead of native ETH.
- `EthThresholdCondition` has been renamed to `ValueThresholdCondition`.
