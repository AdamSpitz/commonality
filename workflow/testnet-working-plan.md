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

Do not push `gen:large` (today: 100 users; 1000+ not built) at Sepolia. The indexer already 502s at idle; a load generator would trash the lab you still need to read.

## Current state (2026-09-04 snapshot)

Re-probe with `./scripts/verifier-testnet.sh` (and `--browser` when you care about journeys). Do not treat this snapshot as live truth.

**Already in place**

- Contracts on Base Sepolia; `testnet.contracts` saw bytecode for 19 configured addresses (`deployments/base-sepolia.env`).
- Eight UIs at `https://<slug>.testnet.commonality.works` via Cloudflare UI gateway + Pinata IPNS.
- DNS/TLS, app shells, app-config (no localhost), RPC, platform-api / attesters / workers health, sponsored-gas ERC-7677 config: passing on that run.
- Operator accounts/keys mostly done ([testnet-prep.md](../testnet-prep.md)): wallets, Render, Pinata, Privy, Pimlico, RPC, onramp.
- Proven once, then allowed to go stale: Civility policy enforcement (2026-08-14), funded `PublishedData` round-trip (2026-07-20), Privy embedded-wallet login, AccountAssertions on live Tally.

**Not working / not in the lab yet**

- `testnet.environment` **fail**: indexer GraphQL **502**; `content-funding` and `conceptspace` HTTP aborted; `testnet.website-journeys` killed at 180s.
- `testnet.onchain-to-indexer` skipped by policy (mutation opt-in + funded verifier wallet). Nightly cadence therefore cannot claim write→index.
- CauseStarter is the intended front door locally (`LOCAL_UI_DOMAINS` default) but is **not** in `deployments/testnet-names.json` / verifier `expectedHosts`.
- Alignment-trust bootstrap must not ship the local Hardhat key; live testnet stand-up is still a human+ops item ([inbox.md](../inbox.md)).
- Local journeys that will bite you on testnet: `stack.user-journeys` (`InvalidVerifierSignature` on channel create); funding-portal aggregation tests reading `0n`.
- CauseStarter scale ceiling (believer-set transport) is real but **out of scope** until the lab is up. See inbox; do not “fix scale” as part of this plan.

**Human leftovers (do not paper over)**

From testnet-prep / inbox — stop and Ask if you hit them:

- Cloudflare zone / DNSLink / `services.testnet.commonality.works` gateway (UIs already work via the UI gateway; this is leftover naming/ops).
- 2-of-3 Safe for contract-admin.
- Fund/enable `COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY` and, when Adam says so, `COMMONALITY_VERIFIER_NIGHTLY_ALLOW_TESTNET_MUTATION=1`.
- Sponsored-gas live UI walk: [sponsored-gas-live-trace.md](./sponsored-gas-live-trace.md).
- Alignment-trust bootstrap: generate wallets, fund `ALIGNMENT_TRUST_BOOTSTRAP_ADDRESS`, Render secrets, denylist canary — never the checked-in local key.

## Next

Do these in order unless Adam names a different one. Each item is a session-sized chunk. Tag is the [autonomy tier](./task-tiers.md) for that slice.

1. **[ ] (Tell) Re-probe and write what is actually down.** Run `./scripts/verifier-testnet.sh` (add `--browser` if you have time). Record the live `testnet.http` / `testnet.indexer` / service health in this file’s “Current state” (replace the 2026-09-04 snapshot). If the indexer is 200 and near head, skip to item 3. If it is 502, do item 2. Do not “fix” flaky IPFS timeouts until you know they still fail after a retry.

2. **[ ] (Tell) Make the Render indexer stay up.** `https://commonality-indexer.onrender.com/graphql` 502 with `x-render-routing: dynamic-paid-error` is the shared-read bottleneck. Use [deployment.md](./deployment.md) (Indexer on Render) and Render logs: crash loop, OOM, unpaid instance, bad `RPC_URL` / start block, disk. Fix env or redeploy; do not rewrite Ponder “to be safer.” Success: `_meta` returns a usable block number and `testnet.indexer` passes. Update this file.

3. **[ ] (Tell) Get read-only testnet smoke boring.** `testnet.dns`, `http`, `rpc`, `indexer`, `app-shell`, `app-config`, `contracts` all pass on one `./scripts/verifier-testnet.sh` run. Retry once on IPFS/Cloudflare aborts before treating a site as broken. If a site is still dead, follow [deployment.md](./deployment.md) / `./scripts/deploy-testnet.sh` only for that domain — do not republish all eight “for luck.”

4. **[ ] (Tell) Browser journeys on the happy paths.** `./scripts/verifier-testnet.sh --browser`. If `testnet.website-journeys` times out, narrow: which URL, console 404/500 vs hang vs indexer. Fix the deployed cause (stale chunk, metadata 500, missing CORS origin) rather than raising the timeout. Known historical noise: LazyGiving `/#/projects` resource 500s.

5. **[ ] (Ask) CauseStarter on testnet hostname.** The eight legacy domains are live; CauseStarter is not in `testnet-names.json`, UI gateway IPNS map, or platform-api CORS list ([testnet-render-env.md](./testnet-render-env.md) has no wildcard). Propose a hostname (likely `causestarter.testnet.commonality.works`), the IPNS/gateway/CORS/verifier `expectedHosts` edits, and wait for Adam. After a yes: implement and publish with the existing deploy scripts; add the host to Pinata Host Origins (wildcards unsupported). Do not silently make CauseStarter the only testnet UI.

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
- Wipe local data if you need a local repro; do not wipe or redeploy testnet contracts without Ask.
- Human custody (keys, faucets, Render billing, Safe, Privy dashboard): stop and put a short note in [../inbox.md](../inbox.md).
- When a Next item is done, check it off, update Current state, and leave the next unchecked item obvious.

## Pointers

- [deployment.md](./deployment.md) — contracts, Render, `deploy-testnet.sh`, indexer.
- [testnet-prep.md](../testnet-prep.md) — human checklist.
- [testnet-render-env.md](./testnet-render-env.md) — CORS and Render `sync: false`.
- [commonality-works-setup.md](./commonality-works-setup.md) — DNS / Cloudflare.
- [cloudflare-ui-gateway/README.md](../cloudflare-ui-gateway/README.md) — `*.testnet.commonality.works`.
- [privy-pimlico-setup.md](./privy-pimlico-setup.md), [sponsored-gas-live-trace.md](./sponsored-gas-live-trace.md).
- `verifier/environments/testnet.json` — hosts and required config the smoke actually checks.
- [../fake-data-generation/PLAN.md](../fake-data-generation/PLAN.md) — do not mix with this plan.
- Root [../TODO.md](../TODO.md) — one-shot leftovers (verifier signature, portal `0n`, demo-seed UI pass).
