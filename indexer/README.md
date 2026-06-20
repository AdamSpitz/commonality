# Indexer

Thin event cache: watches blockchain events, stores them raw, and serves them via REST API (consumed by the SDK).

## Architecture

A single Ponder application with one responsibility:

- **events table** — stores every raw contract event (all topics + ABI-encoded data)

No business logic, no aggregation, no IPFS sync. All entity-state computation happens client-side in SDK fold functions. This is the **Client-Side Folding** pattern — non-obvious, but intentional.

See [specs/tech/indexer/README.md](../specs/tech/indexer/README.md) for the full explanation of what this means and why.

## Deployment

For local Docker development, the indexer defaults to `PONDER_CHAIN=hardhat` and starts in dev mode.

For Render or other hosted environments:

- Set `PONDER_CHAIN` to `base-sepolia` or `mainnet`.
- Provide the matching RPC URL as `PONDER_RPC_URL_84532` or `PONDER_RPC_URL_1`.
- Set `DATABASE_URL` and `DATABASE_SCHEMA` for Postgres-backed sync state.
- Run with `PONDER_SCRIPT=start` so the container uses `ponder start` instead of dev mode.

Contract deployments can still be configured with the legacy one-env-var-per-contract
addresses plus subsystem start blocks, but the indexer also accepts an
`INDEXER_DEPLOYMENT_MANIFEST` JSON string for contract-versioning prep. Shape:

```json
{
  "chains": {
    "base-sepolia": {
      "Beliefs": [{ "address": "0x...", "startBlock": 123 }],
      "AssuranceContractFactory": [
        { "address": "0x...v1", "startBlock": 456 },
        { "address": "0x...v2", "startBlock": 789 }
      ]
    }
  }
}
```

The top-level chain form (`{"base-sepolia": { ... }}`) is also accepted. Logical
contract names match the names in `ponder.config.ts` (`Beliefs`, `DelegatableNotes`,
`CreatorAssuranceContractFactory`, etc.). When multiple versions are listed, Ponder
indexes all addresses and starts at the earliest listed `startBlock` for that logical
contract/factory.

## Dev stuff you can do

To sync contract ABIs from the hardhat project:

    npm run sync-abis

To run the indexer locally:

    npm run dev
