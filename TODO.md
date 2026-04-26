# TODO

## Main list

- Make sure the seed content gets into the fake universe simulation.

- Add Admin tabs to the UI. (What goes in it? And how do we get the UI to know that an admin is looking at it?)

- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Get DNS names and ENS names.

- Do another smart-contract audit pass.
  - First: which smart contracts are scary? IIRC the main one that was complicated was DelegatableNotes. Is that still true? Maybe not quite, see below.

- (Not a task for AI.) Try out the UI manually.
- (Not a task for AI.) Do a big code review myself. I don't trust it.

- Keep working on [memes](specs/product/memes.md).
- Work on the [elevator pitch](docs/common-sense-majority/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

- Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
- Point an AI at the UI and tell it "go use this."
- Similar: "Go try to break the thing. You are a really good tester. Be adversarial."
- We'll need a lot more AI underlings, with good documentation, following all the pathways, trying all the things.

- Using `cofounder` skill: Are we ready to launch?

## Out of scope for the MVP, but worth remembering

- [Bridges](specs/tech/bridges.md) to tradfi.

## Suggestions from AI

- (Done) Smoke check for render.yaml — added `scripts/smoke-check-render.mjs` + `npm run smoke-check`.

## Smart contracts - AI's take on it

Based on the survey, here's my read on which contracts are tricky enough to be hard to get right:

**Top tier (genuinely complex):**

1. **`DelegatableNotes.sol`** (765 lines) — still the most complex. The hash-commitment delegation chain (`chainHash = hash(owner, parentChainHash)`) is clever but unusual: callers pass full owner arrays for verification, with a 200-depth cap to bound gas. Combine that with multi-token-type handling (ETH / ERC-20 / ERC-1155), authorized primary/secondary markets, and reentrancy surface across token transfers, and there's a lot of room for subtle bugs. Yes, your recollection is right.

2. **`CreatorAssuranceContractFactory.sol`** - we addressed some of the concerns, maybe not all.

3. **`ERC1155SecondaryMarket.sol`** (405 lines) — orderbook with partial fills, ask/bid orders, ERC-20 settlement, ERC-1155 custody. Order accounting + partial fulfillment is a classic place to introduce off-by-one or rounding bugs, and reentrancy via 1155 hooks is a real concern (it does use `ReentrancyGuard`).

4. **`ChannelRegistry.sol`** (313 lines) — signature-verified channel claims with nonces, deadlines, veto windows, and third-party contract registration tied to the factory. State machine (verified / creator-controlled / vetoed) plus signature replay surface make it nontrivial.

5. **`Pubstarter.sol`** (313 lines) — multiple factories in one file, but each factory is mostly glue. Less algorithmically tricky than the above; complexity is mostly "many moving parts" rather than subtle logic.

**Middle tier (worth careful review but not nail-biting):**
`ERC1155PrimaryMarket`, `AssuranceContract(s)`, `CreatorAssuranceContract`, `ChannelEscrow`, `Implications`, `AlignmentAttestations`.

**Low risk:** the small condition contracts, oracles, registry-of-content, statement contracts, and the utils/* token wrappers are short and mostly mechanical.

So: **DelegatableNotes is still #1**, but `CreatorAssuranceContractFactory` and `ERC1155SecondaryMarket` deserve roughly the same level of caution now.


### Audit: ERC1155SecondaryMarket.sol

**Overall verdict:** Solid foundation. Architecture is sound (escrow model, CEI ordering, `nonReentrant` everywhere, SafeERC20). Not "rock-solid in production" yet — there are a handful of real issues plus some sharp edges I'd want fixed before mainnet.

#### Issues

##### High

**H1. `fulfillSaleListingTo` doesn't reject `recipient == address(this)`** (line 207)
A buyer can specify the marketplace itself as recipient. The ERC1155 tokens land in the contract with no listing tracking them — permanently stranded. There is no admin recovery path. Add `if (recipient == address(this)) revert InvalidRecipient();`.

**H2. `cancelBuyOrder` has no `OrderDoesNotExist` check** (line 349–355)
Currently relies on `buyer != _msgSender()` to reject nonexistent orders (since `msg.sender` is never `address(0)`). It works, but emits the misleading `NotTheBuyer` error and is inconsistent with `cancelSaleListing`. More importantly, it's exactly the kind of "works by coincidence" pattern that breaks during a refactor. Add the explicit check.

##### Medium

**M1. `"0x"` is not empty bytes** (lines 176, 241, 267, 336)
`"0x"` is the 2-byte string literal `[0x30, 0x78]` ('0','x'), not empty `bytes`. ERC1155 transfers are passing junk data into the receiver hook. Use `""` instead. Won't break OpenZeppelin's `ERC1155Holder` (it ignores data) but a downstream receiver hook that inspects `data` would see garbage. Costs gas too.

**M2. Constructor doesn't validate `erc1155Address`** (line 137)
Bricks the contract if zero, not exploitable, but trivial to add.

**M3. paymentToken liveness assumption**
USDC blacklist or pausable token → `safeTransferFrom(buyer, seller, totalCost)` reverts permanently if seller is blacklisted, freezing the listing. Mitigated because seller can `cancelSaleListing`. Buy orders symmetrically: if buyer becomes blacklisted, fulfillers can't be paid — but buyer can cancel and recover. Document this clearly; consider an admin-less rescue path or an order expiry mechanism.

**M4. Dead address-zero check** (line 322)
`address seller = _msgSender(); if (seller == address(0)) revert InvalidRecipient();` — `msg.sender` cannot be zero. Remove it; dead checks signal misunderstanding to readers/auditors.

##### Low / hardening

- **L1.** No order expiration — stale buy orders can be hit when prices move. Standard for naive orderbooks; consider a `deadline` field.
- **L2.** Self-trade is allowed (buyer == seller). Doesn't lose funds but enables wash-trading volume. Add `if (seller == buyer) revert ...` if that matters for your market.
- **L3.** No price/cost confirmation parameter on `fulfillSaleListing`/`fulfillBuyOrder`. Since IDs are immutable in price, the existing design is fine, but adding `expectedPricePerToken` is cheap defense-in-depth.
- **L4.** No max-count cap; a `count * pricePerToken` overflow just reverts (Solidity 0.8.x), so DoS-of-self only.
- **L5.** `_nextSaleListingId++` etc. could be `unchecked` for minor gas savings.
- **L6.** Inconsistency: `getSaleListing` returns the struct, `getBuyOrder` returns a tuple. Cosmetic.
- **L7.** ERC1155 contract is trusted (immutable, set at deploy). If someone deploys this against a malicious ERC1155, all bets are off — worth stating in the NatSpec.

#### What's done well

- `nonReentrant` on every state-changing entry point + `ERC1155Holder` correctly inherited.
- State updates (delete/decrement) happen *before* external token transfers — proper CEI.
- `SafeERC20` everywhere.
- Immutables for `paymentToken` and `_erc1155`.
- Custom errors instead of strings.
- Partial fills handled correctly with consistent decrement-or-delete logic.
- Buy-order escrow refund math is correct (uses stored `pricePerToken * remaining count`).

#### Bottom line

Fix H1 and H2 before any deployment. Fix M1–M4 before mainnet. Decide consciously about L1 (expiration) and L3 (slippage) based on threat model. After that, this is shippable for a reasonably trusted paymentToken. I'd still recommend a third-party audit before significant TVL given the escrow exposure.

#### Implementation notes - 2026-04-26

- **Done: H1.** `fulfillSaleListingTo` now rejects `recipient == address(this)` with `InvalidRecipient`, with regression coverage.
- **Done: H2.** `cancelBuyOrder` now explicitly rejects missing orders with `OrderDoesNotExist`, with regression coverage.
- **Done: M1.** ERC-1155 transfers now pass empty bytes (`""`) instead of the `"0x"` string literal. Added receiver-hook coverage for `fulfillSaleListingTo`.
- **Done: M2.** Constructor now rejects `erc1155Address == address(0)` with `InvalidERC1155Address`, with regression coverage.
- **Done/documented: M3 and L7.** Added NatSpec documenting that `paymentToken` and the ERC-1155 contract are trusted deployment choices, and that pausable/blacklistable payment tokens can temporarily make orders unfulfillable while preserving the ordinary cancel path when transfers permit.
- **Done: M4.** Removed the dead `_msgSender() == address(0)` check in `fulfillBuyOrder`.
- **Done: L3.** `fulfillSaleListing`, `fulfillSaleListingTo`, and `fulfillBuyOrder` now require an exact `expectedPricePerToken` and revert with `UnexpectedPrice` if the order price does not match the caller's expectation. Updated DelegatableNotes, SDK, UI, integration tests, and fake-data callers for the ABI change.
- **Not done: L1.** Order expiration is a real product/design change because it changes order creation, indexing, UI forms, and stale-order behavior. Leave for a deliberate marketplace v2 task.
- **Not done: L2.** Self-trade remains allowed for now. It is economically pointless in the current local marketplace and existing tests document that behavior; blocking it should be a product decision if wash-volume metrics become important.
- **Not done: L4.** Solidity 0.8 overflow checks already make excessive `count * pricePerToken` self-reverting.
- **Not done: L5.** Skipped unchecked ID increments; tiny gas optimization, not worth weakening readability in this pass.
- **Not done: L6.** Return-shape inconsistency is cosmetic and would be ABI-impacting for callers.
