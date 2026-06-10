# Implication Attester AI Service

This is a standalone service that evaluates whether one statement implies another and publishes attestations on-chain.

## Role in the AI-service ecosystem

- **Family:** Attester.
- **Primary UI domains:** Conceptspace and Tally; other domains consume the implication graph indirectly through statement anchoring, supporter counts, and trust configuration.
- **Trust boundary:** Users are trusting the attester identity for conservative semantic implication.
- **Output:** Positive on-chain `ImplicationAttestation` records; negative/low-confidence evaluations do not publish positive attestations.
- **Related services:** `implication-finder` submits candidate pairs; `implication-graph-nudger` consumes the resulting graph to suggest existing statements.

## Overview

The Implication Attester AI service:
1. Accepts requests to evaluate S1 → S2 implications
2. Requires payment via x402 protocol
3. Fetches statement content from IPFS
4. Uses OpenRouter (LLM) to evaluate logical implication
5. If evaluation is positive (high/medium confidence), publishes an on-chain attestation

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

# x402 Payment
X402_PAYMENT_ADDRESS=0x...  # Address to receive payments
SERVICE_MARGIN_PERCENT=20   # Markup to cover operational costs
ETH_USD_PRICE=3000          # ETH price for cost calculation
GAS_PRICE_MULTIPLIER=1.2     # Safety margin for gas price
ESTIMATED_INPUT_TOKENS=1000
ESTIMATED_OUTPUT_TOKENS=200

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000     # Time window in milliseconds
RATE_LIMIT_MAX_REQUESTS=10     # Max requests per window
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

Evaluate whether statement S1 implies statement S2. Requires x402 payment.

**Request:**
```json
{
  "fromStatementCid": "bafybeigram...",
  "toStatementCid": "bafybei..."
}
```

**Response (200 OK):**
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

**Response (402 Payment Required):**
```json
{
  "error": "payment_required",
  "message": "Payment required to process this request",
  "paymentDetails": {
    "amount": "0.000037",
    "amountUsd": "0.11",
    "currency": "ETH",
    "address": "0x...",
    "paymentId": "pay_1234567890_abc",
    "expiresAt": "2026-02-13T12:00:00Z"
  }
}
```

**Response (429 Rate Limit Exceeded):**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many evaluation requests. Please wait before trying again.",
  "retryAfter": 45
}
```

To make a request with payment:
1. Call `/quote` to get current price
2. Send payment to the payment address
3. Include payment proof in header: `X-Payment-Proof: payment:<paymentId>`

### GET /quote

Get current price estimate for evaluation.

**Response:**
```json
{
  "price": "0.000037",
  "priceUsd": "0.11",
  "currency": "ETH",
  "expiresAt": "2026-02-13T12:00:00Z"
}
```

### GET /status/:fromStatementCid/:toStatementCid

Check if an attestation exists for a statement pair.

### POST /evaluate-implications-batch

Evaluate multiple statement implication pairs in a single request. Requires x402 payment. Maximum 10 evaluations per batch.

**Request:**
```json
{
  "evaluations": [
    {
      "fromStatementCid": "bafybeigram...",
      "toStatementCid": "bafybei..."
    },
    {
      "fromStatementCid": "bafybeiabc...",
      "toStatementCid": "bafybeixyz..."
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "fromStatementCid": "bafybeigram...",
      "toStatementCid": "bafybei...",
      "success": true,
      "decision": true,
      "confidence": "high",
      "explanation": "S2 is a direct subset of S1's claims...",
      "explanationCid": "bafybeigram...",
      "transactionHash": "0x...",
      "processingTime": 3421
    },
    {
      "fromStatementCid": "bafybeiabc...",
      "toStatementCid": "bafybeixyz...",
      "success": true,
      "decision": false,
      "confidence": "low",
      "explanation": "No clear logical connection...",
      "explanationCid": null,
      "transactionHash": null,
      "processingTime": 2890
    }
  ],
  "totalProcessingTime": 6311
}
```

**Response (400 Bad Request - Batch too large):**
```json
{
  "error": "batch_too_large",
  "message": "Batch size exceeds maximum of 10 evaluations",
  "details": {
    "requested": 15,
    "maximum": 10
  }
}
```

### GET /health

Health check endpoint with ETH balance status.

## Deployment

The implication attester is not deployed as a standalone Render service anymore. It runs inside the bundled `commonality-service-host-attesters` service described in [workflow/deployment.md](../workflow/deployment.md) and [specs/tech/service-bundling.md](../specs/tech/service-bundling.md).

Configure its environment through the service-host attesters Render service, using `scripts/generate-render-secrets.mjs` as the source of the per-service secret block. The important values remain:

- `ETHEREUM_RPC_URL`: target-network RPC URL
- `ATTESTER_PRIVATE_KEY`: private key for the attester wallet (secret)
- `IMPLICATIONS_CONTRACT_ADDRESS`: deployed Implications contract address
- `OPENROUTER_API_KEY`: OpenRouter API key
- `X402_PAYMENT_ADDRESS`: address to receive payments

For local development, start the bundled stack via the repository-level Docker/service scripts rather than building this package as a separate deployment unit.

## Production Checklist

- [ ] Ethereum RPC configured for target network (testnet/mainnet)
- [ ] Attester wallet has sufficient ETH for gas
- [ ] Implications contract deployed and address configured
- [ ] OpenRouter API key configured
- [ ] x402 payment address configured
- [ ] Health check endpoint responding (GET /health)
- [ ] Rate limits appropriate for production load
