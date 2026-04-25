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

2. **`CreatorAssuranceContractFactory.sol`** (440 lines) — a close second now. It wires together ChannelRegistry, ContentRegistry, ChannelEscrow, primary/secondary markets, conditions, and DelegatableNotes authorization. Lots of cross-contract invariants (channel verification state, third-party-vs-owner control, initial-purchase accounting) that have to all hold together. This one has grown into "complex enough to worry about."

3. **`ERC1155SecondaryMarket.sol`** (405 lines) — orderbook with partial fills, ask/bid orders, ERC-20 settlement, ERC-1155 custody. Order accounting + partial fulfillment is a classic place to introduce off-by-one or rounding bugs, and reentrancy via 1155 hooks is a real concern (it does use `ReentrancyGuard`).

4. **`ChannelRegistry.sol`** (313 lines) — signature-verified channel claims with nonces, deadlines, veto windows, and third-party contract registration tied to the factory. State machine (verified / creator-controlled / vetoed) plus signature replay surface make it nontrivial.

5. **`Pubstarter.sol`** (313 lines) — multiple factories in one file, but each factory is mostly glue. Less algorithmically tricky than the above; complexity is mostly "many moving parts" rather than subtle logic.

**Middle tier (worth careful review but not nail-biting):**
`ERC1155PrimaryMarket`, `AssuranceContract(s)`, `CreatorAssuranceContract`, `ChannelEscrow`, `Implications`, `AlignmentAttestations`.

**Low risk:** the small condition contracts, oracles, registry-of-content, statement contracts, and the utils/* token wrappers are short and mostly mechanical.

So: **DelegatableNotes is still #1**, but `CreatorAssuranceContractFactory` and `ERC1155SecondaryMarket` deserve roughly the same level of caution now.


### CreatorAssuranceContractFactory (Done)

2026-04-25: Simplified the factory in the useful API-changing ways:
- split the fused `createContract` entry point into `createCreatorContract` and `createThirdPartyContract`;
- packed creation inputs into `CreateContractParams`;
- changed initial purchases from raw token IDs to content-array indices;
- built content IDs/canonical IDs once;
- removed redundant registry interface casts and the dead `try/catch` in `releaseContentOnFailure`;
- updated SDK/UI/fake-data/test callers and ABI sync scripts.

Left alone: the payment middleman path. The assurance contract address is not known before deployment, so pushing the initial purchase pull-through into `CreatorAssuranceContract.buyERC1155` would make the one-transaction create+initial-buy flow worse unless we also add deterministic deployment or permit-style approval plumbing.

Original note:
> Take a look at CreatorAssuranceContractFactory.sol. Where's the complexity coming from? Can it be simplified?


The complexity is concentrated in `createContract` — one ~160-line function with 13 parameters orchestrating six things at once. Here's where it actually comes from, and where simplification is real vs. cosmetic:

#### Real complexity (worth attacking)

**1. Two flows fused into one function.** Third-party vs. creator branches twice — once for validation (lines 266–288) and again for condition wrapping (lines 316–335) — with the recipient choice also depending on a related-but-different axis (verified vs. unclaimed). Splitting into `createCreatorContract` and `createThirdPartyContract` would drop the `isThirdParty` param, collapse each branch's validation into a single readable block, and let each path call a small shared `_deploy(...)` helper. This is the biggest readability win.

**2. The factory acts as a payment middleman.** Lines 358–369 do `transferFrom → forceApprove → buyERC1155 → forceApprove(0)`. If `CreatorAssuranceContract.buyERC1155` accepted a `payer` argument and pulled directly from `msg.sender` (the original caller, passed through), the factory wouldn't need to custody/approve anything. Removes 4 token operations and one storage approval round-trip per creation.

**3. Content IDs get built twice** (lines 246–252 and 345–348), and `_findPrice` is O(n·m). For a contract creating, say, 20 items with 20 initial purchases, that's 400 string-equality-via-uint comparisons. Build `contentIds` + `canonicalIds` once into parallel arrays in a single pass, and require `initialPurchaseIds` to be **indices** into that array rather than raw token IDs — then `_findPrice` becomes `prices[idx]`. Both savings, and one fewer thing for a caller to get wrong.

**4. Parameter count → struct.** 13 params is hitting stack pressure and making call sites unreadable. Group into a `CreateParams` struct (channel info, content arrays, threshold/deadline, metadata, initial purchase). Standard solidity move.

#### Cosmetic complexity (cheap to fix)

- **Redundant interface casts.** `IContentRegistry(address(contentRegistry))` and `IChannelRegistry(address(channelRegistry))` appear ~7 times each. Both registries are already typed concrete contracts on the factory; the interfaces add no safety, just visual noise. Either drop the interfaces or store the registries *as* the interface type.
- **`try/catch` on `getContentIds()`** in `releaseContentOnFailure` (lines 395–403). The factory deployed the AC and knows it implements the method — the empty-catch fallback is dead defensive code.
- **`_buildContentId` returns a tuple** but each caller uses only one half (line 247 ignores `canonicalId`, line 346 ignores `contentId`). Once you do fix #3 above this disappears naturally.

#### Complexity that's *load-bearing* (don't touch)

- The third-party verified-channel `threshold > initialPurchaseValue` check (line 277) — that comment explains a real veto-window invariant.
- SafeERC20 + `forceApprove(..., 0)` reset — correct for non-standard tokens even though the doc claims standard 18-decimal assumptions.
- The `recipient = escrow vs channelOwner` split — genuinely two cases.

#### Suggested order of attack

1. Split `createContract` into two entry points (biggest legibility win, no behavior change).
2. Pack params into a struct.
3. Switch initial-purchase API to indices, do single-pass content ID building.
4. Push payment pull-through into `CreatorAssuranceContract.buyERC1155`.
5. Remove the redundant interface casts and the `try/catch`.

I'd start with #1 + #5 since they're pure refactors with no API change for callers.
