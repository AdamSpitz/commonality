# Testnet verifier to-do list

## Implementation status — 2026-06-09

### Done

- [x] Added committed non-secret testnet topology/config manifest: `verifier/environments/testnet.json`.
- [x] Added focused deployed-testnet check directory: `verifier/checks/testnet/`.
- [x] Split the old coarse smoke concept into focused guarded leaves:
  - [x] `testnet.dns` — DNS + TLS for configured `*.testnet.commonality.works` hosts.
  - [x] `testnet.http` — HTTP reachability for configured app/service URLs.
  - [x] `testnet.rpc` — expected chain id + usable block number via configured RPC.
  - [x] `testnet.indexer` — GraphQL `_meta.block.number` + lag comparison against RPC head.
  - [x] `testnet.app-shell` — configured app URLs return nonblank HTML app shells.
  - [x] `testnet.app-config` — deployed app bundle contains expected endpoint/address text and no obvious local-dev values.
  - [x] `testnet.contracts` — configured deployed contract addresses exist and have bytecode on the configured chain.
- [x] Added `testnet.environment` supervisor over the focused testnet leaves.
- [x] Rewired `functionality.deep-stack` to consume `testnet.environment` instead of legacy `env.testnet-smoke`.
- [x] Deleted legacy `env.testnet-smoke` after migrating to focused `testnet.*` checks.
- [x] Shared `testnet.contracts` into `facet.security` as a deployed-contract signal.
- [x] Added guarded high-side-effect checks:
  - [x] `testnet.onchain-to-indexer` — refuses without `COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION=1`; when enabled, submits a verifier-funded `AlignmentAttestation`, waits for inclusion, and asserts the deployed event cache exposes it.
  - [x] `testnet.website-journeys` — refuses without `COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS=1`; runs real Chromium probes over configured deployed app URLs and hash routes.
- [x] Updated guarded-check policy inventory and validator for the new `testnet.*` checks.
- [x] Added `npm run verifier:testnet`.
- [x] Updated `verifier/README.md` dashboard/docs and `CONTINUITY.md` handoff notes.

### Verified locally

- [x] New JSON files parse.
- [x] Every `verifier/checks/testnet/*.mjs` emits one valid Result JSON when run directly without opt-in.
- [x] `coverage.guarded-check-policy` passes when invoked directly with resolved file input.
- [x] `git diff --check` passes.
- [x] LSP diagnostics are clean.

### Not verified / blocked

- [x] Focused known-bad harness check `known-bad.testnet-focused` passes via `verifier-run --workspace verifier known-bad.testnet-focused`.
- [ ] Full harness graph validation with `verifier-summarize` was not run because `verifier-summarize` was not on PATH in this shell; `verifier-run` is available with explicit `--workspace verifier`.
- [ ] Focused testnet checks have not yet all been run against the real deployed environment with `COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1` and `COMMONALITY_TESTNET_RPC_URL=...`.
  - [x] `testnet.website-journeys` was run live with browser opt-in and passed across all 8 configured app URLs before route expansion.
  - [x] `testnet.app-config` was run live and correctly failed: deployed `config.json` files currently omit chain id (`VITE_CHAIN_ID`/`VITE_DEFAULT_CHAIN_ID`), contain a local-dev fallback string (`localhost` / `VITE_EVENT_CACHE_URL=http://localhost:42069`), and do not include the expected `commonality-indexer.onrender.com` text.
  - [x] Expanded `testnet.website-journeys` route inventory was run live. After correcting stale route paths in `verifier/environments/testnet.json`, it fails only on real deployed-config fallout: LazyGiving `/projects` and Alignment `/explore` render but emit localhost connection-refused console errors.
  - [x] `testnet.indexer` was run live and passed after updating it for the deployed Ponder GraphQL shape (`_meta.status[chainSlug].block.number`).
  - [x] `testnet.contracts` was run live and passed after fixing the verifier RPC JSON parsing path so large `eth_getCode` responses are parsed before evidence truncation.
  - [x] `testnet.onchain-to-indexer` was run without mutation opt-in and correctly recorded a guarded skipped-by-policy error rather than remaining missing.
  - [ ] Mutating `testnet.onchain-to-indexer` has not yet been run live with a funded verifier wallet.
