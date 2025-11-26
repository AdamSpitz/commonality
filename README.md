# Commonality

The way we do development on this project is that we write specs in English, and we ask AI to write the code. See [specs/README.md](specs/README.md).

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

Tests that validate the interaction between multiple subsystems (blockchain + indexer):

    cd integration-tests
    npm run test:small

See [integration-tests/README.md](integration-tests/README.md) and [integration-tests/INDEXER_TESTING_GUIDE.md](integration-tests/INDEXER_TESTING_GUIDE.md) for details.
