# Second look: should we be on Ethereum L1 rather than an L2?

Status: **open question, not scheduled** (2026-08-01). A note to revisit a foundational choice, not
a proposal to change it. Nothing here is decided and no work depends on it.

Distinct from [multi-chain.md](./multi-chain.md), which asks whether *users* may pick a chain per
contract. This asks whether *we* picked the right default chain in the first place.

## Where the current choice comes from

One sentence, in [shared/tech.md](./shared/tech.md):

> In general an Ethereum L2 (or validium?) is probably the best choice for which chain to use.
> (Ethereum gives us best-in-class trustlessness/decentralization, but **L1 will be too expensive
> for an app like this that needs to support a high volume of small transactions**.) … for now
> let's set up our configuration to use Base … and we can switch later if we want to.

That is the entire recorded rationale, it was written as a provisional default explicitly expecting
revision, and it has not been revisited since. Base then propagated into
[costs.md](./costs.md), deployments, the paymaster work and the indexer without anyone re-examining
the premise. This file exists so that the premise has somewhere to be re-examined.

## Why it's worth a second look now

**1. L1 scalability is a moving target, and it's moving toward us.** The Lean Ethereum effort is
routing ZK technology developed for L2s back into L1 execution, and blob capacity/pricing is
expected to keep improving. A cost premise adopted as a throwaway default should not be treated as
permanent when the underlying number is expected to change substantially over the next few years.
This cuts both ways and is not an argument that L1 wins — only that "L1 is too expensive" is a
claim with a date on it, and ours has no date on it.

**2. Our byte layer is now transaction history, and L1's is better.** Under
[indexer/the-graph.md](./indexer/the-graph.md), content lives in `publishData(bytes)` calldata and
is recovered by `eth_getTransactionByHash`. That makes *historical transaction availability* a
load-bearing property rather than an incidental one. EIP-4444-style history expiry affects L1 too,
but L1 has by far the deeper archival-node ecosystem and the strongest independent incentive to
keep serving old history. L2 history retention is a younger, thinner, more operator-dependent
promise. If calldata is the canonical store, this is a real point in L1's favour that nobody scored
when Base was chosen — because when Base was chosen, content was going in IPFS.

**3. The EthStorage result is partly an artifact of being on Base.** The 2026-08-01 desk checks
([spikes/ethstorage](/spikes/ethstorage/README.md)) failed EthStorage on two counts, and **A1 —
no Base deployment — evaporates if we are on L1.** EthStorage Mainnet is chain 333 anchored to
Ethereum mainnet, and its storage contract is deployed on L1. On L1 the two-chain upload/pointer
split disappears and only A4 (whitelisted providers, project-operated endpoints) remains, which is
a maturity problem that time may fix on its own. That does not make EthStorage adoptable, but it
does mean our chain choice is silently constraining our storage options.

**4. The posture argument may prefer L1.** Much of the legal directory rests on the chain being
neutral, permissionless infrastructure that nobody operates. An L2 has a sequencer, and Base's is
operated by an identifiable company with a compliance department. That is not obviously fatal —
we're a user of the chain either way — but "the chain is not an operator we can be asked to lean
on" is a cleaner sentence about L1 than about any L2, and several documents lean on it.

## The counter-argument, stated honestly

The original premise may simply still be right, and the volume asymmetry is the crux:

