# Plan: per-project payment token

Status: planned, not started (2026-11-19). Background and decisions: [currency.md](../product/currency.md).

## Goal

Each project (general projects and content-funding campaigns) chooses **one** settlement token from an owner-managed allowlist. Initial allowlist: USDC (USDZZZ on testnet) plus a **reputation-points token**, so early real-world usage can run on points instead of money.

Non-goals:
- One project accepting several tokens. Assurance thresholds are a single scalar; multi-token would need oracles or per-token goals. Rejected.
- Cross-currency swaps or pledges.
- Choosing the points token's distribution and transfer policy. That's a product decision, so ask Adam. The token must at least allow `transferFrom` into and out of system contracts (see step 5).

## Current state (what already works)

- Per-project contracts (`AssuranceContract`, `IdentityHeldProceeds`, `CreatorAssuranceContract`, `ProspectiveContentAssuranceContract`) take the token as a constructor argument and store it immutably.
- `ProjectFactory` and `FixedControllerFactory` already take `paymentToken` per create call. Only the UI/config pins a single token.
- `DelegatableNotes` already rejects notes whose token doesn't match the market.
- The SDK's `CurrencyAmount` types tag amounts by currency and refuse to mix them.

What pins one token per deployment:
- `hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol`: `immutable paymentToken`.
- `hardhat/contracts/content-funding/ProspectiveContentRoundFactory.sol`: `immutable paymentToken`.
- `hardhat/contracts/content-funding/BeneficiaryEscrow.sol`: single token, `_balances[beneficiaryId]`.
- Config: single `PAYMENT_TOKEN_ADDRESS` (`scripts/deploy-commonality.sh`, `hardhat/scripts/deploy-incremental.js`) and `VITE_PAYMENT_TOKEN_{ADDRESS,SYMBOL,DECIMALS}` (`docker-compose.yml`).

## Steps

Each step should land green (contract tests, SDK tests, typecheck) before the next one starts.

### 1. Token allowlist contract
- A small `PaymentTokenRegistry` (owner-managed `isAllowed(token)`, plus `TokenAllowed`/`TokenDisallowed` events), or the same functionality inside each factory. Prefer one shared registry so the UI and indexer have a single source.
- `ProjectFactory` / `FixedControllerFactory`: revert if the token isn't allowed. Decide whether to enforce this in the factory or only in the UI; enforcing in the factory is safer.

### 2. Content-funding factories take a token
- `CreatorAssuranceContractFactory` and `ProspectiveContentRoundFactory`: remove the immutable token. Accept `paymentToken` per create call and check it against the registry. Include the token in creation events, using new event names per [contract-versioning.md](./contract-versioning.md) ("events are the real ABI").
- Watch for lazily created / unclaimed-channel campaigns. Anything keyed by channel that assumed one token (for example "the campaign for channel X") may now need to be keyed by `(channel, token)`, or restricted to one token per channel. Pick one approach and document it.

### 3. Multi-token `BeneficiaryEscrow`
- `_balances[beneficiaryId][token]`. `deposit(beneficiaryId, token, amount)`, `withdraw(beneficiaryId, token)`, and a view to match. New event names (`DepositedV2`/`WithdrawnV2`, or similar) that include the token.
- Check all callers (`IdentityHeldProceeds` and friends) pass their own `paymentToken`.

### 4. Deploy wiring
- Deploy scripts deploy the registry, allowlist USDC/USDZZZ (plus the points token where relevant), and drop the single-token factory args. Keep a "default token" config value for UI defaults only.
- Local dev: deploy a second mock ERC-20 (`PremintingERC20`) so multi-token paths get exercised. Update fake-data generation (`fake-data-generation/paymentTokenUnits.ts` and friends) to create projects in both tokens.
- Mainnet isn't live, so this ships as a fresh deployment rather than a v1/v2 coexistence. Confirm with Adam if that has changed.

### 5. Reputation-points token
- A minimal ERC-20 that satisfies the [currency.md safety constraints](../product/currency.md#safety-constraints) (no fees, no rebasing, no callbacks). If it should be non-transferable between users, allow transfers only to and from system contracts, and get explicit review, since this deviates from the vanilla ERC-20 assumption.
- Minting policy is Adam's call. Stub it as owner-mint.
- Check whether gas sponsorship ([sponsored-gas.md](./sponsored-gas.md)) assumes the payment token has a Uniswap pool or a USD value.

### 6. Indexer + SDK
- Index `paymentToken` per project/campaign and the token metadata (symbol, decimals) from the registry. Stop reading the global token anywhere project-specific.
- Never assume 6 decimals.
- Aggregates (channel totals, user totals, escrow balances) are per-token; the existing `CurrencyAmount` aggregation guards should make mistakes loud.

### 7. UI
- Project creation: token picker. Default to the default token; hide the picker when only one token is allowed.
- Donation/purchase flows: show the project's token, and handle balances and approvals per token. Notes and delegation: show per-token balances.
- Fiat estimate ("≈ C$…") only for USD-pegged tokens. Points show as points.
- Channel/creator pages: totals side by side per token, never summed.

### 8. Docs
- Update [currency.md](../product/currency.md) "Current state" and the token notes in [contract-versioning.md](./contract-versioning.md). Mark this plan done.

## Open questions for Adam
- Points token: transferable or system-only? Who can mint, and how much?
- Content funding: can one channel have campaigns in multiple tokens at once?
- Should allowlist changes be owner-only, or eventually governed?
