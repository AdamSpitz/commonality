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

**Recommended while iterating on CauseStarter UI:** keep the Docker stack for chain/indexer/IPFS/tool domains, and serve this SPA with Vite so HMR applies immediately (no image rebuild).

1. Start (or leave running) the local stack: `./scripts/services.sh --start` (or at least hardhat + indexer + cause-assist + gateway).
2. Seed `causestarter/.env` from the running Docker SPA config (contract addresses + tool domain URLs):

   ```bash
   python3 tmp/seed-causestarter-vite-env.py
   ```

   (Needs Docker CauseStarter on `:8090` once so `config.json` is available. Re-seed after a chain re-deploy.)
3. From the repo root:

   ```bash
   npm run causestarter:dev
   ```

   Or from this package: `npm run dev`.

Dev server: **http://localhost:5174** (main `ui` stays on 5173).

Vite proxies `/api` → indexer, `/api/cause-assist` → cause-assist, `/ipfs-api` → Kubo. Tool cards still open the other domains at `*.localhost:8088`.

**Note:** browser `localStorage` is per-origin, so causes saved on `:8090` do not appear on `:5174` (and vice versa). Use Vite for day-to-day UI work; use Docker (`./scripts/deploy-causestarter.sh` → `:8090`) when you need the packaged nginx SPA.

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

After start, `services.sh` runs a **fail-fast config sync check**
(`./scripts/check-local-config-sync.sh` / `npm run local:check`) so missing
`PublishedData`, stale ProjectFactory ABIs, or SPA address drift fail loudly
instead of at first publish/create-project. Re-run anytime:

```bash
npm run local:check
./scripts/services.sh --check
```

If the check fails after a chain reset or partial redeploy:

```bash
./scripts/deploy-contracts.sh localhost   # refresh deployments/localhost.env + .env + ui/.env
npm run causestarter:deploy               # rewrite CauseStarter config.json
# Republish domain UIs if LazyGiving/etc. still show old addresses:
./scripts/services.sh --start             # or re-run the ui-ipfs-publisher-* services
```

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

## Agent / browser automation

Grok (or any agent) can drive CauseStarter in a real browser.

### Prerequisites

1. Local stack + SPA: `./scripts/deploy-causestarter.sh` → http://localhost:8090/
2. Playwright MCP in Grok (`~/.grok/config.toml`):

```toml
[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@latest"]
enabled = true
startup_timeout_sec = 90
```

Register once with: `grok mcp add playwright -- npx -y @playwright/mcp@latest`  
Then **restart Grok** so MCP tools load.

3. Chromium for Playwright tests (repo root):  
   `npx playwright install chromium`

### Stable selectors (`data-testid`)

| Test id | Purpose |
|---|---|
| `wallet-connect-button` | Open Connect / show connected account |
| `wallet-account-menu` | Hardhat account picker (localhost only) |
| `wallet-hardhat-0` … `wallet-hardhat-9` | Pick Hardhat account |
| `wallet-disconnect` | Disconnect |
| `home-start-cause` | Home CTA → wizard |
| `nav-start` | Desktop nav “Start” |
| `start-cause-page` | Wizard root |
| `start-cause-goal` | Goal textarea |
| `start-cause-continue` | Continue |
| `start-cause-publish` | Publish cause |

On **localhost**, Connect only lists Hardhat accounts (no MetaMask). Use **Hardhat #0** for funded local txs.

### Smoke script (Playwright)

Against the Docker SPA (hash routing, default):

```bash
npm run causestarter:deploy   # if not already up
npm run test:e2e --workspace=causestarter
# watch the browser:
npm run test:e2e:headed --workspace=causestarter
```

Vite dev (path routing, not hash):

```bash
CAUSESTARTER_BASE_URL=http://localhost:5174 CAUSESTARTER_HASH_ROUTING=0 \
  npm run test:e2e --workspace=causestarter
```

### Example agent prompt

> Use the browser. Open http://localhost:8090/, click Connect, choose Hardhat #0,  
> click “Start a cause”, fill the goal with …, then Continue.

This package stays thinner than `ui/` (no multi-domain matrix, no Privy). Product posture:
[`specs/product/founder-first.md`](../specs/product/founder-first.md).
