# Assurance contract composability (mechanics)

How assurance contracts plug into each other at the contract level. For the product-level "what this enables and why," see [specs/product/composability.md](/specs/product/composability.md).

## Why the architecture already supports this

The existing contracts (`hardhat/contracts/individual-projects/`) separate three concerns behind interfaces, and that separation *is* the composability story:

- **Measurement** — `IProgressSource.getAssuranceContractProgress() → uint256`. Any contract can report a progress number.
- **Judgment** — `IAssuranceCondition` with `hasSucceeded()` / `hasFailed()`. A pure tri-state predicate: succeeded, failed, or undecided (both false). **Invariant: never both true at once.**
- **Money** — `AssuranceContract` holds the ERC-20 balance, pays `_recipient` on success, refunds on failure. The condition is set **once** (`_setCondition`, immutable thereafter).

Crucially, `CancellableCondition` is already a *condition that wraps another condition* (`baseCondition`) and adds veto logic. So the decorator/combinator pattern is proven and in production — new combinators are the same shape.

## The five composition seams

### 1. Condition algebra (`IAssuranceCondition` combinators)
New conditions that take other `IAssuranceCondition`s as constructor args and combine their tri-states. Candidate combinators:

| Combinator | `hasSucceeded()` | `hasFailed()` |
|---|---|---|
| **NOT(c)** | `c.hasFailed()` | `c.hasSucceeded()` |
| **AND(c₁…cₙ)** | all `hasSucceeded()` | any `hasFailed()` |
| **OR(c₁…cₙ)** | any `hasSucceeded()` | all `hasFailed()` |
| **K-of-N(c₁…cₙ)** | ≥K succeeded | >(N−K) failed (≥K success now impossible) |

These preserve the never-both invariant *provided each child does* — verify with the truth tables, especially the mixed succeeded/failed cases (failure must dominate where reachable, and the "success still possible?" test for K-of-N must be exact). NOT cleanly swaps the two, so it's safe by construction.

### 2. Progress aggregation (`IProgressSource`)
`ValueThresholdCondition` reads a single progress source. An **aggregating progress source** that implements `getAssuranceContractProgress()` as a function over several underlying contracts enables:
- **Rollup** — sum of child contracts' progress (regional federation).
- **Matching (virtual only)** — `direct + f(direct)` where `f` is the matching formula (linear or concave/QF-style). ⚠️ This inflates the *number the condition sees*, not the *money in the contract* — use it only for QF-style virtual matches where a separate pool pays the amplified amount at settlement. **Real matching funds (an org actually contributing money) is seam 4, not seam 2** — see [matching.md](matching.md).
- Note token-denomination: progress is in the *source's* settlement token; aggregating across tokens needs normalization (oracle price or a shared token).

