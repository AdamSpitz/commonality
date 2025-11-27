# IPFS Content Sync Implementation

## Overview

This document describes the IPFS content sync implementation for the Concept Space indexer.

## Problem Statement

Previously, the indexer used a fire-and-forget `.then()` pattern to fetch IPFS content in event handlers:

```typescript
fetchStatementContent(cid).then(async (content) => {
  // Update database...
});
```

**Issues:**
- Race conditions with Ponder's indexing lifecycle
- No retry mechanism for failed fetches
- IPFS gateway failures could result in permanently missing content
- Unclear error handling

## Solution: Background Sync Job

We implemented a background job that periodically retries fetching IPFS content for statements where `contentFetched = false`.

### Architecture

```
Event Handler              Background Job               IPFS Gateway
     │                           │                            │
     │  1. Create statement      │                            │
     │     (contentFetched=false)│                            │
     ├──────────────────────────>│                            │
     │                           │                            │
     │                           │  2. Periodic sync (5 min)  │
     │                           ├───────────────────────────>│
     │                           │                            │
     │                           │  3. Fetch content          │
     │                           │<───────────────────────────┤
     │                           │                            │
     │                           │  4. Update DB              │
     │                           │    (contentFetched=true)   │
     │                           │                            │
```

### Key Components

#### 1. Event Handler ([src/conceptspace/index.ts](src/conceptspace/index.ts))

```typescript
async function ensureStatement(ctx, statementId, timestamp) {
  // Create placeholder record immediately (no blocking)
  await ctx.db.insert(statements).values({
    id: statementId,
    cid,
    content: null,           // Will be filled by sync job
    statementType: null,
    title: null,
    excerpt: null,
    contentFetched: false,   // Flag for sync job
    // ...
  });
}
```

#### 2. Background Sync Job ([src/conceptspace/utils/ipfsSyncJob.ts](src/conceptspace/utils/ipfsSyncJob.ts))

**Configuration:**
- **Interval:** 5 minutes
- **Max Retries:** 10 attempts per statement
- **Timeout:** 24 hours (then gives up)
- **Batch Size:** 100 statements per iteration

**Features:**
- Tracks retry attempts per statement
- Cleans up tracking data after success or timeout
- Logs detailed progress for debugging
- Graceful error handling

**How it works:**
1. Query database for statements where `contentFetched = false`
2. For each statement:
   - Fetch content from IPFS gateway
   - Parse and validate JSON structure
   - Update database with parsed fields
   - Mark `contentFetched = true`
3. Track failures and retry on next iteration
4. Give up after max retries or 24 hours

#### 3. API Server Integration ([src/api/index.ts](src/api/index.ts))

The sync job starts automatically when the API server launches:

```typescript
startIpfsSyncJob({
  db,
  log: {
    info: (msg) => console.log(`[IPFS Sync] ${msg}`),
    warn: (msg) => console.warn(`[IPFS Sync] ${msg}`),
    error: (msg) => console.error(`[IPFS Sync] ${msg}`),
  },
});
```

## Why IPFS Data Must Be in the Indexer

Some might ask: "Why not just fetch IPFS data from the UI?"

**Answer:** The indexer needs IPFS content for several critical features:

1. **Full-Text Search** ([queries-and-actions.md:16](../specs/queries-and-actions.md#L16))
   - Searching by keyword requires indexing the statement content
   - Can't search what you don't have stored

2. **Statement Lists** ([queries-and-actions.md:12-13](../specs/queries-and-actions.md#L12-L13))
   - Trending/popular statements need titles and excerpts
   - Would require N IPFS fetches to display a list of N statements

3. **Performance**
   - IPFS gateways can be slow (100ms-5s per fetch)
   - Caching in indexer provides instant query responses
   - Reduces load on IPFS gateway

4. **Reliability**
   - IPFS gateway downtime doesn't affect app functionality
   - Content is available even if gateway is temporarily unavailable

## Benefits of This Approach

✅ **Non-blocking**: Event handlers return immediately, no impact on indexing speed

✅ **Resilient**: Automatic retries handle temporary gateway failures

✅ **Observable**: Clear logging shows sync progress and issues

✅ **Eventually Consistent**: Content arrives within minutes, which is acceptable for most use cases

✅ **Separates Concerns**: Event handling and external data fetching are independent

✅ **Testable**: Sync job can be tested independently of event handlers

## Configuration

Environment variables (optional):

```bash
# IPFS gateway URL (default: https://gateway.pinata.cloud/ipfs)
IPFS_GATEWAY=https://your-gateway.example.com/ipfs
```

Internal configuration can be adjusted in [src/conceptspace/utils/ipfsSyncJob.ts](src/conceptspace/utils/ipfsSyncJob.ts):

```typescript
const SYNC_INTERVAL_MS = 5 * 60 * 1000;      // 5 minutes
const MAX_RETRIES = 10;                       // 10 attempts
const RETRY_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
```

## Monitoring

The sync job logs important events:

```
[IPFS Sync] Starting IPFS sync job (interval: 300s, max retries: 10)
[IPFS Sync] Found 15 statements with pending content fetches
[IPFS Sync] Successfully synced IPFS content for statement 0x1234...
[IPFS Sync] IPFS sync job completed: 12 succeeded, 3 failed
[IPFS Sync] Giving up on statement 0x5678... after 10 attempts
```

## Future Improvements

Potential enhancements for production:

1. **Priority Queue**: Prioritize statements with more believers
2. **Multiple Gateways**: Fallback to alternative IPFS gateways
3. **Metrics**: Track success rate, average fetch time
4. **Admin API**: Endpoint to manually trigger sync for specific statements
5. **Smart Backoff**: Exponential backoff for failing statements

## Testing

The sync job is designed to be testable:

1. **Unit Tests**: Mock database and IPFS fetch
2. **Integration Tests**: Use test IPFS gateway and real database
3. **Manual Testing**: Create statements and watch sync job logs

See [src/conceptspace/utils/__tests__/ipfsSyncJob.test.ts](src/conceptspace/utils/__tests__/ipfsSyncJob.test.ts) for test structure.

## Related Files

- [src/conceptspace/index.ts](src/conceptspace/index.ts) - Event handlers (statement creation)
- [src/conceptspace/utils/ipfsSyncJob.ts](src/conceptspace/utils/ipfsSyncJob.ts) - Background sync job
- [src/conceptspace/utils/ipfs.ts](src/conceptspace/utils/ipfs.ts) - IPFS fetch utilities
- [src/api/index.ts](src/api/index.ts) - API server (job initialization)
- [ponder.schema.ts](ponder.schema.ts) - Database schema (statements table)

## References

- Issue #6 in [specs/indexers.md:222-238](../specs/indexers.md#L222-L238)
- Queries requiring IPFS data: [specs/queries-and-actions.md](../specs/queries-and-actions.md)
- Statement format: [specs/statements.md](../specs/statements.md) (if exists)
