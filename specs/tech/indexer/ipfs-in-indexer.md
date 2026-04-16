# IPFS content in the indexer: current design and potential alternative

## Current design

The indexer fetches IPFS content (statement text, project metadata) via background sync jobs and stores it in the database alongside on-chain data. This serves three purposes:

1. **Queryability**: Parsed fields like `statementType`, `title`, and `excerpt` are stored as separate columns, enabling filtering and search.
2. **Joined responses**: The GraphQL API returns complete records (e.g. statement + believer count + content) in a single query.
3. **Derived fields**: The `excerpt` is generated from raw IPFS content, not stored on-chain or in IPFS.

The background sync jobs retry failed IPFS fetches (up to 10 times over 24 hours) to handle gateway flakiness without blocking event handlers.

## Potential alternative: don't cache IPFS content in the indexer

IPFS is inherently content-addressed and cache-friendly. Instead of fetching and storing content in the indexer's database, we could:

- Store only the CID in the indexer (which we already get from on-chain events)
- Point clients at an IPFS gateway (or a local IPFS node on the same machine) for content fetching
- If latency matters, run a local IPFS node that naturally caches anything requested through it

### What this would simplify

- Remove the background sync job framework (`ipfsSyncJob.ts` and per-subsystem sync jobs)
- Remove `content`, `contentFetched`, `statementType`, `title`, `excerpt` columns from the statements table
- Remove `metadataContent`, `metadataFetched` columns from the projects table
- Fewer failure modes in the indexer (no retry logic, no IPFS gateway dependency)
- Faster indexer rebuilds (no need to re-fetch IPFS content)

### What would need to move elsewhere

- **Content parsing and field extraction**: The client (or a thin middleware) would need to fetch the IPFS JSON and parse out `statementType`, `title`, etc.
- **Excerpt generation**: Would move to the client side or a separate service.
- **Content-based filtering**: Any GraphQL queries that filter by `statementType` or search by excerpt would no longer work at the indexer level. Either the client filters after fetching, or a separate search index handles it.

### Open questions

- How important is server-side filtering by content fields in practice? If clients always fetch full lists and filter locally, the cost is low. If there are queries like "all statements of type X," it matters more.
- Could a lightweight content-indexing service (separate from the chain indexer) handle the queryability concern without coupling IPFS content to chain indexing?
