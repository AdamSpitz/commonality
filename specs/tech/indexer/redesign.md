# Redesign of the indexer

## User's notes

I guess my motivation is something like...

I'm trying to figure out whether I'm ready to deploy this whole system. I'm nervous about potential bugs, I'm nervous about needing this centralized component, and also I'm just kinda hoping to make something simple that just works and doesn't need a ton of maintenance.

So the overall goal is something like simplicity + decentralization.

Ideas that I'm hoping will help:
  - Don't be afraid to let the client fetch directly from IPFS if that'll simplify the indexer. (See [ipfs-in-indexer.md](./ipfs-in-indexer.md).)
  - "Lazy":
    - No need to eagerly index all the entities (e.g. projects/delegation-chains/whatever); many will be dead/dormant, and for most purposes I don't think we need the indexed info unless it's explicitly asked for.
    - Also, for small entities, maybe don't even fold eagerly; have a thin event cache plus a few small eager-indexed registry tables, and let the client do the fold itself.
    - See [indexer-performance.md](./indexer-performance.md).

What does the redesigned system look like? Can we get away with fewer/simpler pieces?

Can we refactor the current system so that it'll be easy to create this redesigned system to replace the current indexer?

---

## The Redesign

### What the current system looks like

The current indexer is a Ponder application with 5 subsystems, ~20 database tables, background IPFS sync jobs, social data sync, federation between subsystems via GraphQL, and custom REST endpoints for complex queries. It works — all event handlers are implemented, the SDK talks to it via typed GraphQL queries — but it's a substantial piece of infrastructure with a lot of surface area.

The pieces:
- **Ponder** processes every on-chain event into derived tables with pre-computed aggregates
- **Background jobs** fetch IPFS content (statement text, project metadata) and social data (ENS names, Twitter)
- **Federation** lets the Aligning query the other subsystems' GraphQL APIs for cross-cutting aggregations
- **Custom REST endpoints** (~15 of them) handle queries that don't fit GraphQL well
- **The SDK** is mostly a thin client that calls GraphQL/REST and returns typed results

### What the redesigned system looks like

Replace all of the above with three simpler pieces:

```
┌─────────────────────────────────────────┐
│  1. Thin Event Cache                    │
│     - Watches chain for contract events │
│     - Stores raw events in a DB         │
│     - Serves them via simple query API  │
│     - Maintains a few small registry    │
│       tables (what exists, alignments,  │
│       implications)                     │
│     - No business logic, no aggregation │
│     - No IPFS fetching, no social data  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  2. SDK with fold functions             │
│     - Fetches raw events from the cache │
│     - Folds them into entity state      │
│       client-side                       │
│     - Reads current state from contract │
│       view functions where available    │
│     - Fetches IPFS content directly     │
│       from a gateway                    │
│     - Does cross-entity aggregation     │
│       (the Aligning logic)        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  3. IPFS Gateway (existing infra)       │
│     - Content-addressed, cache-friendly │
│     - No custom code needed             │
│     - Could be a public gateway or a    │
│       local node for performance        │
└─────────────────────────────────────────┘
```

### What gets eliminated

| Current piece | What happens to it |
|---|---|
| Ponder dependency | Gone. The event cache is ~100 lines of chain-watching logic. |
| 5 subsystem schemas (~20 tables) | Replaced by one `events` table (no registry tables needed). |
| All event handler business logic | Moves into SDK fold functions. Same logic, different location. |
| Background IPFS sync jobs | Gone. Client fetches from IPFS gateway on demand. |
| Social data sync | Gone. Client resolves ENS/social data on demand. |
| Federation (indexer-to-indexer GraphQL) | Gone. The "Aligning" becomes SDK-side aggregation. |
| ~15 custom REST endpoints | Gone. The SDK computes these locally from raw events + view functions. |
| GraphQL codegen pipeline | Gone. The event cache API is trivial (fetch events by contract/type/topic). |

### What the event cache does

```
Storage:
  events(
    id,                        -- txHash + logIndex
    contract_address,
    event_name,
    block_number,
    block_timestamp,
    transaction_hash,
    log_index,
    topic0,                    -- event signature
    topic1, topic2, topic3,    -- indexed params
    data                       -- ABI-encoded non-indexed params
  )

  (No other tables. Registry tables were originally planned but turned out
   to be unnecessary — the SDK discovers entities from creation events.)

Ingestion:
  Ponder watches configured contracts and inserts one row per event.

Query API:
  GET /api/events?contractAddress=0x...&eventName=DirectSupport&topic1=...
  (Supports filtering by contractAddress, eventName, topic1-3, blockNumber range, limit)
```

