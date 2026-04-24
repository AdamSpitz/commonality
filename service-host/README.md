# Service Host

`service-host` runs multiple AI logical services in one Node process, supervises them individually, and mounts any HTTP surfaces behind one shared Express listener. It is the unified host described in [`specs/tech/service-bundling.md`](../specs/tech/service-bundling.md).

Bundling is a deployment choice, not a shared-config shortcut. Each hosted service still gets its own full config object and its own signer key where applicable.

## What It Hosts

The host currently supports these logical service kinds:

- `implication-attester`
- `content-attester`
- `implication-finder`
- `content-finder`
- `implication-graph-nudger`
- `bridge-creator`
- `explorer-curator`

Services that expose HTTP can be mounted under a host route prefix:

- `implication-attester`
- `content-attester`
- `implication-graph-nudger`
- `bridge-creator`
- `explorer-curator`

## Config File

Pass a JSON config file path as the first CLI argument, or set `SERVICE_HOST_CONFIG`.

Example:

```json
{
  "port": 3000,
  "workers": [
    {
      "name": "implication-finder",
      "kind": "implication-finder",
      "restartDelayMs": 1000,
      "config": {
        "eventCacheUrl": "http://indexer:42069",
        "attesterUrl": "http://service-host-attesters:3000/implication-attester",
        "attesterFinderKey": "secret",
        "beliefsContractAddress": "0x1234",
        "implicationsContractAddress": "0x5678",
        "ipfsGatewayUrl": "http://ipfs:8080",
        "pollIntervalMs": 30000,
        "topNStatements": 20,
        "minBelieverThreshold": 2,
        "stateFilePath": "/data/implication-finder-state.json"
      }
    },
    {
      "name": "explorer-curator",
      "kind": "explorer-curator",
      "routePrefix": "/explorer-curator",
      "config": {
        "nudgerPrivateKey": "0x1111",
        "ethereumRpcUrl": "http://hardhat:8545",
        "nudgePublicationsContractAddress": "0x9999",
        "openRouterApiKey": "secret",
        "indexerUrl": "http://indexer:42069",
        "ipfsApiUrl": "http://ipfs:5001",
        "ipfsGatewayUrl": "http://ipfs:8080",
        "openRouterModel": "anthropic/claude-3.5-haiku",
        "stream": "fundable-project-explorer",
        "curatorIntervalMs": 21600000,
        "name": "Fundable Project Explorer",
        "description": "Curates and personalizes explorer entries",
        "sourceType": "explorer-curator",
        "version": "0.1.0"
      }
    }
  ]
}
```

If any hosted service sets `routePrefix`, the top-level `port` is required because the host owns the actual listener.

## Environment Config

If no config path is provided, the host can synthesize a bundle config from environment variables. This is the deployment path used by `docker-compose.yml` and `render.yaml`.

Each logical service has a `*_ENABLED` flag. Disabled services are not added to the host config, and their service-specific required env vars are not read. For example, an attester-only host can set the five worker/nudger `*_ENABLED=false` flags without providing finder or nudger credentials.

Bundle selection flags:

- `IMPLICATION_ATTESTER_ENABLED`
- `CONTENT_ATTESTER_ENABLED`
- `IMPLICATION_FINDER_ENABLED`
- `CONTENT_FINDER_ENABLED`
- `IMPLICATION_GRAPH_NUDGER_ENABLED`
- `BRIDGE_CREATOR_ENABLED`
- `EXPLORER_CURATOR_ENABLED`

Shared env vars used by multiple enabled services:

- `PORT` or `SERVICE_HOST_PORT`
- `ETHEREUM_RPC_URL`
- `OPENROUTER_API_KEY`
- `INDEXER_URL`, `EVENT_CACHE_URL`, `PLATFORM_API_URL`
- `IPFS_API`, `IPFS_GATEWAY`, `IPFS_GATEWAY_URL`
- `OPENROUTER_MODEL`

Each service also has service-specific env vars such as signer keys, attester URLs, route prefixes, prompt templates, and polling intervals. See `service-host/src/envConfig.ts` for the current centralized env-var mapping.

## Running

With a config file:

```bash
npm run build
node dist/cli.js ./service-host.config.json
```

With env vars only:

```bash
SERVICE_HOST_PORT=3000 \
ETHEREUM_RPC_URL=http://localhost:8545 \
OPENROUTER_API_KEY=secret \
IMPLICATION_FINDER_ENABLED=false \
CONTENT_FINDER_ENABLED=false \
IMPLICATION_GRAPH_NUDGER_ENABLED=false \
BRIDGE_CREATOR_ENABLED=false \
EXPLORER_CURATOR_ENABLED=false \
node dist/cli.js
```

The supervisor restarts a service if it throws during startup or if its run handle finishes unexpectedly. `SIGINT` and `SIGTERM` trigger a clean shutdown of all hosted services.

When routed services are configured, the host serves:

- `GET /health` for host health
- `/<routePrefix>/...` for each mounted service's existing HTTP routes
