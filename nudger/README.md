# Nudger Service

An off-chain HTTP service that suggests statements to users: "you signed S1 — you might also want to sign S2."

## Quick Start

1. Copy `.env.example` to `.env` and fill in the values:
   - `NUDGER_PRIVATE_KEY` - Ethereum private key for signing nudges
   - `ETHEREUM_RPC_URL` - RPC URL for blockchain access
   - `INDEXER_URL` - URL of the statement indexer
   - `IMPLICATIONS_CONTRACT_ADDRESS` - Address of the Implications contract

2. Install dependencies and build:
   ```bash
   npm run build
   ```

3. Run the service:
   ```bash
   npm run dev  # Development with hot reload
   npm run start  # Production
   ```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /nudges?targetStatementCid=<cid>` | Get nudge suggestions for a statement |
| `GET /nudges/bulk?targetStatementCids=<cid1>,<cid2>,...` | Batch nudges for multiple statements |
| `GET /.well-known/nudger.json` | Nudger metadata (name, description, address) |
| `GET /health` | Health check |

## Configuration

| Environment Variable | Description | Default |
|----------------------|-------------|---------|
| `NUDGER_PRIVATE_KEY` | Private key for signing | (required) |
| `ETHEREUM_RPC_URL` | Ethereum RPC URL | (required) |
| `INDEXER_URL` | Indexer URL | `http://localhost:3001` |
| `PORT` | Service port | `3002` |
| `NUDGER_NAME` | Display name | `Implication Graph Nudger` |
| `NUDGER_DESCRIPTION` | Description | `Suggests statements based on the implication graph` |
| `NUDGER_SOURCE_TYPE` | Strategy type | `implication-graph` |
| `NUDGER_VERSION` | Version | `0.1.0` |
| `IMPLICATIONS_CONTRACT_ADDRESS` | Implications contract | (required) |

## NudgeMessage Format

```typescript
{
  nudger: string;                  // Ethereum address of the nudger
  targetStatementCid: string;     // "You signed this..."
  suggestedStatementCid: string;  // "...you might also want to sign this"
  reason: string;                  // Human-readable explanation
  confidence: number;             // 0-1
  timestamp: number;              // Unix timestamp
  signature: string;               // EIP-191 signature
}
```

## Strategies

### Implication Graph Nudger (default)

Suggests statements based on the implication graph:
- Statements that are implied by the target statement with more supporters
- Statements that imply the target statement with more supporters

This is the reference implementation. The framework is designed to support additional strategies like:
- Bridge-creator nudger (AI-based statement synthesis)
- Semantic similarity nudger (vector embeddings)
- Collaborative filtering nudger