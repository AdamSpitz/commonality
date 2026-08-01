# Spending a note on a different chain from the assurance contract

Status: **exploratory, nothing decided** (2026-08-01). The recommendations below are conditional on
adding cross-chain note spending at all. Written in response to the question "how hard would it be to
let a delegatable note buy into an assurance contract on another chain?"

Motivating goal: **"you can put your assurance contract on L1 or on an L2."** Not "put everything on
L1" — see [l1-vs-l2.md](./l1-vs-l2.md). L1 is expected to get cheaper but not fast enough for every
use case, so at least one L2 stays in the picture indefinitely. The blocker is that a note and the
assurance contract it buys into currently must be on the same chain.

There are no users and no backward-compatibility constraints, so contract rewrites are cheap.

## The claim: the atomicity is an implementation artifact

`DelegatableNotes.purchaseFromPrimaryMarket` currently does all of this in one transaction: read
`paymentToken`, compute `requiredPayment`, consume the payment notes, create receipt notes carrying
the same `chainHash`, then `forceApprove` + `buyERC1155`.

But the properties that actually matter are only these three:

1. **Exactly-once value.** A note's value is spent once and cannot be double-spent.
2. **Revocability survives.** Whatever comes back — receipts, refunds, reimbursements — lands under
   the *same delegation chain* that funded it, so a failed pledge replenishes the pool it came from
   instead of stranding funds at an EOA.
3. **Recoverability.** If the purchase cannot complete, the value returns to its delegation chain.

None of those require a single transaction. But replacing transaction atomicity with an asynchronous
bridge is still a distributed atomicity problem: transport cannot by itself promise "exactly once."
Doing so directly would require durable pledge IDs, idempotent handlers, replay protection, retries,
and an authoritative way to distinguish a delayed purchase from a failed one before refunding it.

The simplest way around most of that machinery is **not to make a cross-chain purchase atomic at
all**. Bridge value into a destination balance first; make spending that balance a separate, local
transaction afterward. The UI may present one flow, but the protocol should admit that it contains
two independently finalized operations.

**And an assurance contract is unusually latency-tolerant.** It is a threshold commitment: no price,
no slippage, no MEV, no ordering advantage within a block. Since
[decision 0003](../decisions/0003-reimbursement-only-retroactive-funding.md) removed the secondary
market, receipts are non-transferable and nothing rewards being early. The only clock is the campaign
deadline, measured in days or weeks. A pledge that takes fifteen minutes to cross a bridge is
completely fine.

The redesign done for securities reasons therefore also removed most of the reason atomicity
mattered. That is worth noticing, because it is what makes this tractable at all.

## Decision gate — does revocation have to remain live across chains?

The simple per-chain design below has a serious semantic cost: an upstream delegator can revoke an
uncommitted source note, but cannot revoke the destination root note. Calling transport "spending"
is defensible—a delegate can always beat revocation by making an authorized local purchase—but it
broadens that escape hatch into indefinite unspent custody on another chain. A delegate could bridge
and simply hold the destination note forever.

That is a real weakening of the delegation model, not an implementation wrinkle. If live revocation
is non-negotiable, the per-chain design is wrong and the single-hub alternative below comes back into
contention. Two possible mitigations both give up some of the simplicity:

- **Destination proxy ancestor.** Create `(originProxy → destinationController)` rather than a root
  note. This helps only if `originProxy` can authenticate revocation authority from the source;
  doing that cross-chain reintroduces distributed coordination. Reusing an EOA address is not
  generally safe for smart-contract accounts.
- **Campaign-bound credit with an expiry.** Restrict the transported note to one campaign and return
  it after a TTL if unspent. This bounds the escape window, but requires a keeper/return path and a
  new constrained-note semantic.

The UI would at minimum have to present source redemption as irrevocable. Whether that is compatible
with the product's delegation promise must be decided before choosing a cross-chain shape.

## Recommendation now — per-chain deployments, no bridge

Deploy `DelegatableNotes` per chain and accept that notes on Base cannot buy a project on L1. This is
zero new code, trust or failure modes, at the cost of fragmented balances and delegation graphs. A
delegator can deposit on the project's chain; the real failure is when a *delegate* finds a suitable
project on a chain where their pool holds nothing.

