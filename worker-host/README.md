# Worker Host

`worker-host` runs multiple background AI services in one Node process, supervises them individually, and can mount their HTTP surfaces behind one shared Express listener. It is the Bundle B implementation from [`specs/tech/service-bundling.md`](../specs/tech/service-bundling.md).

## What it hosts

The host currently supports the background-worker bundle:

- `implication-finder`
- `content-finder`
- `implication-graph-nudger`
- `bridge-creator`
- `explorer-curator`

Each worker still gets its own full config object and its own signer key where applicable. Bundling is a deployment choice, not a shared-config shortcut.

Workers that expose HTTP can also be mounted under a host route prefix. Today that means:

- `implication-graph-nudger`
- `bridge-creator`
- `explorer-curator`

## Config file

Pass a JSON config file path as the first CLI argument, or set `WORKER_HOST_CONFIG`.

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
        "attesterUrl": "http://implication-attester:3000",
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
        "port": 0,
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

If any worker sets `routePrefix`, the top-level `port` becomes required. The nested worker `port` values are ignored in that case because the host owns the actual listener.

## Environment-based config

If no config path is provided, the host can also synthesize the bundle config from environment variables. This is the deployment path used by `docker-compose.yml` and `render.yaml`.

Required env vars for the full Bundle B shape:

- Shared: `PORT` or `WORKER_HOST_PORT`, `ETHEREUM_RPC_URL`, `OPENROUTER_API_KEY`, `NUDGE_PUBLICATIONS_CONTRACT_ADDRESS`
- Finder wiring:
  - `IMPLICATION_FINDER_ATTESTER_URL`, `IMPLICATION_FINDER_ATTESTER_FINDER_KEY`, `BELIEFS_CONTRACT_ADDRESS`, `IMPLICATIONS_CONTRACT_ADDRESS`
  - `CONTENT_FINDER_ATTESTER_URL`, `CONTENT_FINDER_ATTESTER_FINDER_KEY`
- Nudger identities:
  - `IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY`
  - `BRIDGE_CREATOR_PRIVATE_KEY`
  - `EXPLORER_CURATOR_PRIVATE_KEY`

Useful shared fallbacks:

- `INDEXER_URL`, `EVENT_CACHE_URL`, `PLATFORM_API_URL`
- `IPFS_API`, `IPFS_GATEWAY`, `IPFS_GATEWAY_URL`
- `OPENROUTER_MODEL`

Optional overrides:

- Per-worker route prefixes such as `IMPLICATION_GRAPH_NUDGER_ROUTE_PREFIX`
- Per-worker poll intervals / metadata env vars
- `BRIDGE_CREATOR_COMMONALITY_STATEMENTS`
- `EXPLORER_CURATOR_STREAM`, `EXPLORER_CURATOR_INTERVAL_MS`

## Running

```bash
npm run build --workspace=@commonality/worker-host
node worker-host/dist/cli.js ./worker-host.config.json
```

Or without a JSON file:

```bash
PORT=3000 \
ETHEREUM_RPC_URL=http://localhost:8545 \
OPENROUTER_API_KEY=secret \
NUDGE_PUBLICATIONS_CONTRACT_ADDRESS=0x9999 \
IMPLICATION_FINDER_ATTESTER_URL=http://localhost:3000/implication-attester \
IMPLICATION_FINDER_ATTESTER_FINDER_KEY=secret \
BELIEFS_CONTRACT_ADDRESS=0x1234 \
IMPLICATIONS_CONTRACT_ADDRESS=0x5678 \
CONTENT_FINDER_ATTESTER_URL=http://localhost:3000/content-attester \
CONTENT_FINDER_ATTESTER_FINDER_KEY=secret \
IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY=0x1111 \
BRIDGE_CREATOR_PRIVATE_KEY=0x2222 \
EXPLORER_CURATOR_PRIVATE_KEY=0x3333 \
node worker-host/dist/cli.js
```

The supervisor restarts a worker if it throws during startup or if its run handle finishes unexpectedly. `SIGINT` and `SIGTERM` trigger a clean shutdown of all hosted workers.

When routed workers are configured, the host also serves:

- `GET /health` for host health
- `/<routePrefix>/...` for each mounted worker's existing HTTP routes
