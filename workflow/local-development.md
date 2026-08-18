# Local development and deployment

## Coding

**Branch structure:** See [workflow/branching.md](/workflow/branching.md). Briefly: work on feature branches; commits directly on `dev` or `master` are blocked by hooks. Feature-branch commits run the quick suite, and merges into `master` are gated by the full suite.

## Building

**Prerequisites:** [Node.js 24.x](https://nodejs.org/), [Docker](https://docs.docker.com/get-docker/)

```bash
npm install
verifier-run automated.build   # or npm run build
```

See [build.md](./build.md) for more details.

## Local deployment

After building, you can run:

```bash
./scripts/services.sh --start
./scripts/data.sh --seed
```

That's it. This uses Docker Compose to start a local Hardhat blockchain, deploys the smart contracts, starts IPFS, the Ponder indexer, and the platform API service, then publishes the selected UI domain SPA(s) to the local IPFS gateway.

**Which UI bundles get built:** local start currently publishes **CauseStarter only**. The eight legacy `ui` domains (commonality, lazyGiving, alignment, tally, content-funding, civility, common-sense-majority, conceptspace) each run a full Docker Vite build sequentially and were a major part of `--start` time. This is a temporary, reversible default — the compose services and source trees are still there.

- Default: `LOCAL_UI_DOMAINS=causestarter` (implicit)
- Restore every local IPFS SPA: `LOCAL_UI_DOMAINS=all ./scripts/services.sh --start`
- Subset: `LOCAL_UI_DOMAINS=causestarter,tally ./scripts/services.sh --start`

The same env var is read by `scripts/deploy-causestarter.sh`. The allow-list lives in `scripts/ui-domains.mjs` (`resolveLocalPublishDomains`). CauseStarter's dedicated SPA on `:8090` is always started and is independent of this list.

A local UI gateway then gives each **published** IPFS bundle a stable URL such as `http://causestarter.localhost:8088/#/`. Bookmark `http://localhost:8088/admin` for links to whatever was published. The latest CIDs, raw IPFS gateway URLs, and stable local URLs are written to `./data/ui-ipfs/<domain>/`. You can re-print the stable URLs any time with `./scripts/services.sh --url`. After that, run `./scripts/data.sh --seed` to populate the chain with fake data. The default is `--seed=tiny` (5 users, 1 round, 12 statements, no invariant pass). Use `--seed=small` for the older 10-user / 3-round set.

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
  - [Verifier workspace](/verifier/README.md) — how to run the checks; [DESIGN.md](/verifier/DESIGN.md) for the testing philosophy and validation-pass runbook
