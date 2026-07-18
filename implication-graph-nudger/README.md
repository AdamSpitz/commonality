# Implication Graph Nudger

An off-chain service that watches the implication graph and suggests statements to users: "you signed S1 — you might also want to sign S2."

This is the reference implementation of the nudger service pattern. See [`specs/tech/subsystems/nudger/README.md`](../specs/tech/subsystems/nudger/README.md) for the full architecture.

## Role in the AI-service ecosystem

- **Family:** Nudger.
- **Primary UI domain:** Tally; Conceptspace provides the underlying statement/nudger substrate.
- **Trust boundary:** Users are trusting the nudger for recommendation strategy, not durable truth. A suggestion has no lasting effect unless the user signs the suggested statement.
- **Output:** Typed nudger publication documents in IPFS, with CIDs recorded on-chain.
- **Related services:** `bridge-creator` is a CSM-owned nudger that synthesizes new bridge statements; `explorer-curator` curates purpose-specific browsing surfaces.

## How it works

On startup (and once per hour thereafter), the background worker:

1. Fetches all statements from the indexer.
2. For each statement, queries the implication graph (both directions) and generates nudge suggestions for any implied/implying statements with a higher supporter count.
3. Fetches PublishedData `DataRetracted` events and generates re-anchor nudges scoped to implications out of the retracted statement, so signers can directly re-sign implied statements that still match their view.
4. Collects all nudges into a single batch, uploads it to IPFS, and publishes the CID on-chain via the `NudgePublications` contract.

The nudge strategy is purely graph-based — no LLM calls. Confidence scores are derived from the ratio of supporter counts between the two statements.

## HTTP endpoints

The service exposes a minimal HTTP interface for discovery and health monitoring only. It does **not** serve nudge suggestions over HTTP; the canonical source is the chain.

| Endpoint | Description |
|----------|-------------|
| `GET /.well-known/nudger.json` | Nudger metadata (name, description, address, sourceType) |
| `GET /health` | Health check — returns status and nudger address |

## Configuration

| Environment Variable | Description | Default |
|----------------------|-------------|---------|
| `NUDGER_PRIVATE_KEY` | Private key for signing publish transactions | (required) |
| `ETHEREUM_RPC_URL` | Ethereum RPC URL | (required) |
| `NUDGE_PUBLICATIONS_CONTRACT_ADDRESS` | Address of the `NudgePublications` contract | (required) |
| `PUBLISHED_DATA_CONTRACT_ADDRESS` | Address of the `PublishedData` contract for retraction re-anchor nudges | `0x000...000` |
| `INDEXER_URL` | Indexer URL | `http://localhost:3001` |
| `IPFS_API` | IPFS API URL | `http://localhost:5001` |
| `IPFS_GATEWAY` | IPFS gateway URL | `http://localhost:8080` |
| `PORT` | Service port | `3002` |
| `NUDGER_NAME` | Display name | `Implication Graph Nudger` |
| `NUDGER_DESCRIPTION` | Description | `Suggests statements based on the implication graph` |
| `NUDGER_SOURCE_TYPE` | Strategy type | `implication-graph` |
| `NUDGER_VERSION` | Version | `0.1.0` |

## NudgeMessage format

```typescript
{
  targetStatementCid: string;      // "You signed this..."
  suggestedStatementCid: string;  // "...you might also want to sign this"
  reason: string;                   // Human-readable explanation
  confidence: number;              // 0–1, derived from supporter-count ratio
}
```

These messages are collected into a `NudgeBatch` document, uploaded to IPFS, and recorded on-chain. They are not served directly over HTTP.

## Strategies

This service implements the implication-graph strategy. Additional strategies can be added to separate nudger services (e.g., `bridge-creator/`) following the same `NudgerStrategy` interface from `nudger-core`.
