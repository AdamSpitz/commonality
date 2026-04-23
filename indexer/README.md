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

- Set `PONDER_CHAIN` to `sepolia` or `mainnet`.
- Provide the matching RPC URL as `PONDER_RPC_URL_11155111` or `PONDER_RPC_URL_1`.
- Set `DATABASE_URL` and `DATABASE_SCHEMA` for Postgres-backed sync state.
- Run with `PONDER_SCRIPT=start` so the container uses `ponder start` instead of dev mode.

## Dev stuff you can do

To sync contract ABIs from the hardhat project:

    npm run sync-abis

To run the indexer locally:

    npm run dev
