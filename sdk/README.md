# Commonality SDK

Client library for interacting with the Commonality protocol. Used by integration tests and UI code.

## Architecture

The SDK provides two main interfaces:

1. **Actions** - Write operations (blockchain transactions)
   - `believeStatement()`, `createDelegation()`, `contributeToProject()`, etc.
   - Uses viem to interact with smart contracts

2. **Queries** - Read operations (data fetching)
   - `getStatement()`, `getUserBelief()`, `getProject()`, etc.
   - Uses a local GraphQL executor that wraps the Ponder indexer

## Local GraphQL Approach

Rather than querying the Ponder indexer directly, we run a local GraphQL executor that:
- Provides a clean, stable API schema (hides Ponder's auto-generated quirks)
- Executes queries in-process (no separate server needed)
- Forwards underlying data requests to the Ponder indexer

This gives us a typed, maintainable API surface that's decoupled from indexer implementation details.

## Usage

```typescript
import { createGraphQLExecutor, createTestClients } from '@commonality/sdk';
import { getStatement, believeStatement } from '@commonality/sdk';

// Set up executor and clients
const executor = createGraphQLExecutor('http://localhost:42069/graphql');
const clients = createTestClients(privateKey, rpcUrl);

// Query data
const statement = await getStatement(executor, statementId);

// Perform actions
const txHash = await believeStatement(clients, beliefsContract, statementCid);
```

## Structure

```
sdk/
├── src/
│   ├── actions/              # Blockchain write operations
│   ├── queries/              # Direct indexer queries (used by resolvers)
│   ├── graphql-queries/      # Public query API (uses local GraphQL)
│   ├── graphql-server/       # Local GraphQL schema and resolvers
│   │   └── schema/
│   │       ├── type-defs.ts  # GraphQL schema
│   │       └── resolvers/    # Query resolvers
│   └── abis.ts               # Smart contract ABIs
```

The `graphql-queries/` directory is the main public API for reading data. The `queries/` directory contains the underlying implementation that talks to the indexer.
