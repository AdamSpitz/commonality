# Commonality SDK

Client library for interacting with the Commonality protocol. Used by integration tests and UI code.

## Notes for AI working on this code

If you modify any of this sdk code, please make sure "npm run integration-tests" (in the top-level directory) succeeds when you're done.

## Architecture

The SDK provides two main interfaces:

1. **Actions** - Write operations (blockchain transactions)
   - `believeStatement()`, `createDelegation()`, `contributeToProject()`, etc.
   - Uses viem to interact with smart contracts

2. **Queries** - Read operations (data fetching)
   - `getStatement()`, `getUserBelief()`, `getProject()`, etc.
   - Uses a local GraphQL executor that wraps the Ponder indexer

## Local GraphQL Approach

NOTE: This is a little bit unusual, so pay attention.

Rather than querying the Ponder indexer directly, we run a local GraphQL executor that:
- Provides a clean, stable API schema (hides Ponder's auto-generated quirks)
- Executes queries in-process (no separate server needed)
- Forwards underlying data requests to the Ponder indexer

This gives us a typed, maintainable API surface that's decoupled from indexer implementation details.

## Usage

```typescript
import { createSDKMachinery, createTestClients } from '@commonality/sdk';
import { getStatement, believeStatement, waitForIndexerToSyncToTxHash } from '@commonality/sdk';

// Set up machinery and clients
const machinery = createSDKMachinery('http://localhost:42069/graphql');
const clients = createTestClients(privateKey, rpcUrl);

// Perform actions
const txHash = await believeStatement(clients, beliefsContract, statementCid);

// Wait for indexer to process this transaction
await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, txHash);

// Query data (now includes the latest changes)
const statement = await getStatement(machinery, statementId);
```

### Indexer Synchronization

When you perform blockchain actions (transactions), the indexer needs time to process the events and update its database. Use `waitForIndexerToSyncToBlockNumber()` or  `waitForIndexerToSyncToTxHash()` to ensure the indexer has caught up before querying:

```typescript
import { waitForIndexerToSyncToTxHash, waitForIndexerToSyncToBlockNumber } from '@commonality/sdk';

// Option 1: Wait for indexer to process a specific transaction (just a convenience wrapper around waitForIndexerToSyncToBlockNumber)
const txHash = await someContractWrite();
await waitForIndexerToSyncToTxHash(machinery, publicClient, txHash);

// Option 2: Wait for a specific block number
const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
await waitForIndexerToSyncToBlockNumber(machinery, receipt.blockNumber);
```

## Structure

  - The `indexer-queries/` directory is the main public API for reading data.
  - The `actions/` directory contains actions that "write" to the system (blockchain writes, IPFS uploads).
