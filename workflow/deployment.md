# Deployment

This document covers **testnet and mainnet** deployment. For local development, see [README.md](README.md); the full local stack runs in Docker and needs no secrets.

If an LLM is doing deployment prep, it should execute the scriptable steps here, inspect outputs, and stop for human help when a step needs secret custody, wallet funding, ENS/DNS/account access, dashboard clicks, or product judgment. The companion [testnet-prep.md](../testnet-prep.md) is only the human/operator blocker list.

## Mental model

Commonality deploys to three independent targets:

| Target             | What goes there                                                | How it's deployed                      |
| ------------------ | -------------------------------------------------------------- | -------------------------------------- |
| **Ethereum chain** | Smart contracts                                                | `hardhat run scripts/deploy.js`        |
| **Render**         | AI services, platform API, indexer (once prod-ready — see gap) | `render.yaml` blueprint + git push     |
| **IPFS + IPNS + ENS + DNS** | UI (eight branded SPAs)                               | `scripts/deploy-testnet.sh` (one-shot per release) |

Each target has its own cadence and its own blast radius. Don't try to unify them behind one megascript — the separation is the feature.

## Infrastructure-as-code

- [`render.yaml`](../render.yaml) is the Render blueprint — but it is **generated**. The source of truth is [`render.yaml.template`](../render.yaml.template) (service structure) plus [`deployments/<network>.env`](../deployments/) (non-secret values). After editing either file, regenerate and commit:
  ```bash
  node scripts/generate-render-yaml.mjs          # defaults to deployments/base-sepolia.env
  node scripts/generate-render-yaml.mjs deployments/mainnet.env   # for mainnet
  ```
  Do **not** edit `render.yaml` directly — your changes will be overwritten. Configure only secrets through the Render dashboard (the `sync: false` entries that remain after generation).
- [`docker-compose.yml`](../docker-compose.yml) is the source of truth for local.
- [`deployments/<network>.env`](../deployments/) is the source of truth for deployed contract addresses and other non-secret deployment values. The deploy script writes it and you commit it; `generate-render-yaml.mjs` reads it to fill in `render.yaml`.

No Terraform, no Kubernetes, no Pulumi. Resist upgrading until you have a concrete reason.

---

## One-time setup

### 1. Create `.env.secrets`

Generate deployment wallets first:

```bash
node scripts/generate-wallets.mjs
```

This creates/updates two gitignored files:

- `.env.secrets` — private keys plus finder trust secrets. Save the printed secret block in your password manager too.
- `deployments/wallets.env` — public wallet addresses, x402 payment recipient addresses, `CHANNEL_VERIFIER_TRUSTED_SIGNER_ADDRESS`, and UI default-trust env vars.

Then fill the remaining non-generated values in `.env.secrets` (use `.env.secrets.example` as the reference):

