# What we've been working on lately

Main thing I want to work on next:
  - CRITICAL BUGS: "npm run ui:test:e2e" has a bunch of errors. Get all of that fixed.
  - Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?

Other big things to do soon:
  - (Not a task for AI.) Satisfy myself that the whole thing works.
  - ?

## Issues Found: setBelief / UI Query Problems

### Issue 1: setBelief points to statements with no content [FIXED]

**Problem**: When the simulation generated `setBelief` or `setBeliefsInBatch` actions, it used statementIds derived from `keccak256(JSON.stringify(content))`. These were never actually published to IPFS, so when the indexer processed the DirectSupport events:

- It created statement placeholder records in the database
- The IPFS sync job tried to fetch content but nothing existed at the derived CID
- Resulted in empty/placeholder statements with no actual content

**Solution implemented**: Modified `fake-data-generation/runSimulation.js` to:
1. Upload statements to IPFS during simulation initialization using the SDK's `publishDocument` function
2. Store the real IPFS CID in each statement
3. Use the CID (not the mock keccak256 hash) when calling `setBelief`

The `.env` file already has `IPFS_API=http://localhost:5001` configured, which points to the local IPFS node from docker-compose.

---

### Issue 2: UI queries don't exist in GraphQL schema

The UI at `ui/src/conceptspace/pages/BrowseStatementsPage.tsx:50-51` queries:
- `browseStatementsByMostSupporters`
- `browseStatementsByNewest`

But these queries don't exist in the Ponder-generated GraphQL schema. The available queries are only:
- `statements(id)` - get single statement
- `statementss(...)` - paginated list (note double 's')

**Impact**: The Browse Statements page fails to load any data because the queries are invalid.

**Fix options**:
1. Update UI to query `statementss` with appropriate filters (orderBy believerCount for "most supporters", orderBy createdAt for "newest")
2. Add custom GraphQL resolvers to indexer for `browseStatementsByMostSupporters` and `browseStatementsByNewest`

---

## Miscellaneous TODO.md files

- [ui/TODO.md](ui/TODO.md)
