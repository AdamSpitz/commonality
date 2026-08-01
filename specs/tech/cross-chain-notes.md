# Spending a note on a different chain from the assurance contract

Status: **exploratory, nothing decided** (2026-08-01). Written in response to the question "how hard
would it be to let a delegatable note buy into an assurance contract on another chain?"

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

None of those require a single transaction. They require exactly-once consumption on the notes
side, exactly-once delivery on the assurance side, and a recovery path if delivery fails. That is
an ordinary two-phase problem, not an atomicity problem.

**And an assurance contract is unusually latency-tolerant.** It is a threshold commitment: no price,
no slippage, no MEV, no ordering advantage within a block. Since
[decision 0003](../decisions/0003-reimbursement-only-retroactive-funding.md) removed the secondary
market, receipts are non-transferable and nothing rewards being early. The only clock is the campaign
deadline, measured in days or weeks. A pledge that takes fifteen minutes to cross a bridge is
completely fine.

The redesign done for securities reasons therefore also removed most of the reason atomicity
mattered. That is worth noticing, because it is what makes this tractable at all.

## Shape A — hub-and-spoke (recommended direction)

**`DelegatableNotes` is deployed once, on one chain. Assurance contracts go anywhere.**

This matches the actual goal: notes are the user's wallet and delegation graph, and it is *projects*
we want spread across chains, not notes. One deployment means one revocation domain, one delegation
graph, no note fragmentation, and no "which chain are my notes on" question.

Flow:

1. **Commit (hub, atomic, local).** `commitPledge(noteId, chain, destChainId, assuranceContract, …)`
   consumes the note exactly as today, escrows the USDC, records a pending pledge keyed by
   `chainHash`, and emits the outbound message. The note is now irrevocably committed.
2. **Transport.** USDC plus a small payload moves to the destination chain.
3. **Fulfil (destination, atomic, local).** A `PledgeEscrow` receives the USDC, calls
   `buyERC1155`, and records that the resulting receipt belongs to `(hubChainId, chainHash)`.
4. **Return path.** On assurance failure or reimbursement, value is sent back with the same
   `chainHash`; the hub recreates a note under that chain hash, exactly as `refundIntoNote` does now.

Two things make this much easier than it first looks:

**The receipt never has to come home.** Under decision 0003 receipts are non-transferable
recognition, and the only economic right attached is capped pro-rata reimbursement. So the receipt
can simply live on the destination chain inside `PledgeEscrow`, tagged with the owning `chainHash`.
Only *value* crosses, and only on the return leg. This is strictly simpler than today's code, which
wraps receipts back into notes.

**`chainHash` is only ever interpreted on the hub.** It is `keccak256` over a chain of owner
addresses. Carrying it to another chain and back as an opaque 32-byte tag means no assumption is
made that those addresses mean the same thing elsewhere — which matters, because a smart-contract
account at address `X` on Base is not necessarily controlled by the same party as address `X` on L1.
Hub-and-spoke sidesteps that entirely; a design that moved notes between chains would not.

**Rule to adopt:** revocation applies to uncommitted notes only. Once a pledge is committed in step
1 it cannot be revoked mid-flight; it can only fail forward into the return path. Clean, local, and
easy to explain.

## Transport options, ranked

**1. CCTP (recommended).** Circle's native burn-and-mint for USDC: burn on the source chain, mint on
the destination, no wrapped assets and no third-party bridge liquidity. v2 carries a message payload,
so the pledge parameters ride along with the value. The decisive argument is that **it adds zero
marginal trust** — if USDC is the settlement token you already trust Circle, who can freeze or
blacklist regardless of how the value moves. Latency is minutes, which this use case tolerates
easily.

*Check before relying on it:* being a CCTP domain is not the same as USDC merely existing on a chain.
Any candidate L2 must actually be a supported domain, and that constrains the L2 list.

**2. Native rollup bridges.** Most trust-minimized — inherits the rollup's own security, no new
parties. But **direction matters enormously**: L1→L2 is minutes, while L2→L1 on an optimistic
rollup is a seven-day challenge period. A hub on an L2 pledging to an L1 assurance contract would be
unusable through the native path. This is also a place where the L1-trajectory thesis bites: if and
when Base ships validity proofs, this option gets dramatically better.

