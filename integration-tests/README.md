# Integration Tests

This directory contains integration tests for the Commonality system. These tests verify that the blockchain (Hardhat), indexer (Ponder), and GraphQL API work together correctly.

## Prerequisites

Before running the tests, you need to have three services running:

1. **Hardhat Node** - A local blockchain
2. **Indexer** - Ponder indexer that watches the blockchain and provides a GraphQL API
3. **Deployed Contracts** - The smart contracts must be deployed to the local blockchain

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

This will deploy the contracts and output their addresses. Note the `BELIEFS_CONTRACT_ADDRESS`.

### Terminal 3: Start Indexer

You need to set the contract addresses as environment variables before starting the indexer:

```bash
cd indexer
export BELIEFS_CONTRACT_ADDRESS=0x... # Use address from deploy output
export IMPLICATIONS_CONTRACT_ADDRESS=0x...
# ... set other contract addresses as needed
npm run dev
```

The indexer will start at `http://localhost:42069/graphql`.

### Terminal 4: Run Tests

```bash
cd integration-tests
npm test
```

That's it! The deployment script automatically creates a `.env.local` file with all the contract addresses, which is loaded automatically when tests run.

## Environment Variables

The tests automatically load environment variables from `.env.local`, which is created by the `deploy-local` script. The file contains:

- `RPC_URL` - Hardhat node URL (default: `http://localhost:8545`)
- `GRAPHQL_URL` - Ponder GraphQL endpoint (default: `http://localhost:42069/graphql`)
- `BELIEFS_CONTRACT_ADDRESS` - Address of the Beliefs contract
- `IMPLICATIONS_CONTRACT_ADDRESS` - Address of the Implications contract
- And other contract addresses...

**Note:** `.env.local` is automatically created/updated when you run `npm run deploy-local` in the hardhat directory. You don't need to manually set any environment variables!

## Project Structure

```
integration-tests/
├── src/
│   ├── actions.ts         # User actions (e.g., believeStatement, uploadToIPFS)
│   ├── queries.ts         # GraphQL queries (e.g., getStatement, waitForSync)
│   └── *.test.ts          # Test files
├── package.json
├── tsconfig.json
└── README.md
```

## Writing Tests

Tests follow this general pattern:

1. **Setup** - Create clients and prepare data
2. **Execute Action** - Perform a blockchain transaction
3. **Wait for Sync** - Wait for the indexer to process the transaction
4. **Query** - Query the GraphQL API
5. **Assert** - Verify the results

Example:

```typescript
import { createTestClients, believeStatement } from './actions.js';
import { createGraphQLClient, getStatement, waitForSync } from './queries.js';

it('should do something', async () => {
  // Setup
  const clients = createTestClients(PRIVATE_KEY);
  const graphqlClient = createGraphQLClient();

  // Execute action
  const txHash = await believeStatement(clients, beliefsContract, statementCid);
  const receipt = await clients.publicClient.getTransactionReceipt({ hash: txHash });

  // Wait for sync
  await waitForSync(graphqlClient, receipt.blockNumber);

  // Query and assert
  const statement = await getStatement(graphqlClient, statementId);
  assert.strictEqual(statement?.directSupporters, 1);
});
```

## Helper Modules

### actions.ts

Provides high-level functions for interacting with the blockchain:

- `createTestClients(privateKey)` - Create wallet and public clients
- `uploadToIPFS(content)` - Mock IPFS upload (generates CID)
- `cidToBytes32(cid)` - Convert CID to bytes32 for contracts
- `believeStatement(clients, contract, cid)` - Express belief in a statement
- `disbelieveStatement(...)` - Express disbelief
- `clearOpinion(...)` - Remove opinion

### queries.ts

Provides functions for querying the Ponder GraphQL API:

- `createGraphQLClient(url)` - Create GraphQL client
- `query(client, queryString, variables)` - Execute GraphQL query
- `getStatement(client, id)` - Get statement by ID
- `getUserBelief(client, userAddress, statementId)` - Get user's belief
- `waitForSync(client, targetBlock)` - Wait for indexer to sync

## Current Tests

### hello-world.test.ts

A basic smoke test that:
1. Creates a mock statement
2. Has a user express belief in it
3. Waits for the indexer to sync
4. Queries the belief back and verifies it was recorded

This test serves as a template for more complex tests.

## Future Work

As we expand the test suite, we should add tests for:

- Implications between statements
- Project creation and funding
- Delegation chains
- Secondary market trading
- Complex multi-user scenarios

The infrastructure in `actions.ts` and `queries.ts` should be expanded as needed to support these tests.