No business logic. No schema migrations when event types change. No subsystem boundaries to maintain. No federation.

### What the SDK fold functions look like

The SDK already defines types like `Project`, `Statement`, `Note`. The fold functions are straightforward additions:

```typescript
// Beliefs for a statement
function foldBeliefs(events: DirectSupportEvent[]): BeliefState {
  const beliefs = new Map<Address, 'believe' | 'disbelieve'>();
  for (const e of events) {  // events arrive in block order
    if (e.inSupport) beliefs.set(e.user, 'believe');
    else beliefs.set(e.user, 'disbelieve');
    // A user can also remove their belief — handle that event too
  }
  return {
    believers: [...beliefs].filter(([_, v]) => v === 'believe').map(([k]) => k),
    disbelievers: [...beliefs].filter(([_, v]) => v === 'disbelieve').map(([k]) => k),
    believerCount: [...beliefs.values()].filter(v => v === 'believe').length,
    disbelieverCount: [...beliefs.values()].filter(v => v === 'disbelieve').length,
  };
}

// Project state
function foldProjectState(events: ProjectEvent[]): ProjectState {
  const contributions: Contribution[] = [];
  for (const e of events) {
    if (e.type === 'ERC1155Bought') contributions.push({ ... });
    if (e.type === 'ERC1155Sold') { /* mark refund */ }
    // etc.
  }
  // totalReceived comes from a contract view function, not from folding
  return { contributions, ... };
}

// Aligning: "total funding for cause S"
async function totalFundingForCause(statementCid: string): Promise<bigint> {
  const alignments = await cache.getAlignments(statementCid);  // from registry
  const implications = await cache.getImplications(statementCid);  // from registry
  const projectAddresses = deriveAlignedProjects(alignments, implications);
  // Read each project's balance directly from chain — one multicall
  const balances = await multicall(
    projectAddresses.map(addr => ({ address: addr, functionName: 'totalReceived' }))
  );
  return balances.reduce((sum, b) => sum + b, 0n);
}
```

Key property: **the fold logic is versioned with the SDK and UI, not with a separate indexer deployment.** If you change how project state is computed, you update the SDK — no indexer redeployment, no re-sync.

### What about queries that need global knowledge?

Most pages show a single entity (a statement, a project, a delegation chain). For these, the SDK fetches that entity's events and folds them. No global knowledge needed.

The queries that need global knowledge are:

| Query | Solution in the redesign |
|---|---|
| "Which statements exist?" | SDK discovers from `DirectSupport` creation events (fold all events, extract unique statement CIDs) |
| "Which projects exist?" | SDK discovers from `LazyGivingAssuranceContractCreated` factory events |
| "Projects aligned with cause S" | SDK fetches `AlignmentAttestation` + `ImplicationAttestation` events, folds client-side |
| "Total funding for cause S" | SDK finds aligned projects from events; chain reads provide balances |
| "Statements sorted by believer count" | This is the one hard case — see below |
| "Top contributors to cause S" | Requires folding each aligned project's events. Feasible if # of aligned projects is manageable (dozens). |

**The "sort by believer count" problem.** To rank all statements by popularity, you need every statement's believer count. Options:

1. **Add `believer_count` to the statements registry table.** The event cache updates it on each `DirectSupport` event. This is a small addition to the "no business logic" principle, but it's a single counter increment — not really "business logic." Acceptable.
2. **Accept that global ranking is a premium feature** that requires the full event cache to be caught up. On a fresh cache, you can browse statements (from the registry) but can't sort by popularity until the cache has processed enough events. This is fine for a pre-deployment system.
3. **Let the client fold all statements' beliefs.** If there are 500 statements with an average of 50 belief events each, that's 25,000 events. Fetchable in one query, foldable in milliseconds. This actually works at modest scale.

Recommendation: option 3 at small scale, option 1 if/when scale demands it.

### Migration path

The redesign doesn't require a big-bang rewrite. The current system can be refactored incrementally:

