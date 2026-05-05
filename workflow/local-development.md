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

That's it. This starts a local Hardhat blockchain, deploys the smart contracts, starts IPFS, the Ponder indexer, and the platform API service, then publishes all eight domain SPA builds (commonality, pubstarter, alignment, tally, content-funding, noninflammatory, csm, conceptspace) to the local IPFS gateway and prints their gateway URLs. The latest CIDs and SPA URLs are written to `./data/ui-ipfs/<domain>/`. You can re-print those URLs any time with `./scripts/services.sh --url`. After that, run `./scripts/data.sh --seed` to populate the chain with fake data (10 users, 3 rounds).

For a clean local reset, use:

```bash
./scripts/data.sh --wipe
./scripts/services.sh --start
./scripts/data.sh --seed
```

`--wipe` removes the saved local chain, IPFS repo, and Ponder indexer database. Do not delete only one of `data/hardhat/` or `data/ponder/`: a reset chain with an old Ponder database can make the UI look empty because the indexer thinks old blocks were already processed. `services.sh --start` clears Ponder automatically when it sees Ponder data without a saved local chain, and `data.sh --seed` now errors if the indexer already contains events. If you intentionally want to add another seed run on top of existing data, pass `--allow-seed-on-existing-data`.

For a richer first-run demo that uses the formal seed-content corpus (excluding proliferation variants) and publishes one-shot Explorer/nudge fixtures without live AI worker calls, run:

```bash
./scripts/data.sh --seed=demo
```

No API keys or secrets are needed for local development.

See [deployment.md](./deployment.md) for testnet/mainnet deployment (which does require secrets).
