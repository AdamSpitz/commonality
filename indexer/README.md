# Indexer

Thin event cache: watches blockchain events, stores them raw, and serves them via REST API (consumed by the SDK).

## Architecture

A single Ponder application with two responsibilities:

- **events table** — stores every raw contract event (all topics + ABI-encoded data)
- **Registry tables** — small "what exists" tables maintained eagerly:
  - `statements_registry`
  - `projects_registry`
  - `alignment_attestations_registry`
  - `implications_registry`

No business logic, no aggregation, no IPFS sync. All entity-state computation happens client-side in SDK fold functions.

See [specs/indexer](../specs/indexer/README.md) for the full architectural spec.

## Dev stuff you can do

To sync contract ABIs from the hardhat project:

    npm run sync-abis

To run the indexer locally:

    npm run dev
