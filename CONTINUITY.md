# Continuity notes for ephemeral AI instances

## Content-funding e2e test — COMPLETED (pending live test run)

### What was done

Identified and fixed the root cause of the `waitForIndexerToSyncToTxHash()` hang that blocked
both the Subjectiv and content-funding Playwright tests.

**Root cause**: `waitForIndexerToSyncToTxHash` polls `{origin}/status` where origin is derived
from `machinery.indexerUrl` (e.g. `http://localhost:5173/graphql` → `http://localhost:5173`).
But Vite's dev-server proxy did not proxy `/status` to the indexer, so every poll got a 404 from
Vite and the function timed out without ever advancing past block 0.

**Fixes made**:
1. `ui/vite.config.ts` — added `/status` to the proxy so `http://localhost:5173/status` forwards
   to the indexer.
2. `ui/e2e/global-setup.ts` — added content-funding addresses (CONTENT_REGISTRY_ADDRESS,
   CHANNEL_REGISTRY_ADDRESS, CHANNEL_ESCROW_ADDRESS, CREATOR_CONTRACT_FACTORY_ADDRESS) to
   `copyContractAddresses` so they are reliably written to `ui/.env` with `VITE_` prefix.
3. `ui/e2e/utils/blockchain.ts` — exposed content-funding addresses from `getContractAddresses`.
4. `hardhat/scripts/deploy.js` — writes content-funding `VITE_*` vars to `ui/.env` on fresh deploy.
5. `sdk/src/indexer-sync.ts` — added explicit `number` type annotation to `timeoutMs` parameter
   to allow callers to pass values other than the literal-typed default (10000).
6. `ui/e2e/content-funding-flow.spec.ts` — new Playwright spec that creates a creator assurance
   contract on-chain and verifies the channel card appears on the Browse Creators page.

### Notes for next session

The code changes are complete and all unit tests pass (`npm run build && npm run test`). The
Playwright test has NOT been run against a live stack yet because that requires the full Docker
Compose setup (hardhat + indexer + Vite dev server). To validate end-to-end, run:

```
cd ui && npx playwright test content-funding-flow
```

If it fails:
- Check that `/status` is now proxied correctly: `curl http://localhost:5173/status` should return
  the Ponder sync status JSON (not 404).
- Check that the indexer has `CREATOR_CONTRACT_FACTORY_ADDRESS` set: look at
  `docker-compose logs indexer | grep CREATOR_CONTRACT`.
- If `waitForIndexerToSyncToTxHash` still times out, add verbose logging to the test by setting
  `shouldTestsBeVerbose: true` in `createSDKMachinery`.

The Subjectiv e2e test (`subjectiv-flow.spec.ts`) is blocked by the same `/status` proxy issue,
so the fix here should unblock that test too (no code changes needed there).

### Files changed

- `ui/vite.config.ts`
- `ui/e2e/global-setup.ts`
- `ui/e2e/utils/blockchain.ts`
- `hardhat/scripts/deploy.js`
- `sdk/src/indexer-sync.ts`
- `ui/e2e/content-funding-flow.spec.ts` (new)
