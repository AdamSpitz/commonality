# Local development and deployment

## Coding

**Branch structure:** See [workflow/branching.md](/workflow/branching.md). Briefly: work in `dev`, promote to `master` via merge. Commits to dev are gated by a quicker test suite; merges to master are gated by the full test suite.

## Building

**Prerequisites:** [Node.js 24.x](https://nodejs.org/), [Docker](https://docs.docker.com/get-docker/)

```bash
npm install
npm run build
```

See [build.md](./build.md) for more details.

## Local deployment

After building, you can run:

```bash
./scripts/services.sh --start
./scripts/data.sh --seed
```

That's it. This uses Docker Compose to start a local Hardhat blockchain, deploys the smart contracts, starts IPFS, the Ponder indexer, and the platform API service, then publishes all eight domain SPA builds (commonality, lazyGiving, alignment, tally, content-funding, civility, common-sense-majority, conceptspace) to the local IPFS gateway. A local UI gateway then gives each IPFS bundle a stable URL such as `http://commonality.localhost:8088/#/` and `http://lazyGiving.localhost:8088/#/`. Bookmark `http://localhost:8088/admin` for a simple local admin page linking to all eight stable URLs. The latest CIDs, raw IPFS gateway URLs, and stable local URLs are written to `./data/ui-ipfs/<domain>/`. You can re-print the stable URLs any time with `./scripts/services.sh --url`. After that, run `./scripts/data.sh --seed` to populate the chain with fake data (10 users, 3 rounds).

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

No API keys or secrets are needed for local development. The generated root `.env` and `ui/.env` are based on the local deployment defaults; use [`.env.example`](/.env.example) and [`ui/.env.example`](/ui/.env.example) as the reference for the variables that the stack and UI understand. `scripts/services.sh` owns starting/stopping/status/URL printing for Docker services; `scripts/data.sh` owns wiping and seeding local chain/IPFS/indexer data.

See [deployment.md](./deployment.md) for testnet/mainnet deployment (which does require secrets).


## Testing

See:
  - [Big test plan](/verifier/testing-plan.md)
