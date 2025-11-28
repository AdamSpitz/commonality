# Integration Tests

This directory contains integration tests for the Commonality system. These tests verify that the blockchain (Hardhat), indexer (Ponder), and GraphQL API work together correctly.

## Prerequisites

Before running the tests, you need to have three services running:

1. **Hardhat Node** - A local blockchain
2. **Deployed Contracts** - The smart contracts must be deployed to the local blockchain
3. **Indexer** - Ponder indexer that watches the blockchain and provides a GraphQL API

## Quick Start

### Terminal 1: Start Hardhat Node

```bash
cd hardhat
npx hardhat node
```

This starts a local Ethereum node at `http://localhost:8545`.

### Terminal 2: Deploy Contracts

```bash
npm run deploy-local
```

This will deploy the contracts and write their addresses to a couple of different files - one used by the indexer itself, one used by the integration tests.

### Terminal 3: Start Indexer

To start the indexer:

```bash
cd indexer
npm run dev:no-ui
```

The indexer will start at `http://localhost:42069/graphql`.

### Terminal 4: Run Tests

```bash
cd integration-tests
npm test
```

This should run the tests and output the results.

## Environment Variables

The tests automatically load environment variables from `.env.local`, which is created by the `deploy-local` script. The file contains:

- `RPC_URL` - Hardhat node URL (default: `http://localhost:8545`)
- `GRAPHQL_URL` - Ponder GraphQL endpoint (default: `http://localhost:42069/graphql`)
- `BELIEFS_CONTRACT_ADDRESS` - Address of the Beliefs contract
- `IMPLICATIONS_CONTRACT_ADDRESS` - Address of the Implications contract
- And other contract addresses...

**Note:** `.env.local` is automatically created/updated when you run `npm run deploy-local` in the hardhat directory. You don't need to manually set any environment variables!
