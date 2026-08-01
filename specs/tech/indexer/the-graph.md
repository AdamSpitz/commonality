# Moving the read layer to The Graph

Status: **proposed, not adopted** (Jul 2026). Written from a conversation. **Updated 2026-07-31**
after a pass against the [legal directory](/specs/product/legal/README.md); the sections on
`refuse-serve`, the objections, and the spike order were substantially rewritten as a result. A
subsequent review clarified that merely omitting content from the subgraph does not stop graph-node
from ingesting the content-bearing log, so a **pointer-only contract event** is now the proposed
precondition. Calldata and EthStorage are competing retrieval candidates for the bytes. Still not
reviewed by anyone but its authors, and nothing here is decided.

This asks a narrow question: **would replacing the Ponder event cache with a subgraph on The
Graph help?**

## The intended shape, in one minute

1. A user creates a document, computes its content-addressed ID (ideally an IPFS-compatible CID),
   and uploads the bytes directly to a long-term store such as EthStorage. We neither proxy nor pay
   for that upload.
2. Commonality contracts and events contain only the CID and ordinary protocol facts — who
   published or referenced it, supports, relationships, retractions, block/transaction location —
   never the document bytes.
3. One generic shared index covers those pointer-only facts. It could remain one
   Commonality-operated Ponder service or become one Commonality-authored subgraph run by The
   Graph's independent indexers. A cause founder normally needs only a static UI and its
   scope/policy config either way; founder-specific indexes remain an optional independence path,
   not the default.
4. A browser asks the subgraph *what exists*, fetches each CID's bytes directly from EthStorage,
   IPFS or another mirror, verifies them against the CID, then applies the vertical's retraction,
   display and aggregation policy locally.

In short: **storage does byte availability; the chain authenticates references; a shared index does
metadata discovery; the browser verifies, scopes and renders.** This division is the important
architectural change: it removes Commonality and cause founders from the content-hosting path and
keeps user content out of the index altogether. Switching that one shared metadata index from
Ponder to The Graph is a separate, secondary decision about whether eliminating Commonality's last
read service is worth The Graph's dependencies and loss of control.

This document sits alongside the two existing topology documents rather than replacing either:

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

## What switching the shared index would actually buy

The relevant comparison is **one shared, pointer-only Ponder service operated by Commonality versus
one shared, pointer-only subgraph authored by Commonality and executed by The Graph**. It is not
one Ponder deployment per cause founder versus The Graph. Per-vertical scope already belongs in
static client configuration under the shared-feed topology, so a cause founder needs no indexer
server in either case.

Most of the legal and data-handling improvement comes from the preceding storage/pointer redesign:
the user uploads directly, the event and index contain only a CID, and the browser retrieves and
verifies bytes. Retaining Ponder after that change would still leave Commonality operating one
Postgres-backed metadata service, but not a user-content host.

The Graph's incremental operational benefit is therefore narrower: Commonality stops running that
last shared metadata index — its host, database, backfills, monitoring, API and bill. In return we
accept Graph publication/API/GRT dependencies and a read service whose operators can decline or
fail without process. The decision should turn on whether shedding this one relatively boring
service is worth that trade, not on a claim that every founder otherwise needs a server.

[multiple-providers.md](/specs/product/legal/multiple-providers.md) ranks the indexer **#4** for real
multiplicity and names The Graph as "the structural fix," while saying plainly that this is
"operator-posture credibility, not risk reduction" and that "the indexing itself is not where risk
lives." That remains the right weighting: the legal upside is real but modest and should not be
oversold.

### The neutrality claim

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
rather than a service. A vertical's scope therefore lives in its own bundle/config applied
client-side, where folding already runs, under either shared Ponder or The Graph. The Graph changes
the shared index's operator; it does not create this static-vertical property.

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
hide the reasoning — it is that the legitimate independent driver is shedding the remaining
shared-index infrastructure, not evading notices and not saving each founder from a server. The
comparison above states that narrower operational rationale explicitly.

