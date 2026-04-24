# Attester Host

`attester-host` runs the implication attester and content attester in one Express process under separate route prefixes. It is the HTTP half of the service-bundling plan in [`specs/tech/service-bundling.md`](../specs/tech/service-bundling.md).

## What it hosts

- `implication-attester`
- `content-attester`

Each mounted attester keeps its own full config object, including its own `ATTESTER_PRIVATE_KEY`. Bundling is a deployment choice, not a shared-signer shortcut.

## Config file

Pass a JSON config file path as the first CLI argument, or set `ATTESTER_HOST_CONFIG`.

Example:

```json
{
  "port": 3000,
  "implicationAttester": {
    "routePrefix": "/implication-attester",
    "config": {
      "ethereumPrivateKey": "0x1111",
      "ethereumRpcUrl": "http://localhost:8545",
      "implicationsContractAddress": "0x1234",
      "openRouterApiKey": "secret",
      "openRouterModel": "anthropic/claude-3.5-haiku",
      "ipfsApiUrl": "http://ipfs:5001",
      "ipfsGatewayUrl": "http://ipfs:8080/ipfs",
      "port": 0,
      "paymentAddress": "0xaaaa",
      "serviceMarginPercent": 20,
      "ethUsdPrice": 3000,
      "gasPriceMultiplier": 1.2,
      "estimatedInputTokens": 1000,
      "estimatedOutputTokens": 200,
      "rateLimitWindowMs": 60000,
      "rateLimitMaxRequests": 10
    }
  },
  "contentAttester": {
    "routePrefix": "/content-attester",
    "config": {
      "ethereumPrivateKey": "0x2222",
      "ethereumRpcUrl": "http://localhost:8545",
      "alignmentAttestationsContractAddress": "0x5678",
      "alignmentTopicStatementCid": "bafy...",
      "openRouterApiKey": "secret",
      "openRouterModel": "anthropic/claude-3.5-haiku",
      "ipfsApiUrl": "http://ipfs:5001",
      "ipfsGatewayUrl": "http://ipfs:8080/ipfs",
      "port": 0,
      "paymentAddress": "0xbbbb",
      "serviceMarginPercent": 20,
      "ethUsdPrice": 3000,
      "gasPriceMultiplier": 1.2,
      "estimatedInputTokens": 2500,
      "estimatedOutputTokens": 400,
      "rateLimitWindowMs": 60000,
      "rateLimitMaxRequests": 10,
      "attesterName": "noninflammatory-neutral",
      "promptTemplate": "..."
    }
  }
}
```

The nested `port` values are ignored by the host and can be set to `0`.

## Environment-based config

If no config path is provided, the host can also build its config directly from environment variables. This is the deployment path used by `docker-compose.yml` and `render.yaml`.

Required service-specific env vars:

- `IMPLICATION_ATTESTER_PRIVATE_KEY`
- `IMPLICATION_ATTESTER_PAYMENT_ADDRESS`
- `IMPLICATIONS_CONTRACT_ADDRESS`
- `CONTENT_ATTESTER_PRIVATE_KEY`
- `CONTENT_ATTESTER_PAYMENT_ADDRESS`
- `ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS`
- `ALIGNMENT_TOPIC_STATEMENT_CID`
- `CONTENT_ATTESTER_NAME`
- `CONTENT_ATTESTER_PROMPT_TEMPLATE` or `CONTENT_ATTESTER_PROMPT_TEMPLATE_FILE`

Shared env vars used by both mounted services:

- `PORT` or `ATTESTER_HOST_PORT`
- `ETHEREUM_RPC_URL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `IPFS_API`
- `IPFS_GATEWAY`

Optional overrides:

- `IMPLICATION_ATTESTER_ROUTE_PREFIX`, `CONTENT_ATTESTER_ROUTE_PREFIX`
- `IMPLICATION_ATTESTER_TRUSTED_FINDER_KEY`, `CONTENT_ATTESTER_TRUSTED_FINDER_KEY`
- the per-service pricing/rate-limit env vars exposed in [`src/envConfig.ts`](./src/envConfig.ts)

## Running

```bash
npm run build --workspace=@commonality/attester-host
node attester-host/dist/index.js ./attester-host.config.json
```

Or without a JSON file:

```bash
PORT=3000 \
IMPLICATION_ATTESTER_PRIVATE_KEY=0x1111 \
IMPLICATION_ATTESTER_PAYMENT_ADDRESS=0xaaaa \
IMPLICATIONS_CONTRACT_ADDRESS=0x1234 \
CONTENT_ATTESTER_PRIVATE_KEY=0x2222 \
CONTENT_ATTESTER_PAYMENT_ADDRESS=0xbbbb \
ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS=0x5678 \
ALIGNMENT_TOPIC_STATEMENT_CID=bafy... \
CONTENT_ATTESTER_NAME=noninflammatory-neutral \
CONTENT_ATTESTER_PROMPT_TEMPLATE="..." \
OPENROUTER_API_KEY=secret \
ETHEREUM_RPC_URL=http://localhost:8545 \
node attester-host/dist/index.js
```

The host serves:

- `GET /health` for host health
- `/<routePrefix>/...` for each mounted attester's existing routes
