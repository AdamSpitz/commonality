# Concept Space — Data Architecture

## Domain

Statements, beliefs, and implication relationships.

## How It Works

The indexer stores raw `DirectSupport` and `ImplicationAttestation` events in the shared `events` table. The SDK fetches these events and folds them client-side:

- **Beliefs:** `foldStatementBeliefs()` processes `DirectSupport` events to reconstruct per-statement believer/disbeliever counts and lists.
- **User beliefs:** `foldUserBeliefs()` processes `DirectSupport` events filtered by user address to get all statements a user believes/disbelieves.
- **Implications:** `foldImplications()` processes `ImplicationAttestation` events to build the implication map (organized by attester).
- **Statement discovery:** Statements are discovered from `DirectSupport` events — any statement CID that appears in a belief event is a known statement.
- **Statement content:** Fetched directly from IPFS gateway on demand (not cached in the indexer).

## Key Design Decisions

- Implications are NOT transitive — indirect support is computed via direct implication lookups only (no graph traversal).
- No IPFS content caching in the indexer — the client fetches statement text from IPFS directly.
- No social data sync — ENS names and social verification are resolved client-side on demand.

For cross-cutting concerns (event cache architecture, REST API) see [../../indexer/federation.md](../../indexer/federation.md).