- `OPENROUTER_API_KEY` — LLM access
- `VITE_WALLETCONNECT_PROJECT_ID` — from cloud.walletconnect.com
- `PINATA_JWT` — for IPFS uploads
- RPC provider URLs, especially `BASE_SEPOLIA_RPC_URL`
- noninflammatory attestation policy. For the first testnet, upload seed statements with `npm exec --workspace=fake-data-generation tsx prepareSeedStatements.ts -- --upload`, then run `./scripts/setup-testnet-ai-policy.mjs`. The setup script reads the approved `noninflammatory-civility-topic` seed statement's uploaded CID from `fake-data-generation/output/seed-statements.uploads.json`; pass `--alignment-topic-statement-cid=<CID>` only to override it. This configures both the stateless `content-attester` fallback and the `us-politics` beat-agent rehearsal; add `--x-api-bearer-token=<token>` or set `X_API_BEARER_TOKEN` for Twitter/X ingestion. Review the generated `BEAT_AGENT_BEAT_DEFINITION_JSON` before public use.
- deployed service/UI URLs once chosen
- `IPNS_PRIVATE_KEY_TESTNET_*` (one per UI subdomain) — generated all at once with `./scripts/setup-testnet-naming.sh` (or one by one with `./scripts/setup-ipns-key.sh`)
- Optional Cloudflare DNS automation: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`

`.env.secrets` and `deployments/wallets.env` are gitignored. Never commit secrets.

### 2. Fund Base Sepolia operational wallets

The human/operator only needs to use a Base Sepolia faucet for `DEPLOYER_ADDRESS` in `deployments/wallets.env`. The deployer needs ETH for contract deployment anyway, and the distribution script can use `DEPLOYER_PRIVATE_KEY` from `.env.secrets` to fund the other transaction-sending wallets.

After the faucet transfer lands, inspect the distribution plan:

```bash
node scripts/fund-base-sepolia-wallets.mjs --amount 0.005 --dry-run
```

If the script reports that the deployer balance is sufficient, send the transfers:

```bash
node scripts/fund-base-sepolia-wallets.mjs --amount 0.005 --yes
```

The script refuses to run if the funder cannot cover the per-wallet transfers, estimated transfer gas, and its reserve balance. By default it sends `0.005 ETH` to each operational wallet and leaves `0.02 ETH` in the deployer; adjust with `--amount` or `--reserve` if needed. If you prefer a separate faucet-funded distribution wallet, set `FUNDER_PRIVATE_KEY` and pass/use that instead; otherwise the deployer is the intended funder.

### 3. Create accounts

- **[Render](https://render.com)** — one account is fine for both testnet and prod (we'll use separate blueprints per network).
- **[Pinata](https://app.pinata.cloud)** — free tier covers a few CIDs.
- **[ENS](https://app.ens.domains)** — use `commonality.eth` on **mainnet L1**. We use only mainnet ENS: even for testnet UI deploys, the ENS name lives on L1, because `eth.limo` (and most gateways) only resolve mainnet ENS. The dapp's contract network is independent.
- **DNS provider for `commonality.works`** — prefer Cloudflare so setup can be API-driven; otherwise any provider that supports TXT and CNAME records works.
- **RPC provider** (Alchemy or Infura) — the public endpoints in `hardhat.config.cjs` work for light use, but paid endpoints are worth it for the indexer.

---

## Deploying a testnet release (happy path)

### Step 1: Deploy contracts to Base Sepolia

```bash
cd hardhat
npx hardhat run scripts/deploy.js --network base-sepolia
```

`hardhat.config.cjs` automatically reads `.env`, `deployments/wallets.env`, and `.env.secrets`, so you do not need to export the deployer key by hand. The deploy script uses `CHANNEL_VERIFIER_TRUSTED_SIGNER_ADDRESS` from `deployments/wallets.env` for the `ChannelVerifier` trusted signer on non-local networks.

This writes contract addresses to `deployments/base-sepolia.env` and detailed metadata to `hardhat/deployments/base-sepolia-<timestamp>.json`.

After deploying content-funding contracts, explicitly configure production economics before inviting users:

- Use only a vetted standard ERC-20 settlement token (MVP: USDC; no fee-on-transfer/rebasing/callback tokens).
- Set `CreatorAssuranceContractFactory.thirdPartyMinPurchase` to a meaningful minimum in settlement-token units.
- Keep `thirdPartyMaxDuration` bounded (default 7 days, matching the default channel veto window) unless there is a deliberate anti-squatting reason to change it.

**Commit `deployments/base-sepolia.env` to git.** Services read addresses from it.

Optionally verify on Basescan:

```bash
npx hardhat verify --network base-sepolia <address> <constructor-args>
```

### Step 2: Deploy services to Render

First time only:

1. Make sure `render.yaml` is up to date: `node scripts/generate-render-yaml.mjs` and commit if it changed.
2. In Render, **New → Blueprint**, connect to this GitHub repo.
3. Render reads `render.yaml` and creates the 4 runtime services (`commonality-indexer`, `commonality-service-host-attesters`, `commonality-service-host-workers`, `commonality-platform-api`) plus the indexer Postgres database.
4. For each service, open its dashboard and set the `sync: false` env vars. Use the helper script to generate a per-service block you can paste into **Environment → Add from .env**:
   ```bash
   node scripts/generate-render-secrets.mjs
   ```
   It reads `.env.secrets`, `deployments/wallets.env`, and `deployments/base-sepolia.env` and prints one block per service. `ALIGNMENT_TOPIC_STATEMENT_CID` will be missing until you run `scripts/setup-testnet-ai-policy.mjs` — add it to the attesters service afterward.

Subsequent deploys: just `git push`. Render rebuilds automatically (`autoDeploy: true`).

Do **not** add Render custom domains for each service. Render is compute; Cloudflare is the public edge/naming layer. Deploy the Cloudflare Worker gateway in [`cloudflare-service-gateway/`](../cloudflare-service-gateway/) so one hostname routes to the Render `*.onrender.com` service origins:

- `https://services.testnet.commonality.works/indexer/*`
- `https://services.testnet.commonality.works/platform-api/*`
- `https://services.testnet.commonality.works/attesters/*`
- `https://services.testnet.commonality.works/workers/*`

Verify after the Worker is deployed:

```bash
curl https://services.testnet.commonality.works/attesters/health
curl https://services.testnet.commonality.works/workers/health
curl https://services.testnet.commonality.works/indexer/graphql
curl https://services.testnet.commonality.works/platform-api/health
```

Temporary fallback: until the Cloudflare route is ready, the current testnet env/config uses the direct Render `*.onrender.com` URLs documented in [`cloudflare-service-gateway/README.md`](../cloudflare-service-gateway/README.md#direct-render-fallback). Switch `deployments/base-sepolia.env` and `render.yaml.template` back to the `services.testnet.commonality.works` gateway URLs once the Worker is deployed.

### Step 3: Deploy UI to IPFS (+ IPNS + ENS + DNS)

Before building the UI, set `EVENT_CACHE_URL` in `.env.secrets` to the public base URL of the deployed indexer, for example:

```bash
EVENT_CACHE_URL=https://commonality-indexer.onrender.com
```

The IPFS UI cannot use the local Vite proxy, so this URL is baked into the bundle at build time. `scripts/deploy-ui.sh` will stop early if it is missing.

#### How the naming layer works (testnet)

We pin each UI build to IPFS (Pinata) and point to it through a **stable IPNS name** (one per UI subdomain). The ENS contenthash and the DNSLink TXT record on `commonality.works` both reference that IPNS name — and stay unchanged forever. Per-deploy work is a single `w3name` publish (free, no transaction, no DNS change).

This is **testnet-only**. On mainnet we pin the ENS contenthash directly to immutable IPFS CIDs (see "Mainnet differences" below), so every UI deploy is an on-chain transaction. That gas friction is intentional — it acts as a deploy-control gate, and there's no IPNS private key whose loss could let someone swap the live UI.

```
              Pinata pin                w3name publish              eth.limo / Cloudflare gateway
   build/   ──────────────▶   CID   ──────────────────▶   IPNS    ◀───────────────────────────────  user
                                                            ▲
                                                            │ unchanged after one-time setup:
                                                            │   • ENS contenthash → ipns://<name>
                                                            │   • DNSLink TXT → /ipns/<name>
```

The same IPNS name backs both the `*.testnet.commonality.eth.limo` URL and the `*.testnet.commonality.works` URL, so they always show the same build.

#### One-time setup (per environment)

Do this once for testnet, again for mainnet. It costs a few mainnet-ENS transactions then never costs gas again.

1. **Generate local naming material:**
   ```bash
   ./scripts/setup-testnet-naming.sh
   ```
   This is safe/idempotent and does not touch external services. It creates or reuses one IPNS key per UI, appends missing `IPNS_PRIVATE_KEY_TESTNET_*` values and standard testnet UI URLs to `.env.secrets`, and writes the public IPNS names to `deployments/testnet-ipns.env`.
2. **ENS prerequisite — create subdomains/resolvers** (mainnet L1). The script detects whether the parent is wrapped and uses the ENS Name Wrapper when required:
   ```bash
   ./scripts/create-ens-subdomains.sh --inspect
   ./scripts/create-ens-subdomains.sh --yes
   ```
   This creates/updates `testnet.commonality.eth` plus `commonality`, `lazygiving`, `alignment`, `tally`, `content-funding`, `civility`, `common-sense-majority`, and `conceptspace` under it, each with the ENS public resolver.

   If `commonality.works` has first been imported into ENS via DNSSEC, the same script can target that ENS name instead:
   ```bash
   ./scripts/create-ens-subdomains.sh --root commonality.works --inspect
   ./scripts/create-ens-subdomains.sh --root commonality.works --yes
   ```
   DNSSEC-importing `commonality.works` itself is still a one-time ENS/DNSSEC setup step outside this script; after import, subdomain creation is ordinary ENS automation. If we decide to use `commonality.works` as the ENS root for testnet contenthashes, update `ensRoot` in `deployments/testnet-names.json` from `commonality.eth` to `commonality.works` before the next step.
3. **Set ENS contenthashes automatically** after the ENS names/resolvers exist:
   ```bash
   ./scripts/setup-testnet-naming.sh --ens --yes
   ```
   This calls `scripts/update-ens.sh` for each UI and submits one mainnet transaction per UI name, pointing the ENS contenthash at that UI's `ipns://<name>`.
4. **Set DNSLink + CNAME automatically if using Cloudflare.** Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` to `.env.secrets`, then run:
   ```bash
   ./scripts/setup-testnet-naming.sh --dns --yes
   ```
   It upserts `CNAME <ui>.testnet.commonality.works -> cloudflare-ipfs.com` and `TXT _dnslink.<ui>.testnet.commonality.works = dnslink=/ipns/<ipns-name>` for every UI.
5. **Manual DNS fallback** if not using Cloudflare. Use `deployments/testnet-ipns.env` for the IPNS names. For each UI subdomain:
   - `CNAME` from `alignment.testnet.commonality.works` to `cloudflare-ipfs.com` (or another IPFS gateway that honors DNSLink).
   - `TXT` on `_dnslink.alignment.testnet.commonality.works` with value `dnslink=/ipns/k51qzi...` (same IPNS name as the ENS contenthash).

After this, both `alignment.testnet.commonality.eth.limo` and `alignment.testnet.commonality.works` resolve to whatever the IPNS record currently points at.

#### Per-deploy (every release)

```bash
./scripts/deploy-testnet.sh
```

This builds each UI for `base-sepolia`, pins it to Pinata, and publishes a new IPNS revision under the matching key. No on-chain transaction, no DNS change. Total wall time: a couple of minutes for all eight UIs.

To deploy a subset:

```bash
DOMAINS="alignment lazygiving" ./scripts/deploy-testnet.sh
```

To deploy a single UI by hand (for debugging):

```bash
./scripts/deploy-ui.sh base-sepolia alignment    # → prints CID
./scripts/publish-ipns.sh IPNS_PRIVATE_KEY_TESTNET_ALIGNMENT <cid>
```

Visit `https://alignment.testnet.commonality.eth.limo` or `https://alignment.testnet.commonality.works` to verify.

Supported testnet host slugs: `commonality` (default), `lazygiving`, `alignment`, `tally`, `content-funding`, `civility`, `common-sense-majority`, `conceptspace`. (`deploy-testnet.sh` still maps `lazygiving` to the UI build's legacy `lazyGiving` domain internally.)

#### Mainnet differences

For mainnet we skip the IPNS layer and pin the ENS contenthash directly to immutable IPFS CIDs. Per-deploy flow per UI:

1. `./scripts/deploy-ui.sh mainnet <domain>` — build, pin, print CID.
2. `./scripts/update-ens.sh <domain>.commonality.eth <cid> --network mainnet` — submit one on-chain transaction setting the contenthash to `ipfs://<cid>`.

So a full mainnet release is eight on-chain transactions. At typical gas this is roughly $5–20 per release. We accept that cost because:

- Whoever holds `ENS_OWNER_PRIVATE_KEY` (which can be a multi-sig) is the only party who can change a live UI — there's no IPNS key file lying around.
- A contenthash is immutable; no concept of "the IPNS service returned stale data."
- The transaction record is an auditable deploy log.

The `*.commonality.works` mainnet subdomains can either (a) keep DNSLink TXT records updated per release to the same CID, or (b) be configured as Cloudflare-proxied CNAMEs to `<name>.commonality.eth.limo` so they track the ENS contenthash automatically. Option (b) avoids per-release DNS work but requires Cloudflare's CNAME-flattening / TLS termination so the cert is for `*.commonality.works`. Decide before mainnet.

A dedicated `scripts/deploy-mainnet.sh` wrapper doesn't exist yet — write it as part of pre-mainnet prep, modeled on `deploy-testnet.sh` but calling `update-ens.sh` instead of `publish-ipns.sh`.

#### Gateway cache lag

IPNS resolution is cached by gateways (`eth.limo`, `cloudflare-ipfs.com`, etc.) for a few minutes after a publish. Users may see the previous CID for that window. This matches how IPFS deploys cached today and is not specific to IPNS.

---

## Indexer on Render

The Render blueprint now includes both the `commonality-indexer` web service and a `commonality-indexer-db` Postgres database.

Set these indexer env vars in the Render dashboard:

- `PONDER_CHAIN`: `base-sepolia` for testnet or `mainnet` for production
- `PONDER_RPC_URL_84532` or `PONDER_RPC_URL_1`: RPC URL for the selected chain
- `START_BLOCK`: block where the deployed contracts start emitting relevant events
- All contract addresses from `deployments/<network>.env`

The blueprint already wires:

- `PONDER_SCRIPT=start` so hosted deployments use `ponder start`
- `DATABASE_URL` from the managed Postgres database
- `DATABASE_SCHEMA=commonality_base_sepolia_v2` for the current Base Sepolia deployment. Use a fresh schema only when intentionally abandoning stale indexed data; otherwise keep the schema stable.
- `PONDER_EXPERIMENTAL_DB=platform` so normal Render redeploys of a changed Ponder build can reuse the same production schema instead of failing with "previously used by a different Ponder app".

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

`setup-env.sh` is only used for local development. On Render, env vars live in the dashboard; use `scripts/generate-render-secrets.mjs` to generate the per-service blocks for bulk-pasting.

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
3. Regenerate and commit `render.yaml`: `node scripts/generate-render-yaml.mjs`. This fills in the new contract addresses automatically — no Render dashboard edits needed for addresses.
4. Redeploy UI (addresses are baked into the bundle): `./scripts/deploy-testnet.sh`. The IPNS pointer updates automatically; ENS contenthash does not need a new transaction.
5. Old indexer data is wrong — wipe the indexer Postgres and resync from the new contracts' start block.

This is intentionally high-friction. For testnet it's tolerable; for mainnet, consider adding an audit pass before each redeploy.

### UI-only change

```bash
./scripts/deploy-testnet.sh
```

Builds, pins, and publishes new IPNS revisions for all UIs. No ENS or DNS changes needed. Gateway caches may serve the previous CID for a few minutes.

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
- [ ] Contracts verified on Basescan
- [ ] `deployments/mainnet.env` committed
- [ ] `ChannelVerifier.trustedVerifier()` matches `CHANNEL_VERIFIER_TRUSTED_SIGNER_ADDRESS` from `deployments/wallets.env`, and Render `platform-api-service` uses the matching `VERIFIER_PRIVATE_KEY`
- [ ] Tenderly or similar alerts set up for unusual contract activity

### UI
- [ ] UI builds against mainnet addresses
- [ ] Mainnet ENS subdomain tree exists under `commonality.eth`, each with the public resolver
- [ ] CIDs pinned to Pinata
- [ ] ENS contenthashes set directly to `ipfs://<cid>` (immutable; **no IPNS on mainnet**) — one tx per subdomain per release
- [ ] `commonality.works` mainnet subdomains configured (either DNSLink TXT updated per release, or Cloudflare-proxied CNAMEs to `*.commonality.eth.limo` — decide which)
- [ ] `scripts/deploy-mainnet.sh` written (modeled on `deploy-testnet.sh`)
- [ ] `ENS_OWNER_PRIVATE_KEY` for mainnet is in a hardware wallet or multi-sig, not plaintext on disk
- [ ] All eight UIs load via both `<name>.commonality.eth.limo` and `<name>.commonality.works`, wallet connection works on each

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
- **UI:** Publish a new IPNS revision pointing at the previous CID: `./scripts/publish-ipns.sh IPNS_PRIVATE_KEY_TESTNET_<DOMAIN> <previous-cid>`. CIDs are immutable; as long as Pinata still has the old one pinned, rollback is fast (modulo gateway cache lag). No ENS or DNS change needed.
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
- **Second smart-contract audit pass.**
- **Monitoring / alerting** — only Render's built-in logs today.
- **Staging environment** — Render supports preview environments per PR; worth enabling before the project has real users.

---

## Troubleshooting

| Symptom                                 | Likely cause                                                | Fix                                                                  |
| --------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| "Insufficient funds for gas"            | Deployer wallet empty                                       | Send ETH; for Base Sepolia use the Coinbase faucet or bridge from Ethereum Sepolia |
| Service builds but crashes on boot      | Missing env var                                             | Check Render logs; compare to `.env.example` in the service dir      |
| Attester never attests                  | Attester wallet has no ETH, or wrong `IMPLICATIONS_CONTRACT_ADDRESS` | Check wallet balance; compare addresses to `deployments/<net>.env`   |
| Indexer not syncing                     | Wrong `START_BLOCK`, wrong RPC URL, or indexer not yet prod-ready | See "indexer gap" section                                            |
| UI loads but can't read contracts       | Stale bundle with old addresses                             | Rebuild UI with `./scripts/deploy-ui.sh <network>` and update ENS    |
| ENS update transaction reverts          | `ENS_OWNER_PRIVATE_KEY` doesn't own the name                | Verify ownership at app.ens.domains                                  |
| `eth.limo` returns 404 / "name not found" | ENS subdomain missing or has no resolver set                | In app.ens.domains, ensure the subdomain exists *and* has the public resolver set; setContenthash on a name with no resolver silently no-ops |
| `*.commonality.works` loads but shows stale content | Gateway is caching the old IPNS resolution                  | Wait a few minutes; or force-refresh through `cloudflare-ipfs.com/ipns/<name>` to confirm IPNS is updated |
| `publish-ipns.sh` fails with "sequence too low" | Multiple machines published to the same IPNS key out of order | Always publish from a single machine; w3name's `resolve` then `increment` flow handles ordering automatically as long as you don't race |

For anything not here, check Render logs first, then the service's own README.