**3. "Structurally neutral" is partly false, and its failure mode is worse than what it replaces.**

Graph indexers choose which subgraphs to allocate to, and gateway operators choose what they
route. The ability to refuse does not disappear; it **moves to parties we do not control, cannot
appeal to, and cannot get process from.** That converts "we can be ordered to remove something,
with notice" into "a third party can drop our entire read layer without explanation" — a
dependency risk wearing a neutrality costume, and one shared failure can darken every vertical.

Note this also sharpens the third objection in the earlier draft (whether nobody-we-can-name's
exposure is a clean resolution or an evasion). It is neither, exactly: the exposure does not
vanish, it becomes *somebody unaccountable-to-us's* exposure, and they will act on it on their own
schedule.

## The precondition: a pointer-only event, with content outside the event

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

### Candidate retrieval layer: EthStorage

Calldata is not the only way to preserve the pointer-only boundary. EthStorage may be a better
byte-retrieval layer, especially if documents grow or old transaction input proves unreliable
through ordinary browser RPCs. Its stated purpose is long-term storage: blob data enters through
Ethereum DA, storage providers retain replicas and continuously prove storage, and users pay in
ETH using familiar Ethereum wallets and tooling. Unlike Celestia, EigenDA and ordinary EIP-4844
blobs, it is not merely a temporary DA layer. That Ethereum integration is its main attraction over
Arweave, Filecoin and similar alternatives.

The shape would be:

1. the client canonicalizes the content and computes `dataId = sha256(content)` (or the existing
   CID-equivalent digest);
2. the user uploads it to EthStorage under a content-derived key;
3. the client retrieves and verifies it;
4. the user calls `publishData(dataId)` and the contract emits the pointer-only event;
5. The Graph discovers the publication; readers fetch the bytes from EthStorage and accept them
   only when their hash equals `dataId`.

The raw EthStorage primitive is **not immutable**. It is a CRUD key-value store and `putBlob`
explicitly overwrites an existing key. Content addressing supplies the property we actually need:
an overwrite with different bytes fails hash verification and therefore cannot change what an
onchain `dataId` means. A small application contract could additionally enforce write-once keys,
but integrity must never depend on that rule. Deletion or provider failure remains an availability
failure — content addressing prevents undetectable substitution, not disappearance.

Technically, the EthStorage uploader need not be the Commonality publisher. Anyone may make bytes
matching `dataId` available; the Commonality transaction is the signed act that adopts and
publishes those exact bytes. Pre-uploading the same bytes neither impersonates the publisher nor
changes the publication. For the operator-posture argument, however, **we must not become the
upload proxy, payer or default fallback host**: the clean fact remains that the user arranges
storage and signs the pointer while our software verifies the binding.

This would directly address both weaknesses of calldata retrieval:

- old transaction input is an incidental archive-RPC service, whereas long-term retrieval is the
  storage network's explicit job; EIP-4444-style history expiry and L2 history retention make that
  distinction material;
- keyed retrieval avoids decoding direct calls, UserOperations and nested multicalls and avoids
  associating several logs with several embedded publications in one transaction.

It also makes larger documents and attachments practical. The primitive stores blob-sized values
(up to 131,072 bytes) and its SDK chunks files, rather than charging permanent calldata prices for
every byte.

The trade is a new, young, load-bearing network and endpoint dependency. Before choosing it, a
spike must establish:

- what overwrite and delete authorization actually is, and whether deletion ends providers'
  retention obligation;
- whether payment is genuinely pay-once, what duration is promised, and how provider incentives
  remain funded;
- whether arbitrary independent `es-node` endpoints can retrieve old values, rather than the
  documented project RPC being a practical chokepoint;
- production/mainnet maturity, Base compatibility or cross-chain publication mechanics, browser
  wallet support, fees, maximum/chunked object behavior, and time-to-readable after upload;
- behavior when upload succeeds but the pointer transaction fails (harmless orphan) or vice versa
  (the UI must not publish until a verified read succeeds), plus mirroring/re-upload recovery.

