# TODO

## Main list

- Make sure the seed content gets into the fake universe simulation.

- Add Admin tabs to the UI.

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