### 3. Recipient composition (payout target)
`_recipient` is just an address. Point it at:
- **another `AssuranceContract`** → waterfall (A's payout pledges into B).
- **a splitter** → formulaic fan-out to many recipients.
Requires a safe-routing fallback: if the downstream contract has already failed/closed when funds arrive, funds must not strand — route to a refund path.

### 4. Pledger composition (funding source)
A pledger is whoever buys receipt tokens — can be a contract:
- **delegate pool** — pledges on behalf of many followers (ties into the [delegation subsystem](../delegation/README.md)).
- **gated town contract** — a contract that pledges into a regional contract only when its *own* local condition succeeds (the walkthrough's "town runs an assurance contract to decide whether to join the inter-town contract"). Revocation composes: unwinding the local contract unwinds the regional participation.

#### 4a. The refund edge (the dual of seam 3)

Seam 3 makes the *success* edge composable (where a payout goes). Its dual is the *failure* edge: where a refund goes when a contract fails. Today `refundERC1155(holder, …)` pushes the settlement token back to whoever holds the receipts — fine when `holder` is an EOA, but a dead-end when the pledge was funded from a **delegatable note**. In that case the receipts live *inside* `DelegatableNotes` (as ERC1155-typed notes, chain preserved), so an EOA-style refund can't reach them: the notes contract has no way to trigger the refund and nowhere to put the proceeds. The receipts can only leave via a secondary-market resale, never via a refund back into a revocable note.

`DelegatableNotes.refundIntoNote(noteId, chain, primaryMarket)` closes this — the exact mirror of `purchaseFromPrimaryMarket`:

- **Implemented**, with SDK fold/decoder/action support and tests (`hardhat/test/DelegatableNotes.refund.test.js`, `sdk/.../folds.test.ts`).
- Authorization mirrors the purchase path: verifies the passed `chain` hashes to the note's `chainHash` and that `chain[0]` is the caller (current leaf).
- It does **not** re-check failure — the AC's `refundERC1155` already reverts via `requireRefundsAllowed()` (i.e. `requireAssuranceContractHasFailed()`) unless the contract has failed, so failure has a single source of truth.
- CEI ordering: the receipt note is deleted (`NoteConsumed`) before the external call; operator approval to the AC is granted transiently and revoked immediately (mirroring the purchase path's `forceApprove(…, 0)` cleanup); the settlement-token **balance delta** is taken as the authoritative refund amount.
- It mints a new ERC20 note with the **same `chainHash`**, so revocability survives the round trip: a failed pledge replenishes the same revocable pool it was funded from instead of stranding at an EOA. A new `RefundedIntoNote(caller, primaryMarket, …, inputNoteId, outputNoteId)` event lets the SDK fold copy the full chain onto the output note (the same trick `ERC1155Purchased` uses for purchase outputs).

This is the load-bearing primitive for the "if P fails, money returns to my pool" / ordered-fallback-cascade capability discussed in [the product doc](/specs/product/composability.md#thoughts-on-the-above). Note that the refund *destination* must follow the *current* receipt holder (receipts are resellable), so it's chosen at refund-call time, not bound at pledge time. The cascade *policy* itself ("then try B") stays off-chain (an executor + intent record, reusing the [recurring-pledges](/specs/product/recurring-pledges.md) intent/execution split); a trustless on-chain `FallbackRouter` is a later, optional escalation with a real custody cost.

### 5. Oracle/trigger composition (`IOracle` → `OracleCondition`)
`OracleCondition` already wraps `IOracle` (tri-state `result()` of 0/1/2). Since it's an `IAssuranceCondition`, it drops straight into the seam-1 algebra. The credible-threat standby contract is `NOT(OracleCondition(govKeepsFundingOracle))`. The contract plug exists; only a concrete real-world-event `IOracle` plus its trust/dispute mechanics are missing (see [localism-movement.md §1](/specs/product/localism-movement.md)).

## Invariants and hazards

- **Tri-state preservation.** Every combinator must guarantee `!(hasSucceeded() && hasFailed())` given children that satisfy it. This is the one correctness property that, if violated, makes a contract simultaneously withdrawable *and* refundable. Unit-test the full truth table per combinator, including undecided/mixed inputs.
- **Acyclicity.** Condition/progress references must form a DAG. A cycle (A reads B's progress, B reads A's) deadlocks or is undefined. Construction-time enforcement is hard on-chain (you'd need to walk the graph); more practical to enforce off-chain in the factory/SDK and treat cycles as a deploy-time error.
- **Deadline coherence.** A parent's effective deadline should be ≥ each child's, or the parent can fail while children are still live, stranding money. The SDK/factory should validate monotonic deadlines down the tree.
- **Money-routing atomicity.** Cascades (seam 3) must handle a closed/failed downstream target without reverting the upstream withdrawal into a stuck state. Define the fallback explicitly.
- **Trust surface.** Composing with an arbitrary external condition means trusting all of its code (the `ProjectFactory` trust note already flags this for factory addresses; a tree multiplies it). Mitigation: a registry/whitelist of audited combinator + condition types, and a tree that the SDK can introspect so a UI can show a pledger exactly what they're committing to.
- **Immutability is load-bearing.** Conditions are set-once. A composed tree is frozen at deploy — that's what makes a credible threat credible and lets pledgers verify it, but "edit structure" = "deploy new tree." The SDK/UX must make re-deploy painless rather than trying to make trees mutable.
- **Gas / liveness.** A condition that reads N children multiplies the read cost and can stall if one child never resolves; per-level deadlines bound this.

## Build notes

- New combinators are small immutable contracts in `hardhat/contracts/individual-projects/`, deployed via factories (mirroring `ValueThresholdConditionFactory`), and wired by an extended `ProjectFactory` path (`...WithCondition` already accepts a pre-deployed custom condition, so a composed tree can be assembled then passed in).
- SDK fold functions already reconstruct project state from raw events; composition adds a tree-walk so the SDK can present "what does this contract actually depend on." This is where acyclicity/deadline validation should live.
- Don't build combinators speculatively — each one lands when a concrete [product capability](/specs/product/composability.md) is being productized. NOT + a real-world oracle (credible threat) is the natural first.
