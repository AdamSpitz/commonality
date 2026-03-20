# Indexer Architecture

This document describes the Commonality indexing architecture.

## Overview

The indexer is a thin event cache — a single Ponder application that watches all contracts, stores raw events in a single `events` table, and serves them via a REST API. All business logic (state reconstruction, aggregation, cross-subsystem queries) lives in the SDK's fold functions, not in the indexer.

## Architecture

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

No derived tables. No registry tables. No joins. One row per event, forever.

## How Subsystems Share Data

Previously, the five logical subsystems (Concept Space, Pubstarter, Marketplace, Delegation, Funding Portal) were described as separate indexers with federation via GraphQL. **This is no longer the case.**

All subsystems share a single event cache. The SDK's query functions for each subsystem fetch raw events from this cache (filtered by contract address and event name), then fold them into typed entity state client-side. Cross-subsystem queries (like the Funding Portal's "total funding for cause S") are implemented as SDK functions that call other subsystems' SDK query functions — no indexer-to-indexer communication needed.

## Why This Works

**Simple infrastructure:** One Ponder process, one database table, one REST endpoint. No schema migrations when event types change. No subsystem boundaries to maintain in the indexer.

**Fold logic versioned with the SDK:** When you change how state is computed, you update the SDK — no indexer redeployment, no re-sync.

**Dead entities cost nothing:** A project nobody visits = zero computation. The indexer stores the events but the SDK only folds them on demand.

**Trustless verification:** The event cache is a commodity service — anyone can run one, and anyone can verify its output against the chain. No opaque business logic to trust.

## Historical Note

The original architecture described 5 separate indexers with federation (one querying another's GraphQL API). This was replaced with the current thin event cache + SDK folds design. See [redesign.md](redesign.md) for the full rationale and migration history.
