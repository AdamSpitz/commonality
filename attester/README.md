# Implication Attester AI Service

This is a standalone service that evaluates whether one statement implies another and publishes attestations on-chain.

## Overview

The Implication Attester AI service:
1. Accepts requests to evaluate S1 → S2 implications
2. Fetches statement content from IPFS
3. Uses OpenRouter (LLM) to evaluate logical implication
4. If evaluation is positive (high/medium confidence), publishes an on-chain attestation

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Ethereum
ETHEREUM_RPC_URL=http://localhost:8545
ATTESTER_PRIVATE_KEY=0x...  # Private key for signing transactions
IMPLICATIONS_CONTRACT_ADDRESS=0x...  # Address of Implications contract

# OpenRouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-3.5-haiku

# IPFS
IPFS_API=http://localhost:5001
IPFS_GATEWAY=http://localhost:8080

# Server
PORT=3000
```

## Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### POST /evaluate-implication

Evaluate whether statement S1 implies statement S2.

**Request:**
```json
{
  "fromStatementId": "bafybeigram...",
  "toStatementId": "bafybei..."
}
```

**Response:**
```json
{
  "alreadyAttested": false,
  "decision": true,
  "confidence": "high",
  "explanation": "S2 is a direct subset of S1's claims...",
  "explanationCid": "bafybeigram...",
  "transactionHash": "0x...",
  "gasUsed": 48234,
  "processingTime": 3421
}
```

### GET /health

Health check endpoint.

## Next Steps

- [ ] Add x402 payment integration
- [ ] Add batch processing (cron job)
- [ ] Add event-driven automation (watch for new statements)
- [ ] Add admin UI for reviewing attestations
- [ ] Deploy to production (Render or similar)
