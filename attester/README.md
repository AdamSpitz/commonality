# Implication Attester AI Service

This is a standalone service that evaluates whether one statement implies another and publishes attestations on-chain.

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
  "fromStatementId": "bafybeigram...",
  "toStatementId": "bafybei..."
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

### GET /status/:fromStatementId/:toStatementId

Check if an attestation exists for a statement pair.

### POST /evaluate-implications-batch

Evaluate multiple statement implication pairs in a single request. Requires x402 payment. Maximum 10 evaluations per batch.

**Request:**
```json
{
  "evaluations": [
    {
      "fromStatementId": "bafybeigram...",
      "toStatementId": "bafybei..."
    },
    {
      "fromStatementId": "bafybeiabc...",
      "toStatementId": "bafybeixyz..."
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
      "fromStatementId": "bafybeigram...",
      "toStatementId": "bafybei...",
      "success": true,
      "decision": true,
      "confidence": "high",
      "explanation": "S2 is a direct subset of S1's claims...",
      "explanationCid": "bafybeigram...",
      "transactionHash": "0x...",
      "processingTime": 3421
    },
    {
      "fromStatementId": "bafybeiabc...",
      "toStatementId": "bafybeixyz...",
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

### Render (Recommended)

This service is configured for deployment on [Render](https://render.com).

1. **Fork/push this repository** to your GitHub/GitLab account

2. **Create a Blueprint on Render:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Blueprint"
   - Connect your repository
   - Render will read `render.yaml` and create the service

3. **Configure environment variables** in Render dashboard:
   - `ETHEREUM_RPC_URL`: Your Ethereum RPC URL (Alchemy, Infura, etc.)
   - `ATTESTER_PRIVATE_KEY`: Private key for the attester wallet (keep this secret!)
   - `IMPLICATIONS_CONTRACT_ADDRESS`: Address of the deployed Implications contract
   - `OPENROUTER_API_KEY`: Your OpenRouter API key
   - `X402_PAYMENT_ADDRESS`: Address to receive payments

4. **Deploy:**
   - The service will automatically deploy on push to main
   - Monitor the deploy logs in Render dashboard

### Manual Deployment

```bash
# Build and run locally
cd attester
npm run build
npm start

# Or using Docker
docker build -f Dockerfile -t commonality-attester ..
docker run -p 3000:3000 --env-file .env commonality-attester
```

## Production Checklist

- [ ] Ethereum RPC configured for target network (testnet/mainnet)
- [ ] Attester wallet has sufficient ETH for gas
- [ ] Implications contract deployed and address configured
- [ ] OpenRouter API key configured
- [ ] x402 payment address configured
- [ ] Health check endpoint responding (GET /health)
- [ ] Rate limits appropriate for production load