- [x] Exact `*.testnet.commonality.works` host inventory in `verifier/environments/testnet.json` was confirmed by live `testnet.dns` / `testnet.http` against the eight configured app hosts.

### Still to do

- [x] Implement real `testnet.onchain-to-indexer`:
  - [x] choose a harmless canonical testnet transaction (`AlignmentAttestations.attestAlignment` with verifier-reserved IDs),
  - [x] use a verifier-funded wallet/secret (`COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY`),
  - [x] wait for inclusion,
  - [x] wait for indexer catch-up,
  - [x] assert the deployed event cache reflects the event.
  - [ ] Fund/provision the verifier wallet and run this live against the deployed environment.
- [x] Implement real non-mutating `testnet.website-journeys` with Playwright/browser checks against deployed URLs.
  - [x] Extend `testnet.website-journeys` beyond shell rendering into configured domain-specific hash routes.
  - [ ] Extend `testnet.website-journeys` into wallet-backed user paths.
- [x] Add known-bad fixtures for the new focused checks, especially:
  - [x] wrong chain id / malformed RPC response,
  - [x] stale/lagging indexer,
  - [x] blank/error app shell,
  - [x] forbidden localhost/dev config in app bundle,
  - [x] configured contract address with no bytecode.
- [x] Prefer deterministic deployed `/config.json` checks in `testnet.app-config` when available, while retaining bundle text-search as a fallback/backstop.
- [x] Decided to delete legacy `env.testnet-smoke`; current shape is the focused `testnet.environment` rollup.

---

> Take a look at the verifier workspace and tell me how you'd reorganize it to add checks for the now-deployed testnet stuff. That is, in      
addition to the basic tests that just run unit tests locally or do a local deployment and run e2e tests on my dev machine and so on, we now  
have smart contracts and an indexer and various services and a real website with a real DNS name (*.testnet.commonality.works), and I want   
to check it to make sure it's all set up correctly and so on.  


I’d reorganize the verifier workspace by making “deployed testnet” a first-class branch, rather than continuing to pack it into the single broad `env.testnet-smoke` leaf.

Right now the dashboard already has the right high-level shape:

```text
root
└── facet.functionality
    └── functionality.deep-stack
        ├── local/deep stack checks
        └── env.testnet-smoke
```

But now that `*.testnet.commonality.works` is real, `env.testnet-smoke` is too coarse. It should become a small deployed-environment suite.

## Proposed shape

```text
facet.functionality
└── functionality.deep-stack
    ├── artifact.ipfs-domain-smoke
    ├── stack.user-journeys
    ├── stack.fresh-seeded
    ├── stack.restart-consistency
    ├── stack.deployment-depth
    └── testnet.environment
        ├── testnet.dns
        ├── testnet.http
        ├── testnet.rpc
        ├── testnet.contracts
        ├── testnet.indexer
        ├── testnet.app-shell
        ├── testnet.app-config
        ├── testnet.onchain-to-indexer
        └── testnet.website-journeys
```

I’d keep `functionality.deep-stack` as the place where “not just local unit tests — does a real stack/environment actually work?” rolls up. But I’d replace `env.testnet-smoke` with `testnet.environment`, an intermediate supervisor over focused leaves.

## Concrete checks I’d add

### 1. `testnet.dns`

Purpose: prove the public DNS names resolve sanely.

Checks:

- expected hostnames exist:
  - `testnet.commonality.works`
  - `api.testnet.commonality.works` if applicable
  - `indexer.testnet.commonality.works` / GraphQL hostname
  - app/domain-specific subdomains under `*.testnet.commonality.works`
