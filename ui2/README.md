# CauseStarter UI (`ui2`)

Alternate, mobile-first interface for the Commonality substrate. Where the main
[`ui/`](../ui/) package is organized as multi-domain product sites (Commonality,
Civility, CSM, LazyGiving, …), **ui2** is a single app organized around the
**cause starter** job:

1. **Found a cause** — publish a founding statement that names what you stand for
2. **Enroll people** — supporters (signers), volunteers, and collaborators
3. **Build momentum** — funding portals, assurance contracts, content funding
4. **Use the rest as tools** — Commonality thesis, Civility, CSM, Tally, etc. are
   supporting features, not equal top-level entry points

## Tech stack

Same substrate as `ui/`:

- React 19 + TypeScript + Vite
- Material UI (mobile-first shell with bottom navigation)
- viem / wagmi / ConnectKit
- `@commonality/sdk` for chain actions and indexer queries

## Run (local dev)

From the repo root (with deps installed):

```bash
npm run ui2:dev
```

Or from this package:

```bash
npm run dev
```

Dev server defaults to **http://localhost:5174** (main `ui` stays on 5173).

Build:

```bash
npm run ui2:build
```

## Wallet connection

CauseStarter uses [ConnectKit](https://docs.family.co/connectkit) + wagmi.

- **Browser extension wallets** (MetaMask, Rabby, etc.) work via the injected connector without extra config.
- **WalletConnect** (QR / mobile wallets) requires a free project id from [Reown Cloud](https://cloud.reown.com). Set it before building:

```bash
# ui2/.env or the shell environment used for docker build
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

Vite bakes `VITE_*` into the bundle at build time, so change the id → rebuild/redeploy (`./scripts/deploy-ui2.sh`).

For local hardhat (chain id `31337`), switch your wallet to that network after connecting (RPC `http://127.0.0.1:8545`).

## Docker deploy

Multi-stage image: build SDK + SPA, serve with nginx. Runtime `config.json` is
written from environment variables on container start.

```bash
# Build image and start on http://localhost:8090/
npm run ui2:deploy

# Stop
npm run ui2:deploy:stop
```

Or with compose directly:

```bash
docker compose build ui2
docker compose up -d ui2
```

### Full local system (tool links)

CauseStarter tool cards open the domain SPAs at `http://{domain}.localhost:8088/#/`.
`./scripts/deploy-ui2.sh` now also:

1. Publishes missing domain UI bundles to local IPFS (`data/ui-ipfs/…`)
2. Starts `ui-local-gateway` on **:8088**
3. Starts `platform-api-service` on **:3001** when needed

Admin index of all local SPAs: http://localhost:8088/

Optional IPFS path for CauseStarter itself: `ui-ipfs-publisher-causestarter`
publishes a hash-routed bundle at `http://causestarter.localhost:8088/#/`.

## Design notes

- **Cause draft store** (`src/lib/causeStore.ts`) keeps founder progress in
  `localStorage` so a multi-step launch survives reloads before/while on-chain
  publication.
- On-chain actions reuse the same SDK functions the main UI uses
  (`createAndSignStatement`, `browseStatements`, `believeStatement`, …).
- Cross-domain links resolve via the same runtime config keys as `ui`
  (`VITE_LAZYGIVING_URL`, `VITE_CIVILITY_URL`, …) and default to the local
  gateway hosts when running `deploy-ui2.sh`.

This package is intentionally thinner than `ui/`: no multi-domain build matrix,
no Privy path, no Playwright suite yet. It is a product-surface experiment for
the founder-first / CauseStarter posture described in
[`specs/product/founder-first.md`](../specs/product/founder-first.md).
