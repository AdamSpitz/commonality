# Integration Tests

This directory contains integration tests for the Commonality system. These tests verify that the blockchain (Hardhat), indexer (Ponder), and GraphQL API work together correctly.

## Prerequisites

Before running the tests, you need to have three services running:

1. **Hardhat Node** - A local blockchain
2. **Deployed Contracts** - The smart contracts must be deployed to the local blockchain
3. **Indexer** - Ponder indexer that watches the blockchain and provides a GraphQL API

## Quick Start

### Automated (Recommended)

The easiest way to run integration tests is using the automated script:

```bash
# Run all tests
./run-integration-tests.sh

# Run specific tests by pattern
./run-integration-tests.sh "src/delegation*.test.ts"

# Run tests matching a keyword
./run-integration-tests.sh "conceptspace"

# Run a single test file
./run-integration-tests.sh "src/hello-world.test.ts"
```

This script will:
1. Start a fresh Hardhat node
2. Deploy contracts
3. Start the indexer with a clean database
4. Run all tests (or tests matching the provided pattern)
5. Clean up background processes

### Manual (For Development)

If you need to run tests manually with more control:

#### Terminal 1: Start Hardhat Node and Deploy

```bash
./start-node-and-deploy.sh
```

This starts a Hardhat node in the background and deploys contracts.

#### Terminal 2: Start Indexer

**IMPORTANT:** Always use this script to ensure a fresh database:

```bash
./start-indexer.sh
```

This script cleans up the `.ponder` directory and starts the indexer with a fresh database.

**DO NOT** use `cd indexer && npm run dev:no-ui` directly, as it won't clean the database and tests will fail with stale data.

#### Terminal 3: Run Tests

```bash
cd integration-tests

# Run all tests
npm test

# Run specific tests by pattern
npm test -- "src/delegation*.test.ts"

# Run a single test file
npm test -- "src/hello-world.test.ts"
```

#### Cleanup

When done, stop the background processes:

```bash
./stop-hardhat-node.sh
./stop-indexer.sh
```

## Environment Variables

The tests automatically load environment variables from `.env.local`, which is created by the `deploy-local` script. The file contains:

- `RPC_URL` - Hardhat node URL (default: `http://localhost:8545`)
- `GRAPHQL_URL` - Ponder GraphQL endpoint (default: `http://localhost:42069/graphql`)
- `BELIEFS_CONTRACT_ADDRESS` - Address of the Beliefs contract
- `IMPLICATIONS_CONTRACT_ADDRESS` - Address of the Implications contract
- And other contract addresses...

**Note:** `.env.local` is automatically created/updated when you run `npm run deploy-local` in the hardhat directory. You don't need to manually set any environment variables!
