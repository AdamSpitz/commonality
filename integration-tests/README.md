# Integration Tests

This directory contains integration tests for the Commonality system. These tests verify that the blockchain (Hardhat), indexer (Ponder), and GraphQL API work together correctly.

## Prerequisites

Before running the tests, you need to have four services running:

1. **Hardhat Node** - A local blockchain
2. **IPFS Node** - A local IPFS node for storing and retrieving statement content
3. **Deployed Contracts** - The smart contracts must be deployed to the local blockchain
4. **Indexer** - Ponder indexer that watches the blockchain and provides a GraphQL API

## Quick Start

### Automated (Recommended)

The easiest way to run integration tests is using the automated script:

```bash
# Run all tests
./scripts/run-integration-tests.sh

# Run specific tests by pattern
./scripts/run-integration-tests.sh "src/delegation*.test.ts"

# Run tests matching a keyword
./scripts/run-integration-tests.sh "conceptspace"

# Run a single test file
./scripts/run-integration-tests.sh "src/hello-world.test.ts"
```

This script will:
1. Start a fresh Hardhat node in Docker
2. Start a local IPFS node in Docker
3. Deploy contracts
4. Start the indexer with a clean database in Docker
5. Run all tests (or tests matching the provided pattern)
6. Clean up Docker containers

### Manual (For Development)

If you need to run tests manually with more control:

#### Terminal 1: Start Hardhat Node and Deploy

```bash
./scripts/start-node-and-deploy.sh
```

This starts a Hardhat node in the background and deploys contracts.

#### Terminal 2: Start Indexer

**IMPORTANT:** Always use this script to ensure a fresh database:

```bash
./scripts/start-indexer.sh
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
./scripts/stop-hardhat-node.sh
./scripts/stop-indexer.sh
```

## Environment Variables

The tests automatically load environment variables from `.env.local`, which is created by the `deploy-local` script. The file contains:

- `RPC_URL` - Hardhat node URL (default: `http://localhost:8545`)
- `GRAPHQL_URL` - Ponder GraphQL endpoint (default: `http://localhost:42069/graphql`)
- `IPFS_API` - IPFS API endpoint for uploading content (default: `http://localhost:5001`)
- `IPFS_GATEWAY` - IPFS gateway for fetching content (default: `http://localhost:8080/ipfs`)
- `BELIEFS_CONTRACT_ADDRESS` - Address of the Beliefs contract
- `IMPLICATIONS_CONTRACT_ADDRESS` - Address of the Implications contract
- And other contract addresses...

**Note:** `.env.local` is automatically created/updated when you run `npm run deploy-local` in the hardhat directory. The IPFS configuration is included by default and points to the local IPFS node running in Docker.

## IPFS Integration

The integration tests use a local IPFS node running in Docker to store and retrieve statement content. This provides several benefits:

- **No rate limiting** - Unlike Pinata's public gateway, the local node has no rate limits
- **Faster uploads and downloads** - Local network latency instead of internet latency
- **No external dependencies** - Tests can run offline
- **Fresh state** - Each test run starts with a clean IPFS node

The `uploadToIPFS()` function in the SDK automatically detects the `IPFS_API` environment variable and uploads content to the local IPFS node. The indexer's background sync job fetches content from the local IPFS gateway (`IPFS_GATEWAY`).
