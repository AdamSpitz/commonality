# Commonality

The way we do development on this project is that we write specs in English, and we ask AI to write the code.

The main spec is in [specs/README.md](specs/README.md).

## Documentation Index

**Development:**

## Main artifacts

### Smart contracts

The [hardhat/](hardhat/) directory (or at least the hardhat/contracts directory) is meant to be considered "part of the spec". Don't blow it away. (You can blow away the tests and recreate them if you want.)

See [hardhat/README.md](hardhat/README.md) for more info.

Also note that the hardhat/ directory contains the fake-data generation system; see [hardhat/fake-data-generation/README.md](hardhat/fake-data-generation/README.md).

### Indexer

The indexer uses [Ponder](https://ponder.sh/) to index blockchain events and provide a GraphQL API.

See [indexer/README.md](indexer/README.md) for more info.

### SDK

There's an [sdk/](sdk/) directory for user actions and queries. The intention is for this code to be used by both the integration-tests and the ui code.

### Integration Tests

To run the full integration test suite (starts Hardhat in Docker, starts indexer, runs tests, cleans up):

    ./scripts/run-integration-tests.sh

The script now uses Docker for Hardhat and runs the indexer on the host machine. See [integration-tests/README.md](integration-tests/README.md) and [DOCKER.md](DOCKER.md) for more details.

## UI

We're starting to implement the UI in the top-level "ui" directory, though not much is really implemented yet. It should use the sdk for user actions and queries, though.

## Docker

We now have a Docker Compose setup for running Hardhat. This is used both for integration tests and for providing a clean environment for development and testing.

See [DOCKER.md](DOCKER.md) for usage instructions and [dockerization-plan.md](dockerization-plan.md) for the full migration plan.

Quick start:
```bash
# Start Hardhat node and deploy contracts
docker-compose up hardhat-deploy

# For running integration tests (uses Docker for Hardhat)
./scripts/run-integration-tests.sh
```
