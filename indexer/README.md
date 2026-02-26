# Indexer

Indexes blockchain events and provides GraphQL APIs (consumed by the SDK).

## Architecture

Five logically independent subsystems, each with its own schema, event handlers, and API:

- **Concept Space**
- **Pubstarter**
- **Delegation**
- **Funding Portal**
- **Mutable Refs**

In the future these might be worth splitting off into separate indexers.

See [specs/indexers.md](../specs/indexers.md) for the full architectural spec.

## Dev stuff you can do

To sync contract ABIs from the hardhat project:

    npm run sync-abis

To run the indexer locally:

    npm run dev
