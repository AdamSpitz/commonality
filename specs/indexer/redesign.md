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
- **Federation** lets the Funding Portal query the other subsystems' GraphQL APIs for cross-cutting aggregations
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
│       (the Funding Portal logic)        │
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
| 5 subsystem schemas (~20 tables) | Replaced by one `events` table + a few small registry tables. |
| All event handler business logic | Moves into SDK fold functions. Same logic, different location. |
| Background IPFS sync jobs | Gone. Client fetches from IPFS gateway on demand. |
| Social data sync | Gone. Client resolves ENS/social data on demand. |
| Federation (indexer-to-indexer GraphQL) | Gone. The "Funding Portal" becomes SDK-side aggregation. |
| ~15 custom REST endpoints | Gone. The SDK computes these locally from raw events + view functions. |
| GraphQL codegen pipeline | Gone. The event cache API is trivial (fetch events by contract/type/topic). |

### What the event cache does

```
Storage:
  events(
    contract_address,
    event_signature,
    topic1, topic2, topic3,   -- indexed params
    data,                      -- ABI-encoded non-indexed params
    block_number,
    tx_hash,
    log_index
  )

  -- Small registry tables, eagerly maintained:
  statements(cid, created_at_block)
  projects(address, factory_address, created_at_block)
  alignment_attestations(attester, subject, statement_cid)
  implications(attester, from_cid, to_cid)

Ingestion:
  on each new block:
    for each configured contract:
      fetch new events via eth_getLogs
      insert into events table
      if event is a creation/registry event, update registry table

Query API:
  GET /events?contract=0x...&event=DirectSupport&topic1=<statementCid>
  GET /events?contract=0x...&event=ERC1155Bought
  GET /registry/statements
  GET /registry/projects
  GET /registry/alignments?statement=<cid>
  GET /registry/implications?to=<cid>
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

// Funding portal: "total funding for cause S"
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
| "Which statements exist?" | Registry table (eagerly maintained, small) |
| "Which projects exist?" | Registry table (eagerly maintained, small) |
| "Projects aligned with cause S" | Registry tables (alignments + implications, both small) |
| "Total funding for cause S" | Registry gives aligned projects; multicall reads balances from chain |
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
- Add the small registry tables.
- This can run alongside Ponder initially.

**Phase 3 is now complete.** The events table and registry tables have been added to the Ponder schema, and event handlers capture raw events for all contracts. The existing Ponder indexer continues to function exactly as before.

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

1. **More client-side work.** The UI/SDK becomes responsible for more computation. For individual entity pages this is fine (trivial folds). For the Funding Portal's cross-cutting aggregations, it means the client is doing N multicalls + fold operations. At modest scale (dozens of aligned projects) this is fast. At large scale (hundreds+), you might want a caching layer or to bring back selective server-side aggregation.

2. **Loss of Ponder's dev experience.** Ponder gives you hot reload, auto-generated GraphQL types, built-in reorg handling, factory contract patterns. The event cache is simpler but less ergonomic during development. This matters less after initial development is done.

3. **The "sort by popularity" gap.** Global ranking queries are harder without pre-computed aggregates. The workarounds (fold all events client-side at small scale, or add a counter to the registry) are fine but not as clean as a pre-built database query.

4. **You're building something custom.** Ponder is a maintained open-source project with a community. The thin event cache is your own code. It's much simpler code, but it's *your* code to maintain. (Counter-argument: the event cache is so simple that there's barely anything to maintain.) (Other counter-argument: let's just use Ponder for the event cache. The point of this isn't necessarily to eliminate the dependency on Ponder, just to simplify the architecture.)

5. **Initial latency for cold entities.** When someone visits a project page for the first time after a cache rebuild, the SDK fetches and folds events on the spot. For a project with thousands of events, this might take a noticeable moment. The current system pre-computes so pages load instantly. Mitigations: client-side caching (fold once, cache the result), or a service worker that pre-folds popular entities.

### Bottom line

The redesign trades a moderate amount of client-side complexity for a large reduction in server-side complexity. Given that the system isn't deployed yet and the expected scale is modest, this tradeoff is strongly favorable. The migration path is incremental and each phase has standalone value.

The biggest risk is if the Funding Portal's cross-entity aggregations become a performance bottleneck at scale. But that's a bridge to cross when you get there — and the architecture makes it easy to add selective server-side aggregation for specific hot queries without rebuilding the full Ponder indexer.

**Recommendation: do it.** Start with Phase 1 (fold functions in the SDK)Take a look at specs/indexer/redesign.md, and do the first chunk of phase 1. Make sure the  — it's valuable even if you never do the rest, and it'll give you concrete data about whether client-side folding feels right in practice.

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

Added the thin event cache service to Ponder:

1. **events table** (`schemas/events.schema.ts`): Stores raw event data with:
   - id (txHash + logIndex), contractAddress, eventName, blockNumber, blockTimestamp
   - transactionHash, logIndex, topic0-3, data (ABI-encoded non-indexed params)

2. **Registry tables** (lightweight "what exists" tracking):
   - `statements_registry` (cidV1, createdAtBlock, createdAtTimestamp)
   - `projects_registry` (id, factoryAddress, createdAtBlock, createdAtTimestamp)
   - `alignment_attestations_registry` (id, attester, subjectAddress, statementId, createdAtBlock)
   - `implications_registry` (id, attester, fromStatementId, toStatementId, createdAtBlock)

3. **Event handlers** (`src/events-cache/index.ts`): Capture raw events for all contracts:
   - Beliefs: DirectSupport
   - Implications: ImplicationAttestation
   - AssuranceContractFactory: PubstarterAssuranceContractCreated
   - AssuranceContract: 6 events
   - SecondaryMarket: 7 events
   - PremintingERC1155: TransferSingle, TransferBatch
   - DelegatableNotes: 7 events
   - NoteIntent: NoteIntentAttested
   - AlignmentAttestations: AlignmentAttestation
   - MutableRefUpdater: RefUpdated

The existing Ponder indexer continues to function exactly as before. This is a pure addition.

Build passes, SDK tests pass (239 tests).


## Phase 4: Complete

Phase 4 of the indexer redesign is now complete. Here's what was implemented:

**SDK Changes:**
- Added `eventCacheUrl` and `contractAddresses` fields to `SDKMachinery`
- Created `eventCacheClient.ts` - utility for fetching events and registry data from the event cache REST API
- Created `eventDecoder.ts` - utility with ABIs and decode functions for all contracts (Beliefs, Implications, AssuranceContract, etc.)
- Updated conceptspace queries (`getStatement`, `getUserBelief`, `getImplicationsFrom`, `getImplicationsTo`, `getImplication`) to use event cache + fold when available, falling back to GraphQL otherwise

**Key Design Decisions:**
- Hybrid approach: SDK checks if `eventCacheUrl` + `contractAddresses` are configured. If yes, uses event cache + fold. Otherwise falls back to existing GraphQL queries.
- Registry-first: For "what exists" queries, uses registry tables (small, eagerly maintained). For entity state, fetches events and folds locally.
- Backward compatible: Existing code continues to work - just add `eventCacheUrl` and `contractAddresses` to enable Phase 4.