EthStorage therefore deserves treatment as a serious alternative for the byte half of this design,
not only as a distant escape hatch for huge files. It does **not** replace The Graph's discovery
role, provide erasure, or remove the privacy analysis: it deliberately causes decentralized storage
providers to replicate the bytes. The relevant posture is that the user initiates that publication,
not that no third party processes it.

### Other candidates

No obvious alternative has the same combination of Ethereum tooling, ETH payment and explicit
long-term retention:

- **Arweave** has mature pay-once, immutable/content-addressed storage semantics and is the strongest
  functional comparison. Its disadvantages here are a separate network, wallet/token and upload
  stack. A user-paid direct upload is worth benchmarking if EthStorage maturity is inadequate; a
  Commonality-operated uploader would recreate the role this design is trying to shed.
- **IPFS plus Filecoin, Storacha or another persistence provider** is widely supported and CID-native,
  but IPFS alone promises no persistence. Deals, subscriptions or delegated uploads generally leave
  an ongoing payer/provider/account, which weakens both the low-infrastructure vertical story and
  the pay-once posture.
  It remains useful as a non-authoritative mirror because `dataId` makes any source verifiable.
- **Swarm** is Ethereum-adjacent and content-addressed, but postage batches expire unless funded or
  topped up. That ongoing maintenance is the same structural problem as pinning or expiring storage
  deals.
- **Celestia, EigenDA, Avail and raw EIP-4844 blobs** are DA systems with bounded retention, not
  permanent application stores. They only solve this problem when paired with a long-term layer —
  which is exactly the role EthStorage claims.
- Newer storage chains and programmable-data networks may be cheaper, but add their own token,
  wallet/bridge and maturity assumptions. They should beat EthStorage or Arweave on measured
  durability and user flow before entering the load-bearing path.

The design should keep retrieval source-agnostic: `dataId` can be tried against EthStorage, IPFS,
Arweave, calldata or local caches, with hash verification at every source. This permits mirrors and
migration without changing publication identity, although at least one source still needs a credible
long-term availability commitment.

**The fallback if retrieval fails:** a stateless Worker that proxies RPC and enforces `refuse-serve`
from the policy bundle. No Postgres, no backfill, no sync — Tier 1 in shared-feed-topology's
terms, deploying a config object rather than a database-backed indexer, and it keeps the enforcement
lever. It would reintroduce a Commonality- or vertical-operated byte service, so it is a fallback
rather than the intended boundary. Worth designing only if the storage/retrieval spikes say we need
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
- **A byte-retrieval path behind the same seam.** Under the pointer-only event design the SDK
  reader gains a second concern: subgraph for discovery and one or more content-addressed byte
  sources, with hash verification and a client-side cache keyed by `dataId`. Calldata requires
  `eth_getTransactionByHash`, selector-aware nested-call decoding and log association; EthStorage
  requires keyed retrieval, endpoint selection and availability handling. This is the one genuinely
  new piece of the migration.

## Costs and open questions

- **Byte-retrieval durability, latency and fanout** — the blocking questions now, replacing
  `refuse-serve`. The existing calldata spike measures only present-day latency, not whether old
  transactions remain available from normal RPCs. EthStorage trades that archive assumption for a
  younger storage network whose retention and endpoint claims need their own spike.
- **An RPC key may be another shared or per-vertical account.** Calldata retrieval moves byte
  delivery onto an RPC provider, and browser-side RPC at any volume usually means a keyed endpoint.
  Whether Commonality supplies a shared endpoint or each vertical configures one is a separate
  operator/dependency choice; this is not evidence that a founder otherwise needs an indexer server.
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
- **Not literally no service account.** Querying the decentralized network needs an API key (free
  tier, ~100k queries/month). It can be shared or supplied per vertical. If Commonality proxies it,
  we reintroduce a service in the read path and lose much of The Graph's incremental operator
  benefit, though the pointer-only content boundary remains intact.
- **GRT for publishing/curation.** A platform action performed once, not per founder, but it is
  a crypto-economic dependency on a third party.
