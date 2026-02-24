# What we've been working on lately

# E2E Tests Progress (Feb 2026)

## Current Status

The E2E tests partially work:
- **PASSING (10/16)**: wallet-connection, browse-statements, statement-creation-form tests
- **FAILING (6/16)**: belief-expression, statement-creation, user-profile tests

## Failing Tests

The following tests timeout because they can't navigate to statement pages:
1. `should express belief and see believer count increase on statement page`
2. `should express disbelief and see disbeliever count on statement page`
3. `should create a statement and see it appear on browse page`
4. `should display connected user profile with beliefs`
5. `should switch between tabs on profile page`
6. `should view other user profile via URL`

## Root Cause Analysis

The failing tests all involve navigating to URLs with statement CIDs:
- `/statement/{cid}`
- `/statements` (browse page)
- `/user/{address}` (profile page)

These pages query the GraphQL indexer at `http://localhost:42069/graphql` from the browser. The test output shows:
- All blockchain/IPFS/indexer setup works correctly (transactions succeed, IPFS syncs)
- But the browser stays on the home page instead of navigating

**Suspected cause**: CORS issues - the Vite dev server runs on port 5173, and when the browser tries to fetch from the GraphQL endpoint at localhost:42069, it may be blocked by CORS policies. The browser can't access localhost:42069 from localhost:5173.

## Evidence

1. The error-context.md shows the test is stuck on the home page
2. Tests that don't query GraphQL (wallet-connection, form validation) pass
3. The Docker setup works (contracts deploy, indexer syncs)
4. The SDK functions work in Node.js (tests create statements successfully)

## Suggested Fixes

### Option 1: Add CORS to Ponder indexer
The Ponder indexer doesn't expose CORS headers. Add CORS configuration to allow localhost:5173 to query it.

### Option 2: Add Vite proxy
Configure Vite to proxy `/graphql` requests to `http://localhost:42069/graphql`. This avoids CORS entirely.

In `ui/vite.config.ts`:
```ts
export default defineConfig({
  server: {
    proxy: {
      '/graphql': 'http://localhost:42069',
    },
  },
  // ... existing config
})
```

### Option 3: Use browser-fetch polyfill
The SDK might be using node-fetch or a different fetch that doesn't work in browser context. Check if `graphql-request` works in the browser.

## Test Timeouts

The tests use 30 second timeouts which may be too short. Consider increasing:
- `testTimeout: 60000` in playwright.config.ts

## Notes for Next Implementor

- Run `npm run ui:test:e2e` to see current state
- Check test-results/ for screenshots of failures
- The global-setup.ts handles Docker orchestration
- Tests use SDK directly for blockchain calls, bypass wagmi for signing

---

Main thing I want to work on next:
  - Get the e2e tests (npm run ui:test:e2e) working.

Other big things to do soon:
  - Fix the problems in TODO-smart-contracts.md.
  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) I need to do a big code review myself, of the whole thing. I don't trust it.
    - Stuff I'm suspicious about:
      - Statement IDs. Are we using the correct CID format? Are we using the CID at all?
  - ?

---

## Miscellaneous TODO.md files

- [ui/TODO.md](ui/TODO.md)
