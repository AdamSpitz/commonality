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

## DelegatableNotes.sol audit findings (2026-04-26)

Annotated by a second AI review. TL;DR: most of these don't hold up. Worth doing: M1, maybe I4 and L2. The rest are either wrong, micro-optimizations, or restate that the code is safe.

### HIGH

- [ ] ~~**H1: `revoke()` allows middle-chain participants to no-op.**~~ **VERDICT: WRONG.** The audit misread the loop. Owners is leaf-first; for a middle caller at `callerIndex=k`, `newLeafIndex=k` and the loop rebuilds `hash` only from `owners[length-1]` down to `owners[k]`, stripping descendants `owners[0..k-1]`. That's a real state change, not a no-op. Worked example: chain `[A,B,C]`, caller `B` (idx 1) → new chain `[B,C]`, different hash. Skip.

### MEDIUM

- [x] **M1: `ERC1155Purchased` event docs say "total ETH spent" but purchases use ERC20.** **VERDICT: VALID, easy fix.** Line 184 NatSpec is just wrong — purchases are ERC-20 settled. Worth fixing.

- [ ] ~~**M2: `_createNotesForPurchasedTokens` can produce oversized output arrays.**~~ **VERDICT: NOT A SECURITY ISSUE.** `maxOutputs = tokenIds.length * chains.length` and the caller pays for their own gas; there's no griefing vector since the caller is also the one whose notes get consumed. "OOM" doesn't apply on-chain — it's just self-imposed gas cost. At most a micro-optimization.

- [ ] ~~**M3: `reclaimFunds` for ERC1155 relies on implicit self-transfer authorization.**~~ **VERDICT: WRONG.** The ERC-1155 standard explicitly permits `from == msg.sender` without approval; OpenZeppelin's implementation does so. We don't support arbitrary non-standard ERC-1155s anyway. Skip.

- [ ] ~~**M4: No slippage protection on marketplace purchases.**~~ **VERDICT: WRONG ABOUT THE FAILURE MODE.** The audit says "the user's notes are already consumed and must be retried" — but the whole tx is atomic, so on revert the notes are NOT consumed. `paymentAmount` must equal `requiredPayment` exactly (lines 527, 597) so any price drift just reverts cleanly. No issue.

### LOW

- [ ] ~~**L1: inefficient array trimming.**~~ **VERDICT: MICRO-OPT.** Trivial gas savings, not worth the code churn unless we're already touching this function.

- [ ] **L2: `receive()` accepts ETH with no restrictions.** **VERDICT: MINOR, worth considering.** It exists for marketplace ETH refunds, but our markets settle in ERC-20, so the function may be unnecessary entirely. Could remove it or restrict to known marketplaces. Low priority.

- [ ] ~~**L3: `deposit` transfers tokens after note creation.**~~ **VERDICT: NON-ISSUE.** The audit itself acknowledges it's safe due to `ReentrancyGuard` and atomic revert. Nothing to do.

- [ ] ~~**L4: `MAX_DELEGATION_DEPTH = 200` could still cause gas issues.**~~ **VERDICT: WRONG.** 200 keccak256s on packed 52-byte input is ~6k gas total — nowhere near block limits. Skip.

### INFORMATIONAL

- **I1: `forceApprove` double-tx.** Skip — the safety guarantee is worth more than the gas.
- **I2: no enumeration getter.** By design (off-chain indexing). Skip.
- **I3: Solidity 0.8.33 overflow protection.** Not actionable.
- [ ] **I4: `purchaseFromSecondaryMarket` doesn't verify listing exists.** **VERDICT: VALID minor improvement.** Returning zeros and then failing with `InvalidPaymentAmount` is a confusing error. A `ListingDoesNotExist` revert would be clearer. Low priority.