If the revocation gate resolves in favour of the per-chain design, this is also its migration path:
the deployments remain in place when adapters are added. Even if the gate resolves toward a hub,
today's required single-chain deployment was not speculative work.

## Conditional future shape — bridge between per-chain notes deployments

**Deploy `DelegatableNotes` beside the assurance contracts on every supported money chain. A bridge
adapter moves value from a source note into a root note on the destination; purchases and refunds
then use the existing local notes machinery unchanged. The design is symmetric—there is no required
hub chain.**

This is simpler than inventing a `DelegatedBalanceVault`. Such a vault would need balance ownership,
authorization, receipt custody, purchase, refund and eventually reimbursement accounting — much of
`DelegatableNotes` again. Reusing the contract also makes the baseline deployment and the eventual
cross-chain deployment identical: the recommendation above is this future shape without the adapter.

Flow:

1. **Redeem for transport (source, atomic, local).** The adapter irreversibly consumes value from a
   note and starts a transfer carrying the destination chain, amount, source `chainHash`, destination
   controller, and a globally unique transfer ID. Crossing this boundary counts as spending for
   source-chain revocation purposes.
2. **Transport.** USDC plus the attribution payload moves to the destination chain.
3. **Credit (destination, atomic, local).** The destination adapter idempotently creates a root note
   owned by the named destination controller. At this point transport is complete; no assurance
   purchase is pending or ambiguous.
4. **Spend and refund locally.** The controller uses the existing `purchaseFromPrimaryMarket` and,
   after campaign failure, `refundIntoNote` paths. Receipt custody and delegation-chain accounting
   need no new market-facing contract.
5. **Return optionally.** The adapter consumes an unspent or refunded destination note and bridges
   its USDC back. The source deployment recreates a note under the original source `chainHash`.
   Ordinary wallet withdrawal plus a user-directed bridge is not equivalent: it would give the
   delegate unconstrained USDC instead of replenishing the revocable pool that funded the pledge.

The broad state model remains small:

```text
Source note → InTransit → Destination note → Purchased receipt note
                                         ↘ ReturnInTransit → Source note
```

A missed campaign deadline is ordinary: the destination note remains spendable on another local
campaign or returnable to the source. The source never guesses whether a delayed purchase succeeded
before issuing a refund. The UI can still present "use this note for that campaign" as one guided flow and
submit the local purchase after transport finalizes; the protocol does not pretend the two steps are
atomic.

There is an important identity wrinkle. A source `chainHash` cannot itself be the destination note's
`chainHash`: local note operations require the caller/controller to be the delegation-chain leaf, and
addresses — especially smart-contract accounts — need not have the same controller on two chains. The
transport must therefore bind both:

- a **local destination controller**, which owns and authorizes the destination root note; and
- the **opaque source `chainHash`**, stored separately as return-path attribution.

The destination controller is an opaque address chosen in an already-authorized source redemption;
no cross-chain proof that the delegate controls it is required. Naming the wrong address can burn or
strand value, so binding it into the source transaction and confirming it clearly is a serious UX
and transaction-integrity concern, not a separate authorization protocol.

Three rules keep the model comprehensible:

**The receipt never has to come home.** Under decision 0003 receipts are non-transferable recognition
with only capped pro-rata reimbursement attached. The destination `DelegatableNotes` deployment can
hold and refund them locally; only value crosses chains. `PremintingERC1155` has an owner-controlled
receipt-transfer-bridge allowlist, but this design deliberately does not need to use it.

**Return restores delegation; it does not preserve live revocation.** Return-path attribution cannot
force a destination note to come back and therefore does not repair the decision-gate problem. It is
still required by the stated recoverability property: when an unspent or failed pledge *does* return,
it must replenish the original delegation chain rather than become unconstrained money in the
delegate's wallet. A first implementation may omit returns only by explicitly shipping a one-way
transport whose stuck or failed value cannot recover to its funding pool; that is not the full design.

This does not eliminate bridge engineering: adapter authority, transfer IDs, replay protection,
idempotent crediting and recovery from failed delivery are still necessary. It does eliminate both
the cross-chain purchase state machine and a second implementation of the notes-to-market surface.

