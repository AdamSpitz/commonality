# Commonality

## Getting started

**Prerequisites:** [Node.js 24.x](https://nodejs.org/), [Docker](https://docs.docker.com/get-docker/)

```bash
npm install
npm run build
./services.sh --start
./data.sh --seed
```

That's it. This starts a local Hardhat blockchain, deploys the smart contracts, starts IPFS, the Ponder indexer, the content-funding platform API service, and the UI, and populates the chain with fake data (10 users, 3 rounds). The UI will be at http://localhost:5173.

No API keys or secrets are needed for local development. See [DEPLOYMENT.md](DEPLOYMENT.md) for testnet/mainnet deployment (which does require secrets).

## Where to find various files

  - Specs: [specs/README.md](specs/README.md)
  - AI continuity notes: [CONTINUITY.md](CONTINUITY.md)
  - Reviews: [REVIEWS.md](REVIEWS.md)
  - Deployment instructions (including how to run locally): [DEPLOYMENT.md](DEPLOYMENT.md)
  - To-do list: [TODO.md](TODO.md)

## Feedback loops

- `npm run lint` to run various linters
- `npm run build` to make sure everything builds and type-checks
- `npm run test` to run the tests (takes many minutes!)

Note that the build and tests are run by the Git pre-commit hook, and the whole thing takes a few minutes to run, so if you're ready to commit and the only thing left to do is run the build and the tests, it's okay to just attempt to commit and make sure it goes through; no need to run the whole test suite only to have it run again when you commit immediately afterward.

## Artifacts

TODO: make these real markdown links

  - Smart contracts: `hardhat/README.md`
  - Content-funding contracts: `hardhat/contracts/content-funding/`
  - Fake-data generation: `fake-data-generation/README.md`
  - Indexer: `indexer/README.md`
  - SDK (used by both integration-tests and ui): `sdk/README.md`
  - Integration tests: `integration-tests/README.md`
  - UI: `ui/README.md`
  - Platform API service: `platform-api-service/README.md`
  - Implication Attester AI: `implication-attester/README.md`
  - Content Attester AI: `content-attester/README.md`
  - Finder AI: `finder/README.md`

## Other things worth noting

### Unusual architecture: Client-Side Folding

The indexer is intentionally dumb — it's a thin event cache that stores raw blockchain events and nothing else. All state computation ("folding") happens client-side in the SDK. If you're wondering why the indexer has no business logic, this is why. See [specs/indexer/README.md](specs/indexer/README.md).

### Local dev done using Docker

We have a Docker Compose setup for running Hardhat and the Ponder indexer. This provides a clean, isolated environment for development and testing.

## High-level overview of current status

For now, this project hasn't even been deployed yet, so don't worry about backward compatibility.

- Test coverage exists across all major subsystems (SDK, hardhat, integration tests, UI, and e2e coverage for pubstarter/fundingportals/mutablerefs/marketplace).
- Subjectiv trust-network computation now runs in a Web Worker, rehydrates cached trusted sets plus visited per-user direct-trust mappings from IndexedDB on startup, refreshes on direct-trust edits/manual refresh/window focus/a periodic timer, streams partial trusted-set updates into the UI while recomputation is still underway, has higher-level UI integration coverage across the direct-trust settings flow plus funding-portal and leaderboard trust-aware filtering, and now has clearer Settings/funding-portal copy around personal trust networks, partial loading, and the no-direct-trust fallback.
- Content-funding MVP is implemented across contracts, SDK, platform API service, attester infrastructure, and UI. Recent follow-up work fixed the claim/create-contract UI paths, added focused `CreateContractPage` coverage for the key validation and creator-vs-third-party flows, now surfaces already-registered content immediately during create-contract validation, renders per-content known attesters coherently, uploads real metadata to IPFS instead of placeholder CIDs, integrates content-funding-aware display in funding-portal aligned-projects list, and caches oEmbed preview results. Remaining follow-up is running the live Playwright flow against a real local stack. Non-MVP work remains embedded wallets/off-ramp.
