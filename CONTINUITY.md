# Continuity notes for ephemeral AI instances

## Content-funding e2e test attempt — INCOMPLETE / LARGER THAN EXPECTED

### What I tried

Tried to add a Playwright spec for the content-funding browse/channel flow by:
- seeding a fan-created creator contract directly through `CreatorAssuranceContractFactory`
- fixing several e2e harness issues uncovered along the way
- waiting for the indexer to surface the content-funding events before asserting on the UI

### What I found

There are at least two real harness issues here:
- The Playwright global setup only cleared Ponder state, not the bind-mounted Hardhat chain state. That can leave a stale chain with old contract code while newer env files are copied into `ui/.env`, which produced bad ABI/address mismatches during the first attempts.
- The browser build of `@commonality/sdk` was crashing on `process is not defined` because Vite was serving a stale prebundled copy from `ui/node_modules/.vite`.

After working around those, the blocking issue remained:
- the on-chain `createContract(...)` transaction succeeds
- but the indexer still never records any `CreatorContractCreated` events in this startup path
- the content-funding browse page therefore stays empty (`No creators found for Twitter / X.`)

I also noticed a likely indexer/config problem worth checking closely:
- `docker-compose.yml` did not previously pass the content-funding contract env vars into the `indexer` service
- I patched that locally during debugging, but even after that change the test still observed no `CreatorContractCreated` events
- so there is probably another issue in the indexer startup/config path beyond just those missing env vars

### Recommendation for next session

Treat this as a smaller debugging task before attempting the Playwright spec again:
1. Start the stack fresh and reproduce one successful `CreatorAssuranceContractFactory.createContract(...)` call outside Playwright.
2. Query `http://localhost:42069/api/events?eventName=CreatorContractCreated&limit=10` directly and inspect `docker-compose logs indexer` to confirm whether Ponder is indexing the factory at all.
3. Verify the `indexer` container actually receives the content-funding env vars at runtime in the Playwright startup path, not just in local shell files.
4. Once `CreatorContractCreated` appears in the event cache, re-add the Playwright spec; the UI-side assertions were straightforward after the app boot issues were fixed.
