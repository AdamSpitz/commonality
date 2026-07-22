# Retroactive-funding redesign — rollout tracker

**Status: in progress.** Started 2026-07-22.

This tracks propagating the Jul 2026 securities redesign through every layer
(contracts → SDK → indexer → UI → docs). It is a **handoff document**: if you
are a fresh LLM picking this up, read this whole file, then re-verify the
"current state" table against the code (some of it may have moved since it was
written) before doing anything.

## The decision this implements

Source of truth: [`specs/product/legal/retroactive-funding-redesign.md`](/specs/product/legal/retroactive-funding-redesign.md)
(and the ranking in [`specs/product/legal/README.md`](/specs/product/legal/README.md)).

The securities risk came from rewarding scouts via **appreciation on a
transferable, platform-promoted instrument**. The chosen posture removes that
while keeping retroactive funding:

- **Design 1 — reimbursement waterfall, no market.** Contributions mint
  **non-transferable** receipts. Retroactive funders *donate*; the contract
  reimburses early contributors **pro-rata, at cost, capped at what they put
  in** — never interest/premium/markup. The secondary market is **deleted
  entirely** (a capped market is vestigial; removing it eliminates the
  exchange/dealer problem instead of merely shrinking it).
- **Design 2 — Delegation is the scout-payment channel.** Reward for judgment
  is reputation + larger *delegated budgets* (money to manage, never in
  pocket), optionally a flat service fee — never per-dollar-of-outcome.

The marketing/UX invariant that governs everything below: **"get your money
back and fund the next one" must be the *whole* story.** No buy/sell/invest/
markup/upside language anywhere user-facing.

## Current state (audited 2026-07-22)

| Layer | State | Detail |
|---|---|---|
| **Contracts — core** | ✅ Done | `AssuranceContracts.sol`: `totalEarlyContributions`, `totalRetroReceived`, `donateRetroactive()` (reverts `RetroactiveDonationExceedsOutstandingReimbursement` past the cap), pro-rata O(1) `withdrawReimbursement()`, events `RetroactiveDonationReceived` / `ReimbursementWithdrawn`. `PremintingERC1155.sol` enforces `NonTransferableReceipt` (mint/burn/bridge/owner-setup only). |
| **Contracts — leftovers** | ⚠️ Dead code present | `hardhat/contracts/marketplace/ERC1155SecondaryMarket.sol` still exists; `DelegatableNotes.sol` still imports it and keeps `authorizedSecondaryMarketFactories` / `purchaseFromSecondaryMarket` wiring. Spec says these become dead code. Removal touches deployed-contract surface — **needs Adam's decision** (remove vs. leave dormant). |
| **SDK** | ❌ Gap | `sdk/src/subsystems/lazy-giving/actions.ts` still exports the whole market API (`createSaleListing`, `fulfillSaleListing`, `cancelSaleListing`, `createBuyOrder`, `fulfillBuyOrder`, `cancelBuyOrder`, `approveERC1155ForMarketplace`) and `burnTokens`. It has **no** binding for `donateRetroactive` or `withdrawReimbursement` — the new waterfall is unreachable from the SDK. |
| **Indexer** | ❌ Gap | No handler for `RetroactiveDonationReceived` / `ReimbursementWithdrawn`. The "outstanding reimbursement" figure the UI needs to show is not indexed. |
| **UI — market** | ✅ Unmounted | `SecondaryMarketSection.tsx` exists but is **not mounted anywhere** (orphan file + test). (Earlier verifier `review.not-crypto-scary` claim that ProjectDetailPage renders it is **stale — from 2026-07-09**, before it was unmounted.) |
| **UI — new flow** | ❌ Not built | `ProjectDetailPage` mounts `BuyTokensSection` (primary contribution, "buy" framing), `RefundSection`, `WithdrawSection` (project withdraws funds), `BurnTokensSection` (burn-to-support — old model). There is **no** "close the loop" retroactive-donation UI and **no** reimbursement-withdrawal UI. |
| **Docs — primary** | ✅ Updated | `docs/end-user/commonality/vision-and-strategy/why-its-better/retroactive-funding.md` fully describes the new flow, on-message. |
| **Docs — other** | ⚠️ Needs scrub | Old buy/sell/invest/market language still in: `docs/end-user/shared/for-crypto-natives.md`, `docs/end-user/tldr-for-llms.md`, `docs/end-user/shared/use-case-walkthroughs/research-funding.md`, `docs/end-user/shared/diagrams/retro-funding-story.poc.html`, and several `.../ease-of-adoption/*` files. Full list needs grep pass (see checklist). |