- CNAME/A/AAAA records point where expected.
- no accidental localhost/private IP targets.
- HTTPS certificate covers the names.

This is cheap and can run frequently.

### 2. `testnet.http`

Purpose: prove public endpoints are reachable as web services, not just DNS entries.

Checks:

- HTTP → HTTPS redirect works.
- HTTPS returns 2xx/3xx where expected.
- no generic Cloudflare/Vercel/worker error pages.
- headers look plausible.
- optionally verify cache/security headers for app hosts.

### 3. `testnet.rpc`

This is the existing RPC part of `env.testnet-smoke`, split out.

Checks:

- `eth_chainId` equals the expected testnet chain id.
- `eth_blockNumber` advances or is at least nonzero/recent.
- configured RPC URL is not accidentally mainnet/local/anvil.
- optionally compare chain id to frontend config and deployed contract metadata.

### 4. `testnet.contracts`

Purpose: prove the deployed contract layer matches the repo’s intended deployment.

Inputs should probably include a checked-in deployment manifest, e.g.:

```text
deployments/testnet.json
```

Checks:

- every expected contract address is present.
- each address has bytecode.
- bytecode hash matches the artifact/build or recorded expected hash.
- constructor/config values are correct:
  - owner/admin/multisig address
  - token/treasury addresses
  - linked contract addresses
  - chain id
- critical read-only invariants hold.
- event ABI/interface is compatible with the indexer.

This belongs partly under `facet.security` too. I’d either:
- feed `testnet.contracts` into both `testnet.environment` and `facet.security`, or
- split into `testnet.contracts.deployed` under functionality and `security.testnet-contract-config` under security.

Since verifier inputs form a DAG, sharing one leaf between supervisors is fine.

### 5. `testnet.indexer`

Purpose: prove Ponder/indexer is alive and indexing the right chain/contracts.

Checks:

- GraphQL endpoint responds.
- `_meta.block.number` exists.
- indexed block is not too far behind RPC block.
- indexer chain id / network name matches expected.
- indexed contract addresses match deployment manifest.
- representative entity tables are queryable.
- no GraphQL errors.
- optionally health endpoint/log endpoint if available.

This should fail if the indexer is indexing the wrong chain or wrong contract address, even if GraphQL itself is up.

### 6. `testnet.app-shell`

Purpose: prove the website loads as a user-visible app.

Checks:

- GET app URL returns nonblank HTML.
- built asset references are reachable.
- no obvious error shell.
- maybe use Playwright to assert:
  - page loads
  - no console errors of severity error
  - primary nav renders
  - core route renders

This can be a light browser smoke, not full journey testing.

### 7. `testnet.app-config`

This is important. The website can load while pointing to the wrong contracts/indexer/RPC.

Checks:

- frontend environment/config embedded in the app points to:
  - expected chain id
  - expected RPC/wallet chain
  - expected GraphQL/indexer URL
  - expected deployed contract addresses
  - expected IPFS gateway/base URL
- no localhost/dev URLs in production testnet bundle.
- no mainnet addresses unless intentionally configured.

This could be deterministic if the app exposes a config JSON endpoint, e.g.:

```text
https://testnet.commonality.works/config.json
```

If it doesn’t, I’d strongly consider adding one.

### 8. `testnet.onchain-to-indexer`

Purpose: prove the deployed contracts and deployed indexer agree.

This is the first real integration check beyond “services are up.”

Options:

- non-mutating version:
  - read known existing events/entities from deployment/bootstrap data
  - compare on-chain event/log state to GraphQL indexed state
- mutating guarded version:
  - using a verifier-funded test wallet, submit a tiny harmless testnet transaction
  - wait for RPC inclusion
  - wait for indexer to catch up
  - assert GraphQL shows the new entity/event

This should be guarded separately:

```sh
COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION=1
COMMONALITY_TESTNET_PRIVATE_KEY=...
```

