# Indexer performance (in theory)

I want a better understanding of indexer performance characteristics. (In theory only - this isn't deployed yet, I just want an analysis of big-O characteristics, concurrency, composability, etc.)

(Partly my motivation is: what if I screw it up, or want to switch to The Graph, or whatever?)

What would happen if we ran the system for a while, then had to blow away the indexer?

What are the different "entities" being indexed, and how big are we expecting them each to be? What would happen if we treated each entity as a separate thing responsible for its own indexing; does the rest of the system continue functioning properly?

If we do decouple the indexing work, which aspects then have trust assumptions? (e.g. Adding up the funding for a cause requires adding up the funding for each project, so it would depend on the project's indexing being honest.) Can those be mitigated by using cryptography?

---

## Entity inventory

The system has 5 logical indexer subsystems. Here's every indexed entity, with expected cardinality.

### Concept Space

| Entity | Key | Expected count | Growth pattern |
|--------|-----|----------------|----------------|
| **statements** | IPFS CIDv1 | Moderate (thousands?) | Grows as users create new statements |
| **beliefs** | (user, statementId) | users × statements they care about | Sparse — most users only engage with a few statements |
| **implications** | (attester, from, to) | Small per attester | Grows with attester activity, but attesters are few |
| **users** | address | Number of participants | Bounded by actual users |
| **attesters** | address | Very small | Only people who choose to be implication attesters |

Each entity is small and independent. No entity grows unboundedly relative to another.

### LazyGiving

| Entity | Key | Expected count | Growth pattern |
|--------|-----|----------------|----------------|
| **projects** | contract address | Moderate | One per crowdfunding campaign |
| **projectTokens** | (project, erc1155, tokenId) | Small per project | Typically a handful of token types per project |
| **contributions** | tx-based | contributors × projects | Main growth driver |
| **refunds** | tx-based | Subset of contributions | Only on failed campaigns |
| **saleListings** | (market, listingId) | Proportional to secondary market activity | Could be large for popular projects |
| **buyOrders** | (market, orderId) | Same as above | |
| **trades** | tx-based | Subset of listings×orders | |
| **participantSummaries** | (participant, project) | contributors × projects | Aggregate, updated on each contribution |
| **tokenBurns** | tx-based | Subset of contributions | Only donors who burn tokens |

Each project is a natural partition boundary. A project with 1000 contributors produces ~1000 contribution records and ~1000 participantSummary records. Most projects are expected to be small.

### Delegation

| Entity | Key | Expected count | Growth pattern |
|--------|-----|----------------|----------------|
| **delegatableNotes** | noteId | Moderate | One per deposit + one per delegation hop |
| **delegationChains** | (noteId, position) | notes × chain depth | MAX_DELEGATION_DEPTH = 200, but typical depth is low (2-5) |
| **noteEvents** | (txHash, logIndex) | All note lifecycle events | Audit trail; grows with activity |
| **noteIntentAttestations** | (attester, noteContract, noteId) | Small | Only when someone attests intent |

Notes are naturally independent. Each delegation tree is its own unit.

### Funding Portal

| Entity | Key | Expected count | Growth pattern |
|--------|-----|----------------|----------------|
| **alignmentAttestations** | (attester, subject, statement) | attesters × projects × statements | Sparse in practice |

This subsystem is thin on its own. Its complexity comes from cross-subsystem aggregation — the SDK queries events from multiple contracts and folds them to build cross-cutting views.

### Mutable Refs (utility)

| Entity | Key | Expected count | Growth pattern |
|--------|-----|----------------|----------------|
| **mutableRefs** | (owner, name) | Small | Named pointers to IPFS content |
| **refUpdates** | tx-based | Small | History of updates |

Negligible scale.

---

## Big-O characteristics

### Event handler complexity

Every event handler is **O(1)** — a single upsert or insert. The only exception:

- **NoteDelegated**: Reconstructs the delegation chain by inserting one `delegationChains` row per position. This is **O(d)** where d = delegation depth. But d ≤ 200 (hard contract limit), and in practice d is expected to be 2-5.

No event handler does graph traversal, aggregation across unbounded sets, or anything superlinear.

### Query complexity

| Query | Complexity | Notes |
|-------|-----------|-------|
| Get statement / belief / project / note | **O(1)** | Direct primary key lookup |
| Get beliefs for statement S | **O(b)** | b = number of believers of S; indexed |
| Get contributions for project P | **O(c)** | c = number of contributors to P; indexed |
| Get delegation chain for note N | **O(d)** | d = chain depth; indexed by (noteId, position) |
| Get implications pointing to statement S | **O(i)** | i = number of implications to S; indexed by `reverseIdx` |
| **Get all projects aligned with cause S** | **O(a × i)** | a = attestations, i = implications. SDK fetches alignment and implication events, folds client-side. No graph traversal because implications are not transitive. |
| **Total funding for cause S** | **O(p)** | p = number of aligned projects. After finding aligned projects (above), SDK reads `totalReceived` from chain or folds project events. |
| **Top contributors to cause S** | **O(p × c)** | SDK fetches each aligned project's contribution events and folds per-participant. This is the most expensive query. |

### The "personalized view" problem

The query "projects aligned with statement S, according to *my* trusted attesters" can't be pre-computed because every user has a different trusted set. But the cost is bounded:

- Filter attesters: O(a) where a = total attestations for S (scan once, filter by user's trust set)
- This happens once in the Funding Portal; downstream queries use the filtered result

If the trusted-attester set is small (expected), this is fast. If someone trusts thousands of attesters, it's still linear, not quadratic.

---

## Dependency graph between subsystems

```
Concept Space ──────────────────────┐
  (statements, beliefs,             │
   implications)                    │
                                    ▼
LazyGiving ────────────────────► Funding Portal
  (projects, contributions,       (alignment attestations,
   secondary market)               cross-cutting aggregations)
                                    ▲
Delegation ─────────────────────────┘
  (notes, chains, intents)

Mutable Refs
  (standalone utility)
```

**Key property: the dependency arrow is one-way.** Only the Funding Portal's SDK queries depend on the other three subsystems' SDK queries. Concept Space, LazyGiving, and Delegation are fully independent of each other. All subsystems share the same event cache — there is no inter-indexer dependency.

---

## Blow-away-and-rebuild analysis

**What is the source of truth?** The blockchain. Every piece of indexed data originates from on-chain events. The indexer is a materialized view.

**What happens if we destroy the indexer and rebuild from scratch?**

1. **Rebuild time** = proportional to total number of on-chain events ever emitted. This is a full replay from the contracts' deployment blocks. With Ponder, this is automatic — just restart with a fresh database.

2. **What's temporarily lost during rebuild:**
   - **Raw events**: Re-indexed from chain as Ponder replays. Available eventually, not instantly.
   - **IPFS content and social data**: Not stored in the indexer — the SDK fetches these on demand from IPFS gateways and external APIs, so they're unaffected by an indexer rebuild.
   - **No pre-computed aggregates to lose**: The indexer stores only raw events. All aggregates (believerCount, totalReceived, etc.) are computed client-side by SDK fold functions on each query.

3. **Service availability during rebuild:** The indexer serves stale/partial data until it catches up to chain head. The UI would show incomplete data but wouldn't break — queries return fewer results, not wrong results. (Ponder exposes a sync status endpoint that the SDK already uses via `waitForIndexerToSyncToBlockNumber`.)

4. **Rebuild cost in practice:** For a new-ish system with tens of thousands of events, this is minutes. For a mature system with millions of events, possibly hours. The main bottleneck is RPC call throughput (fetching historical events/blocks), not CPU.

**Bottom line: blowing away the indexer is safe and recoverable.** The only cost is temporary unavailability of aggregated views.

---

## Per-entity independence analysis

**Can each subsystem be indexed independently?** In the current architecture, all subsystems share a single event cache. The event cache either has all events (it's up) or none (it's down). There's no per-subsystem failure mode in the indexer — it's one table.

The per-subsystem independence is in the **SDK layer**: each subsystem's fold functions only need events from their own contracts. If you wanted to, you could run separate event caches for different contract sets, but there's no need at current scale.

**Can you go further and split *within* a subsystem?** For LazyGiving, yes — each project is an independent partition (its own AssuranceContract, ERC1155, SecondaryMarket). The SDK fetches and folds each project's events independently. Dead projects that nobody visits = zero fold computation.

---

## Trust assumptions when decoupled

### What's trustless (verifiable on-chain)

Everything the indexer reports is independently verifiable because it comes from on-chain events:

- Project A received X ETH → read `totalReceived` from the AssuranceContract directly
- User U believes statement S → read from Beliefs contract
- Attester A said S1 implies S2 → read from Implications contract
- Note N exists with amount A → read from DelegatableNotes contract

An indexer can be *wrong* (bug, stale, compromised), but it can always be *checked*.

### What has implicit trust assumptions

The cross-cutting aggregations in the Funding Portal combine data from multiple sources:

1. **"Total funding for cause S"** = sum of `totalReceived` across aligned projects. This trusts:
   - The LazyGiving indexer to report `totalReceived` correctly for each project
   - The Concept Space indexer to report implications correctly
   - The Funding Portal's own alignment attestation data

2. **"Top contributors to cause S"** = same trust chain, plus trusting contributor data from LazyGiving

3. **"Available delegation funding for cause S"** = trusts Delegation indexer for note amounts

### Can cryptography help?

**Short answer: mostly unnecessary, because the on-chain data is already the trust anchor.**

Longer answer:

- **Merkle proofs for individual facts**: You could require the indexer to serve Merkle proofs alongside each data point, proving it matches on-chain state. EVM storage proofs (EIP-1186) exist for this. But this adds significant complexity and latency for minimal benefit — anyone who distrusts the indexer can just query the chain directly.

- **Aggregate proofs**: The harder case. "Total funding for cause S = 42 ETH" is a claim that requires summing across multiple contracts. You'd need something like a ZK proof that the sum is correct given the on-chain state. This is technically possible (ZK rollup style) but massive overkill for this system.

- **Practical alternative**: The UI already has the information it needs to verify. Each project's `totalReceived` is a single on-chain read. The UI could spot-check or fully verify any aggregate by reading the underlying contracts directly. This is cheaper and simpler than cryptographic proofs.

**The real mitigation is architectural, not cryptographic: the event cache is a commodity service that anyone can run and verify.** Since the indexer stores only raw events (no business logic), verifying its output is trivial — just compare against the chain. The fold logic lives in the SDK, which runs client-side and is fully transparent.

---

## Concurrency considerations

### Write concurrency (event handling)

- **Cross-subsystem**: Fully concurrent. Events for Concept Space, LazyGiving, Delegation, and Funding Portal have no shared state.
- **Within LazyGiving**: Each project's events are independent. Two projects' events can be processed concurrently without conflict.
- **Within Delegation**: Note events from different root owners are independent. Events within a single delegation tree must be ordered (parent before child).
- **Within Concept Space**: Belief events for different statements are independent. The only contention point is updating `believerCount`/`disbelieverCount` on the same statement concurrently.

Ponder processes events in block order (sequential within a block), so these concurrency properties matter more if you were to build a custom indexer or split into separate processes.

### Read concurrency (queries)

All queries are read-only against the indexed database. Standard database concurrency applies — no special concerns.

---

## The Graph comparison

| Dimension | Ponder (current) | The Graph |
|-----------|------------------|-----------|
| **Language** | TypeScript | AssemblyScript (WASM) |
| **Hosting** | Self-hosted or managed | Decentralized network or self-hosted (graph-node) |
| **Schema** | TypeScript with Ponder helpers | GraphQL SDL |
| **Dynamic contracts** | `factory()` helper | `DataSource.create()` templates |
| **Federation** | Custom (GraphQL-to-GraphQL) | Not built-in (would need custom gateway) |
| **IPFS content fetching** | Custom background jobs | Built-in `ipfs.cat()` in mappings |
| **Rebuild from scratch** | Automatic on restart | Automatic on redeployment |
| **Dev experience** | Hot reload, TypeScript types | Slower iteration, AssemblyScript quirks |
| **Decentralization** | None (trusted operator) | Optional (decentralized network has economic incentives for honest indexing) |
| **Cost** | Server costs | GRT token costs (decentralized) or server costs (self-hosted) |

**Would switching be hard?** Moderate. The event handler logic is simple (O(1) upserts) and would translate directly. The main friction points:
1. Federation: The Graph doesn't natively support one subgraph querying another. You'd need to handle cross-cutting queries differently (either in a gateway layer or by denormalizing into one large subgraph).
2. IPFS sync jobs and social data fetching: Would need to move to a separate service.
3. AssemblyScript: Minor but annoying rewrite cost.

**Would switching be worth it?** Probably not, unless you specifically want the decentralized indexing network (which provides economic guarantees of honest indexing — relevant to the trust question above). For a self-hosted deployment, Ponder is simpler and more flexible.

---

## Lazy reindexing

**Question:** After blowing away the indexer, can the system function without replaying old/dead/dormant data — only recomputing an entity's indexed state when someone actually asks for it?

### What "lazy" means here

Instead of replaying all historical events eagerly on startup, only index an entity when it's accessed:
- Someone visits a project page → replay that project's contract events on demand
- Someone views a delegation chain → replay that note's events on demand
- Otherwise, don't bother with dormant/dead entities

### Per-subsystem feasibility

**LazyGiving: naturally lazy-friendly.** Each project is its own AssuranceContract at its own address. You can replay a single project's events by filtering `eth_getLogs` to just that contract address. This gives you `totalReceived`, contributions, refunds, secondary market state — everything on the project page. Cost: one RPC call per project, proportional to that project's event count. Dead projects with no visitors = zero work.

**Delegation: moderately lazy-friendly.** All notes live in a single DelegatableNotes contract, but events have `noteId` as an indexed parameter, so you can filter `eth_getLogs` by noteId. Reconstructing a single note's history (created, delegated, revoked, split, consumed) is feasible on demand. The catch: delegation chains link parent→child, so reconstructing a child's full chain requires knowing the parent's state too. But chains are short (typically 2-5 deep, max 200), so walking up is cheap.

**Concept Space: lazy-friendly for individual entities.** Beliefs and Implications are shared contracts, but events have indexed parameters (`statementId`, `attester`). You can reconstruct a single statement's belief count by filtering `DirectSupport` events by statementId. Same for implications. This is fine for "show me statement S" pages.

**Mutable Refs: trivially lazy.** Each ref is independent. Reconstruct on access.

**Funding Portal: this is the problem.** You're right — the Funding Portal is the main obstacle to lazy indexing. Here's why:

### The Funding Portal problem

The Funding Portal's key queries are aggregations *across* entities:

- **"Total funding for cause S"** needs `totalReceived` from every aligned project. If projects are lazily indexed, you don't know their `totalReceived` until someone visits each project page. You can't sum what you haven't computed.

- **"Top contributors to cause S"** needs `participantSummaries` from every aligned project. Same problem, worse — you need per-contributor detail, not just a total.

- **"Projects aligned with cause S"** needs alignment attestations (Funding Portal's own data, small and cheap to index eagerly) plus implications (Concept Space data). This is actually fine — alignments and implications are small datasets.

So the real bottleneck is: **aggregating funding data across projects requires knowing each project's state.**

### What could we do about it?

**Option 1: Read project totals directly from the chain (no indexer needed for aggregates).**

Each AssuranceContract holds its funds. Its balance is its `totalReceived` minus withdrawals. You can read `address(project).balance` with a single `eth_call`. So "total funding for cause S" becomes:

1. Look up aligned projects (from eagerly-indexed alignment attestations — small dataset)
2. For each aligned project, do one `eth_call` to read its balance
3. Sum client-side

Cost: one RPC call per aligned project. For 50 aligned projects, that's 50 `eth_call`s — fast with `multicall`. No indexer needed for this aggregate. The alignment attestations are the only thing that needs to be indexed eagerly, and they're small.

This doesn't help with "top contributors" (you can't get per-contributor breakdowns from contract balances), but that's arguably a less critical query — you only need it for leaderboard pages, not for the main funding dashboard.

**Option 2: Two-tier indexing (registry eager, detail lazy).**

Index "what exists" eagerly, index "what happened within it" lazily:

- **Eager (cheap, small):** Factory events (which projects exist), alignment attestations (which projects align with which causes), implications, beliefs. This is the "registry" layer.
- **Lazy (expensive, per-entity):** Individual project contributions, secondary market trades, delegation chain history, participant summaries. Only computed when someone views that entity's detail page.

The eager tier gives you enough to answer "what projects exist for cause S?" and, combined with on-chain balance reads, "how much total funding does cause S have?" The lazy tier fills in the detail when someone drills down.

**Option 3: Incremental background reindexing with priority queue.**

Don't block on indexing. Instead:

1. On startup, immediately index the small/cheap data (alignments, implications, factory events)
2. Queue all projects for background reindexing, sorted by: recently active first, then by most-viewed
3. Serve partially-indexed data with a "still syncing" indicator
4. If a user requests a not-yet-indexed project, bump it to the front of the queue

This isn't truly "lazy" — it's "eager with smart prioritization." But it achieves the same user-facing goal: the stuff people care about comes back fast, dormant stuff comes back whenever.

**Option 4: The original intuition from the spec — client-side aggregation.**

From the original notes: *"maybe we just keep info for each project (which is objective info like token purchases) and just let each individual's UI gather up the projects and add up the project info?"*

This is essentially Option 1, pushed further. The Funding Portal becomes a thin layer:
- It indexes only alignment attestations (what aligns with what)
- All project data comes from either (a) the LazyGiving indexer if it's available, or (b) direct on-chain reads if it's not
- The UI does the aggregation

This works well if the number of aligned projects per cause is manageable (dozens, not thousands). For leaderboards, you'd need the LazyGiving indexer to be available for the relevant projects, but you could lazily index just those.

### Recommendation

Option 2 (two-tier) combined with Option 1 (on-chain reads for aggregates) gives the best laziness:

- **Always indexed eagerly:** Alignment attestations, implications, factory events. These are small — hundreds or low thousands of records total, replayed in seconds.
- **Indexed lazily on access:** Everything within a specific project, delegation tree, or statement detail view. Triggered by page visit, cached once computed.
- **Never indexed (read from chain):** Simple aggregates like total project funding, which are just contract balances.

The result: after blowing away the indexer, the system is functional within seconds (eager tier), shows correct funding totals immediately (on-chain reads), and fills in project/delegation detail pages on first visit (lazy tier). Dead/dormant projects that nobody visits = zero indexing cost.

### What Ponder can't do (and what would be needed)

Ponder doesn't support lazy/on-demand indexing — it replays all events from all configured contracts on startup. To implement the lazy approach, you'd need either:

1. **A thin custom layer on top of Ponder**: Use Ponder for the eager tier (alignments, implications, factory events — configure only those contracts). Build a separate on-demand service that replays specific contract events via `eth_getLogs` when requested, caches the results, and exposes the same GraphQL API shape.

2. **Replace Ponder for the lazy entities**: Keep Ponder for the eager tier. For project detail pages, query the chain directly from the API layer or SDK. This is essentially what Option 1 already describes for balance reads; extend it to contribution history by doing `eth_getLogs` filtered to a specific contract address.

Neither requires abandoning Ponder entirely. The eager tier (small, fast to replay) stays in Ponder. The lazy tier is a separate concern.

---

## Can we skip the indexer and let the UI fold events directly?

**Question:** For entities whose state is a fold over a small number of events, can the UI just query for the raw events and reconstruct the state itself? Do we even need an indexer, or is a blockchain node (or a thin event cache) sufficient?

### What the indexer actually adds

Let's look at what the current indexer computes that isn't directly available from the chain:

| What the indexer computes | Could the UI compute it instead? |
|---------------------------|----------------------------------|
| **believerCount / disbelieverCount** for a statement | Yes — fetch `DirectSupport` events filtered by statementId, fold into counts. Or: iterate over known users and call `beliefs(user, statementId)` view function. |
| **Individual user's belief** for a statement | **Not needed** — `beliefs(user, statementId)` is a public view function on the contract. Direct read, no events needed. |
| **Implications** for a statement | **Not needed** — `hasAttestation(attester, from, to)` is a view function. For "all implications pointing to S", fetch `ImplicationAttestation` events filtered by `toStatementCid`. |
| **Project totalReceived** | **Not needed** — contract balance. One `eth_call`. |
| **Project threshold/deadline** | **Not needed** — view functions on EthThresholdCondition. |
| **Contribution history** for a project | Yes — fetch `ERC1155Bought` events filtered by contract address. Raw events are the history. |
| **Participant summaries** (net contribution per user per project) | Yes — fold `ERC1155Bought` + `ERC1155Sold` events by participant. |
| **Secondary market state** (active listings, orders) | Yes — fold listing/order/trade events. But more complex; many event types. |
| **Delegation chain** for a note | Partially — events give you the sequence of delegations, but the chain hash verification is nontrivial. Could read current note state from contract view functions if available. |
| **IPFS content** (statement text, project metadata) | Different problem — the indexer fetches and caches IPFS content. This isn't event folding; it's a separate concern. |
| **Social data** (ENS, Twitter) | Same — separate concern, not event folding. |

**Key insight: most of the "current state" for individual entities is already readable from contract view functions.** The indexer's main value-adds are:

1. **Enumeration** — "which statements exist?", "which projects exist?", "who are the believers of S?" The chain doesn't have an efficient way to answer set-membership queries. Events are the only way to discover what entities exist.
2. **Aggregation** — believerCount, totalReceived, participantSummaries. These are folds over events. Simple folds, but folds nonetheless.
3. **Cross-entity joins** — the Funding Portal's aggregations. Already discussed above.
4. **Off-chain data** — IPFS content, social data. Not related to event indexing.

### What a standard blockchain node provides

A standard Ethereum full node supports `eth_getLogs` with filters:
- By contract address (exact match or list)
- By topics (indexed event parameters — up to 3 per event)
- By block range

Your contracts already have good indexed parameters on all events. So for most queries, `eth_getLogs` with the right filters gives you exactly the events you need.

**Limitations of `eth_getLogs`:**

1. **Block range scanning is O(blocks).** The node checks bloom filters for each block in the range. For "all events from block 0 to now," this scales with chain age. For a chain with millions of blocks, this can be seconds to minutes. Hosted RPC providers (Alchemy, Infura) often limit block ranges (e.g., max 10,000 blocks per query) or rate-limit aggressively.

2. **No "reverse index" queries.** You can filter by `toStatementCid` (topic) to find implications pointing to a statement. But you can't efficiently ask "which statementIds have at least one believer?" without scanning all `DirectSupport` events ever. This is the enumeration problem.

3. **No aggregation.** The node returns raw events. The client must fold them.

### The "thin event cache" idea

Instead of a full indexer (Ponder) that processes events into derived tables, what about a minimal service that:

1. Watches the chain for events from your contracts
2. Stores the raw events in a queryable database (by contract address, event signature, indexed params)
3. Serves them via a simple API
4. Does NO processing — no derived tables, no aggregation, no folding

The client/SDK then fetches raw events and folds them locally.

**What this gives you over a raw node:**
- Fast queries over the full block range (events are pre-cached, no bloom filter scanning)
- Handles the enumeration problem (you know what exists because you've seen the creation events)
- No RPC rate limits or block range restrictions

**What it doesn't give you:**
- Aggregates (believerCount, totalReceived) — client must compute
- Cross-entity joins — client must compute
- IPFS content — separate concern (see ./ipfs-in-indexer.md)

**How complex is this?** Very simple. It's essentially:
```
on each new block:
  for each configured contract:
    fetch new events
    store in database (indexed by contract, event type, topics, block number)

on query:
  SELECT * FROM events
  WHERE contract = ? AND event_type = ? AND topic1 = ?
  ORDER BY block_number
```

No business logic. No schema migrations when you add new event types. The "fold" logic lives in the SDK, not the indexer.

### Can the client actually do the folding?

For most entities, the fold is trivial:

**Beliefs:** Fold `DirectSupport` events for statementId S → last event per user wins → count believers/disbelievers. O(events for S). For a statement with 500 believers who each changed their mind once, that's ~1000 events. Instant.

**Implications:** Fold `ImplicationAttestation` + `ImplicationRevoked` events → set of active implications. Tiny dataset per statement.

**Project contributions:** Fold `ERC1155Bought` events for contract address P → list of contributions, running total. For a project with 200 contributors, that's ~200 events. Instant.

**Delegation chains:** Fold `NoteCreated` + `NoteDelegated` + `NoteRevoked` events for noteId N → current chain state. O(chain depth). Tiny.

**Secondary market:** This is the most complex fold — multiple event types (listings, fulfillments, cancellations, buy orders, trades). But it's still per-marketplace, and each marketplace is small.

The one thing the client can't easily do: **"show me all statements sorted by believer count."** That requires having folded every statement's events. This is the enumeration/ranking problem — you need global knowledge. But how often do you actually need global ranking? Maybe that's an eager-indexed thing (small dataset), while individual entity pages use client-side folding.

### A spectrum of approaches

From simplest to most complex:

1. **Direct RPC only (no indexer at all).** UI calls `eth_getLogs` and view functions directly. Works for individual entity pages. Fails for enumeration ("what statements exist?") and global aggregation. Fails at scale (RPC rate limits, block range scanning).

2. **Thin event cache.** Store raw events, serve them fast. Client folds. Solves RPC performance and enumeration. No business logic in the indexer. IPFS content fetching is a separate service.

3. **Event cache + small eager-indexed tables.** Cache raw events AND maintain a few small derived tables eagerly: "which statements exist", "which projects exist", "alignment attestations", "implications". These are the registry/enumeration tables. Everything else is client-folded from raw events.

4. **Full indexer (current approach).** Ponder processes every event into derived tables with aggregates. Maximum query performance, minimum client complexity. Maximum indexer complexity.

**Option 3 is probably the sweet spot.** It's nearly as simple as option 2 but solves the enumeration/registry problem. The small eager tables are cheap (hundreds to low thousands of records). The per-entity folding happens client-side from cached raw events, which is fast for small entities and avoids ever indexing dead/dormant ones.

### What about the fold logic living in the SDK?

This is actually natural. The SDK already defines types like `Project`, `Statement`, `Note` etc. Adding fold functions is straightforward:

```typescript
// In the SDK
function foldProjectState(events: ProjectEvent[]): ProjectState {
  let totalReceived = 0n;
  const contributions: Contribution[] = [];
  for (const event of events) {
    if (event.type === 'ERC1155Bought') {
      totalReceived += event.totalCost;
      contributions.push({ participant: event.participant, ... });
    }
    if (event.type === 'ERC1155Sold') {
      totalReceived -= event.totalRefund;
    }
  }
  return { totalReceived, contributions, ... };
}
```

This has a nice property: **the fold logic is in the same codebase as the UI, versioned together.** If you change how project state is computed, you don't need to re-deploy and re-sync an indexer — just update the SDK and the UI recomputes on next page load.

### What remains that this can't handle?

1. **IPFS content fetching.** You still need something to fetch statement text and project metadata from IPFS and make it available. This could be a simple separate service, or the UI could fetch from IPFS directly (via a gateway).

2. **Global ranking/trending.** "Top statements by believer count" requires knowing all statements' counts. If you eagerly index the statement registry (small), you could store counts there. Or accept that trending/ranking is a feature that requires the full indexer to be up.

3. **The Funding Portal's cross-entity aggregations.** Already covered above — either client-side aggregation with on-chain balance reads, or accept this as the one thing that needs a fuller indexer.

---

## Summary of your original questions

**"What would happen if we ran the system for a while, then had to blow away the indexer?"**
→ Rebuild from on-chain events. Minutes to hours depending on scale. No data loss. Temporary unavailability of aggregated views. Safe.

**"What are the entities, and can each be treated as a separate thing?"**
→ Five subsystems, already logically independent. Concept Space, LazyGiving, Delegation can each go down without affecting the others. Only Funding Portal aggregations require all three to be up. Within LazyGiving, each project is a natural partition.

**"Which aspects have trust assumptions? Can cryptography help?"**
→ Cross-subsystem aggregations (total funding for a cause) trust each subsystem's indexer. Cryptographic proofs are technically possible but overkill — the practical mitigation is that anyone can run their own indexer or verify against the chain directly. The subsystem separation is the trust boundary.

**"What if I want to switch to The Graph?"**
→ Feasible but not free. Main friction is federation (The Graph doesn't natively support it) and the AssemblyScript rewrite. Not worth it unless you want decentralized indexing guarantees.

---

## Why we didn't implement per-entity lazy fetching

### The appeal of the idea

The ideal mental model: instead of one monolithic indexer that ingests everything, you have conceptually many tiny independent per-entity indexers. Each project, each delegation chain, each statement has its own little indexer that starts empty and populates lazily only when someone asks for it. If there's a bug, you blow away that one entity's data and it rebuilds on next access. If the indexer is down entirely, per-entity queries could fall back to querying a blockchain node directly. The whole thing feels more fault-tolerant, more scalable, and less scary to deploy.

This is a real architectural intuition and it's worth understanding why the current system doesn't fully implement it — and why it mostly doesn't need to.

### What the current architecture already provides

The current architecture is closer to this ideal than it first appears:

**The indexer has no business logic.** Every event handler is a single raw insert. The only way the indexer can produce wrong data is if it stores an event incorrectly — which is trivially detectable (compare against the chain). There's no fold logic, no aggregation, no derived state in the indexer. Bugs in "how do we compute project state" live in the SDK fold functions, which run client-side and can be fixed by deploying new UI code without touching the indexer at all.

**Blowing away and rebuilding is already safe and fast.** Since the schema is just raw events, a full rebuild is a mechanical replay — no decisions, no business logic, no state to reconstruct. At early scale this takes seconds to minutes. There's no "partial rebuild" danger, no migration risk, no derived-table inconsistency. It's just re-watching the chain.

**Per-entity isolation already exists in the query layer.** The SDK's `fetchLazyGivingProjectEvents` fetches only events for one contract address. Per-entity queries are already isolated at the read layer, even if the write layer is monolithic. A bug that corrupts one project's events would require a global rebuild to fix, but the SDK fold functions run per-entity and a buggy fold for one entity doesn't infect others.

### What's actually missing and why it wasn't added

True lazy per-entity fetching would require replacing Ponder's eager replay with on-demand `eth_getLogs` calls, cached per entity. The complexity cost comes from three things Ponder currently handles for free:

**Staleness tracking.** Once you've fetched entity X's events up to block N, you need to know when new events have arrived. This means either (a) polling the chain to track the current tip and re-fetching deltas per entity, or (b) re-querying the chain on every request. Both require re-implementing the "follow the chain" logic that Ponder provides automatically.

**Reorg handling.** Ponder handles chain reorganizations — if a block is reorged away, Ponder rolls back the affected events. A DIY lazy fetch layer that caches raw events needs to handle the case where a cached block gets reorged. Solvable (track by block hash, invalidate on reorg) but non-trivial.

**Enumeration can't be lazy.** `getAllProjects()` needs to know which projects exist. That requires scanning factory events from block 0. You can't lazily discover "what entities exist" — you either index factory events eagerly or you scan everything on every enumeration query. So the eager tier can't be eliminated entirely, which means you still have Ponder for factory/registry events, plus a new custom lazy layer for per-entity detail. Two systems instead of one.

### The residual risk and how to think about it

The real fear is: deploy, discover a bug, and have to do something expensive or irreversible to fix it. Here's where that risk actually lives:

- **Bug in the indexer's event capture**: Almost impossible — the handler is `insert(rawEvent)`. Detectable by comparing against the chain.
- **Bug in an SDK fold function**: Fix the fold, redeploy the UI. No indexer rebuild needed.
- **Wrong events being indexed (missing a contract, wrong ABI)**: Requires a rebuild, but rebuilds are fast and safe.
- **Scalability problem in the indexer**: The indexer is stateless raw inserts. If it gets slow, the bottleneck is RPC throughput or database write throughput — well-understood problems with well-understood solutions (batching, better RPC provider, read replicas).

The scary scenario — "I deployed, accumulated lots of state, and now I need to fix something but can't rebuild without hours of downtime" — doesn't really apply here because the indexer holds no derived state. The closest risk is "the chain has grown so large that a rebuild takes hours." That's a real risk at extreme scale, but at that scale you'd have the resources to run a dedicated archive node and the rebuild would be fast again.

### Verdict

The per-entity lazy approach would add meaningful complexity (staleness tracking, reorgs, two-tier architecture) without much additional fault isolation — because the main source of potential bugs (fold logic) is already fully isolated from the indexer. The current architecture gives most of what the mental model promises: no business logic in the indexer, fast safe rebuilds, per-entity isolation at the query layer, and the ability to swap the indexer for direct blockchain reads by changing the SDK query layer.

If the system grows to the point where eager indexing of all events is genuinely too slow or expensive, the lazy approach would become worth revisiting. At that scale the engineering investment is justified and the problem is better understood. For now, the simple eager indexer with zero business logic is the right call.