## Resolved decisions (2026-07-22, with Adam)

1. **Remove the dead secondary-market code.** Delete `ERC1155SecondaryMarket.sol`,
   its `DelegatableNotes` wiring (`authorizedSecondaryMarketFactories`,
   `purchaseFromSecondaryMarket`, factory authorization), the SDK market
   bindings, and `SecondaryMarketSection.tsx` (+ test). Build the new flow now
   (not deferred to mainnet).
2. **`burnTokens` / `BurnTokensSection` is old-model — remove it.** In the new
   model, burning a receipt is a no-op on the reimbursement accounting, so
   burn-to-support is meaningless. Replaced by the two altruism primitives below.
3. **Two altruism primitives (both route through the reimbursement contract):**
   - **Non-recoverable early donation ("Donate normally").** A contribution-time
     choice: the money funds the project but the contributor takes **no
     reimbursement claim**. Implemented as *contribute + full `forgoReimbursement`
     in the same transaction*. This is provably the safe corner of forgo: right
     after contributing `x`, `T − R = (T_prev − R_prev) + x ≥ x` (since the
     standing invariant is `T ≥ R`), so a full self-forgo always fits the cap and
     `w = 0` makes the withdrawal guard trivial. The donor **keeps the
     recognition receipt token** (recognition ≠ claim); only the reimbursement
     claim is dropped.
   - **`forgoReimbursement(f)`** for an existing scout who changes their mind.
     Capped at `min(remaining contribution, T − R)`. The `T − R` bound
     simultaneously prevents `outstandingReimbursementTotal()` underflow **and**
     over-reimbursing the other scouts beyond cost (both reduce to `f ≤ T − R`).
     Additional guard for a scout who already withdrew (`w_A > 0`):
     `(c_A − f)·R/(T − f) ≥ w_A`, so their own claim can't underflow. Emits a
     forgo event for the indexer.
4. **Contract math note:** forgo reduces `earlyContributions[sender]` and
   `totalEarlyContributions` (denominator-down); `R` (`totalRetroReceived`) is
   untouched, so already-received retro money redistributes pro-rata to the
   remaining scouts and the project's `withdrawableRecipientBalance` is
   unaffected. This is the dual of `donateRetroactive` (numerator-up).

## Checklist

Copy-editing / low-risk:
- [x] Fix `review.ui-banned-terms` "on-chain" hit in `StatementPage.tsx` (done 2026-07-22, separate from redesign but same session).
- [ ] Scrub remaining end-user docs of buy/sell/invest/market/upside language against the redesign spec. Grep seed: `grep -rliE "secondary market|buy tokens|sell.*token|price per token|invest|resale|markup|upside" docs/end-user`.

Dead-code removal (decided — remove; **full removal** into the deployed-contract
ABI + deploy plumbing, confirmed with Adam 2026-07-22). Done as focused passes:
- [x] **Contracts + deploy + ABIs** (commit `b26a8fab`, 2026-07-22): deleted
  `ERC1155SecondaryMarket.sol` (+ tests); removed `MarketplaceFactory` from
  `ProjectFactory.sol` (constructor arg, `ERC1155SecondaryMarket` return types,
  `ProjectCreated.marketplace` field) and renamed the two entrypoints to
  `createERC1155AndAssuranceContract[WithCondition]`; removed all
  `DelegatableNotes` secondary-market wiring + its constructor arg; dropped the
  unused `marketplaceFactory` arg from `CreatorAssuranceContractFactory`;
  unplumbed `MARKETPLACE_FACTORY_ADDRESS`/`VITE_MARKETPLACE_FACTORY_ADDRESS` from
  `deploy.js`, `deploy-incremental.js`, `render.yaml`, `deployments/*.env`,
  `ui/.env`; dropped the ABIs from both sync-abis manifests + regenerated.
  Full hardhat suite (416) + SDK suite (408) pass; lint + build green.
- [x] **SDK secondary-market bindings** (2026-07-22): removed the market actions,
  queries, folds/events/types, event decoders/cache helper, direct chain reads,
  obsolete ABI files/sync entries, and `marketplaceFactory` machinery/runtime
  config (including UI trust-worker plumbing and other SDK consumers). Deleted
  the obsolete integration-test/fake-data market actions and the orphan UI
  `SecondaryMarketSection` / `TradeHistory` components. SDK typecheck, lint,
  build, and tests pass (383 tests after deleting obsolete market coverage); the
  full workspace build passes.
