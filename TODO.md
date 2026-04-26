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



# Security Audit: Pubstarter.sol — addressed 2026-04-26

Implementation pass on the audit findings:
- M1 done: Pubstarter validates `ids.length > 0`, equal lengths, `prices[i] > 0`. `MultiERC1155AssuranceContract.setPricesERC1155` now uses a separate `_erc1155PriceIsSet` flag instead of treating zero as "unset".
- M2 done: Pubstarter requires `threshold > 0` and `deadline > block.timestamp`.
- M3 done: `MultiERC1155AssuranceContract` now takes `erc1155Addr` as an immutable in the constructor; `setPricesERC1155` only operates on it (the parameter has been dropped from the function signature). `erc1155Price` reverts on a foreign collection or unset id, so buy / refund / `erc1155TotalCost` all reject anything other than the configured token.
- L1 partial: renamed `AssuranceContractFactory.isDeployedMarket` → `isDeployedAssurance` (and updated `DelegatableNotes`). Did NOT lock factories to a single Pubstarter caller because `CreatorAssuranceContractFactory` shares them; the maps are still safe as a "factory deployed it" stamp because the factory enforces the contract type.
- L2 done: Pubstarter constructor zero-checks all four factory addresses.
- L3 done: dropped `FreeERC1155Factory` (and removed it from deploy.js / sync-abis).
- L4 done: Pubstarter emits a single `ProjectCreated(creator, token, assuranceContract, marketplace, condition)` event per call.
- L5 done: extracted `_deployTokenMarketplaceAndAC`, `_wireUpAndFinalize`, `_validateTokenArrays` helpers; the two public entry points are now thin.

