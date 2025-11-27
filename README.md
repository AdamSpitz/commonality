# Commonality

The way we do development on this project is that we write specs in English, and we ask AI to write the code.

## Documentation Index

**Specifications:**
- [specs/README.md](specs/README.md) - Main specification and architecture

**Development:**
- [hardhat/README.md](hardhat/README.md) - Smart contracts
- [hardhat/generative-tests/README.md](hardhat/generative-tests/README.md) - Generative testing system
- [indexer/README.md](indexer/README.md) - Ponder indexer setup
- [integration-tests/QUICK_START.md](integration-tests/QUICK_START.md) - Quick guide to integration tests
- [integration-tests/README.md](integration-tests/README.md) - Integration testing framework

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

See [hardhat/README.md](hardhat/README.md) for details on the smart contracts and [hardhat/generative-tests/README.md](hardhat/generative-tests/README.md) for generative testing.

### Indexer

    cd indexer
    npm run sync-abis

### Integration tests

Tests that validate the interaction between multiple subsystems (blockchain + indexer).

**Quick start:**
```bash
./run-integration-tests.sh
```

Or you can start a hardhat node in a separate terminal, then do:
```
npm run integration-tests                      # Scenario-based tests (fast, focused)
npm run integration-tests:generative:small     # Generative tests (stress testing)
```

**Documentation:**
- [integration-tests/QUICK_START.md](integration-tests/QUICK_START.md) - Quick guide to the testing framework
- [integration-tests/README.md](integration-tests/README.md) - Comprehensive documentation
- [integration-tests/INDEXER_TESTING_GUIDE.md](integration-tests/INDEXER_TESTING_GUIDE.md) - Guide for generative tests

The integration test framework provides reusable helpers for testing the indexer with both focused scenario tests and randomized stress tests.


### Docker stuff

Sam, see [QUICKSTART.md](QUICKSTART.md) if you want to get this up and running.

There's also [DOCKER_README.md](DOCKER_README.md) with more-detailed documentation.
