# Indexer

Thin event cache: watches blockchain events, stores them raw, and serves them via REST API (consumed by the SDK).

## REST API

- `GET /api/events` returns raw indexed events with optional `chainId`, `contractAddress`, `eventName`, `topic1`, `topic2`, `topic3`, `blockNumber_gte`, `blockNumber_lte`, and `limit` filters.
- `GET /api/published-data/:publisher/:dataId` returns the default PublishedData reader view for one publisher/content pair. It honors only the publisher's own `DataRetracted` event, matching the library default policy, and returns one of:
  - `{ "status": "active", "data": "0x..." }`
  - `{ "status": "retracted", "retractedData": "0x..." }`
  - `{ "status": "not-published" }`

Pass `chainId` and/or `contractAddress` when a shared indexer has more than one deployment in its raw event cache.

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
- Keep `PONDER_ETH_GET_LOGS_BLOCK_RANGE` large enough for catch-up. Base Sepolia produces blocks quickly; a tiny range such as `10` makes a million-block historical sync require roughly 100k `eth_getLogs` batches. The Render blueprint defaults to `1000`; lower it only if the RPC provider rejects larger ranges.

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

Build the publishable manifest from a deployment env file with:

```sh
npm run deployment-manifest:build -- --network base-sepolia
```

That writes `deployments/base-sepolia.manifest.json` and prints the compact
`INDEXER_DEPLOYMENT_MANIFEST` value for services that still consume the manifest
directly from env. After pinning the JSON (for example to IPFS), publish the current
pointer onchain through `MutableRefUpdater`:

```sh
DEPLOYMENT_MANIFEST_REF=ipfs://bafy... \
  npx hardhat run scripts/publish-deployment-manifest-ref.js --network base-sepolia
```

The default ref name is `commonality.deployment-manifest`. The ref owner is the
publishing wallet, so clients that use this discovery path must know/trust that
publisher address (or hardcode deployment addresses instead).

## Dev stuff you can do

To sync contract ABIs from the hardhat project:

    npm run sync-abis

To run the indexer locally:

    npm run dev