- The **money layer** is low-volume and high-value. Assurance contracts, note purchases, escrow
  claims — dollars per transaction are tolerable when the transaction moves hundreds of dollars.
  This is the part of the system that *could* afford L1, which is exactly the instinct
  [multi-chain.md](./multi-chain.md) already records ("a high-stakes assurance contract on Ethereum
  L1, smaller ones on an L2").
- The **speech layer** is high-volume and low-value. Supports, beliefs, implications, nudges — the
  headline claim is "a million people support this statement," each one a transaction worth
  approximately nothing individually. A million L1 transactions is not a rounding error, it is
  a non-starter at any plausible near-term L1 price.

So the intuition "censorship-resistant speech belongs on the most credibly neutral chain" collides
head-on with "speech is the high-volume half." **Any serious version of this analysis has to resolve
that tension, and it is the reason the answer is not obviously L1.** A hybrid — speech on an L2,
money on L1 — is coherent under the colocation rules below, and is roughly the inverse of what the
censorship-resistance framing would suggest.

## Which pieces actually need to be colocated

[multi-chain.md § Which contracts must co-locate](./multi-chain.md#which-contracts-must-co-locate)
has the detail. The three-way summary, which is the practical thing to keep in your head:

| Tier | Contracts | Constraint |
|---|---|---|
| **Must be atomic together** | `DelegatableNotes` ↔ `AssuranceContract` ↔ payment token | Same chain, same transaction **as currently written**. See [cross-chain-notes.md](./cross-chain-notes.md) — for *this* cluster the atomicity is an implementation property, not a business requirement. |
| **Must be atomic together (unexamined)** | `CreatorAssuranceContract` ↔ its factory ↔ `ContentRegistry` ↔ `ChannelRegistry` ↔ `ChannelEscrow` | Same chain, same transaction. cross-chain-notes.md does **not** cover this cluster: its argument rests on an assurance pledge being a latency-tolerant threshold commitment, which does not obviously transfer to channel claiming and escrow. Treat as a genuine constraint until someone examines it. |
| **Same chain by reference** | `AlignmentAttestations` (stores raw project addresses) | Addresses only mean something on their own chain. Movable only if it stored CAIP-10 identifiers instead. |
| **Chain-agnostic** | `Beliefs`, `Implications`, `NudgePublications`, `PublishedData`, `NoteIntent`, `MutableRefUpdater` | Reference content by hash/CID, emit events, make no cross-contract calls. These can live anywhere a `chainId` is attached. |

The seam falls almost exactly along **money vs. speech**, which is what makes the hybrid option
live. Two things determine how real that seam is, and both should be checked before anyone leans on
it:

- **Does anything in the money layer reference a statement by address rather than by hash?**
  Hash-referenced links cross chains fine; address-referenced ones do not. `AlignmentAttestations`
  is the known offender and it sits on the boundary.
- **Cross-chain aggregation is the hidden cost.** A split deployment means the read layer must
  assemble one view from two chains. multi-chain.md already flags this and explicitly declines to
  build it, and [scalability.md](./scalability.md) notes statement browsing will eventually need
  server-side derived state regardless.

The good news: the cheap optionality changes in multi-chain.md § "Cheap changes worth making now"
are all **already done** (chainId on events, CAIP-10 URLs, chain-keyed addresses, map-shaped Ponder
config). So the plumbing does not currently forbid any of this — which is precisely why the
question can sit here unresolved without accruing cost.

## What would have to happen to settle it

Not scheduled, and deliberately so — this is not urgent while pre-testnet and single-chain.
Whenever it is picked up:

1. **Put a number on the premise.** Cost per support/belief/publication at current L1 and Base
   prices, at realistic MVP volume and at aspirational volume. The original claim was never
   quantified; it should not be re-adopted or discarded on vibes either.
2. **Sanity-check the trajectory claim.** Lean Ethereum and blob-pricing expectations are the
   reason to revisit at all, so state what would need to be true by when, and treat forecasts as
   forecasts.
3. **Price the hybrid explicitly**, including the cross-chain aggregation work it forces on the
   read layer, and check the address-vs-hash reference question above. If cross-chain delegated-note
   spending is part of that hybrid, verify that every candidate chain is a CCTP domain—not merely a
   chain where USDC exists—because the recommended transport direction in
   [cross-chain-notes.md](./cross-chain-notes.md) depends on native CCTP support.
4. **Re-run the EthStorage A1 check** against whatever chain wins, since it is chain-dependent.

If it ever does get settled, it deserves a file in [decisions/](../decisions/), not an edit to this
one.
