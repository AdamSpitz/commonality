# Scalability

This document describes how each component of the system is expected to scale.

## Overview

The system has a deliberate architecture: a thin event cache (no business logic) with client-side state computation in the SDK. This keeps complexity bounded and avoids a heavy indexer. Most queries are per-entity, not global — each entity's data is independent.

## Components

### Blockchain (L2)

- Scales naturally with the L2's throughput
- No on-chain state that grows unboundedly — each project/note/statement is its own logical unit
- Gas costs are the natural rate limiter

### Smart Contracts

- O(1) per event — simple storage updates
- No graph traversal or cross-contract loops
- Already designed with good indexed topics for efficient filtering

### Indexer (Ponder)

- Single `events` table, all raw events stored
- Each entity query fetches only that entity's events (filtered by address or ID)
- Query complexity is O(entities relevant to query), not O(all entities)
- Post-startup sync is fast — block-by-block processing from chain head

### SDK (Client-Side Folding)

- Fetches raw events for a specific entity, folds into entity state
- Per-project page: O(contributors) events
- Per-statement page: O(believers) events
- Per-note page: O(chain depth) events
- No global folds — each query is independent

### IPFS Content

- Statement text, project metadata stored on IPFS
- Content is static and content-addressed
- Needs a CDN/gateway layer for cold-start performance (not currently in place)

### Platform API Service

- In-memory caches for channel resolution, content lookups, verification challenges
- Stateless — can horizontally scale behind a load balancer
- Rate limits: would need to increase for high traffic

### UI (SPA)

- Single-page app served as static assets
- Can be hosted on IPFS with CORS headers on API services
- ENS or redirect service needed to point "latest" to current deployment CID

## Scalability Risks and Mitigations

| Concern | Risk | Mitigation |
|---------|------|------------|
| Global sorting/ranking ("top statements") | Requires global knowledge | Pagination or accept this needs full indexer |
| Funding Portal cross-project totals | Needs each project's funding | Read balances from chain (multicall) instead of folding |
| IPFS cold-start latency | First fetch is slow | Add CDN layer (Cloudflare gateway) |
| API rate limits | 5 req/min is low for viral traffic | Increase limits, use Redis caching |
| Indexer rebuild after outage | Minutes to hours depending on event count | Two-tier indexing: eager small tables + lazy per-entity |

## Key Property

Most queries are bounded by "how many events for this specific entity?" rather than "how many events ever?" This keeps the system tractable even at scale — a project with 10,000 contributors is still just O(10,000) events to fetch and fold for that project's page, not O(all projects).

The main things that need attention at scale are:
1. Global enumeration/ranking queries
2. Cross-entity aggregations (Funding Portal totals)
3. IPFS/CDN layer for content serving
4. API caching and rate limit increases