- **Source onboarding does not go away.** Objection 8 in shared-feed-topology applies unchanged:
  a subgraph watches configured contracts and factories, so somebody still adds new operator
  factories as verticals appear.
- **Verifier surface.** Checks such as `onchain-to-indexer` are written against the REST shape.
- **Indexing latency and third-party uptime** become someone else's operational quality, which is
  the point and also the risk.

## Retrieval and development spikes

**Spike 1 — does calldata retrieval work and perform?**

> For the surfaces that actually render statements — a `/portal/${statementCid}` board, statement
> detail, nudge cards, implication-neighbour lists — measure the wall-clock cost and request fanout
> of fetching `PublishedData` content by `eth_getTransactionByHash` and decoding calldata instead
> of reading it from the indexer, against Base Sepolia, with a warm and a cold client cache. Cover
> every supported publishing route, including direct calls, smart accounts/UserOperations and
> batches; prove the correct nested call can be associated with each log and verify the recovered
> content against `dataId`. Test realistic cold pages rather than only individual RPC latency.

The currently deployed contract still puts the content in both calldata and the event, so this
retrieval experiment can run before changing the contract; it must deliberately use calldata.
This was the cheapest retrieval candidate to test because it needs no Graph or storage-network
infrastructure. It no longer settles the precondition by itself: EthStorage may replace calldata as
the canonical byte layer. If calldata retrieval is too slow, historically unreliable or too fragile
through wrapped calls, the answer is not "put the bytes back in the subgraph"; it is EthStorage,
the stateless-Worker fallback, or retaining the current architecture.

**Partial result (2026-07-31):** the mechanism worked for all three publications currently on Base
Sepolia, with three concurrent cold lookups taking roughly 0.2–0.3 seconds and warm in-memory
recovery under 2 ms. But all three are tiny verifier smoke-test documents sent by direct EOA calls;
there are no real pages, smart-account publications or batches to measure. The spike is therefore
encouraging but inconclusive. Reproduction and full limitations are in
[`spikes/the-graph-calldata/README.md`](/spikes/the-graph-calldata/README.md). A representative
fixture through every supported publication route is still required before the calldata candidate
is settled.

**Spike 1b — is EthStorage a credible long-term byte layer?**

> Using a user-paid browser flow, upload representative small and multi-chunk documents under
> content-derived keys, retrieve and hash-verify them through more than one independent endpoint,
> and measure cost, upload-to-readable delay and cold-page fanout. Attempt overwrite and deletion;
> document exactly who can perform each operation and what happens to provider retention. Confirm
> the production network, Base/cross-chain story, ETH-only claim and pay-once retention commitment
> from protocol behavior and current terms, not only overview copy.

Compare the resulting user flow and durability assumptions with one direct, user-paid Arweave
upload. This spike can replace the unresolved nested-calldata work if EthStorage wins; it should not
be bolted on as a mandatory second canonical store.

**Spike 2 — does the dev loop survive?**

> Stand up `graph-node` in Docker against the local chain, index one contract's events, and
> confirm the dev loop is tolerable — specifically whether hardhat works or the local stack has
> to move to anvil, and how bad re-deploy/manifest churn feels in practice.

Everything else on this page is a judgement call that no spike will settle.

## What would have to be true to adopt this

1. **The contract emits pointers only** — content-bearing bytes stay out of the event subscribed to
   by the subgraph, with a credible content-addressed retrieval path: reliable calldata retrieval
   (spike 1), user-paid long-term storage such as EthStorage (spike 1b), or the stateless-Worker
   fallback carrying the bytes.
2. The dev loop survives spike 2.
3. We accept a third-party dependency in the read path — including that indexers and gateway
   operators may decline to carry us, without process — in exchange for Commonality no longer
   operating the one shared metadata service, and for the read layer being structurally rather than
   rhetorically neutral.

Absent (1), this is not adoptable regardless of how cheap the migration looks: emitting content
into an event and then authoring a manifest that asks unwitting third-party indexers to ingest that
event is a worse posture than the one we have, not a better one.