**Phase 1**: Move fold logic into the SDK. **COMPLETE**
**Phase 2**: Add direct IPFS and on-chain reads to the SDK. **COMPLETE**
- For IPFS content: `fetchFromIPFS(machinery.ipfsConfig, cid)` already exists.
- For on-chain state: 11 view functions now available in `sdk/src/utils/chain-reads.ts`:
  - `readConditionParams`, `readProjectETHBalance`, `readNoteOnChainInfo`, `readBelief`
  - `readHasAlignment`, `readHasImplication`, `readExplanation`, `readMutableRef`
  - `readTotalReceivedValue`, `readConditionStatus`
  - `readSaleListing`, `readBuyOrder`, `readNextNoteId`
  - 239 SDK tests passing

**Phase 3: Add raw events table to Ponder.** See [phase3-plan.md](./phase3-plan.md) for the implementation plan.
- A simple service: watch configured contracts, store events, serve via REST.
- This can run alongside Ponder initially.

**Phase 3 is now complete.** The events table has been added to the Ponder schema, and event handlers capture raw events for all contracts. (Registry tables were originally planned but later removed — the SDK discovers entities from creation events in the event cache.)

**Phase 4: Switch the SDK to use the event cache.**
- Update SDK query functions to fetch from the event cache + fold locally, instead of calling Ponder's GraphQL.
- The Ponder indexer is now unused and can be removed.

Each phase is independently deployable and testable. Phase 1 is the most valuable regardless of whether you do the rest — having fold functions in the SDK makes the system more resilient.

---

## Assessment: Is this a good idea?

### Yes, with caveats

**Strong arguments for:**

1. **Dramatic reduction in server-side complexity.** The event cache is maybe 200 lines of code vs the current indexer's ~2000+ lines of event handlers, schemas, sync jobs, federation, and custom endpoints. Fewer things to break, fewer things to maintain.

2. **The system isn't deployed yet.** This is the right moment to simplify. Once deployed with users depending on the current API shape, a redesign gets much harder.

3. **The fold logic is trivial.** The performance analysis already showed this — most entities have a handful of events, and the folds are simple O(n) scans. There's no entity where client-side folding is computationally concerning at the expected scale.

4. **Eliminates the IPFS sync job headaches.** The background retry framework is one of the more fragile parts of the current system. Letting the client fetch from IPFS on demand removes the entire category of "content not yet synced" bugs.

5. **Better decentralization story.** The event cache is a commodity service — anyone can run one, and anyone can verify its output against the chain. The current Ponder indexer has opaque business logic that you have to trust. The thin cache is just "did you store the events correctly?" which is trivially verifiable.

6. **Fold logic versioned with UI.** When you change how state is computed, you update the SDK, and every client picks it up on next load. No indexer redeployment + re-sync cycle.

7. **Dead entities cost nothing.** A project nobody visits = zero computation. The current system eagerly indexes everything regardless of whether anyone looks at it.

**Honest caveats:**

1. **More client-side work.** The UI/SDK becomes responsible for more computation. For individual entity pages this is fine (trivial folds). For the Aligning's cross-cutting aggregations, it means the client is doing N multicalls + fold operations. At modest scale (dozens of aligned projects) this is fast. At large scale (hundreds+), you might want a caching layer or to bring back selective server-side aggregation.

2. **Loss of Ponder's dev experience.** Ponder gives you hot reload, auto-generated GraphQL types, built-in reorg handling, factory contract patterns. The event cache is simpler but less ergonomic during development. This matters less after initial development is done.

3. **The "sort by popularity" gap.** Global ranking queries are harder without pre-computed aggregates. The workarounds (fold all events client-side at small scale, or add a counter to the registry) are fine but not as clean as a pre-built database query.

4. **You're building something custom.** Ponder is a maintained open-source project with a community. The thin event cache is your own code. It's much simpler code, but it's *your* code to maintain. (Counter-argument: the event cache is so simple that there's barely anything to maintain.) (Other counter-argument: let's just use Ponder for the event cache. The point of this isn't necessarily to eliminate the dependency on Ponder, just to simplify the architecture.)

5. **Initial latency for cold entities.** When someone visits a project page for the first time after a cache rebuild, the SDK fetches and folds events on the spot. For a project with thousands of events, this might take a noticeable moment. The current system pre-computes so pages load instantly. Mitigations: client-side caching (fold once, cache the result), or a service worker that pre-folds popular entities.

### Bottom line

