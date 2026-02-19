# What we've been working on lately

Main thing I want to work on next:
  - CRITICAL BUGS: "npm run ui:test:e2e" has a bunch of errors. Get all of that fixed.
  - Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?

Other big things to do soon:
  - (Not a task for AI.) Satisfy myself that the whole thing works.
  - ?

## Issues Found: setBelief / UI Query Problems

### Issue 1: setBelief points to statements with no content

When the simulation generates `setBelief` or `setBeliefsInBatch` actions, it uses statementIds derived from `keccak256(JSON.stringify(content))` in `fake-data-generation/generateStatements.js:17`. These are never actually published to IPFS, so when the indexer processes the DirectSupport events:

- It creates statement placeholder records in the database (see `indexer/src/conceptspace/index.ts:35-60`)
- The IPFS sync job tries to fetch content but nothing exists at the derived CID
- Results in empty/placeholder statements with no actual content

**Impact**: Even though beliefs ARE being recorded, the statements have no content to display.

**Fix options**:
1. Have the simulation actually publish statements to IPFS before calling setBelief
2. Use real IPFS CIDs from the start
3. Add sample statements directly to the indexer database (not via IPFS)

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