## Transport options, ranked

**1. CCTP (recommended).** Circle's native burn-and-mint for USDC: burn on the source chain, mint on
the destination, no wrapped assets and no third-party bridge liquidity. v2 carries a message payload,
so attribution and destination-controller data can ride with the value. The decisive argument is that **it adds zero
marginal trust** — if USDC is the settlement token you already trust Circle, who can freeze or
blacklist regardless of how the value moves. Latency is minutes, which this use case tolerates
easily.

*Check before relying on it:* being a CCTP domain is not the same as USDC merely existing on a chain.
Any candidate L2 must actually be a supported domain, and that constrains the L2 list.

**2. Native rollup bridges.** Most trust-minimized — inherits the rollup's own security, no new
parties. But **direction matters enormously**: L1→L2 is minutes, while L2→L1 on an optimistic
rollup is a seven-day challenge period. Moving a note from an L2 to an L1 assurance contract would
be unusable through the native path. This is also a place where the L1-trajectory thesis bites: if and
when Base ships validity proofs, this option gets dramatically better.

**3. Third-party general messaging (LayerZero, Hyperlane, CCIP).** Flexible and fast, but each
introduces a new trusted validator set — a party who can stop or corrupt the read/write path and who
can be leaned on. That runs directly against the operator-posture reasoning in
[legal/](../product/legal/README.md), which is busy *reducing* the number of parties with levers.
Recommend against unless CCTP proves insufficient.

**4. ZK proofs of source-chain state.** Trust-minimized in principle, but they need proving
infrastructure and timely destination access to the source state root. CCTP already solves the
USDC-settled case without marginal trust; revisit if settlement stops being USDC.

## Rejected shortcut — signed spend intents

A signed intent is not settlement because an upstream delegator can revoke the note before redemption.
A relayer can submit the future shape's source redemption for gasless UX, but that is account abstraction, not
bridging; see [sponsored-gas.md](./sponsored-gas.md).

## Rejected alternative — one notes hub plus destination escrows

Keeping `DelegatableNotes` on one hub would preserve one revocation domain, avoid note fragmentation,
and keep `chainHash` interpretation on one chain. It loses because every non-hub pledge depends on
hub liveness and transport, while each destination escrow must reimplement note ownership,
authorization, receipt custody, purchase, refund and reimbursement attribution. The per-chain-notes
shape accepts fragmentation and a cross-chain controller-binding problem to avoid that second
market-facing implementation. If live revocation proves non-negotiable, this alternative deserves to
be reconsidered rather than pretending the per-chain shape preserves it.

## First work if transport is scheduled

There is no cross-chain implementation work worth doing now. If the decision gate is resolved and
transport is scheduled, start here:

1. **Generalize the existing authorized note-creation pattern carefully.** `createDelegatedNoteFor`
   already lets the recurring-pledge registry create a note for another owner, but it pulls backing
   tokens from that owner. A destination adapter needs a similarly narrow, atomic path that creates
   only fully backed notes from bridge-delivered funds—not a generic minter that can create unbacked
   liabilities. Keep local purchase and refund unchanged.
2. **Keep origin attribution distinct from local delegation identity.** A future adapter needs an
   opaque `(originChainId, originNotesContract, originChainHash)` tag for the return path; it must not
   pretend that tag is a valid local `chainHash`.

Do not make these changes merely for optionality; make them as part of a concrete adapter design.
The general `(chainId, address)` identity work belongs to
[multi-chain.md](./multi-chain.md#cheap-changes-worth-making-now) rather than being duplicated here.

## Open questions

- Does anything else in the money layer reference a project by bare address rather than by hash?
  (Flagged in [l1-vs-l2.md](./l1-vs-l2.md); `AlignmentAttestations` is known, others unaudited.)
- Cross-chain aggregation for cause boards — already flagged as deferred in multi-chain.md and
  [scalability.md](./scalability.md), but cross-chain note transport makes it arrive sooner.
- Is temporary destination-note fragmentation acceptable product behaviour?

Destination transaction gas is a sponsored-gas/account-abstraction concern rather than an open
cross-chain protocol question; use the existing [sponsored-gas.md](./sponsored-gas.md) machinery.
