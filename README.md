# Commonality

## Getting started

**Prerequisites:** [Node.js 24.x](https://nodejs.org/), [Docker](https://docs.docker.com/get-docker/)

```bash
npm install
npm run build
./services.sh --start
./data.sh --seed
```

That's it. This starts a local Hardhat blockchain, deploys the smart contracts, starts IPFS, the Ponder indexer, and the content-funding platform API service, then publishes the SPA build to the local IPFS gateway and prints the resulting `http://localhost:8080/ipfs/<cid>/commonality-ui/#/` URL. The latest CID and SPA URL are also written to `./data/ui-ipfs/`. You can re-print the current SPA URL any time with `./services.sh --url`. After that, run `./data.sh --seed` to populate the chain with fake data (10 users, 3 rounds).

No API keys or secrets are needed for local development. See [DEPLOYMENT.md](DEPLOYMENT.md) for testnet/mainnet deployment (which does require secrets).

## Finding relevant specs

See [ROLES.md](ROLES.md) for the full guide. Quick version:

  - **Founder (vision/strategy):** [docs/vision-and-strategy/](docs/vision-and-strategy/) + [specs/README.md](specs/README.md)
  - **Product manager (what to build):** [specs/README.md](specs/README.md) + [specs/product/](specs/product/README.md)
  - **Tech lead (how to build it):** [specs/README.md](specs/README.md) + [specs/tech/README.md](specs/tech/README.md)
  - **Dev (implementation):** This README + code-level READMEs in each package (`hardhat/`, `sdk/`, `ui/`, etc.) + [specs/tech/subsystems/](specs/tech/subsystems/) for your subsystem

## Where to find other files

  - AI continuity notes: [CONTINUITY.md](CONTINUITY.md)
  - Build-process documentation: [BUILD.md](BUILD.md)
  - Reviews: [REVIEWS.md](REVIEWS.md)
  - Deployment instructions for testnet/mainnet: [DEPLOYMENT.md](DEPLOYMENT.md) (local dev is above, in this file)
  - To-do list: [TODO.md](TODO.md)

## Feedback loops

- `npm run lint` to run various linters
- `npm run build` to make sure everything builds and type-checks
- `npm run test` to run the tests (takes many minutes!)

Note that the build and tests are run by the Git pre-commit hook, and the whole thing takes a few minutes to run, so if you're ready to commit and the only thing left to do is run the build and the tests, it's okay to just attempt to commit and make sure it goes through; no need to run the whole test suite only to have it run again when you commit immediately afterward.

## Artifacts

### Core platform

  - [Smart contracts](hardhat/README.md) (`hardhat/`)
  - [SDK](sdk/README.md) — used by integration-tests, ui, and AI services
  - [Indexer](indexer/README.md) — thin Ponder event cache; no business logic
  - [UI](ui/README.md) — four branded surfaces from one Vite/React codebase
  - [Integration tests](integration-tests/README.md)
  - [Fake-data generation](fake-data-generation/README.md)

### AI Service Ecosystem

The core pipeline (attesters, finders, nudgers, explorer) is complete. See `specs/product/ai-assistance.md` for the ecosystem overview and `specs/product/` and `specs/tech/subsystems/` for individual specs.

**AI services — attesters** (evaluate claims and publish on-chain attestations):
  - [Attester Core](attester-core/README.md) — shared library for all attester services
  - [Implication Attester](implication-attester/README.md) — evaluates whether S1 implies S2
  - [Content Attester](content-attester/README.md) — evaluates whether a content item aligns with a statement

**AI services — finders** (proactively discover candidates for attestation):
  - [Finder Core](finder-core/README.md) — shared library for all finder services
  - [Implication Finder](implication-finder/README.md) — discovers statement pairs for the implication attester
  - [Content Finder](content-finder/README.md) — processes a submission queue for the content attester

**AI services — nudgers** (suggest statements to users based on what they already believe):
  - [Nudger Core](nudger-core/README.md) — shared library for all nudger services
  - [Implication Graph Nudger](implication-graph-nudger/README.md) — suggests statements implied by ones you already signed
  - [Bridge Creator](bridge-creator/README.md) — synthesizes common-ground statements between opposing views
  - [Explorer Curator](explorer-curator/README.md) — maintains a curated collection for goal-oriented exploration; personalizes per user

### Platform API service

  - [Platform API Service](platform-api-service/README.md) — resolves creator handles and content URLs; handles channel verification (Twitter, YouTube)

## Other things worth noting

### Unusual architecture: Client-Side Folding

The indexer is intentionally dumb — it's a thin event cache that stores raw blockchain events and nothing else. All state computation ("folding") happens client-side in the SDK. If you're wondering why the indexer has no business logic, this is why. See [specs/tech/indexer/README.md](specs/tech/indexer/README.md).

### Local dev done using Docker

We have a Docker Compose setup for running Hardhat and the Ponder indexer. This provides a clean, isolated environment for development and testing.

## High-level overview of current status

For now, this project hasn't even been deployed yet, so don't worry about backward compatibility.

- Test coverage exists across all major subsystems (SDK, hardhat, integration tests, UI, and e2e coverage for pubstarter/fundingportals/mutablerefs/marketplace), the previously broken delegation and subjectiv Playwright flows have been repaired to match the current navigation/copy plus delegation-indexer synchronization behavior, the current build/docker workflow has started getting faster via incremental workspace/image rebuilds plus narrower runtime-permission layers in the UI/hardhat images plus BuildKit-backed npm install caches across the compose-built Node images, and the repo's current lint/pre-commit path is aligned with the ESLint 9 flat-config setup again.
- Subjectiv trust-network computation now runs in a Web Worker, rehydrates cached trusted sets plus visited per-user direct-trust mappings from IndexedDB on startup, refreshes on direct-trust edits/manual refresh/window focus/a periodic timer, streams partial trusted-set updates into the UI while recomputation is still underway, has higher-level UI integration coverage across the direct-trust settings flow plus funding-portal and leaderboard trust-aware filtering, and now has clearer Settings/funding-portal copy around personal trust networks, partial loading, and the no-direct-trust fallback.
- Content-funding MVP is fully implemented across contracts, SDK, platform API service, attester infrastructure, and UI. All three platforms (Twitter, YouTube, Substack) now have complete verification flows, conceptspace now reuses the Twitter channel-verification linkage so linked accounts can show up outside the content-funding UI too, and the multiple-UI-domains reorganization is complete: Commonality, Content Funding, Noninflammatory Content, and Common Sense Majority now have distinct branded surfaces plus separate build artifacts in the shared UI codebase.
