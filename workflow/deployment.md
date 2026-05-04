# Deployment

This document covers **testnet and mainnet** deployment. For local development, see [README.md](README.md); the full local stack runs in Docker and needs no secrets.

## Mental model

Commonality deploys to three independent targets:

| Target             | What goes there                                                | How it's deployed                      |
| ------------------ | -------------------------------------------------------------- | -------------------------------------- |
| **Ethereum chain** | Smart contracts                                                | `hardhat run scripts/deploy.js`        |
| **Render**         | AI services, platform API, indexer (once prod-ready — see gap) | `render.yaml` blueprint + git push     |
| **IPFS + ENS**     | UI (six branded SPAs)                                          | `scripts/deploy-ui.sh` + `update-ens.sh` |

Each target has its own cadence and its own blast radius. Don't try to unify them behind one megascript — the separation is the feature.

## Infrastructure-as-code

- [`render.yaml`](./render.yaml) is the source of truth for all Render services. Treat it like code: edit the file, commit, push, re-sync the blueprint. Do **not** configure services through the Render dashboard except for secrets (the `sync: false` entries).
- [`docker-compose.yml`](./docker-compose.yml) is the source of truth for local.
- [`deployments/<network>.env`](./deployments/) is the source of truth for deployed contract addresses. The deploy script writes it and you commit it; services read it at build time.

No Terraform, no Kubernetes, no Pulumi. Resist upgrading until you have a concrete reason.

---

## One-time setup

### 1. Create `.env.secrets`

Copy and fill in:

```bash
cp .env.secrets.example .env.secrets
```

You need at minimum:

- `DEPLOYER_PRIVATE_KEY` — funded with sepolia ETH (free from a faucet) or mainnet ETH (~0.05–0.1 ETH for full deploy)
- `ATTESTER_PRIVATE_KEY` — separate wallet for the attester services
- `OPENROUTER_API_KEY` — LLM access
- `VITE_WALLETCONNECT_PROJECT_ID` — from cloud.walletconnect.com
- `PINATA_JWT` — for IPFS uploads
- `ENS_OWNER_PRIVATE_KEY` — wallet that owns the ENS name

`.env.secrets` is gitignored. Never commit it.

### 2. Create accounts

