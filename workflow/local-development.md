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

A local UI gateway then gives each **published** IPFS bundle a stable URL such as `http://causestarter.localhost:8088/#/`. Bookmark `http://localhost:8088/admin` for links to whatever was published. The latest CIDs, raw IPFS gateway URLs, and stable local URLs are written to `./data/ui-ipfs/<domain>/`. You can re-print the stable URLs any time with `./scripts/services.sh --url`. After that, run `./scripts/data.sh --seed` to populate the chain with fake data. The default is `--seed=tiny` (5 users, 1 round, no random universe statements, no invariant pass). Use `--seed=small` for the older 10-user / 3-round set.

For a clean local reset, use:

```bash
./scripts/data.sh --wipe
./scripts/services.sh --start
./scripts/data.sh --seed
```

The Anvil container (`hardhat-node`) persists blocks to `data/hardhat/state.json` via `--state` plus a 15s `--state-interval`. Docker stop is SIGTERM; a small entrypoint (`scripts/anvil-docker-entrypoint.sh`) forwards that as SIGINT so Anvil dumps instead of dying empty. Recreate the node after changing that compose service (`docker compose up -d --force-recreate --no-deps hardhat-node`) so the wrapper is mounted.

`--wipe` removes the saved local chain, IPFS repo, and Ponder indexer database. Do not delete only one of `data/hardhat/` or `data/ponder/`: a reset chain with an old Ponder database can make the UI look empty because the indexer thinks old blocks were already processed. `services.sh --start` clears Ponder automatically when it sees Ponder data without a saved local chain. `--start` also records Hardhat-account `TrustSet`s (CauseStarter’s starter network), so the indexer is **not** empty after a fresh start — that is bootstrap, not a seed. `data.sh --seed` only refuses if it already sees signatures / projects / published-data events. If you intentionally want to add another seed run on top of existing data, pass `--allow-seed-on-existing-data`. One-shot reset+seed: `./scripts/stop-wipe-restart.sh --seed`.

For a richer first-run demo that uses the formal seed-content corpus (excluding proliferation variants) and publishes one-shot Explorer/nudge fixtures without live AI worker calls, run:

```bash
./scripts/data.sh --seed=demo
```

### AI services on the local stack

`--start` runs `cause-assist`, `christian-bridge-creator`, and the attester
bundle `service-host-attesters` (implication-attester + content-attester on one
Express listener, `:3006`). Health: `http://localhost:3006/health`, and per
service at `http://localhost:3006/implication-attester/health`. CauseStarter
reaches it through `/api/implication-attester` — proxied by Vite on `:5174` and
by nginx on `:8090` — which is what the bridge-cluster editor's "submit pairs to
attester" step calls.

Two local-only wrinkles are worth knowing about:

- **content-attester is off by default** (`CONTENT_ATTESTER_ENABLED=false` in
  `docker-compose.yml`). It requires `ALIGNMENT_TOPIC_STATEMENT_CID`, which is a
  *published statement* CID rather than a deploy artifact, so a fresh chain has
  none. Because the bundle validates all its services at boot, leaving it on
  takes the implication-attester down with it. Set that CID and
  `CONTENT_ATTESTER_ENABLED=true` to run it.
- **Service signer wallets need funding.** Compose falls back to prefunded
  Hardhat keys, but `docker compose` also auto-loads the root `.env`, and once
  `scripts/generate-wallets.mjs` has run that file holds generated keys with no
  balance on a local chain. Services then boot, report `degraded`, and fail every
  on-chain write. `--start` now runs
  `node scripts/fund-local-service-wallets.mjs`, which tops up any configured
  signer below 1 ETH from Hardhat account #0 (idempotent, and refuses to run off
  chain 31337). Run it by hand after a wipe if an attester reports `degraded`.

No API keys or secrets are needed for local development. The generated root `.env` and `ui/.env` are based on the local deployment defaults; use [`.env.example`](/.env.example) and [`ui/.env.example`](/ui/.env.example) as the reference for the variables that the stack and UI understand. `scripts/services.sh` owns starting/stopping/status/URL printing for Docker services; `scripts/data.sh` owns wiping and seeding local chain/IPFS/indexer data.

See [deployment.md](./deployment.md) for testnet/mainnet deployment (which does require secrets).


## Testing

See:
  - [Verifier workspace](/verifier/README.md) — how to run the checks; [DESIGN.md](/verifier/DESIGN.md) for the testing philosophy and validation-pass runbook
