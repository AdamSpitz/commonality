# Commonality

## Getting started

**Prerequisites:** [Node.js 24.x](https://nodejs.org/), [Docker](https://docs.docker.com/get-docker/)

```bash
npm install
./services.sh --start
./data.sh --seed
cd ui && npm run dev
```

That's it. This starts a local Hardhat blockchain, deploys the smart contracts, starts IPFS and the Ponder indexer, and populates the chain with fake data (10 users, 3 rounds). The UI will be at http://localhost:5173.

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
- `npm run test` to run the tests

Note that the build and tests are run by the Git pre-commit hook, and the whole thing takes a few minutes to run, so if you're ready to commit and the only thing left to do is run the build and the tests, it's okay to just attempt to commit and make sure it goes through; no need to run the whole test suite only to have it run again when you commit immediately afterward.

## Artifacts

  - Smart contracts: `hardhat/README.md`
  - Fake-data generation: `fake-data-generation/README.md`
  - Indexer: `indexer/README.md`
  - SDK (used by both integration-tests and ui): `sdk/README.md`
  - Integration tests: `integration-tests/README.md`
  - UI: `ui/README.md`
  - Attester AI: `attester/README.md`
  - Finder AI: `finder/README.md`

## Other things worth noting

### Local dev done using Docker

We have a Docker Compose setup for running Hardhat and the Ponder indexer. This provides a clean, isolated environment for development and testing.

## High-level overview of current status

For now, this project hasn't even been deployed yet, so don't worry about backward compatibility.