- [x] **SDK burn API removal**: removed `burnTokens`, token-burn queries/fold/type,
  their unit/integration/property-test surface, and the obsolete marketplace-approval
  alias left beside the burn action. Funding-portal receipt counts now treat receipts
  as permanent recognition rather than subtracting burns; reimbursement state will be
  supplied separately by the new waterfall bindings.
- [x] UI burn removal: deleted `BurnTokensSection.tsx` (+ test), updated the component
  index, removed its mount/data fetch from `ProjectDetailPage.tsx`, and removed the
  burn-specific balance accounting/tests. Also deleted the already-skipped legacy
  secondary-market block from `ProjectDetailPage.test.tsx` and its stale mocks.
- Indexer: checked — only imported `AssuranceContractFactoryAbi` /
  `PremintingERC1155FactoryAbi` from `ProjectFactoriesAbi`; the unused
  `MarketplaceFactoryAbi` export was removed. No market event handlers existed.

Contract new-build (`forgoReimbursement`):
- [x] Add `forgoReimbursement(uint256 f)` to `AssuranceContracts.sol`: cap `f ≤ min(earlyContributions[sender] , T − R)`; guard `(c−f)·R/(T−f) ≥ w` when `w>0`; decrement `earlyContributions[sender]` and `totalEarlyContributions`; emit `ReimbursementForgone(sender, f)`. **Done + 6 tests** (full forgo/donate-normally, pro-rata redistribution, T−R cap, over-contribution/zero rejection, already-withdrew guard, forgo-then-fail-then-refund clamp). Also clamped `recordPrimaryRefund` to prevent forgo×refund underflow. All 46 AssuranceContracts tests pass.

SDK new-build:
- [x] Add bindings for `donateRetroactive`, `withdrawReimbursement`, and `forgoReimbursement`; expose direct-chain `reimbursableAmount` / `outstandingReimbursementTotal` reads.
- [x] Add the atomic "donate normally" operation (contribute + full forgo in one transaction): `donateNormallyERC1155` shares the guarded primary-purchase implementation, then fully forgoes the receipt recipient's new reimbursement basis before the transaction completes. SDK `donateNormally` handles allowance and submits the single call.

Indexer new-build:
- [ ] Handle `RetroactiveDonationReceived`, `ReimbursementWithdrawn`, `ReimbursementForgone`; expose per-project outstanding-reimbursement and per-contributor reimbursable/forgone amounts.

UI new-build:
- [ ] Contribution flow: offer "Donate normally" vs. "Fund as a scout (reimbursable later)"; the donate path routes through contribute + forgo, keeps the recognition receipt.
- [ ] "Close the loop" retroactive-donation section (calls `donateRetroactive`, shows outstanding amount).
- [ ] Reimbursement-withdrawal affordance for early contributors + a "forgo my reimbursement" option.
- [ ] Reframe `BuyTokensSection` copy away from "buy/purchase".

Verification:
- [ ] Rerun `verifier-run product.messaging` (and `review.not-crypto-scary`, whose fail is stale from 2026-07-09) after the copy/UI changes to confirm the product facet clears.

## Progress log

- **2026-07-22 (cont. 8)** — Added the atomic donate-normally path. The
  contract's primary purchase now has an internal implementation shared by
  `buyERC1155` and `donateNormallyERC1155`; the latter immediately forgoes the
  full reimbursement basis for the recognition-receipt recipient under the same
  reentrancy guard. Added contract tests for self-funded and gifted receipts,
  regenerated the SDK ABI, and added the allowance-aware SDK `donateNormally`
  action and unit test. Focused contract tests (8) and SDK reimbursement tests
  (5) pass; SDK typecheck is clean. Next: index the three reimbursement events
  and expose aggregate/contributor reimbursement state.
- **2026-07-22 (cont. 7)** — Added and tested the SDK write bindings for
  `donateRetroactive`, `withdrawReimbursement`, and `forgoReimbursement`, plus
  direct-chain reads for `outstandingReimbursementTotal` and per-contributor
  `reimbursableAmount`. Retroactive donations reuse the allowance-aware ERC-20
  approval path. SDK typecheck and all 379 unit tests pass. Did not implement
  "donate normally" as two transactions: the required atomic contract entrypoint
  does not exist yet, and sequential contribute/forgo can be interrupted by a
  retroactive donation and fail. Next: add that atomic contract method and SDK
  binding, then move to indexer event handling.
