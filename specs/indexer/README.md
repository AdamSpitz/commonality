# Indexer Architecture: Client-Side Folding

The Commonality indexer uses a design pattern called **Client-Side Folding**. This is intentional and non-obvious: **the indexer is dumb on purpose**, and all the intelligence lives in the SDK.

## What It Means

The indexer is a **thin event cache**: it watches the blockchain for contract events, stores them raw, and serves them via a simple REST API. It does no aggregation, no business logic, no IPFS fetching — nothing except "store event → serve event".

All entity-state computation (reconstructing a project's state, computing funding totals, resolving delegation chains) happens **client-side in SDK fold functions**. The SDK fetches the raw events it needs, then folds them into typed entity state locally.

```
┌─────────────────────────────────────────┐
│  Thin Event Cache (Ponder)              │
│  - Watches chain for all contract events│
│  - Stores raw events in one DB table    │
│  - Serves them via REST: GET /api/events│
│  - No business logic, no aggregation    │
│  - No IPFS fetching, no social data     │
└─────────────────────────────────────────┘
        │
        │  GET /api/events?contractAddress=...&eventName=...&topic1=...
        ▼
┌─────────────────────────────────────────┐
│  SDK with fold functions                │
│  - Fetches raw events from the cache    │
│  - Folds them into entity state         │
│    client-side                          │
│  - Reads current state from contract    │
│    view functions where available       │
│  - Fetches IPFS content directly        │
│    from a gateway                       │
│  - Does cross-entity aggregation        │
│    (the Funding Portal logic)           │
└─────────────────────────────────────────┘
```

## Why

**Simplicity.** One Ponder process, one database table (`events`), one REST endpoint. No schema migrations when event structures change. No subsystem boundaries to maintain in the indexer.

**Fold logic versioned with the SDK.** When you change how state is computed, you update the SDK — no indexer redeployment, no re-sync of derived tables.

**Dead entities cost nothing.** A project nobody visits = zero computation. Events are stored, but the SDK only folds them on demand.

**Trustless verification.** The event cache is a commodity service — anyone can run one, and clients can verify its output against the chain. No opaque server-side aggregation to trust.

## The Events Table

The indexer stores one row per on-chain event:

```
events(
  id,                        -- txHash + logIndex
  contractAddress,
  eventName,
  blockNumber, blockTimestamp,
  transactionHash, logIndex,
  topic0,                    -- event signature
  topic1, topic2, topic3,    -- indexed params
  data                       -- ABI-encoded non-indexed params
)
```

No derived tables. No joins. One row per event, forever.

## Cross-Subsystem Queries

All five subsystems (Concept Space, Pubstarter, Marketplace, Delegation, Funding Portal) share the single event cache. Cross-subsystem queries (like "total funding for cause S") are implemented as SDK functions that call other subsystems' SDK query functions — no indexer-to-indexer communication needed.

## Fold Versioning and Upgrades

### Current state: accumulators exist, storage doesn't

The fold functions are designed for resumable folding. `foldProject`, `foldSecondaryMarket`, `foldContributionsFromEvents`, and `foldTokenBurns` all accept an optional `initialAccumulator` / `initialState` parameter and return the updated accumulator alongside the result. The intent is: store the accumulator + the block number it's current through, then on the next query fetch only new events and pass the saved accumulator in.

**However, no code currently stores or retrieves these accumulators.** The query layer (`getProject`, etc.) always folds from scratch. The resumable-fold infrastructure is there but unconnected.

For now this is fine — folds are fast and entities are small. It becomes worth wiring up if fold latency becomes noticeable (e.g. a project with tens of thousands of contributions).

### If/when we store accumulators: versioning is required

A stored accumulator is a snapshot of fold state at a point in time. If the fold logic changes and a client loads a stale accumulator, it will resume from a wrong base and produce wrong results. Version numbers prevent this.

The simplest approach: add a `foldVersion` constant to each fold module and embed it in the accumulator type.

```typescript
// In folds.ts
export const PROJECT_FOLD_VERSION = 1;

export interface ProjectAccumulator {
  foldVersion: typeof PROJECT_FOLD_VERSION;
  // ... rest of fields
}
```

When loading a stored accumulator, check `foldVersion === PROJECT_FOLD_VERSION`. If it doesn't match, discard and re-fold from scratch. No migration logic needed — just invalidate and recompute.

Bump the version whenever the accumulator shape changes or the fold logic changes in a way that would make a previously-saved accumulator produce wrong results when resumed. Additive changes (new fields with sensible defaults) can often be handled without a bump by using optional fields.

### What about the raw events themselves?

The raw events table is append-only and source-of-truth. It never needs migration — events are stored as emitted by the chain, and the chain is immutable. If you add a new event type to a contract, old events don't have it; old SDK versions just don't fold it. No version coordination needed.

The only case where raw event interpretation changes is if a contract's ABI changes in a backward-incompatible way (e.g. an event parameter is reordered or retyped). This would require updating the event decoder in the SDK. Old events in the cache would need to be re-decoded with the old ABI and the new events with the new ABI — or, more simply, blow away the event cache and rebuild from scratch (the indexer's standard recovery path).

### Summary

| Change | Impact | Action needed |
|--------|--------|---------------|
| Fold logic fix (no accumulator shape change) | None while accumulators aren't stored | Once stored: bump `foldVersion` |
| Accumulator shape change | Stored accumulators invalid | Bump `foldVersion`; clients discard and re-fold |
| New event type added to contract | None for old clients | Deploy new SDK to handle new events |
| Event ABI breaking change | Raw events misinterpreted | Update decoder; rebuild event cache if needed |

---

## Further Reading

- [redesign.md](redesign.md) — full history and rationale for moving to this design (the original system had ~20 derived tables, background IPFS jobs, and subsystem federation via GraphQL)
- [indexer-performance.md](indexer-performance.md) — performance analysis, including the O(N) fold cost discussion and lazy reindexing options
- [ipfs-in-indexer.md](ipfs-in-indexer.md) — why IPFS content is not cached in the indexer