I’d keep the non-mutating check as normal/manual, and the mutating one as guarded/nightly/manual.

### 9. `testnet.website-journeys`

Purpose: real website, real DNS, real deployed backend, realistic user path.

This is like `stack.user-journeys`, but against `*.testnet.commonality.works` instead of local Docker.

Checks:

- browse landing page/domain pages.
- connect wallet on expected testnet, or use mocked wallet if mutation is disabled.
- for guarded mode, perform one tiny canonical journey:
  - create/attest/fund/back something depending on the domain
  - wait for indexer
  - assert the rendered UI reflects the on-chain action

This should be opt-in and probably not run constantly.

## Naming/layout

I’d add a new directory:

```text
verifier/checks/testnet/
  dns.mjs
  dns.def.json
  http.mjs
  http.def.json
  rpc.mjs
  rpc.def.json
  contracts.mjs
  contracts.def.json
  indexer.mjs
  indexer.def.json
  app-shell.mjs
  app-shell.def.json
  app-config.mjs
  app-config.def.json
  onchain-to-indexer.mjs
  onchain-to-indexer.def.json
  website-journeys.mjs
  website-journeys.def.json
  environment.def.json
```

I would probably retire or rename the existing:

```text
env.testnet-smoke
```

into either:

```text
testnet.environment
```

or keep it temporarily as a compatibility alias/supervisor while migrating.

## Configuration

I’d stop passing three loose env vars only. Add a checked-in testnet target manifest, maybe:

```text
verifier/environments/testnet.json
```

Example shape:

```json
{
  "name": "testnet",
  "baseDomain": "testnet.commonality.works",
  "chainId": 12345,
  "rpcUrlEnv": "COMMONALITY_TESTNET_RPC_URL",
  "graphqlUrl": "https://indexer.testnet.commonality.works/graphql",
  "appUrl": "https://testnet.commonality.works",
  "expectedHosts": [
    "testnet.commonality.works",
    "indexer.testnet.commonality.works"
  ],
  "contractsManifest": "../deployments/testnet.json"
}
```

Secrets still stay in env vars, but non-secret expected topology should be committed so drift is reviewable.

## Scheduling policy

I’d classify the new checks by cost/risk:

Frequent/cheap, safe:

```text
testnet.dns
testnet.http
testnet.rpc
testnet.indexer
testnet.app-shell
testnet.app-config
```

Manual or slower:

```text
testnet.contracts
testnet.website-journeys
```

Guarded/mutating:

```text
testnet.onchain-to-indexer
testnet.website-journeys --mutating
```

And update:

```text
verifier/coverage/guarded-check-policy.json
```

so guarded testnet checks have explicit opt-in env vars and mandatory-by milestones.

## Where it should roll up

I’d wire it like this:

```text
testnet.environment
  -> functionality.deep-stack
  -> facet.functionality
  -> root
```

And also share selected leaves:

```text
testnet.contracts
  -> facet.security

testnet.app-shell / testnet.website-journeys
  -> facet.product maybe, if they validate real user-facing workflows
```

The key is: don’t make “testnet is up” only a functionality concern if some checks are actually security/config/product-readiness checks.

## First implementation pass

If I were doing this incrementally, I’d do it in this order:

1. Split current `env.testnet-smoke` into:
   - `testnet.rpc`
   - `testnet.indexer`
   - `testnet.app-shell`
   - `testnet.environment` supervisor
2. Add `testnet.dns` and `testnet.http`.
3. Add a committed `verifier/environments/testnet.json`.
4. Add `testnet.app-config`, because wrong endpoints/addresses are a high-risk deployment failure.
5. Add `testnet.contracts` against the deployment manifest.
6. Add guarded `testnet.onchain-to-indexer`.
7. Add real-browser `testnet.website-journeys`.

That gives quick confidence early without waiting on the harder mutating journey tests.
