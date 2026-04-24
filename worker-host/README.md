# Worker Host

`worker-host` runs multiple background AI services in one Node process and supervises them individually. It is the first building block for the service-bundling plan in [`specs/tech/service-bundling.md`](../specs/tech/service-bundling.md).

## What it hosts

The host currently supports the background-worker bundle:

- `implication-finder`
- `content-finder`
- `implication-graph-nudger`
- `bridge-creator`
- `explorer-curator`

Each worker still gets its own full config object and its own signer key where applicable. Bundling is a deployment choice, not a shared-config shortcut.

## Config file

Pass a JSON config file path as the first CLI argument, or set `WORKER_HOST_CONFIG`.

Example:

```json
{
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
    }
  ]
}
```

## Running

```bash
npm run build --workspace=@commonality/worker-host
node worker-host/dist/index.js ./worker-host.config.json
```

The supervisor restarts a worker if it throws during startup or if its run handle finishes unexpectedly. `SIGINT` and `SIGTERM` trigger a clean shutdown of all hosted workers.
