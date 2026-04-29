# High-Level Test

## High-Level Test Report: Commonality Project

### 2026-04-29 Fix Status
- Implemented fixes for Issue #1 and Issue #2.
- Live re-test still pending: restart services, reseed, and confirm Browse Statements shows seeded data.

### ✅ What's Working
- **Services start cleanly** — Hardhat, IPFS, indexer, platform API, all 4 UI domains build and publish to IPFS
- **Indexer syncs correctly** — DirectSupport events are indexed and queryable via REST API
- **Seed data generation runs** — 122 actions across 3 rounds, invariant checks ALL PASSED
- **Content-funding scenarios work** — Twitter, YouTube, Substack channels all created correctly
- **Homepage loads** — All 4 UI domains render properly from IPFS gateway
- **CORS is configured** — Indexer returns `access-control-allow-origin: *`

### 🔴 Issue #1: UI Shows "No Statements Found" Despite Seeded Data
**Root cause:** The UI is baked with the **wrong Beliefs contract address**.
- UI queries indexer for: `0x5FbDB2315678afecb367f032d93F642f64180aa3` (Hardhat default)
- Actual deployed Beliefs contract: `0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154`
- Result: zero events returned, empty statements page

The `publish-ui-to-ipfs.mjs` script does **not** pass `VITE_BELIEFS_CONTRACT_ADDRESS` (or other contract addresses) to the build. It relies on the `.env` file being read by Vite, but the `.env` file on the host may have stale addresses from a previous deployment, or the Docker build may not be picking them up correctly.

### 🟡 Issue #2: `purchaseFromPrimaryMarket` Errors in Seeding
11 out of 122 seed actions fail with custom error `0xe450d38c` on `buyERC1155`. The pattern: users trying to buy Pubstarter tokens but the contract rejects them. This is a Pubstarter contract issue — possibly insufficient balance, or the project hasn't met some precondition.

### 🔍 Other Observations
- **Architecture note confirmed**: Statement discovery IS event-driven via DirectSupport only. This works fine once the contract address is correct.
- **Performance concern confirmed**: `browseStatements` fetches ALL DirectSupport events (up to 10,000) and folds in memory. Works for now, will degrade.

### Recommended Next Steps
1. **Fix contract address injection** in `publish-ui-to-ipfs.mjs` — explicitly pass all `VITE_*_CONTRACT_ADDRESS` vars from the deployment output
2. **Debug Pubstarter buyERC1155** error `0xe450d38c`
3. **Re-run this test** after the fixes to confirm statements appear

