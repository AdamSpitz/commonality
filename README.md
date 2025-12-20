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

To run the full integration test suite (starts node, indexer, runs tests, cleans up):

    ./scripts/run-integration-tests.sh

See [integration-tests/README.md](integration-tests/README.md) for details.

## UI

We're starting to implement the UI in the top-level "ui" directory, though not much is really implemented yet. It should use the sdk for user actions and queries, though.

## Docker stuff

At one point we sorta implemented this, but we never really used it, so I deleted some of the files (but might have missed some).

The idea is that we want to have a nicely-packaged Docker container (or docker-compose.yml or something) that runs a hardhat node and the indexer, so that we (and particularly my friend Sam) can just fire it up and generate a bunch of data and run various graph-analysis algorithms and so on.

This is sounding very similar to what scripts/run-integration-tests.sh is doing, so maybe what we should be doing is replacing that script with a proper Dockerized setup.