- **2026-07-22 (cont. 6)** — Completed the coupled SDK/UI burn-removal pass:
  deleted the burn action, queries, fold/type, integration/property wrappers, and
  `BurnTokensSection`; removed burn fetching/accounting from the project page and
  changed funding-portal receipt counts to permanent recognition receipts. Cleaned
  the stale skipped secondary-market tests/mocks left in `ProjectDetailPage.test.tsx`.
  SDK/UI/integration-test typechecks pass, SDK tests pass (372), focused UI tests
  pass (89), the UI production build passes, and the full Docker-backed integration
  suite passes. Next: add the new reimbursement SDK bindings and reads.
- **2026-07-22 (cont. 5)** — Dead-code removal, SDK secondary-market pass:
  deleted all SDK listing/order/trade actions, queries, folds, event decoding,
  chain reads, cache helper, generated ABI files and sync entries. Removed the
  obsolete `marketplaceFactory` address from SDK machinery and UI runtime/trust
  worker plumbing, plus obsolete integration/fake-data market actions and the
  orphan `SecondaryMarketSection` / `TradeHistory` UI. Kept the separate burn API
  temporarily because live UI and funding-portal aggregation still consume it;
  the checklist now couples its removal to the UI burn-section pass. SDK
  typecheck/lint/build and all 383 remaining tests pass; the full workspace build
  passes. Next: remove the mounted burn UI together with the remaining SDK burn
  surface.
- **2026-07-22 (cont. 4)** — Dead-code removal, pass 1 of N: **contracts +
  deploy + ABIs** (commit `b26a8fab`). Confirmed with Adam to do the **full
  removal** (delete `MarketplaceFactory`, change `ProjectFactory`'s constructor
  ABI, unplumb the deploy env) rather than leaving a factory stub. Full hardhat
  (416) + SDK (408) suites pass; lint + build green across all packages. Left
  the SDK market bindings + UI market/burn sections for the next passes (the
  SDK ABIs are regenerated for the new contract shapes but the orphaned market
  ABI files/bindings remain, so the SDK still builds). Detailed SDK touch-list
  recorded in the checklist above. Next: SDK market-binding removal → UI.
- **2026-07-22 (cont. 3)** — Contract layer complete (forgo + 6 tests, 46/46
  pass). Surveyed the dead-code removal: it spans contracts (incl.
  `ProjectFactory` which wires the market), SDK event-decode/fold plumbing, and
  UI — recorded the full touch-list in the checklist. **Stopping here** to keep
  the removal a clean focused pass rather than half-finishing it across three
  packages under a shrinking context. Next session: dead-code removal → SDK
  binding new-build → indexer → UI → doc scrub.
- **2026-07-22 (cont. 2)** — Implemented `forgoReimbursement` in
  `AssuranceContracts.sol` (compiles). Surfaced a semantic subtlety:
  **forgo × refund-on-failure.** Forgo reduces the reimbursement basis
  (`earlyContributions`), but refund-on-failure is a *token-backed* right, so a
  forgoer's tracked contribution can be below their refundable token value.
  Resolution taken (needs Adam's ✔): refund and reimbursement never coexist
  (refund ⇒ failure; `donateRetroactive` ⇒ success), so `recordPrimaryRefund`
  now **clamps** instead of underflowing — a "donate normally" contributor still
  gets their assurance refund if the project fails to reach its goal (the
  non-recoverable choice waives *retroactive reimbursement*, not the pre-goal
  assurance refund). Pending: contract tests for forgo boundaries; then SDK /
  indexer / UI; then dead-code removal.
- **2026-07-22 (cont.)** — Design settled with Adam: remove all secondary-market
  + burn dead code; add two altruism primitives (non-recoverable donation =
  contribute+forgo in one tx; `forgoReimbursement` for existing scouts) capped at
  `min(remaining, T−R)`. Decisions + full checklist recorded above. Starting the
  build: contract `forgoReimbursement` first.
- **2026-07-22** — Created this tracker. Audited all layers (table above).
  Corrected an earlier mistaken read: the secondary-market UI is already
  unmounted; the verifier finding claiming otherwise is stale (2026-07-09).
  Key newly-surfaced gap: the reimbursement waterfall exists in the contract
  but has **zero** SDK / indexer / UI reach. Also fixed the unrelated
  `on-chain` banned-term copy hit in `StatementPage.tsx`.