**3. Third-party general messaging (LayerZero, Hyperlane, CCIP).** Flexible and fast, but each
introduces a new trusted validator set — a party who can stop or corrupt the read/write path and who
can be leaned on. That runs directly against the operator-posture reasoning in
[legal/](../product/legal/README.md), which is busy *reducing* the number of parties with levers.
Recommend against unless CCTP proves insufficient.

**4. ZK proofs of source-chain state.** Prove "note N was consumed on chain A" to chain B. General
and trust-minimized in principle, and ZK tooling is genuinely much better than it used to be. But it
needs a proving service, and for the L2→L1 direction you still need the L2's state root on L1 —
which reintroduces the challenge period unless the rollup is validity-proven. Since CCTP already adds
no marginal trust for a USDC-settled system, ZK is solving a problem we do not currently have.
Revisit if settlement stops being USDC, or once ZK rollup finality is the norm.

## Shape B — the "spend receipt" idea, and why it doesn't quite work

The suggestion was: don't move the note, just produce a receipt saying the note's controller has
decided to spend it.

The instinct is right — authorization and settlement genuinely are separable — but there is a
specific reason the fast version breaks: **a note carries a revocation right held by someone else.**
An upstream delegator can revoke before a signed intent is redeemed. So a signed "I'm spending this"
is not evidence that the value still exists, and anyone fronting capital on the destination chain is
taking revocation risk. Removing that risk means committing the note on the hub first — and once
you've done that, you are in Shape A and the intent bought you nothing.

The version that *does* work is to keep intents for **UX rather than settlement**: the user signs an
intent, a relayer submits the hub transaction so the user needs no gas on the hub chain, and the
normal two-phase flow proceeds. That is account abstraction, which the repo already has machinery
for — see [sponsored-gas.md](./sponsored-gas.md). Worth doing, but it is a gas-abstraction feature,
not a bridging one.

## Shape C — the baseline: do nothing

Deploy `DelegatableNotes` per chain and accept that notes on Base cannot buy a project on L1. Zero
new code, zero new trust, zero new failure modes. The cost is a fragmented delegation graph and a
confusing "you have $50 over here and $30 over there" experience.

This is the honest interim answer, and it may be adequate for a while: a delegator who wants to fund
an L1 cause can deposit on L1. It fails specifically when a *delegate* wants to fund a project on a
chain where their pool holds nothing — which is the real UX failure and the actual argument for
Shape A.

## Cheap changes worth making now

In the spirit of [multi-chain.md § Cheap changes](./multi-chain.md#cheap-changes-worth-making-now),
and given that rewrites are currently free:

1. **Split "consume note" from "execute purchase"** inside `purchaseFromPrimaryMarket`, even for the
   local path. The async version then becomes the same two steps with a different transport instead
   of a parallel implementation. This is the single highest-value refactor here.
2. **Introduce an `IPledgeTarget` seam** so `DelegatableNotes` stops importing the concrete
   `AssuranceContract` / `ERC1155PrimaryMarket` types. A local synchronous target and a cross-chain
   escrow target can then both satisfy it.
3. **Store `(chainId, address)` rather than bare addresses** wherever a contract records another
   contract's identity — `AlignmentAttestations` being the known offender, since it currently pins
   cause boards to one chain. CAIP-10 is already the convention in URLs.
4. **Tag receipts and pending pledges with the owning `chainHash` explicitly**, rather than relying
   on the receipt being wrapped in a note. Needed for Shape A, harmless today.

Items 1–2 are pure refactors with no behaviour change and no new dependencies, and they are what
turn "rewrite the purchase flow" into "add a transport."

## Open questions

- Does anything else in the money layer reference a project by bare address rather than by hash?
  (Flagged in [l1-vs-l2.md](./l1-vs-l2.md); `AlignmentAttestations` is known, others unaudited.)
- What is the correct hub chain? A hub on L1 gives fast native outbound messaging but expensive
  deposits, delegations and revocations, which are the *high-frequency* note operations. A hub on an
  L2 inverts both. CCTP largely dissolves this, which is another argument for it.
- Cross-chain aggregation for cause boards — already flagged as deferred in multi-chain.md and
  [scalability.md](./scalability.md), but Shape A makes it arrive sooner.
- Does the reimbursement pool's O(1) pull-based accounting survive contributors being represented by
  a `PledgeEscrow` rather than individually? Probably yes, since reimbursement is pro-rata by
  contribution, but it needs checking against the implementation.
