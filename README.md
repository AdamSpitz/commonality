# Commonality

The way we do development on this project is that we write specs in English, and we ask AI to write the code.

## Documentation Index

**Specifications:**
- [specs/README.md](specs/README.md) - Main specification and architecture

**Development:**
- [hardhat/README.md](hardhat/README.md) - Smart contracts
- [hardhat/fake-data-generation/README.md](hardhat/fake-data-generation/README.md) - Generative testing system
- [indexer/README.md](indexer/README.md) - Ponder indexer setup

**Deployment:**
- [QUICKSTART.md](QUICKSTART.md) - Quick start with Docker
- [DOCKER_README.md](DOCKER_README.md) - Docker deployment details

## Dev stuff you can do

### Smart contracts

The [hardhat/](hardhat/) directory (or at least the hardhat/contracts directory) is meant to be considered "part of the spec". Don't blow it away. (You can blow away the tests and recreate them if you want.)

Commands you can run:

    cd hardhat
    npm run build
    npm run test

See [hardhat/README.md](hardhat/README.md) for details on the smart contracts and [hardhat/fake-data-generation/README.md](hardhat/fake-data-generation/README.md) for generative testing.

### Indexer

The indexer uses [Ponder](https://ponder.sh/) to index blockchain events and provide a GraphQL API.

To sync contract ABIs from the hardhat project:

    cd indexer
    npm run sync-abis

To run the indexer locally:

    cd indexer
    npm run dev

### SDK

The integration tests use an "sdk" library (at the top level of this repo) for user actions and queries. The intention is for this code to be used by both the integration tests and the UI code.

### Integration Tests

To run the full integration test suite (starts node, indexer, runs tests, cleans up):

    ./scripts/run-integration-tests.sh

Or run components individually:

    ./scripts/start-node-and-deploy.sh   # Start node and deploy contracts
    ./scripts/start-indexer.sh           # Start indexer with fresh database
    ./scripts/stop-hardhat-node.sh       # Stop the node
    ./scripts/stop-indexer.sh            # Stop the indexer

See [integration-tests/README.md](integration-tests/README.md) for details.

## UI

We're starting to implement the UI in the top-level "ui" directory, though nothing is really implemented yet. It should use the sdk for user actions and queries, though.

### Docker stuff

Sam, see [QUICKSTART.md](QUICKSTART.md) if you want to get this up and running.

There's also [DOCKER_README.md](DOCKER_README.md) with more-detailed documentation.
