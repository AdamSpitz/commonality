# Content Attester AI Service

This service evaluates whether a content item aligns with a target statement under a configured attester profile, then publishes positive attestations to `AlignmentAttestations.sol`.

## Overview

The content attester:
1. Accepts a content item plus the statement CID to evaluate against
2. Requires payment via the shared x402-style flow from `attester-core`
3. Resolves content from inline text, a URL, or IPFS
4. Uses OpenRouter to return a structured evaluation
5. Publishes an on-chain alignment attestation when the decision is `true` with `high` or `medium` confidence

## Configuration

Required environment variables:

```bash
# Ethereum
ETHEREUM_RPC_URL=http://localhost:8545
ATTESTER_PRIVATE_KEY=0x...
ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS=0x...
ALIGNMENT_TOPIC_STATEMENT_CID=bafy...

# OpenRouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-3.5-haiku

# Prompt/profile
CONTENT_ATTESTER_NAME=noninflammatory-neutral
CONTENT_ATTESTER_PROMPT_TEMPLATE="...prompt text with {content} and optional {declared_perspective_context} placeholders..."

# IPFS
IPFS_API=http://localhost:5001
IPFS_GATEWAY=http://localhost:8080

# Server
PORT=3000

# x402 Payment
X402_PAYMENT_ADDRESS=0x...
SERVICE_MARGIN_PERCENT=20
ETH_USD_PRICE=3000
GAS_PRICE_MULTIPLIER=1.2
ESTIMATED_INPUT_TOKENS=2500
ESTIMATED_OUTPUT_TOKENS=400

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

## API Endpoints

### POST /evaluate-content

Request body:

```json
{
  "contentCanonicalId": "twitter:uid:12345678:18347",
  "statementCid": "bafy...",
  "contentText": "Optional inline text",
  "contentUrl": "Optional URL",
  "contentCid": "Optional IPFS CID",
  "declaredPerspective": "Optional perspective string"
}
```

Exactly one of `contentText`, `contentUrl`, or `contentCid` must be provided.

Response:

```json
{
  "alreadyAttested": false,
  "decision": true,
  "confidence": "high",
  "reasoning": "2-4 sentence explanation",
  "dimensions": {
    "steelmanning": "pass"
  },
  "subjectId": "0x...",
  "explanationCid": "bafy...",
  "transactionHash": "0x...",
  "processingTime": 1234
}
```

### GET /quote

Shared quote endpoint from `attester-core`.

### GET /health

Shared health endpoint from `attester-core`.

### GET /status/:statementCid/:contentCanonicalId

Shared placeholder status endpoint from `attester-core`.