- **[Render](https://render.com)** — one account is fine for both testnet and prod (we'll use separate blueprints per network).
- **[Pinata](https://app.pinata.cloud)** — free tier covers a few CIDs.
- **[ENS](https://app.ens.domains)** — register `<yourname>.eth`.
- **RPC provider** (Alchemy or Infura) — the public endpoints in `hardhat.config.cjs` work for light use, but paid endpoints are worth it for the indexer.

---

## Deploying a testnet release (happy path)

### Step 1: Deploy contracts to Sepolia

```bash
cd hardhat
npx hardhat run scripts/deploy.js --network sepolia
```

This writes contract addresses to `deployments/sepolia.env` and detailed metadata to `hardhat/deployments/sepolia-<timestamp>.json`.

**Commit `deployments/sepolia.env` to git.** Services read addresses from it.

Optionally verify on Etherscan:

```bash
npx hardhat verify --network sepolia <address> <constructor-args>
```

### Step 2: Deploy services to Render

First time only:

1. In Render, **New → Blueprint**, connect to this GitHub repo.
2. Render reads `render.yaml` and creates the 4 runtime services (`commonality-indexer`, `commonality-attester-host`, `commonality-worker-host`, `commonality-platform-api`) plus the indexer Postgres database.
3. For each service, open its dashboard and set the `sync: false` env vars (secrets and addresses). The blueprint comments at the bottom of `render.yaml` list what each service needs.
4. Addresses come from `deployments/sepolia.env`; copy-paste them into Render.

Subsequent deploys: just `git push`. Render rebuilds automatically (`autoDeploy: true`).

Verify:

```bash
curl https://commonality-attester-host.onrender.com/health
curl https://commonality-worker-host.onrender.com/health
curl https://commonality-indexer.onrender.com/graphql
curl https://commonality-platform-api.onrender.com/health
```

### Step 3: Deploy UI to IPFS + ENS

Before building the UI, set `EVENT_CACHE_URL` in `.env.secrets` to the public base URL of the deployed indexer, for example:

```bash
EVENT_CACHE_URL=https://commonality-indexer.onrender.com
```

The IPFS UI cannot use the local Vite proxy, so this URL is baked into the bundle at build time. `scripts/deploy-ui.sh` will stop early if it is missing.

```bash
./scripts/deploy-ui.sh sepolia                  # → prints CID
./scripts/update-ens.sh myapp.eth <cid> --network sepolia
```

Visit `https://myapp.eth.limo` to verify.

UI is built per network (contract addresses are baked into the Vite bundle), and per domain (six branded variants). To build a non-default domain:

```bash
./scripts/deploy-ui.sh sepolia tally
```

Supported domains: `commonality` (default), `tally`, `content-funding`, `noninflammatory`, `csm`, `conceptspace`.

---

## Indexer on Render

The Render blueprint now includes both the `commonality-indexer` web service and a `commonality-indexer-db` Postgres database.

Set these indexer env vars in the Render dashboard:

- `PONDER_CHAIN`: `sepolia` for testnet or `mainnet` for production
- `PONDER_RPC_URL_11155111` or `PONDER_RPC_URL_1`: RPC URL for the selected chain
- `START_BLOCK`: block where the deployed contracts start emitting relevant events
- All contract addresses from `deployments/<network>.env`

The blueprint already wires:

- `PONDER_SCRIPT=start` so hosted deployments use `ponder start`
- `DATABASE_URL` from the managed Postgres database
- `DATABASE_SCHEMA=public`

For local Docker development, the same image still defaults to `PONDER_SCRIPT=dev:no-ui` and `PONDER_CHAIN=hardhat`.

---

## Environment variables

All service-specific env vars are documented in each service's README. Quick pointers:

- [`attester-host/README.md`](attester-host/README.md)
- [`worker-host/README.md`](worker-host/README.md)
- [`platform-api-service/README.md`](platform-api-service/README.md)

The bottom of [`render.yaml`](./render.yaml) lists which vars are secrets (set in Render dashboard) per service.

### How env vars flow

```
.env.secrets              ← you fill in once (gitignored)
deployments/<net>.env     ← deploy script writes (committed)
         │
         ▼ for local dev: scripts/setup-env.sh <network>
         ▼ for Render:    copy-paste into dashboard once per service
         │
service-local .env files  ← each service reads its own
```

`setup-env.sh` is only used for local development. On Render, env vars live in the dashboard; don't try to automate populating them unless/until it becomes painful.

---

## Updating a running deployment

### Service code change

1. Push to master.
2. Render auto-builds and deploys (per-service, independently).
3. Check `/health` endpoint afterward.

For mainnet, consider setting `autoDeploy: false` per service and triggering manual deploys from tagged commits.

### Contract upgrade

Contracts are not upgradeable in this codebase. Redeploying contracts means:

1. `hardhat run scripts/deploy.js --network <net>` writes new addresses.
2. Commit the updated `deployments/<net>.env`.
3. Update contract-address env vars in Render dashboard for every service that uses them.
4. Redeploy UI (addresses are baked into the bundle).
5. Update ENS contenthash.
6. Old indexer data is wrong — wipe the indexer Postgres and resync from the new contracts' start block.

This is intentionally high-friction. For testnet it's tolerable; for mainnet, consider adding an audit pass before each redeploy.

### UI-only change

```bash
./scripts/deploy-ui.sh <network>       # → new CID
./scripts/update-ens.sh <name>.eth <cid>
```

Users may see the old CID until their gateway cache expires (minutes to hours).

---

## Pre-mainnet checklist

Do not deploy to mainnet until all of these are checked:

### Security
- [ ] Professional smart-contract audit passed
- [ ] Generative / invariant testing complete
- [ ] Emergency pause procedures documented
- [ ] Separate wallets for deployer, attester(s), nudger(s), verifier, ENS owner — never reuse keys
- [ ] Private keys stored in a password manager or hardware wallet, not plaintext
- [ ] Mainnet `DEPLOYER_PRIVATE_KEY` only used for deployment, then retired

### Infrastructure
- [ ] Testnet indexer has been running stably for at least a week
- [ ] Paid RPC endpoint (Alchemy/Infura) configured — public endpoints will rate-limit the indexer
- [ ] Render services moved off `plan: standard` only if load requires it (standard is fine to start)
- [ ] `autoDeploy: false` on mainnet services; deploy from tagged releases
- [ ] Postgres add-on has automated backups enabled
- [ ] Monitoring: at least Sentry (or similar) on the AI services

### Contracts
- [ ] Contracts verified on Etherscan
- [ ] `deployments/mainnet.env` committed
- [ ] `ChannelVerifier` trusted-verifier address matches `platform-api-service` `VERIFIER_PRIVATE_KEY`
- [ ] Tenderly or similar alerts set up for unusual contract activity

### UI
- [ ] UI builds against mainnet addresses
- [ ] CID pinned to Pinata
- [ ] ENS contenthash updated
- [ ] `https://<name>.eth.limo` loads and wallet connection works

### Sign-off
- [ ] Manual smoke test: create belief, add implication, receive nudge, fund a creator
- [ ] Announcement prepared

---

## Operations

### Health checks

- Attester and nudger services: `GET /health`
- Indexer (once deployed): `POST /graphql { "query": "{ _meta { block { number } } }" }`
- IPFS (Pinata): visit `https://gateway.pinata.cloud/ipfs/<cid>`
- ENS: visit `https://<name>.eth.limo`

### Logs

Render streams logs per service. For anything beyond casual debugging, add Sentry (or similar). Render log retention is limited.

### Rollback

- **Services:** Render keeps previous Docker images. In the dashboard: Deploys → pick a previous successful deploy → "Rollback to this deploy."
- **UI:** Point ENS contenthash back to a previous CID. CIDs are immutable; as long as Pinata still has the old one pinned, rollback is instant.
- **Contracts:** no rollback. Deploy a new version and update addresses everywhere.

### Costs (approximate, mid-2026)

- Render: 4 services × ~$25/mo standard = ~$100/mo, plus the Postgres add-on. Can probably drop several to `starter` (~$7/mo) once load is known.
- Render Postgres for indexer: ~$7–20/mo depending on plan.
- Pinata: free tier covers a few CIDs; paid starts at ~$20/mo.
- RPC (Alchemy/Infura): free tier covers light testnet use; production indexer probably needs ~$50/mo.
- Total rough ballpark: **$250–400/mo** before mainnet gas.

---

## Known gaps / future work

See [TODO.md](TODO.md) for the prioritized list. Deployment-relevant items:

- **Indexer prod-readiness** — the four-step plan above.
- **DNS + ENS names** — not registered yet.
- **Second smart-contract audit pass.**
- **Monitoring / alerting** — only Render's built-in logs today.
- **Staging environment** — Render supports preview environments per PR; worth enabling before the project has real users.

---

## Troubleshooting

| Symptom                                 | Likely cause                                                | Fix                                                                  |
| --------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| "Insufficient funds for gas"            | Deployer wallet empty                                       | Send ETH; for sepolia use a faucet                                   |
| Service builds but crashes on boot      | Missing env var                                             | Check Render logs; compare to `.env.example` in the service dir      |
| Attester never attests                  | Attester wallet has no ETH, or wrong `IMPLICATIONS_CONTRACT_ADDRESS` | Check wallet balance; compare addresses to `deployments/<net>.env`   |
| Indexer not syncing                     | Wrong `START_BLOCK`, wrong RPC URL, or indexer not yet prod-ready | See "indexer gap" section                                            |
| UI loads but can't read contracts       | Stale bundle with old addresses                             | Rebuild UI with `./scripts/deploy-ui.sh <network>` and update ENS    |
| ENS update transaction reverts          | `ENS_OWNER_PRIVATE_KEY` doesn't own the name                | Verify ownership at app.ens.domains                                  |

For anything not here, check Render logs first, then the service's own README.
