# Commonality

The way we do development on this project is that we write specs in English, and we ask AI to write the code. See [specs/README.md](specs/README.md).

## Dev stuff you can do

### Smart contracts

The hardhat directory (or at least the hardhat/contracts directory) is meant to be considered "part of the spec". Don't blow it away. (You can blow away the tests and recreate them if you want.)

Commands you can run:

    cd hardhat
    npm run build
    npm run test

    cd indexer
    npm run sync-abis
