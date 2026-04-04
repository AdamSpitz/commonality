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

## Further Reading

- [redesign.md](redesign.md) — full history and rationale for moving to this design (the original system had ~20 derived tables, background IPFS jobs, and subsystem federation via GraphQL)
- [indexer-performance.md](indexer-performance.md) — performance analysis, including the O(N) fold cost discussion and lazy reindexing options
- [ipfs-in-indexer.md](ipfs-in-indexer.md) — why IPFS content is not cached in the indexer
