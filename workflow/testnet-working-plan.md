# Get testnet basically working

Tell a fresh LLM: **read this file, then do the next unchecked item under [Next](#next).** Do not invent a second testnet program, a mainnet cutover, or a mass-load campaign. Deployment mechanics live in [deployment.md](./deployment.md). Human/operator blockers live in [../testnet-prep.md](../testnet-prep.md). Current milestone: [project-status.md](./project-status.md).

This file is the **index** of remaining work to make Base Sepolia a **shared lab for Adam and Sam**: the sites load, the indexer is up, two people can see the same on-chain world, and a few real journeys work. Update it when work lands.

## What “basically working” means

Enough for two operators to use `*.testnet.commonality.works` (and CauseStarter, once it has a hostname) as a shared testing environment:

- UIs load over HTTPS without pointing at localhost.
- Indexer GraphQL answers and is near chain head.
- Platform API / attesters / workers are healthy.
- Two wallets can sign, fund, and see each other’s activity after a short indexer delay.
- `./scripts/verifier-testnet.sh` is green on the read-only leaves; browser journeys do not time out on the happy-path pages.

It does **not** mean: public launch, mainnet, 10⁴ fake users, or a nightly mutating load test. Those are later jobs.

## Three different jobs (do not mix)

| Job | What it is | What it is not | Where it lives |
|---|---|---|---|
| **1. Shared two-person lab** | Live Base Sepolia + Render + IPFS UIs that two people can actually use | Scale test. Mainnet. A populated demo narrative | This file |
| **2. Local world / seed** | Tiny or demo data on Hardhat so the UI has something to look at | Testnet history. Stress traffic | [../fake-data-generation/PLAN.md](../fake-data-generation/PLAN.md) jobs A–C |
| **3. Mass fake activity** | Many random users/actions to stress contracts and indexer | Shared lab. Real statements | Same PLAN.md job D. **Stay local** until job 1 is boring |

Do not push `gen:large` (today: 100 users; 1000+ not built) at Sepolia. The indexer is still catching up / lag-failing; a load generator would trash the lab you still need to read.

## Current state (2026-09-05, read-only smoke)

Full `./scripts/verifier-testnet.sh` (~16:46 UTC): `dns`/`http`/`rpc`/`indexer`/`app-shell`/`contracts`/`policy-enforcement` **pass**; `sponsored-gas` advisory **pass**; **`app-config` fail** (idle official implication attester). Indexer `_meta` **46429250**, lag **0**.

`app-config` reports 0 `ImplicationAttestation`s from `VITE_DEFAULT_TRUSTED_ATTESTERS` `0x021b3C…`. That is the shipped default; filtering to it is the product. Empty official graph → zeros is correct, not a wrong-chain config bug. **Do not mint a dummy attestation to green the check.** **Do not treat this fail as “the lab is down.”** The wrapper still exits 1 until the official attester actually runs (or the check is later made advisory). Item 3’s lab surfaces (sites, RPC, indexer, shells, contracts) are up.

**Wallets funded 2026-09-05** from operator deployer `0xFC0054…`: implication attester, content attester, beat agent each **0.005 ETH** (block 46430751). Verifier still 0.

**Item 4 done.** `testnet.website-journeys` **pass** (~18:32 UTC): 22 URLs, ~36s. First wrapper run still hit the 180s kill (cold Chromium / Cloudflare); a second run finished. The only real page issue is LazyGiving `/#/projects` fetching on-chain junk URI `sponsored-gas-live-trace` as `https://ipfs.io/ipfs/...` (CORS). The page already falls back with “couldn't load some project details.” Check now treats historical IPFS CORS/`Failed to load resource` the same as the existing IPFS 500 hole policy. SDK fold + `fetchFromIPFS` drop invalid CIDs so the next LazyGiving publish stops hitting ipfs.io; do not republish all eight for this. Do not raise the 180s timeout.

Unchanged for later items: `onchain-to-indexer` skipped by policy; `published-data` stale pass (2026-07-20); `alignment-trust` missing.

**Item 2 done.** `npx verifier-run testnet.indexer` **pass** (~16:42 UTC): GraphQL `_meta` **46429137**, lag **0**, maxLag 300. Live deploy `dep-dae48qgou94c73976610` commit `53417ecc`, env range **10000**, Alchemy RPC. Adam raised monthly usage limit to **$30**.

Earlier the same day: 502 crash loop (public prune) then HTTP 200 with lag fail; 10k deploy `dep-dae448m7bikc7380vo6g` **update_failed** on $20 CU cap; service suspended; resume + redeploy after the $30 raise. Do not re-diagnose 502 unless GraphQL 502s again. Do not point RPC at `sepolia.base.org`.

**Crash loop — fixed, do not redo**

- Render service `commonality-indexer` `srv-d8ctfd6k1jcs73a71d2g`, owner `tea-d8croucp3tds73el9abg`, plan standard, not suspended.
- Events: `server_failed` every ~6 min, `nonZeroExit: 75`, then `server_available`.
- Logs: `URL: https://sepolia.base.org` + `pruned history unavailable: requested 42768673, earliest available 45000000`.
- Cause: dashboard `PONDER_RPC_URL_84532` was public Base Sepolia (pruned). `START_BLOCK` in `deployments/base-sepolia.env` / Render is **42768673**.
- Fix applied live (API, not git push to master): set `PONDER_RPC_URL_84532` to Alchemy `BASE_SEPOLIA_RPC_URL` from repo `.env` (probed: that URL **does** return block 42768673). **Restart did not pick up the new env.** `POST .../deploys` with `{"deployMode":"deploy_only"}` did (`dep-dae2vin40ujc73djb6j0` then `dep-dae334on74is73c6iev0`).
- Also set live `PONDER_ETH_GET_LOGS_BLOCK_RANGE=10` (matches [deployment.md](./deployment.md); template had 1000). Regenerated `render.yaml` from `render.yaml.template` on this branch — **Render autoDeploy tracks master**, so the live 10 is from the API PUT, not from this commit until it lands on master.

**Backfill — still the job**

- After Alchemy deploy, logs: `Started returning 200 responses endpoint=/health`, `Started backfill indexing chain=base-sepolia block_range=[45684953,46426208]`, `Started fetching backfill JSON-RPC data ... cached_block=42768672 cache_rate=0.0%`.
- Then stuck: `Updated backfill indexing progress progress=79.7%` on a 5s cadence for **tens of minutes**, `_meta` frozen at **46349669**. GraphQL did not 502 during that window.
- 79.7% ≈ cursor near 45.68M as a fraction of START→head; that matches the backfill window start. `_meta` may not move until Ponder checkpoints. Do not treat frozen `_meta` as “still on public RPC” unless logs again say `sepolia.base.org` / `pruned history`.
- **2026-09-05 ~15:27 UTC diagnosis:** still Alchemy (`base-sepolia.g.alchemy.com`), not public prune. Logs are almost all `eth_getLogs` **compute units per second** errors; hostname **`custom_transport`**; `_meta` still **46349669**. Cause: `ponder.config.ts` wrapped the RPC in viem `http()`, so Ponder used `retryCount: 0` and did not apply its own rate limiter. Fix committed `7afa8c1d` (pass URL string when body-size cap is unset/`0`). Live deploy **`dep-dae3bsv40ujc73dktq6g`** from that commit (API, not master autoDeploy).
- **Watcher result (~15:55 UTC):** deploy **live**; hostname now Alchemy (not `custom_transport`); `_meta` **still 46349669**; progress still **79.7%**; CUPS errors continue. Account is already **PAYG** (10k CU/s; peak ~11.6k). Monthly usage limit is a **$20 / 44.4M CU** cap (35.5M used). Do not raise that cap yet.
- **Next lever:** live `PONDER_ETH_GET_LOGS_BLOCK_RANGE` was **10** even though this key accepts 10k-block `eth_getLogs`. Blueprint + Render PUT to **10000**. Commit `53417ecc` adds a one-shot log `[commonality-indexer] eth_getLogs failed because the RPC rejected the block range or response size` (then drop to 1000, then 10). Deploy **`dep-dae448m7bikc7380vo6g`** was still **building** when the $20 CU cap blew.
- **Alchemy $20 cap blown (~16:25 UTC):** dashboard **44.50M / 44.44M CU** while the **range-10** process (`7afa8c1d`) was still live. Retries cost CU; `_meta` did not move.
- **2026-09-05 later:** 10k deploy **`dep-dae448m7bikc7380vo6g`** finished **`update_failed`** (~16:26 UTC). Logs: Ponder diagnostic `eth_chainId` → Alchemy 429 monthly capacity. Env range is already **10000**; RPC still Alchemy. Latest listed live deploy remains **`dep-dae3bsv40ujc73dktq6g`** (`7afa8c1d`). GraphQL **502**. Indexer **suspended** via API so range-10 retries stop. Cannot boot 10k until the spend fuse is lifted (`eth_chainId` is blocked too). Unstick: (1) Adam raises monthly usage limit ~$5–10, (2) resume + POST deploy `commitId=53417ecc`, (3) watch `_meta` / `testnet.indexer`. Handoff: [../continuity/2026-09-05-testnet-indexer-10k-and-alchemy-cap.md](../continuity/2026-09-05-testnet-indexer-10k-and-alchemy-cap.md).
- Success for item 2: `testnet.indexer` **pass** (lag ≤ 300), not merely HTTP 200. **Met** 2026-09-05 ~16:42 UTC.

**Render API (this machine)**

- Key is **`.env.render`** (`RENDER_API_KEY=`), gitignored. Not in `~/.secrets/commonality/operator.env`. Documented in [deployment.md](./deployment.md), [testnet-render-env.md](./testnet-render-env.md).
- `GET /v1/logs` needs `ownerId` + `resource` (service id). Env list: `GET /v1/services/{id}/env-vars`. Single var: `PUT /v1/services/{id}/env-vars/{KEY}` `{"value":"..."}`. Env change needs **deploy_only**, not only restart.
- Ad-hoc scripts in `tmp/render-indexer-*.sh` and `tmp/watch-indexer-*.sh` — disposable; do not commit.

**Not in the lab yet (unchanged)**

- CauseStarter not live yet; **hostname approved** as `causestarter.testnet.commonality.works` (item 5, next).
- Alignment-trust bootstrap must not ship the local Hardhat key.
- Local journeys that will bite on testnet: `stack.user-journeys` (`InvalidVerifierSignature` on channel create); funding-portal aggregation `0n`.
- CauseStarter scale ceiling out of scope until the lab is up.

**Human leftovers (do not paper over)**

From testnet-prep / inbox — stop and Ask if you hit them:

- Cloudflare zone / DNSLink / `services.testnet.commonality.works` gateway (UIs already work via the UI gateway; this is leftover naming/ops).
- 2-of-3 Safe for contract-admin.
- Fund/enable `COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY` (`VERIFIER_ADDRESS` is also 0 ETH / nonce 0) and, when Adam says so, `COMMONALITY_VERIFIER_NIGHTLY_ALLOW_TESTNET_MUTATION=1`.
- Sponsored-gas live UI walk: [sponsored-gas-live-trace.md](./sponsored-gas-live-trace.md).
- Alignment-trust bootstrap: generate wallets, fund `ALIGNMENT_TRUST_BOOTSTRAP_ADDRESS`, Render secrets, denylist canary — never the checked-in local key.
- Alchemy (or other archive RPC) **CUPS / plan**: indexer is at head on Alchemy after the $30 monthly cap; do not re-open unless lag/502 returns.
- Implication attester / content attester / beat agent funded (0.005 ETH each). `VERIFIER_ADDRESS` still unfunded.

## Next

Do these in order unless Adam names a different one. Each item is a session-sized chunk. Tag is the [autonomy tier](./task-tiers.md) for that slice.

1. **[x] (Tell) Re-probe and write what is actually down.** 2026-09-05 morning run: 502 crash loop. Afternoon run after RPC fix: HTTP pass, indexer fail on lag. Snapshot in Current state.

2. **[x] (Tell) Make the Render indexer stay up / catch up.** Crash loop done. 10k live `dep-dae48qgou94c73976610` / `53417ecc` after $30 Alchemy cap. `testnet.indexer` **pass** 46429137 lag 0 (~16:42 UTC).

3. **[x] (Tell) Get read-only testnet smoke boring.** 2026-09-05 ~16:46 UTC: `dns`/`http`/`rpc`/`indexer`/`app-shell`/`contracts` pass. `app-config` still fails because the official attester has never published; Adam: that is an idle default, not a lab blocker — do not dummy-attest to clear it. Wrapper exit 1 is that canary. Retry once on IPFS/Cloudflare aborts before treating a site as broken. If a site is still dead, follow [deployment.md](./deployment.md) / `./scripts/deploy-testnet.sh` only for that domain — do not republish all eight “for luck.”

4. **[x] (Tell) Browser journeys on the happy paths.** 2026-09-05 ~18:32 UTC: `testnet.website-journeys` **pass** (22 URLs). Historical LazyGiving `/#/projects` IPFS junk CID is tolerated in the check; SDK no longer treats non-CIDs as metadata.

5. **[ ] (Tell) CauseStarter on testnet hostname.** **Adam 2026-09-05: yes.** Hostname is **`causestarter.testnet.commonality.works`**. Implement and publish; do **not** replace or decommission the eight live sites; do **not** spend ENS / eth.limo gas.

   **Done when:** `https://causestarter.testnet.commonality.works` loads over HTTPS (same Worker path as the others), platform-api CORS allows that origin, and `./scripts/verifier-testnet.sh --browser` includes it (dns/http/app-shell/journeys). Pinata Host Origins is a dashboard step — if you cannot add it, note in inbox and keep going (Worker uses `gateway.pinata.cloud` + key, dedicated-gateway origins are leftover).

   **Repo edits (keep lists in sync; grep `conceptspace` as the previous last domain):**
   - `deployments/testnet-names.json` — add `{ "slug": "causestarter", "envVar": "IPNS_PRIVATE_KEY_TESTNET_CAUSESTARTER" }`.
   - `./scripts/setup-testnet-naming.sh` (no `--ens`) so the operator secrets file gets the new key and `deployments/testnet-ipns.env` gets the public name. Idempotent; do not invent a key by hand.
   - `cloudflare-ui-gateway/ui-gateway.mjs` `IPNS_BY_SUBDOMAIN`: `causestarter: 'IPNS_CAUSESTARTER'`.
   - `cloudflare-ui-gateway/wrangler.testnet.toml`: route `causestarter.testnet.commonality.works/*` and `[vars] IPNS_CAUSESTARTER = "<name from testnet-ipns.env>"`.
   - `cloudflare-ui-gateway/README.md` table + “eight UIs” wording.
   - `scripts/generate-render-yaml.mjs` `domainSlugs` + `domainUrlVars` (`VITE_CAUSESTARTER_URL`); regenerate `render.yaml` if that is how CORS is emitted.
   - `workflow/testnet-render-env.md` `CORS_ALLOWED_ORIGINS` — append `https://causestarter.testnet.commonality.works` (parser has **no** `*.testnet` wildcard). Live Render `commonality-platform-api`: PUT that env and **deploy_only** (restart does not pick env).
   - `verifier/environments/testnet.json`: `expectedHosts`, `appUrls`, and `websiteJourneys` (paths at least `"/"` and `"/#/"`).
   - `scripts/deploy-testnet.sh` already reads slugs from `testnet-names.json`. `deploy_slug_for_domain` should keep slug `causestarter` (that is `VITE_DOMAIN`). Do not map it to a legacy camelCase name.
   - Tests that hardcode the eight-subdomain map (`cloudflare-ui-gateway/ui-gateway.test.mjs` and similar) — extend, don’t special-case CauseStarter as the only host.

   **Ops (existing scripts, not a new program):**
   1. DNS: `./scripts/setup-testnet-naming.sh --dns` (or one proxied CNAME for `causestarter.testnet` like the other eight). Wildcard cert `*.testnet.commonality.works` already covers TLS.
   2. `npx wrangler deploy -c cloudflare-ui-gateway/wrangler.testnet.toml` after the route/IPNS var land.
   3. Publish **only** CauseStarter: `DOMAINS=causestarter ./scripts/deploy-testnet.sh` (needs `PINATA_JWT` + the new IPNS key in operator secrets). Do not republish all eight for luck.
   4. Pinata dashboard → Access Controls → Host Origins: add `https://causestarter.testnet.commonality.works` (Picnic plan: no wildcards). Human if you lack dashboard access.
   5. Smoke: `curl` 200, then `./scripts/verifier-testnet.sh --browser`. If journeys fail, narrow like item 4 — do not raise the 180s timeout.

   Stop if you hit Cloudflare zone login, Pinata billing, or missing `CLOUDFLARE_API_TOKEN` / `PINATA_JWT` — inbox, don’t paper over.

6. **[ ] (Tell) Two-person write path, one mutation canary.** After Adam funds the verifier wallet (or an equivalent test wallet): `./scripts/verifier-testnet.sh --mutation` so `testnet.onchain-to-indexer` (and published-data if still gated) is a fresh pass. Then walk, or script, a **minimal** shared loop: wallet A publishes or signs something wallet B can see on the live UI after index. Prefer CauseStarter if item 5 shipped; otherwise Tally sign + LazyGiving project list. Do not seed thousands of txs. File any “we cannot see each other’s stuff” bug here as a new Next item, not as a silent workaround.

7. **[ ] (Tell) Unblock the journeys that will fail as soon as someone tries them.** Only after the lab is up: `InvalidVerifierSignature` on content-funding channel create (`stack.user-journeys`); funding-portal aggregation `0n` (root TODO). Fix against local stack first, then re-check the matching testnet surface if that feature is in the two-person loop.

8. **[ ] (Ask) Nightly mutation flag.** When read-only smoke is green for a few days and item 6 has a fresh pass, ask Adam to set `COMMONALITY_VERIFIER_NIGHTLY_ALLOW_TESTNET_MUTATION=1` in the cadence shell. Do not enable it yourself.

Stop after item 6 unless Adam asks for 7–8. **Do not start job 3 (mass activity on testnet).**

## Explicitly out of scope

- Mainnet, ENS spend beyond what deployment.md already documents, Hardhat 2→3.
- Fake-data job D at 1000+ users; graphs; indexer deep-compare (PLAN.md).
- CauseStarter believer-set indexer aggregate and StatementPicker top-100 window (inbox; scale, not “lab is down”).
- Product messaging / founder-first copy (verifier `facet.product`).
- Admin-mode design, GitHub Issues migration, alternate UIs for Sam (inbox).
- Replacing the eight sites with CauseStarter-only on testnet without an Ask.

## How to work

- Compare branches to `dev`. See [branching.md](./branching.md).
- Prefer `./scripts/verifier-testnet.sh` over ad-hoc curls; it loads secrets and opt-ins.
- Render API: `set -a; source .env.render; set +a`. Never print the key. Never commit `.env.render`.
- Wipe local data if you need a local repro; do not wipe or redeploy testnet contracts without Ask.
- Human custody (keys, faucets, Render billing, Safe, Privy dashboard): stop and put a short note in [../inbox.md](../inbox.md).
- When a Next item is done, check it off, update Current state, and leave the next unchecked item obvious.

## Pointers

- [deployment.md](./deployment.md) — contracts, Render, `deploy-testnet.sh`, indexer. Render API key: gitignored `.env.render`.
- [testnet-prep.md](../testnet-prep.md) — human checklist.
- [testnet-render-env.md](./testnet-render-env.md) — CORS and Render `sync: false`.
- [commonality-works-setup.md](./commonality-works-setup.md) — DNS / Cloudflare.
- [cloudflare-ui-gateway/README.md](../cloudflare-ui-gateway/README.md) — `*.testnet.commonality.works`.
- [privy-pimlico-setup.md](./privy-pimlico-setup.md), [sponsored-gas-live-trace.md](./sponsored-gas-live-trace.md).
- `verifier/environments/testnet.json` — hosts and required config the smoke actually checks.
- [../fake-data-generation/PLAN.md](../fake-data-generation/PLAN.md) — do not mix with this plan.
- Root [../TODO.md](../TODO.md) — one-shot leftovers (verifier signature, portal `0n`, demo-seed UI pass).