Open: Remaining contracts to audit per the survey at the top of this file (DelegatableNotes still #1, then `CreatorAssuranceContractFactory`, `ERC1155SecondaryMarket`, `ChannelRegistry`).

# Security Audit: Pubstarter.sol

Pubstarter is an orchestration contract that wires together a token, marketplace, assurance contract, and success/failure condition into one project. Its safety depends heavily on the contracts it composes. I read the four collaborators (`PremintingERC1155`, `MultiERC1155AssuranceContract`, `AssuranceContract`, `ERC1155PrimaryMarket`, `ValueThresholdCondition`) to evaluate it end‑to‑end.

## Summary
No critical vulnerabilities in Pubstarter itself. The orchestration is correctly ordered (token → marketplace → AC → condition → wire condition → set prices → transfer AC ownership → mint → renounce token ownership), and the chicken‑and‑egg of "condition references AC" is solved cleanly. Below are findings ranked by severity, plus issues in the contracts Pubstarter pulls together that affect its overall security posture.

---

## Medium

### M1. No validation of input arrays — silent "dead project" footguns (Pubstarter.sol:214‑258, 278‑312)
`ids`, `counts`, and `prices` lengths are validated only downstream (`setPricesERC1155` checks `ids vs prices`, `_mintBatch` checks `ids vs counts`). That makes the all‑three invariant work, but two pathological cases get through:

- `ids.length == 0` → assurance contract is created, ownership renounced on the token, but **no inventory exists**. The project is permanently bricked (no buys possible, threshold reachable only via direct ERC‑20 transfer to the AC, refunds impossible).
- `prices[i] == 0` for some `i` → those ids can be claimed for free, with no contribution to `_totalReceivedValue`. Also: `setPricesERC1155` uses `currentPrice != 0` as the "already set" sentinel, so a zero price is **never marked as set**, meaning the (post‑renounce, new‑owner) AC owner could later set a real price for those same ids on the same `erc1155Addr` — modifying live pricing in a way the "prices are immutable" comment promises against.

**Recommendation:** in Pubstarter, require `ids.length > 0`, `counts.length == ids.length == prices.length`, and `prices[i] > 0` for all `i`. Alternatively/additionally, fix the sentinel in `MultiERC1155AssuranceContract.setPricesERC1155` to use a separate `bool isSet` mapping.

### M2. No deadline / threshold sanity checks (Pubstarter.sol:243‑247)
`createCondition` accepts any `threshold` and any `deadline`:
- `threshold == 0` → `hasSucceeded()` true immediately on deploy; recipient can `withdraw()` 0 funds, but more importantly the AC cannot enter a failed state, so refunds are impossible from the start.
- `deadline <= block.timestamp` → condition can be in `hasFailed()` immediately if no funds; project deploys already‑dead.

These are user‑facing UX bugs more than exploits, but they cost gas and produce confusingly‑broken contracts. Recommend `require(threshold > 0 && deadline > block.timestamp)`.

### M3. `setPricesERC1155` accepts arbitrary `erc1155Addr` after ownership transfer (AssuranceContracts.sol:62‑76)
Out of scope for this file but it changes the trust model Pubstarter sets up. After `ac.transferOwnership(owner)`, the new owner can call `setPricesERC1155(otherErc1155, ...)` for **any** ERC1155 collection. The AC will then `safeBatchTransferFrom(address(this), buyer, ...)` — which reverts unless someone deposits those external tokens into the AC, but if the owner does deposit them, sale proceeds flow into the same `_totalReceivedValue` bucket that the original buyers' refunds are accounted against. Owner can therefore dilute / inflate the refund pool post‑hoc.

**Recommendation:** lock `setPricesERC1155` to the single `erc1155Addr` Pubstarter wired up at construction (store it as immutable in the AC, and have Pubstarter pass it).

---

## Low

### L1. Factory `isDeployedMarket` registry is unauthenticated and pollutable (Pubstarter.sol:75, 101‑102, 141)
Anyone can call `MarketplaceFactory.createMarketplace`, `AssuranceContractFactory.createAssuranceContract`, `ValueThresholdConditionFactory.createCondition`, or `Pubstarter.create...` directly — registering arbitrary deployments in the `isDeployedMarket` / `isDeployedCondition` maps. Also note `AssuranceContractFactory` reuses the field name `isDeployedMarket` despite registering assurance contracts (rename to `isDeployedAssurance`).

This isn't an exploit on its own, but if any off‑chain indexer or future on‑chain consumer trusts these maps as a "Pubstarter‑legitimate" stamp, it will be misled. Either remove the maps (events suffice) or restrict factory creation to the Pubstarter contract.

### L2. Constructor does not validate factory addresses (Pubstarter.sol:183‑193)
Factory addresses are stored as immutable with no zero‑check or interface probe. A misconfigured deploy bricks the contract permanently. Add zero‑checks; consider an `ERC165`‑style probe or a sentinel function call.

### L3. `FreeERC1155Factory` is dead code in Pubstarter's flow (Pubstarter.sol:21‑39)
Pubstarter only uses `PremintingERC1155Factory`. `FreeERC1155Factory` is defined here but never referenced — confusion risk and a comment in the docstring claims it's used. Either drop it from this file or wire it into a code path.

### L4. No event from Pubstarter aggregating the deployment (Pubstarter.sol:214‑258)
Off‑chain indexers must join four separate factory events by tx hash to recover one project. Emitting a single `ProjectCreated(token, marketplace, ac, condition)` from Pubstarter would tie the components together atomically.

### L5. Code duplication between the two `create…` functions (Pubstarter.sol:214‑312)
Identical setup logic lives in both. Extract a private helper that takes a `condition` parameter; keep the two public entry points thin. Reduces audit surface.

---

## Informational / Good practice

- **Reentrancy:** Pubstarter's flow is safe. `_mintBatch` triggers `onERC1155BatchReceived` on the AC, but the AC is freshly deployed by Pubstarter and inherits OZ `ERC1155Holder`, which doesn't reenter. `transferOwnership` is non‑callback. `ERC1155PrimaryMarket` uses `nonReentrant` correctly on buy/refund.
- **Ownership lifecycle:** Token ownership is renounced after mint (correct — locks supply). AC condition is one‑shot via `_conditionSet` (correct — owner cannot swap condition after Pubstarter wires it).
- **Trust in the deployer of Pubstarter:** Whoever deploys Pubstarter chooses the four factory addresses; users must trust the deployer that those factories are the real ones. Worth documenting prominently.
- **Token assumption:** `AssuranceContract`'s NatSpec correctly states the payment token must be a standard ERC‑20 (no fee‑on‑transfer, no rebasing, no callbacks). Pubstarter doesn't enforce this; it's a deployer responsibility. Keep the doc — and consider adding it to Pubstarter's NatSpec too, since that's the contract integrators see first.
- **Solidity 0.8.33** — recent and fine; built‑in overflow checks active.

---

## Suggested priority
1. Fix M1 (input validation + zero‑price sentinel) — cheapest, prevents real footguns.
2. Fix M3 (lock `setPricesERC1155` to the configured token) — closes a post‑deploy trust gap.
3. Add M2 sanity checks.
4. Address L1/L2/L3 cleanup; emit aggregated event (L4).
