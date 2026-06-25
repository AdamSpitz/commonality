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
   - Fetches raw events from the indexer's event cache REST API, then folds them client-side into typed entity state
   - Reads current on-chain state via contract view functions (balances, thresholds, etc.)
   - Fetches IPFS content directly from a gateway

### Key concepts

- **Event cache**: The indexer stores raw on-chain events in a single `events` table, served via `GET /api/events`. No business logic in the indexer.
- **Fold functions**: Pure functions in each subsystem's `folds.ts` that reconstruct entity state from raw events (e.g., `foldProject()`, `foldStatementBeliefs()`, `foldDelegationState()`).
- **Event decoder**: `eventDecoder.ts` uses viem's `decodeEventLog` to decode raw events from the cache into typed event objects.
- **Chain reads**: `chain-reads.ts` provides functions for reading current on-chain state via contract view functions.

## Usage

The SDK has **no flat barrel** — there is no `@commonality/sdk` root entry. Import each
piece from its subpath (the subsystem or shared layer it lives in). This keeps the public
surface legible and each consumer coupled only to what it uses.

```typescript
import { createSDKMachinery } from '@commonality/sdk/machinery';
import { createWriteClients } from '@commonality/sdk/utils';
import { getStatement, believeStatement } from '@commonality/sdk/conceptspace';
import { waitForIndexerToSyncToTxHash } from '@commonality/sdk/indexer-sync';

// Set up machinery and clients
const machinery = createSDKMachinery({
  ipfsConfig: { gatewayUrl: 'http://localhost:8080' },
  eventCacheUrl: 'http://localhost:42069',
  contractAddresses: { /* deployed addresses */ },
});
const clients = createWriteClients(privateKey, rpcUrl);

// Perform actions
const txHash = await believeStatement(clients, beliefsContract, statementCid);

// Wait for indexer to process this transaction
await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, txHash);

// Query data (now includes the latest changes)
const statement = await getStatement(machinery, statementId);
```

### Subpaths

One subpath per subsystem: `conceptspace`, `content-funding`, `delegation`,
`displayable-documents`, `fundingportals`, `identity`, `lazy-giving`, `mutable-refs`,
`nudger-publications`, `signer-profiles`, `subjectiv`. Plus the shared layers: `machinery`
(SDK construction/config), `indexer-sync` (sync helpers), `utils` (clients, IPFS, event
decoding, currency, chain reads), `abis` (contract ABIs), and `node` (see below).

### Node.js helpers

For Node.js services and scripts, use the `/node` subpath to read config from environment variables:

```typescript
import { createIPFSConfigInNodeJSFromTheUsualEnvVars, createTwitterApiConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk/node';

const machinery = createSDKMachinery({
  ipfsConfig: createIPFSConfigInNodeJSFromTheUsualEnvVars(),
  twitterApiConfig: createTwitterApiConfigInNodeJSFromTheUsualEnvVars(),
});
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

  - The `subsystems/` directory is the main public API for reading data. Each subsystem has:
    - `actions.ts` — write operations (blockchain transactions, IPFS uploads)
    - `queries.ts` — query functions that fetch events, fold them, and return typed results
    - `folds.ts` — pure fold functions that reconstruct entity state from raw events
    - `types.ts` — TypeScript types for the subsystem's entities
    - `events.ts` — TypeScript types for the subsystem's decoded events
  - The `utils/` directory contains shared utilities:
    - `eventCacheClient.ts` — client for the indexer's REST API
    - `eventDecoder.ts` — ABI decoding for all event types
    - `chain-reads.ts` — on-chain view function reads
