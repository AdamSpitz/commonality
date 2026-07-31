# Moving the read layer to The Graph

Status: **proposed, not adopted** (Jul 2026). Written from a conversation. **Updated 2026-07-31**
after a pass against the [legal directory](/specs/product/legal/README.md); the sections on
`refuse-serve`, the objections, and the spike order were substantially rewritten as a result. A
subsequent review clarified that merely omitting content from the subgraph does not stop graph-node
from ingesting the content-bearing log, so a **calldata-only contract event** is now the proposed
precondition. Still not reviewed by anyone but its authors, and nothing here is decided.

This asks a narrow question: **would replacing the Ponder event cache with a subgraph on The
Graph help?** It sits alongside the two existing topology documents rather than replacing
either:

- [operator-scoped-deployments.md](./operator-scoped-deployments.md) — each operator deploys
  its own scoped read model.
- [shared-feed-topology.md](./shared-feed-topology.md) — unreviewed counter-proposal: one
  shared feed, per-operator scope as a config artifact.

The Graph is best understood as **a third variant of the shared feed**, in which the shared
feed's operator is neither Commonality nor the vertical founder. That single change is what
makes it interesting, and it is also where the hard objection lives.

## Why the migration would be unusually cheap

The indexer is a [deliberately dumb event cache](./README.md): one `events` table of raw
ABI-encoded events, no aggregation, no business logic, with all entity-state computation done
client-side in SDK fold functions.

The usual blocker for a Graph migration — rewriting business logic in AssemblyScript and losing
TypeScript/SDK reuse — therefore mostly does not apply. A mapping would say "store this raw
event." The `GET /api/events` filter shape (contract address, event name, topics, block range)
maps onto GraphQL entities with indexed fields nearly mechanically, and the folding stays exactly
where it already is.

Client-Side Folding, adopted for maintenance reasons, turns out to be the thing that makes the
read layer portable at all.

## What it would actually buy

### First, and primarily: the founder stops needing a server

This is the driving rationale, and it is worth stating before the neutrality argument for two
reasons — it is the reason the idea exists at all (it came out of the founder-infrastructure
question, not out of a legal problem), and because leading with the legal benefit would misstate
the motive in a document that outlives the conversation.

