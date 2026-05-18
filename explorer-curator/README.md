# @commonality/explorer-curator

Background curator service and per-user personalization endpoint for conceptspace explorers.

## Role in the AI-service ecosystem

- **Family:** Explorer / nudger-style curation service.
- **Primary UI domain:** Alignment initially, via the fundable-project explorer; other purpose-specific explorers may use the same pattern later.
- **Trust boundary:** Users are trusting the curator for navigation and prioritization, not for durable truth. Explorer suggestions do not affect shared state unless the user acts on them.
- **Output:** Curated-collection nudger publications in IPFS with on-chain CIDs, plus optional per-user `/suggest` personalization.
- **Related services:** `implication-graph-nudger` suggests graph-adjacent statements; `bridge-creator` synthesizes new bridge statements for CSM.

## Architecture

This service implements the two-tier LLM architecture from the [explorer spec](../specs/tech/subsystems/conceptspace/explorer.md):

### Background LLM (curator)
- Periodically fetches all statements from the chain via the indexer
- Uses an LLM to evaluate which statements best represent distinct funding/cause areas
- Maintains a non-redundant curated collection grouped by topicArea
- Publishes the collection as a `curated-collection` nudger publication (IPFS + on-chain CID)
- Only publishes when the collection has materially changed

### Per-user LLM (personalizer)
- Exposes a `POST /suggest` endpoint
- Accepts `{ stream, signedStatementCids }` 
- Fetches the latest curated collection for the stream
- Uses an LLM to personalize which entries to surface based on the user's signed statements
- Returns `{ suggestions: [{ cid, reason }] }`

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NUDGER_PRIVATE_KEY` | Yes | — | Ethereum private key for the nudger address |
| `ETHEREUM_RPC_URL` | Yes | — | RPC URL for the chain |
| `NUDGE_PUBLICATIONS_CONTRACT_ADDRESS` | Yes | — | Address of the NudgePublications contract |
| `OPENROUTER_API_KEY` | Yes | — | API key for LLM calls |
| `INDEXER_URL` | No | `http://localhost:3001` | Indexer URL |
| `IPFS_API` | No | `http://localhost:5001` | IPFS API URL |
| `IPFS_GATEWAY` | No | `http://localhost:8080` | IPFS gateway URL |
| `OPENROUTER_MODEL` | No | `anthropic/claude-3.5-haiku` | LLM model |
| `PORT` | No | `3004` | HTTP server port |
| `EXPLORER_STREAM` | No | `fundable-project-explorer` | Stream identifier |
| `CURATOR_INTERVAL_MS` | No | `21600000` (6h) | Interval between curator cycles |
| `NUDGER_NAME` | No | `Fundable Project Explorer` | Human-readable name |
| `NUDGER_DESCRIPTION` | No | — | Description |
| `NUDGER_SOURCE_TYPE` | No | `explorer-curator` | Strategy identifier |
| `NUDGER_VERSION` | No | `0.1.0` | Version string |

## Endpoints

- `GET /.well-known/nudger.json` — Nudger metadata (address, name, description, etc.)
- `GET /health` — Health check
- `POST /suggest` — Per-user personalized suggestions
  - Body: `{ stream: string, signedStatementCids: string[] }`
  - Response: `{ suggestions: [{ cid: string, reason: string }] }`
- `GET /collection` — Current curated collection for this service's stream
  - Response: `{ stream, publishedAt, entries: [{ cid, label, topicArea, parentCid? }] }`

## Running

```bash
npm run dev --workspace=@commonality/explorer-curator
```
