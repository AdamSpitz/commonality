# Local development and deployment

## Building

**Prerequisites:** [Node.js 24.x](https://nodejs.org/), [Docker](https://docs.docker.com/get-docker/)

```bash
npm install
npm run build
```

See [BUILD.md](./BUILD.md) for more details.

## Local deployment

After building, you can run:

```bash
./scripts/services.sh --start
./scripts/data.sh --seed
```

That's it. This starts a local Hardhat blockchain, deploys the smart contracts, starts IPFS, the Ponder indexer, and the content-funding platform API service, then publishes the SPA build to the local IPFS gateway and prints the resulting `http://localhost:8080/ipfs/<cid>/commonality-ui/#/` URL. The latest CID and SPA URL are also written to `./data/ui-ipfs/`. You can re-print the current SPA URL any time with `./scripts/services.sh --url`. After that, run `./scripts/data.sh --seed` to populate the chain with fake data (10 users, 3 rounds).

No API keys or secrets are needed for local development.

See [deployment.md](./deployment.md) for testnet/mainnet deployment (which does require secrets).
