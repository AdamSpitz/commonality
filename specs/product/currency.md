# Currency design

The system uses ERC-20 stablecoins rather than native ETH. The reason: assurance contracts and delegatable notes hold funds in escrow for potentially long periods, making ETH's price volatility a problem. **For MVP production, USDC is the settlement token.**

## Design decisions

- **ERC-20 only** — No native ETH anywhere in the settlement path. All fund transfers use ERC-20 via OpenZeppelin `SafeERC20`. Dev and test environments use a mock ERC-20 (`PremintingERC20`) rather than wrapped ETH, so there's one code path everywhere.
- **One settlement token per contract** — Each assurance contract, marketplace, and escrow instance stores an immutable `paymentToken`. This keeps accounting simple: a single scalar threshold compares against a single scalar progress value, both denominated in the same token.
- **MVP production: USDC** — USDC is used in all production contracts.
- **Public testnet: USDZZZ** — Base Sepolia intentionally uses the faucetable `USDZZZ` dev token so testers can get funds easily. This is testnet-only; it does not relax the production USDC decision.
- **MVP display: local-fiat estimate** — Non-USD users (starting with Canadians, since Adam's first real-world users are likely Canadian) should see amounts as an approximate local-fiat figure ("≈ C$205") with the true stored amount ("US$150 USDC") clearly visible. Display-only: settlement stays in USDC. Use a daily off-chain FX rate and show its timestamp; no oracle rigor needed since nothing on-chain depends on it. Never let a user enter a local-fiat number that silently becomes the stored commitment without showing the USDC amount they're actually pledging. Thresholds and pledges are fixed in USD, so the local-fiat figure drifts day to day — always label it as approximate.
- **Post-MVP** — Allow each assurance contract to choose its own settlement token (including DAI or ETH-backed stablecoins for censorship resistance, and local-currency stablecoins — see below).

## Non-USD currencies (decision, 2026-07)

Reconsidered whether USDC-only is right, given a Canadian founder and likely-Canadian early users. Decision:

- **MVP: keep USDC settlement, add the CAD display estimate described above.** Cheap, honest, and solves most of the psychological friction.
- **Post-MVP: per-project settlement token, with a CAD stablecoin as the likely second supported token.** The contracts already support this (immutable `paymentToken` per contract; nothing hardcodes USDC), so the remaining cost is product-side: donors must hold the project's token, and cross-currency pledging (swapping through possibly-thin CAD/USDC pools) should stay out of scope initially — route Canadians to a CAD onramp instead.
- **Rejected: ETH (or RAI/HAI-style ETH-backed stablecoins) as a "neutral" base currency.** For ETH directly: escrowed assurance-contract goals that flicker between met and unmet with ETH's price are a broken product experience. The more interesting variant — hold RAI/HAI behind the scenes and auto-convert at the edges, so users never touch it — fails too: it relocates the volatility rather than removing it (refunds and payouts come back slightly different from what users put in, and now that's the platform's fault rather than a currency they knowingly chose — worse for trust, not better), adds swap spread/slippage twice per round trip through thin pools, and complicates escrow accounting (a USD-denominated threshold over a drifting reserve asset means goal progress moves without anyone contributing). RAI in particular is *designed* to drift (redemption-price mechanics), so it isn't even attempting a fiat peg.

CAD stablecoin landscape, evaluated 2026-07 — see [`spikes/cad-stablecoins/`](../../spikes/cad-stablecoins/) for the full scorecard, verified Base addresses, and re-runnable on-chain checks:

- **CADC** (Loon) — **current leading candidate.** Its Base contract is the Circle/Centre USDC contract (`FiatTokenProxy`), so its blacklist/pause semantics are identical to USDC's — no new admin-control risk beyond what we already accept. Most active Base pool (Aerodrome CADC/USDC, ~$136k liquidity, ~$53k/day volume), and the only token an ordinary Canadian can acquire directly today (Paytrie sells CADC via Interac e-Transfer with Base withdrawal). Caveats: small issuer, ~$1.5M on-Base supply.
- **CADD** (Tetra Digital Group, launched 2026-05) — strongest backing (National Bank of Canada, Wealthsimple, Shopify) but **not retail-ready**: Wealthsimple backs the issuer yet does not list the token (its only CIRO-approved retail stablecoin is USDC), and mint/redeem is institutional-only. Admin powers exceed USDC's: Fireblocks ERC20F with pause, upgradeability, a transfer-gating access registry (probed on-chain: default-allow denylist, not a KYC allowlist), and `recoverTokens()` — the issuer can *seize*, not just freeze, balances of access-revoked accounts. Re-evaluate in 6–12 months if Wealthsimple lists it; adopting it requires an explicit risk acceptance for the seize power.
- **QCAD** (Stablecorp) — **eliminated** for Base settlement: the Base contract has zero total supply and zero Base DEX pairs; trades only on Kraken at negligible volume.

Both viable tokens use **18 decimals** (USDC is 6) — nothing may assume 6. Pool depth (~$130–170k) handles C$100–C$1,000 swaps but not five-figure ones, which is acceptable only because CADC acquisition is direct rather than swap-based. Before adopting: confirm addresses against issuer docs, do one real Paytrie→Base→offramp round trip (like `spikes/coinbase-onramp/`), and ask the issuer what happens if a contract is wrongly blacklisted.

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