Standing up a vertical currently means a Ponder deployment, a Postgres, a host, and a monthly
bill — all due *at launch*, before the founder knows whether the vertical works. The indexer is
the load-bearing dependency; remove it and the entire vertical is a static content-addressed
build on infrastructure he already has. See
[what-a-founder-needs.md § 3.3](/docs/founder/what-a-founder-needs.md#33-open-question-how-much-of-this-should-we-absorb).

**This benefit is independent of every legal argument below, and it is the one the decision
should turn on.** [multiple-providers.md](/specs/product/legal/multiple-providers.md) already
ranks the indexer **#4** for real multiplicity and already names The Graph as "the structural
fix" — while saying plainly that this is "operator-posture credibility, not risk reduction" and
that "the indexing itself is not where risk lives." So the legal upside here is real but modest,
and already-endorsed; it is not news, and it should not be oversold.

### Second: the neutrality claim

[shared-feed-topology.md](./shared-feed-topology.md) identifies the real problem precisely — it
is not the middleman but the claim:

> "censorship-resistant protocol" + "one Commonality-operated universal feed" + "we honor
> takedowns" do not fit together.

That document resolves the incoherence by making the shared feed a *disclosed, partisan lens*.
The Graph resolves it differently: by **removing us as the operator of the shared feed**. The
neutral layer stops being something we assert about ourselves and becomes a structural fact,
like the chain. Nobody sends us a notice about a subgraph we do not operate.

That is the same organizational risk reduction shared-feed-topology attributes to
operator-scoping ("Commonality operates less"), taken further: Commonality operates *nothing* in
the read path.

### Knock-on: operator scoping becomes config, not infrastructure

Both sibling documents converge on the view that per-operator *admission* is "a `WHERE` clause"
rather than a service. The Graph is consistent with that, and pushes it further — with no
Commonality-operated origin in the picture, a vertical's scope necessarily lives in its own
bundle/config applied client-side, where folding already runs. Combined with the founder argument
above, that is what turns a vertical into a static build.

## The legal analysis: what is and is not a problem

An earlier version of this document treated "`refuse-serve` disappears" as the blocking objection.
**That framing was wrong**, and correcting it is most of what the 2026-07-31 pass changed. Losing
a capability over a service you no longer operate is not the problem. *Instructing third parties
to host content is.*

### Why losing `refuse-serve` is not, by itself, the objection

[statement-hosting.md § Role vs. capability](/specs/product/legal/statement-hosting.md#role-vs-capability-why-we-built-it-so-we-cant-comply-cuts-both-ways)
already settles the general question:

> duties attach to roles, not capabilities … An operated service can't shed the duty by deleting
> the capability … The escape hatch is shedding the role, not the capability.

Engineered incapacity is culpable when you *keep the role* — the operator who booby-trapped their
own controls. It is fine when you *vacate* the role, because there is no lever you are failing to
pull and no ongoing act for a duty to attach to (*Van Loon*; contrast the ancillary services Storm
kept running). Vacating a role is a move this repo already endorses twice: the on-ramp ("zero
providers are us", [multiple-providers.md](/specs/product/legal/multiple-providers.md)) and
[sponsored-gas.md](/specs/tech/sponsored-gas.md) Decision 3.

Two further reasons the loss is smaller than it looks:

- **The levers that carry the actual harm survive untouched.** `policy-lists` puts
  `suppress-display` and `exclude-aggregation` in the browser and calls that "genuinely the right
  place." [statement-hosting.md](/specs/product/legal/statement-hosting.md) makes the matching
  point that takedown demands are really about *findability* — rendering, aggregation, discovery.
  All of that still works. `refuse-serve` is one action over one field of one request.
- **Nothing about money is affected.** policy-lists v1 guarantees no policy list can touch anyone's
  money; `refuse-serve` is content-only. The blast radius of losing it is bounded to content
  serving.

### The three objections that are real

**1. Publishing a subgraph is authoring processing instructions that others execute.**

A subgraph manifest is not a passive artifact — it is an instruction set *we write* telling
third-party indexers what to store. Choosing that a mapping persists `event.params.content` is a
selection, and it fails the test [ui-operator-posture.md](/specs/product/ui-operator-posture.md)
already draws: does this involve *selection*, or is it just relaying bytes?

Worse in the privacy frame.
[statement-hosting.md](/specs/product/legal/statement-hosting.md) notes the EDPB's 2025 draft
blockchain guidelines locate controllership in whoever *designs the processing*, and that
statements of belief are Article 9 special-category data tied to a persistent identifier.
Authoring a manifest that instructs a decentralized network to replicate that data across
operators who never consented is designing processing others perform — plausibly a *worse*
posture than today, not better. That would be trading a modest hosted-speech improvement for a
novel privacy exposure, which is a bad trade.

**2. Intent coloring, and there is a paper trail.**

[statement-hosting.md](/specs/product/legal/statement-hosting.md): "immutability as a
from-the-start design value … reads as good faith; the same immutability adopted in response to
legal pressure looks like structuring." A specs directory that says "move the read layer so nobody
can send us a notice" is exactly that evidence, and it is discoverable. The mitigation is not to
hide the reasoning — it is that the *actual* driver is the founder-infrastructure problem, which
is genuine and independent, and the document should say so first. That is why the "what it would
actually buy" section above was reordered.

**3. "Structurally neutral" is partly false, and its failure mode is worse than what it replaces.**

Graph indexers choose which subgraphs to allocate to, and gateway operators choose what they
route. The ability to refuse does not disappear; it **moves to parties we do not control, cannot
appeal to, and cannot get process from.** That converts "we can be ordered to remove something,
with notice" into "a third party can drop our entire read layer without explanation" — a
dependency risk wearing a neutrality costume, and the cost lands on the founder whose vertical
goes dark.

Note this also sharpens the third objection in the earlier draft (whether nobody-we-can-name's
exposure is a clean resolution or an evasion). It is neither, exactly: the exposure does not
vanish, it becomes *somebody unaccountable-to-us's* exposure, and they will act on it on their own
schedule.

## The precondition: a pointer-only event, with content in calldata

**Content-bearing `PublishedData` bytes must stay out of the event the subgraph subscribes to.**
Merely declining to persist the `content` field in a Graph entity is not enough: graph-node must
still receive and decode the complete content-bearing log before the mapping can discard that
field, and may retain raw chain data internally. That materially reduces query exposure, but it
does not cleanly answer the objection that our manifest instructs third parties to process the
content.

There are no production users or backward-compatibility constraints yet, so change the contract
instead. The current event duplicates the bytes already present in the `publishData(bytes)`
transaction calldata:

```solidity
event DataPublished(address indexed publisher, bytes32 indexed dataId, bytes content);
```

The proposed event is:

```solidity
event DataPublished(address indexed publisher, bytes32 indexed dataId);
```

`publishData(bytes)` continues to accept the complete content, derives `dataId = sha256(content)`,
records the publication bit, and emits the pointer. The existing benchmark contract
`hardhat/contracts/test/PublishedDataCalldataOnly.sol` already demonstrates exactly this shape.
The bytes remain permanently in Ethereum transaction calldata, so this is **not a return to IPFS**
and requires no separately operated content store.

Proposed split:

- **The subgraph indexes the pointer only** — `(publisher, dataId, blockNumber, txHash,
  logIndex)`, plus the non-PublishedData events, which are already just addresses, CIDs and
  numbers. Precisely the material
  [shared-feed-topology.md](./shared-feed-topology.md) characterises as low-risk.
- **The chain is the retrieval path for bytes.** Once a client knows the transaction hash, it calls
  `eth_getTransactionByHash`, decodes the `publishData(bytes)` input, and verifies that
  `sha256(content) == dataId`. A receipt or `eth_getLogs` is not sufficient after this contract
  change: receipts contain logs, not transaction input.

The key observation is that **the indexer exists to solve full-history *topic sweeps*, not
targeted lookups.** Browsers cannot sweep history from a public RPC (range limits, rate limits,
CORS, no key). They can fetch one known transaction. So the subgraph does discovery and the RPC
does retrieval, and each is doing the thing it is good at.

There is one important complication to prove rather than assume: a direct EOA call has
`publishData(bytes)` as the top-level transaction input, but a smart-account/UserOperation or
multicall may wrap it inside one or more batch calls. Retrieval must work for every supported
publication path and must unambiguously associate a `DataPublished` log with the corresponding
nested call if a transaction contains multiple publications. If that cannot be made simple and
reliable, the calldata-only design is not ready.

What this buys:

- `refuse-serve` becomes **unnecessary rather than unavailable** — no surface in our stack serves
  content bytes, so there is nothing to refuse.
- The escaping-bytes problem *evaporates instead of needing analysis*. shared-feed-topology's
  review names this as its biggest technical issue: a Worker blocking `/api/published-data/:cid`
  can still leak the same bytes through `/api/events`, `/sql/*`, or GraphQL. With a pointer-only
  event there is no shared-read-layer route that carries them, so no route-level data-flow
  analysis is required.
- The subscribed event never contains the content, so the manifest does not instruct Graph
  indexers to process or persist the Article 9-bearing bytes. RPC providers still serve the
  underlying public transaction as part of the chain, independently of our subgraph instructions.
- A boring pointer subgraph is a far less attractive thing for an indexer or gateway to drop,
  which softens objection 3.

**The fallback if latency fails:** a stateless Worker that proxies RPC and enforces `refuse-serve`
from the policy bundle. No Postgres, no backfill, no sync — Tier 1 in shared-feed-topology's
terms, deploying a config object rather than a service. Still a large reduction from Ponder for a
founder, and it keeps the enforcement lever. Worth designing only if the spike below says we need
it.

**Machine sweepers are unaffected either way.** The implication-attester, explorer-curator and
bridge-creator do sweep the whole space, but they are servers and can hold their own archive
access; they were never the constraint that created the indexer.

## Migration shape

- **One subgraph definition, two deployment targets** — self-hosted `graph-node` (with Postgres
  and IPFS, via Docker) against the local hardhat/anvil chain in dev; the decentralized network
  in production. Structurally the same arrangement as Ponder-local vs. Ponder-on-Render today.
  An earlier version of this argument claimed local development would force keeping Ponder in
  parallel; that was wrong, and the correction is most of why this document exists.
- **SDK read seam** moves from REST to GraphQL. One-time, and a reader/store seam already exists
  to change behind (see [eliminating-ipfs.md](/specs/tech/eliminating-ipfs.md)).
- **Keeping Ponder is optional insurance, not a requirement.** Fold functions do not care where
  raw events came from, so reverting is a seam change rather than a rewrite.
- **A byte-retrieval path behind the same seam.** Under the calldata-only event design the SDK
  reader gains a second source: subgraph for discovery, `eth_getTransactionByHash` for
  `PublishedData` content, selector-aware calldata decoding and hash verification, with a
  client-side cache keyed by `dataId`. Wrapped smart-account and batch calls are part of this
  design, not an edge case. This is the one genuinely new piece of the migration.

## Costs and open questions

- **Byte-retrieval latency** — the blocking question now, replacing `refuse-serve`. See the spike
  below.
- **An RPC key is probably a second account.** Calldata retrieval moves byte delivery onto an RPC
  provider, and browser-side RPC at any volume usually means a keyed endpoint. This is an honest
  dent in the founder story: the ambition in
  [what-a-founder-needs.md § 3.3](/docs/founder/what-a-founder-needs.md#33-open-question-how-much-of-this-should-we-absorb)
  of getting the launch list down to one GitHub account probably does not survive intact. Still far
  better than a server and a monthly bill, but it should not be claimed as zero.
- **Third-party discretion is not neutrality.** Indexers choose allocations; gateway operators
  choose routing. We would have no process and no appeal if either declines. See objection 3.
- **Local dev gets heavier.** Three containers instead of one process, and a slower dev-loop.
  The repo already runs docker-compose with IPFS, so the marginal cost is modest.
- **Hardhat friction.** `graph-node` polls blocks and expects normal reorg semantics; local
  chains with instant mining have known rough edges, and anvil is believed to be the
  better-supported target. **Unverified — this is the spike below.**
- **Manifest regeneration.** `subgraph.yaml` hardcodes addresses and start blocks while local
  contracts redeploy constantly. Templating it is standard practice, and Ponder has the same
  problem today via env vars.
- **Matchstick** (`graph test`, AssemblyScript) replaces the current TS tests for mapping
  coverage. Small, given how trivial the mappings are.
- **Not literally zero accounts.** Querying the decentralized network needs an API key (free
  tier, ~100k queries/month). Better than running a server — but if we proxy it to spare a
  founder the signup, we are the operator again and the entire benefit is forfeit.
- **GRT for publishing/curation.** A platform action performed once, not per founder, but it is
  a crypto-economic dependency on a third party.
- **Source onboarding does not go away.** Objection 8 in shared-feed-topology applies unchanged:
  a subgraph watches configured contracts and factories, so somebody still adds new operator
  factories as verticals appear.
- **Verifier surface.** Checks such as `onchain-to-indexer` are written against the REST shape.
- **Indexing latency and third-party uptime** become someone else's operational quality, which is
  the point and also the risk.

## The two spikes, in this order

**Spike 1 — does calldata retrieval work and perform? (do this first)**

> For the surfaces that actually render statements — a `/portal/${statementCid}` board, statement
> detail, nudge cards, implication-neighbour lists — measure the wall-clock cost and request fanout
> of fetching `PublishedData` content by `eth_getTransactionByHash` and decoding calldata instead
> of reading it from the indexer, against Base Sepolia, with a warm and a cold client cache. Cover
> every supported publishing route, including direct calls, smart accounts/UserOperations and
> batches; prove the correct nested call can be associated with each log and verify the recovered
> content against `dataId`. Test realistic cold pages rather than only individual RPC latency.

The currently deployed contract still puts the content in both calldata and the event, so this
retrieval experiment can run before changing the contract; it must deliberately use calldata.
This goes first because **it settles the precondition, and nothing else matters if it fails.** It
also needs no Graph infrastructure at all, which makes it much cheaper than spike 2. If retrieval
is too slow or wrapped-call recovery is too fragile, the answer is not "put the bytes back in the
subgraph"; it is the stateless-Worker fallback or retaining the current architecture, and the
migration's founder story gets correspondingly weaker.

**Spike 2 — does the dev loop survive?**

> Stand up `graph-node` in Docker against the local chain, index one contract's events, and
> confirm the dev loop is tolerable — specifically whether hardhat works or the local stack has
> to move to anvil, and how bad re-deploy/manifest churn feels in practice.

Everything else on this page is a judgement call that no spike will settle.

## What would have to be true to adopt this

1. **The contract emits pointers only** — content-bearing bytes remain in transaction calldata but
   stay out of the event subscribed to by the subgraph, with reliable calldata retrieval (spike 1)
   or the stateless-Worker fallback carrying the bytes.
2. The dev loop survives spike 2.
3. We accept a third-party dependency in the read path — including that indexers and gateway
   operators may decline to carry us, without process — in exchange for the founder needing no
   server, and for the read layer being structurally rather than rhetorically neutral.

Absent (1), this is not adoptable regardless of how cheap the migration looks: emitting content
into an event and then authoring a manifest that asks unwitting third-party indexers to ingest that
event is a worse posture than the one we have, not a better one.
