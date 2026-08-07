# CauseStarter

Founder-first interface for the Commonality substrate. Where the main
[`ui/`](../ui/) package is organized as multi-domain product sites (Commonality,
Civility, CSM, LazyGiving, …), **CauseStarter** is a single app organized around
the cause-starter job:

1. **Found a cause** — publish a founding statement that names what you stand for
2. **Enroll people** — supporters (signers), volunteers, and collaborators
3. **Build momentum** — funding portals, assurance contracts, content funding
4. **Use the rest as tools** — Commonality thesis, Civility, CSM, Tally, etc. are
   supporting features, not equal top-level entry points

Directionally this is a **core product surface** (eventual primary entry). Known
gaps: [`TODO.md`](./TODO.md).

## Tech stack

Same substrate as `ui/`:

- React 19 + TypeScript + Vite
- Material UI (mobile-first shell with bottom navigation)
- viem / wagmi / ConnectKit
- `@commonality/sdk` for chain actions and indexer queries

## Statement publish = PublishedData

Launch publishes statement content via the **PublishedData** contract (same path
as main `CreateStatementForm`), not browser → Kubo API upload.

- Local deploy loads `PUBLISHED_DATA_CONTRACT_ADDRESS` /
  `VITE_PUBLISHED_DATA_CONTRACT_ADDRESS` the same way as the rest of the stack
  (`./scripts/services.sh --start` or `./scripts/deploy-causestarter.sh`).
- If the address is missing, launch fails with a clear config error.
- Optional same-origin `/ipfs-api` proxy and Kubo CORS are for **legacy / hosting**
  edge cases only, not the product requirement for statement launch.

## Run (local dev)

From the repo root (with deps installed):

```bash
npm run causestarter:dev
```

Or from this package:

```bash
npm run dev
```

Dev server defaults to **http://localhost:5174** (main `ui` stays on 5173).

Build / typecheck / test:

```bash
npm run causestarter:build
npm run typecheck --workspace=causestarter
npm run causestarter:test
```

## Wallet connection

CauseStarter uses [ConnectKit](https://docs.family.co/connectkit) + wagmi.

- **Browser extension wallets** (MetaMask, Rabby, etc.) work via the injected connector without extra config.
- **WalletConnect** (QR / mobile wallets) requires a free project id from [Reown Cloud](https://cloud.reown.com). Set it before building:

```bash
# causestarter/.env or the shell environment used for docker build
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

Vite bakes `VITE_*` into the bundle at build time, so change the id → rebuild/redeploy.

For local hardhat (chain id `31337`), switch your wallet to that network after connecting (RPC `http://127.0.0.1:8545`), or use the built-in Hardhat #0–#9 local connectors.

## Local stack (core domain)

CauseStarter is part of the default local stack:

```bash
./scripts/services.sh --start
```

That publishes the CauseStarter SPA to local IPFS (gateway
`http://causestarter.localhost:8088/#/`) and starts the dedicated nginx SPA on
**http://localhost:8090/** with **cause-assist** (LLM helpers) on **:3002**.

Focused rebuild/redeploy of only CauseStarter + cause-assist:

```bash
npm run causestarter:deploy
npm run causestarter:deploy:stop
```

Or with compose:

```bash
docker compose build cause-assist causestarter
docker compose up -d cause-assist causestarter
```

### Tool deep-links

CauseStarter tool cards open the other domain SPAs at
`http://{domain}.localhost:8088/#/`. Admin index: http://localhost:8088/

IPFS publish for CauseStarter uses the shared
`scripts/publish-ui-to-ipfs.mjs` with `UI_PACKAGE=causestarter`.

## cause-assist (LLM helpers)

Statement suggestions and safety filter default to Grok via xAI. Optional key:
`XAI_API_KEY` in repo-root `.env.secrets`, then `./scripts/setup-env.sh`.
Without a key the service still starts (template suggestions + heuristic safety).

```bash
npm run cause-assist:dev
```

See [`cause-assist/README.md`](../cause-assist/README.md).

## Design notes

- **Cause draft store** (`src/lib/causeStore.ts`) keeps founder progress in
  `localStorage` so a multi-step launch survives reloads before/while on-chain
  publication.
- On-chain actions reuse the same SDK functions the main UI uses
  (`createAndSignStatement`, `browseStatements`, `believeStatement`, …).
- Cross-domain links resolve via the same runtime config keys as `ui`
  (`VITE_LAZYGIVING_URL`, `VITE_CIVILITY_URL`, …) and default to the local
  gateway hosts.

This package is intentionally thinner than `ui/`: no multi-domain build matrix,
no Privy path, no Playwright suite yet. Product posture:
[`specs/product/founder-first.md`](../specs/product/founder-first.md).