The redesign trades a moderate amount of client-side complexity for a large reduction in server-side complexity. Given that the system isn't deployed yet and the expected scale is modest, this tradeoff is strongly favorable. The migration path is incremental and each phase has standalone value.

The biggest risk is if the Aligning's cross-entity aggregations become a performance bottleneck at scale. But that's a bridge to cross when you get there — and the architecture makes it easy to add selective server-side aggregation for specific hot queries without rebuilding the full Ponder indexer.

**Recommendation: do it.** Start with Phase 1 (fold functions in the SDK)Take a look at specs/indexer/redesign.md, and do the first chunk of phase 1. Make sure the  — it's valuable even if you never do the rest, and it'll give you concrete data about whether client-side folding feels right in practice.

---

## Resumable folds: the general strategy for cross-entity performance

### The key insight

A fold over an append-only event stream is inherently resumable. The stream only grows at the tail, so past results never invalidate. You just need the accumulator and a cursor (how far into each stream you've already processed). This means you never have to redo work — you only fold *new* events since your last checkpoint.

This is a general answer to the performance concern in "Honest caveats" #1 and the cross-entity aggregation problem documented below. It applies to every fold in the system, not just the cause board queries.

### The pattern

```typescript
interface ResumableFold<Accumulator> {
  accumulator: Accumulator;
  cursors: Map<StreamId, Cursor>;  // e.g., (contractAddress, lastBlockNumber)
  fold: (accumulator: Accumulator, newEvents: Event[]) => Accumulator;
}

// refresh() is the same everywhere:
async function refresh<A>(state: ResumableFold<A>, fetchEventsSince: FetchFn): Promise<void> {
  for (const [streamId, cursor] of state.cursors) {
    const newEvents = await fetchEventsSince(streamId, cursor);
    state.accumulator = state.fold(state.accumulator, newEvents);
    state.cursors.set(streamId, newEvents.at(-1)?.cursor ?? cursor);
  }
  // Also check for new streams (e.g., a new project got aligned to a cause):
  const newStreams = await discoverNewStreams();
  for (const streamId of newStreams) {
    if (!state.cursors.has(streamId)) {
      const allEvents = await fetchEventsSince(streamId, BEGINNING);
      state.accumulator = state.fold(state.accumulator, allEvents);
      state.cursors.set(streamId, allEvents.at(-1)?.cursor ?? BEGINNING);
    }
  }
}
```

The fold function is the same code the SDK already has — `foldContributionsFromEvents`, `foldProject`, `foldAlignmentAttestations`, etc. The only new thing is the cursor tracking and the `refresh()` wrapper.

### Cursors must be blockchain coordinates

**Design constraint**: Cursors must be blockchain-meaningful values — specifically `(blockNumber, logIndex)` — not opaque database row IDs or sequence numbers internal to the event cache.

Why this matters:

1. **Indexer bypass.** A client holding a cursor like `{ blockNumber: 18_500_000, logIndex: 42 }` can resume the fold against *any* Ethereum data source — a different indexer, a direct RPC node via `eth_getLogs(fromBlock: 18_500_001)`, or an event API like Etherscan. The cursor is portable because it refers to the blockchain, not to the indexer's database.

2. **Bounded history.** You can express "only include events from the past year" as a block number range, and the cursor is self-describing. A client that starts folding from block N knows exactly what history it has and hasn't seen. This also enables partial caches — an event cache that only stores the last year of events is still useful, and cursors from that cache are still meaningful.

3. **Verifiability.** A blockchain-coordinate cursor lets anyone independently verify the fold: "given events from block X to block Y, does the accumulator match?" With an opaque DB cursor, you'd have to trust the specific indexer instance.

4. **Cache independence.** If the event cache is rebuilt, redeployed, or replaced, cursors from the old instance still work — they refer to the chain, not to the old DB. No cursor invalidation on infrastructure changes.

The `BEGINNING` sentinel should map to block 0 (or the contract deployment block). The event cache API already supports `blockNumber` range filtering, so this is naturally compatible.

### Where it can run

The pattern works at every layer, with different trade-offs:

**Client-side (browser/SDK caller holds the state):**
- The browser keeps a `ResumableFold` in memory (or IndexedDB for persistence across page loads).
- On each refresh, it fetches only the delta from the event cache.
- Good for: interactive UIs where the user is looking at a page. A leaderboard that refreshes every 30 seconds only fetches new events since the last refresh — usually zero or a handful.
- Trade-off: cold start on first visit requires the full history. Adds stateful objects to the SDK (currently stateless).

**Server-side (a process maintains the accumulator in a database):**
- A sidecar process (or the indexer itself) holds the `ResumableFold` and writes the accumulator to a table.
- Clients query the table instead of folding themselves.
- Good for: eliminating cold start, sharing computation across many clients.
- Trade-off: introduces server-side state beyond raw events. But it's a *deterministic projection* of those events — it can always be rebuilt from scratch by replaying. This is fundamentally different from the Ponder approach: same fold function, no bespoke schema language, no separate query API.

**Hybrid (server provides a checkpoint, client folds the delta):**
- Server maintains a materialized accumulator that's "close to current" (updated every N blocks or every M minutes).
- Client fetches the checkpoint as a starting point, then folds the small delta of events since the checkpoint.
- Good for: best of both — no cold start, no staleness, server stays simple.
- Trade-off: need a convention for serializing/deserializing accumulator checkpoints.

### Why this is different from "just use an indexer"

The crucial property: **the fold function is always the same TypeScript code regardless of where it runs.** The only thing that changes is who holds the accumulator and how often `refresh()` gets called.

With Ponder (or any traditional indexer), the server-side logic is written in a framework-specific handler format with its own schema language and query layer. Changing how state is computed means redeploying the indexer, re-syncing from genesis, and hoping the new schema is backwards-compatible. Here, you update one fold function in the SDK and every execution context — browser, server sidecar, hybrid checkpoint — picks it up.

### What this means for the specific queries

| Query | Without resumable folds | With resumable folds |
|---|---|---|
| `getAllAlignedProjectsForCause` | N event cache fetches + folds per refresh | Moot — use `getAssuranceContractProgress()` chain read instead (see option 5 below) |
| `getTopContributorsForCause` | N×2 event cache fetches + folds per refresh (full history each time) | First load: full history. Subsequent: delta only. For a leaderboard refreshing every 30s, the delta is typically empty. |
| `foldBeliefs` for all statements | Fetch all belief events, fold from scratch | Incremental: only fold new belief events since last cursor. At modest scale the full fold is already fast, but this keeps it fast as scale grows. |

### Recommendation

Don't build the resumable fold infrastructure yet. The current from-scratch folds work at the expected scale. But **design the fold functions to be resumable-friendly**: they should be pure functions of `(previousState, newEvents) => newState`, not functions that assume they're processing the full history from genesis. Most of them already are. When performance demands it, wrapping them in the resumable pattern is mechanical.

---

## Phase 2: Chain Reads — Complete

### What's been implemented

The SDK now has `publicClient` support, and `sdk/src/utils/chain-reads.ts` contains 11 functions:

| Function | Contract | What it reads |
|---|---|---|
| `readConditionParams` | EthThresholdCondition | threshold, deadline |
| `readProjectETHBalance` | AssuranceContract | ETH balance |
| `readNoteOnChainInfo` | DelegatableNotes | chainHash, amount, token info |
| `readBelief` | Beliefs | user's belief state for a statement |
| `readHasAlignment` | AlignmentAttestations | whether alignment attestation exists |
| `readHasImplication` | Implications | whether implication attestation exists |
| `readExplanation` | Implications | explanation CID for an implication |
| `readMutableRef` | MutableRefUpdater | current ref value |
| `readTotalReceivedValue` | AssuranceContract | cumulative funding received |
| `readConditionStatus` | EthThresholdCondition | hasSucceeded/hasFailed |
| `readSaleListing` | ERC1155SecondaryMarket | sale listing details |
| `readBuyOrder` | ERC1155SecondaryMarket | buy order details |
| `readNextNoteId` | DelegatableNotes | next note ID counter |

All functions have comprehensive tests (happy path, fallback behavior on error, publicClient requirement enforcement).

239 SDK tests passing.

## Phase 3: Raw Events Cache — Complete

### What's been implemented

Added the thin event cache to Ponder:

1. **events table** (`schemas/events.schema.ts`): Stores raw event data with:
   - id (txHash + logIndex), contractAddress, eventName, blockNumber, blockTimestamp
   - transactionHash, logIndex, topic0-3, data (ABI-encoded non-indexed params)

2. **Event handlers** (`src/events-cache/index.ts`): Capture raw events for all contracts:
   - Beliefs: DirectSupport
   - Implications: ImplicationAttestation
   - AssuranceContractFactory: LazyGivingAssuranceContractCreated
   - AssuranceContract: 6 events
   - SecondaryMarket: 7 events
   - PremintingERC1155: TransferSingle, TransferBatch
   - DelegatableNotes: 7 events
   - NoteIntent: NoteIntentAttested
   - AlignmentAttestations: AlignmentAttestation
   - MutableRefUpdater: RefUpdated

Note: Registry tables were originally part of this phase but were later removed. The SDK discovers entities from creation events in the event cache (e.g., factory events for projects, DirectSupport events for statements).


## Phase 4: Event cache SDK integration — Complete

Phase 4 is complete. **The SDK is 100% GraphQL-free.** All queries use event cache + folds or on-chain reads.

### What was implemented:

1. **sdk/src/utils/eventCacheClient.ts**: Client for fetching raw events from the indexer's REST API.

2. **sdk/src/utils/eventDecoder.ts**: ABI-decoded event helpers for all contract event types.

3. **sdk/src/subsystems/conceptspace/queries.ts**: Fully rewritten — entity queries use event cache + folds. Discovery/browsing queries fold events client-side from the event cache.

4. **sdk/src/subsystems/conceptspace/folds.ts**: `foldStatementBeliefs`, `foldUserBeliefs`, `foldAllStatements`, `foldImplications`.

5. **sdk/src/subsystems/aligning/queries.ts**: Fully rewritten — all queries use event cache + folds + chain reads. Cross-project aggregations (`getAllAlignedProjectsForCause`, `getTopContributorsForCause`) replaced `GetProjectDetailsDocument` and `GetParticipantSummariesDocument` GraphQL calls with per-project event fetches + folds + chain reads.

6. **sdk/src/subsystems/aligning/folds.ts**: `foldAlignmentAttestations`.

7. **sdk/src/machinery.ts**: Added `eventCacheUrl` and `contractAddresses` fields.

### What was deleted:

- GraphQL codegen pipeline and generated files
- `graphqlClient.ts` and all GraphQL query files
- Old Ponder-derived-table handlers, schemas, background sync jobs, and federation endpoints
- Registry tables (statements, projects, alignment_attestations, implications) — the SDK discovers entities from creation events instead

### Architecture decision:

The Ponder dependency is kept — but only for its event-watching and DB infrastructure. The indexer is now a thin event cache: the only schema is `events.schema.ts` (one `events` table), all handlers do only `captureRawEvent()`, and the API serves raw events via REST. No business logic lives in the indexer.

## Open question: Cross-entity aggregation queries and performance

### What happened

The last two GraphQL calls in `aligning/queries.ts` have been replaced with event cache + chain reads:

- `GetProjectDetailsDocument` → `getProject()` (fetches project events, folds, then chain-reads threshold/deadline)
- `GetParticipantSummariesDocument` → `getProjectContributions()` + `getProjectRefunds()` (fetches bought/sold events, folds per-participant)

This makes the SDK fully GraphQL-free for cause board queries. The code is cleaner and the architecture is consistent — everything goes through event cache + folds now.

### The performance concern

These two queries are **cross-entity aggregations**, not single-entity folds. They're called in loops:

1. `getAllAlignedProjectsForCause(statementCid)` finds all aligned projects (via registry), then for **each project** calls `getProject()` — which fetches that project's events from the cache, folds them, and makes 2 chain reads (threshold + deadline).

2. `getTopContributorsForCause(statementCid)` calls `getAllAlignedProjectsForCause` (above), then for **each project** calls `getProjectContributions()` + `getProjectRefunds()` — fetching and folding bought/sold events separately per project.

For a cause with N aligned projects, this is ~3N HTTP round-trips to the event cache + 2N chain reads. The old GraphQL approach was 1 query per function (hitting pre-aggregated `projects` and `participantSummaries` tables).

This is different from the other fold migrations (beliefs, delegation chains, individual projects), where we're folding a **single entity's** events — typically small and bounded. Here we're aggregating **across many entities**, which is the kind of query the redesign spec acknowledged might need server-side help at scale (see "Honest caveats" #1 and the "Top contributors to cause S" row in the global-knowledge table).

### Current status

The replacement works correctly (616 tests pass). At modest scale (a handful of aligned projects) it will be fine. The question is what to do if/when scale grows.

### Options to consider later

1. **Leave as-is for now.** The system isn't deployed yet, scale is unknown, and premature optimization isn't worth it. Revisit if performance becomes an issue.

2. **Batch the event cache fetches.** Instead of N individual `fetchEvents` calls (one per project), add a batch endpoint to the event cache that returns events for multiple contracts in one request. This would reduce round-trips from ~3N to ~3 while keeping all fold logic client-side.

3. **Add lightweight server-side aggregates.** Keep `totalReceived` as a column on the `projects_registry` table (updated on each bought/sold event). This is a tiny increment on the "no business logic" principle — just a counter — and would let the project-details query avoid per-project event fetching entirely. Similar to the "believer_count on statements_registry" idea already in the spec.

4. **Use `viem` multicall for chain reads.** Instead of 2N individual chain reads (threshold + deadline per project), batch them into a single multicall. This is an easy win independent of the other options.

5. **Chain-read `totalReceived` instead of folding events.** The contract already maintains `_totalReceivedValue` in storage, exposed via the public getter `getAssuranceContractProgress()` on `MultiERC1155AssuranceContract`. The SDK's `foldProject()` recomputes this from buy/sell events, but for `getAllAlignedProjectsForCause` we only need the total — not the per-participant breakdown. Replace the per-project event-fetch-and-fold with a chain read. Combined with option 4 (multicall), this turns N event cache fetches + N folds + 2N chain reads into a single multicall of 3N reads (totalReceived + threshold + deadline per project), with zero event cache traffic. The fold remains useful for queries that need event-level detail.

These aren't mutually exclusive. Option 1 is the recommendation for now; options 2-5 are tools in the toolbox for when/if scale demands it.

### `getTopContributorsForCause`: dealing with per-participant event history

Unlike `getAllAlignedProjectsForCause` (where a chain read can replace the fold), the top-contributors query genuinely needs per-participant buy/sell event history across all aligned projects. There's no on-chain aggregate for "how much did address X contribute across projects Y, Z, W." The data is only recoverable from events. The leaderboard doesn't need to be real-time — stale data is acceptable.

Two approaches, depending on how pure we want the architecture to be:

#### Approach A: Client-side caching (stay all-in on thin cache + folds)

The browser (or SDK caller) maintains a local cache of already-fetched events per project, keyed by `(projectAddress, lastBlockNumber)`. On subsequent calls:

1. Ask the event cache for events *after* the last known block for each project (the event cache already supports cursor/offset-based pagination via block ranges).
2. Fold only the new events into the existing per-participant accumulator.
3. Merge accumulators across projects and sort.

This turns the N×(full history) fetch into N×(delta since last check) after the first load. For a leaderboard that refreshes every few minutes, the deltas will usually be empty or tiny. The SDK would expose something like a `ContributorLeaderboardCache` object that callers hold onto across refreshes.

Trade-offs:
- Keeps the architecture pure — no new server-side logic.
- First load is still the full history (cold start problem). Acceptable if N is small or if there's a loading state.
- Adds client-side state management. The SDK currently has no stateful objects — this would be the first.

#### Approach B: Server-side fold (same algorithm, runs in the indexer)

Run the same fold logic server-side: the indexer watches `ERC1155Bought` and `ERC1155Sold` events and maintains a `participant_contributions` table with `(participant, project, totalContributed, totalRefunded, count)` rows, updated incrementally as events arrive. The SDK queries this table through the event cache REST API (e.g., `GET /participant-contributions?project=0x...`), then does the cross-project merge and sort client-side.

This is conceptually identical to how the fold works — same incremental accumulation logic — but it runs once on the server instead of in every client. The key difference from the current Ponder/GraphQL approach: the server-side table is a mechanical projection of events (just running the fold), not a bespoke GraphQL schema. Ideally the fold function itself (`foldContributionsFromEvents`) could be shared between client and server, so there's literally one algorithm in one place.

Trade-offs:
- Eliminates the cold-start problem entirely. Clients always get pre-folded data.
- Introduces server-side state beyond raw events — but it's a deterministic projection of those events, not business logic. It can be rebuilt from scratch by replaying.
- Need to decide where this runs. Options: a sidecar process that reads from the event cache and writes to a separate table; or a Ponder handler that maintains the table alongside the existing indexer. The sidecar is cleaner architecturally (the event cache stays dumb); the Ponder handler is less infrastructure.
