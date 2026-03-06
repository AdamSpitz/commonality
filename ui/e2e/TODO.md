# E2E Tests to-do list

## Current Status (Mar 2026)

Work in progress. Previous fixes applied but statement-indexing issue remains unsolved.

- **PASSING (10/16)**: wallet-connection, browse-statements, statement-creation-form tests
- **FAILING (6/16)**: belief-expression, statement-creation, user-profile tests

## USER'S NOTES

I'm confused about a lot of this.





## Fixes Applied So Far

### 1. Vite proxy for CORS (`ui/vite.config.ts`)
Added proxy to avoid browser CORS errors when querying the indexer:
```ts
server: {
  proxy: {
    '/graphql': 'http://localhost:42069',
    '/conceptspace': 'http://localhost:42069',
  },
},
```

### 2. VITE_GRAPHQL_URL points through Vite proxy (`ui/e2e/global-setup.ts`)
Changed the URL written to `ui/.env` from `http://localhost:42069/graphql` to
`http://localhost:5173/graphql` so both browser and Node.js test runner go through
the Vite proxy.

### 3. PONDER_EPHEMERAL=true (`ui/e2e/global-setup.ts`)
The Ponder bind mount (`./data/ponder`) persists across `docker-compose down -v`
(which only removes named volumes, not bind mounts). This caused Ponder to try
fetching blocks from a prior chain that no longer exists.

Fix: pass `PONDER_EPHEMERAL=true` to `docker-compose up` so Ponder uses an
in-memory PGLite database instead.

### 4. Fix `process is not defined` in browser (`sdk/src/utils/ipfs.ts`)
The SDK called `process.env` directly, which throws `ReferenceError` in browsers.
Fixed by guarding: `const env = typeof process !== 'undefined' ? process.env : {}`

### 5. Playwright test timeout increased to 120s (`ui/playwright.config.ts`)
The default 30s was too short — `waitForStatement` alone can take 30s.

### 6. `waitForStatement` polls faster (`ui/e2e/utils/indexer.ts`)
Changed from `maxAttempts=20, intervalMs=2000` (40s max) to
`maxAttempts=60, intervalMs=500` (30s max, but more responsive).

## Remaining Problem: Statement Not Being Indexed

After all the above fixes, the test still fails with:
```
Statement <cid> not found after 60 attempts
IPFS sync result: { success: true, syncedCount: 0 }
```

The test successfully:
- Creates the statement on IPFS
- Signs the transaction on-chain
- Triggers the IPFS sync endpoint

But Ponder never indexes the statement. `syncedCount: 0` means the IPFS sync
job found no statements waiting for content — suggesting Ponder hasn't processed
the `BeliefChanged` event yet.

## Hypotheses for Why Indexing Fails

### H1: Ponder hasn't caught up to the new block yet
Even with `pollingInterval: 100ms`, Ponder needs to:
1. Detect the new block
2. Process the event
3. Write to DB
4. Make it available via GraphQL

The test triggers the IPFS sync immediately after creating the statement.
If Ponder hasn't processed the event yet, the statement won't be in the DB
at all, so syncedCount=0 is correct (nothing to sync yet).

**Fix candidate**: Wait for Ponder to index the statement *before* triggering
the IPFS sync. Currently we trigger sync first, then wait — but we should
wait for the statement row to appear first, then optionally sync.

Or: increase `waitForStatement` to more attempts / longer total wait (e.g.
120 attempts × 500ms = 60 seconds).

### H2: The VITE_GRAPHQL_URL proxy isn't working from Node.js
`waitForStatement` in `indexer.ts` fetches `http://localhost:5173/graphql`.
This should be proxied by Vite to `localhost:42069`. But if the Vite dev
server isn't running yet when `waitForStatement` is called, the request would
fail silently (the `catch {}` block swallows all errors).

**Fix candidate**: Add logging to `waitForStatement` to surface errors, or
query the indexer directly at `http://localhost:42069/graphql` from Node.js
(only the browser needs the proxy).

### H3: The indexer logs show a deeper error
We haven't checked the indexer container logs during the test run.
```bash
docker-compose logs indexer --tail=100
```
This would show if Ponder is erroring on the BeliefChanged event.

## Recommended Next Steps

1. **Check indexer logs** during/after a test run to see if Ponder is
   processing events or erroring.

2. **Simplify `waitForStatement`**: have it query `localhost:42069` directly
   (not via Vite proxy) since it runs in Node.js. The proxy is only needed
   for browser code.

3. **Re-order the wait/sync sequence**: wait for the statement to appear in
   the indexer DB *first*, then trigger IPFS sync for content.

## Notes

- Run `npm run ui:test:e2e` from the `ui/` directory
- Check `ui/test-results/` for screenshots and videos of failures
- `ui/e2e/global-setup.ts` handles Docker orchestration
- The Ponder indexer config is at `indexer/ponder.config.ts`
- Contract addresses flow: `hardhat/scripts/deploy.js` → `.env` (root) →
  `docker-compose.yml` env_file → Ponder
- The `global-setup.ts` also copies addresses to `ui/.env` for the test runner
