# CauseStarter

Organizer-first reference lens for the Commonality substrate. Where the main
[`ui/`](../ui/) package is organized as multi-domain product sites (Commonality,
Civility, CSM, LazyGiving, …), **CauseStarter** is a single app organized around
the cause-starter job:

1. **Organize a cause** — retrieve, review, and select the independent, signable statements it is made of
2. **Enroll people** — supporters (signers), volunteers, and collaborators
3. **Fund the work** — cause boards, assurance contracts, content funding
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
- There is no browser `/ipfs-api` proxy. Durability mirroring is the standalone
  [`published-data-ipfs-mirror`](../published-data-ipfs-mirror/README.md) worker.

## Run (local dev)

**Recommended while iterating on CauseStarter UI:** keep the Docker stack for chain/indexer/IPFS/tool domains, and serve this SPA with Vite so HMR applies immediately (no image rebuild).

1. Start (or leave running) the local stack: `./scripts/services.sh --start` (or at least hardhat + indexer + **cause-assist** + gateway).  
   `cause-assist` is a Compose service (loopback **:3002**). You do **not** need a separate `npm run cause-assist:*` process for normal UI work.
2. Seed `causestarter/.env` from the running Docker SPA config (contract addresses + tool domain URLs):

   ```bash
   python3 scripts/seed-causestarter-vite-env.py
   ```

   (Needs Docker CauseStarter on `:8090` once so `config.json` is available. Re-seed after a chain re-deploy.
   Alternatively copy `VITE_*` keys from `deployments/localhost.env` / `ui/.env`, or re-run
   `./scripts/deploy-contracts.sh localhost` which mirrors addresses into `causestarter/.env`.)
3. From the repo root:

   ```bash
   npm run causestarter:dev
   ```

   Or from this package: `npm run dev`.

Dev server: **http://localhost:5174** (main `ui` stays on 5173).

### Local trust network (project lists)

Project lists on a cause are filtered by a **Subjectiv trust graph**: vouches
that “this project advances that issue” only count from accepted wallets. A
viewer who has named anyone on-chain uses their personal transitive graph. A
viewer without personal trust uses the direct trustees of the configured
`VITE_DEFAULT_ALIGNMENT_TRUST_ROOT`; this intentionally does not traverse the
attesters' own trust edges. The shipped local root is maintained by
[`alignment-trust-bootstrap`](../alignment-trust-bootstrap/README.md), which
admits observed attesters and supports operator revocation for spam response.
That trust relationship is not an attestation of the cause itself.

`./scripts/data.sh --seed` (any size) records that graph for Hardhat `#0`–`#9`
via `scripts/seed-local-alignment-trust.mjs`. The indexer must capture
`TrustRegistry:TrustSet` for CauseStarter to see those edges. After a wipe, the
usual `services.sh --start` then `data.sh --seed` is enough.

To re-run only the trust edges: `node scripts/seed-local-alignment-trust.mjs`.
The cause-page disclosure identifies the starter network, and **Trust settings**
(gear icon) lets any connected wallet replace it by naming its own trustees.

Vite proxies `/api` → indexer and `/api/cause-assist` → **Docker** `cause-assist` on `http://127.0.0.1:3002`. Tool cards still open the other domains at `*.localhost:8088`.

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

After `./scripts/data.sh --seed`, connect as **Hardhat #0** (or any of `#0`–`#9`).
The landing page should include the seeded **Local food systems** cause
(`/cause/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/local-food-systems`), whose
board lists the Riverside garden project and the mixed `@civicbuilder` content
contract, and a **Christianity** cause
(`/cause/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/christianity`) with the
Christian / secular-conservative mediator, three LazyGiving projects, monthly
pledges, and a mixed Common Table essay contract. Seed also publishes a
**secular conservatism** cause under Hardhat #9 so the bridge editor can load
a real other parent (or you can still write a stand-in).

To add only the Christianity storyline onto an already-seeded local chain:

```bash
npm run gen:seed:christianity --workspace=fake-data-generation
```

Featured mediator bridges come from the `christian-bridge-creator` Compose
service on port 3011 (`./scripts/services.sh --start` brings it up). The
roster still publishes without it; the mediator card then shows the service
as unavailable.

## Local stack (core domain)

CauseStarter is part of the default local stack:

```bash
./scripts/services.sh --start
```

That publishes the CauseStarter SPA to local IPFS (gateway
`http://causestarter.localhost:8088/#/`) and starts the dedicated nginx SPA on
**http://localhost:8090/** with **cause-assist** (LLM helpers) proxied internally at `/api/cause-assist/`.

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

Included in Docker Compose (`cause-assist` service). `./scripts/services.sh --start`
and `./scripts/deploy-causestarter.sh` bring it up on **127.0.0.1:3002**. Docker
CauseStarter nginx and Vite both proxy `/api/cause-assist/` to that service.

Statement suggestions and safety filter default to Grok via xAI. Optional key:
`XAI_API_KEY` in repo-root `.env.secrets`, then `./scripts/setup-env.sh`.
Without a key the service still starts (template suggestions + heuristic safety).

Only run it on the host when iterating on **cause-assist itself** (not needed for
CauseStarter UI work):

```bash
# stop the container first so port 3002 is free
docker compose stop cause-assist
npm run cause-assist:dev
```

See [`cause-assist/README.md`](../cause-assist/README.md). Bridge-cluster wording help (brief export + one-shot verbs, no chat): [`docs/founder/bridge-cluster-wording-help.md`](../docs/founder/bridge-cluster-wording-help.md).

## Design notes

- **CauseStarter is a lens, not a directory** ([ADR 0008](../specs/decisions/0008-operated-surfaces-are-lenses.md)).
  It authors no discovery: no search, browse, ranking, featuring, or leaderboards.
  A cause is reached at `/cause/:causeId` through a link its organizer circulates.
  Nothing is reviewed before it renders and nothing is listed, so there are no
  admission criteria; what the operated surface offers is that its numbers are
  correct and independently recomputable, never that the causes are good.
  **Do not add a browse/search/"popular causes" surface** — its absence is the
  posture, not a gap. Policy-list suppression still applies and still must reach
  aggregation, not just rendering.
- **A cause is a set of planks**, not a main statement with supporters. Each
  plank is published separately and carries its own CID; a cause is "live" once
  any plank is on chain, and there is no launch step. The visitor's view is
  `/cause/…` and the organizer's editor is `/cause/…/edit` — separate URLs, not a
  mode flag, so the browser's back button leaves the editor the way a reader
  expects. See
  [shaping-your-cause-statements.md](../docs/founder/shaping-your-cause-statements.md).
- **Bridges are linked, not inlined.** The editor's *Bridges* section lists the
  clusters that quote this cause as compact links to their own pages, offers
  *Create a bridge* (`/bridge/new` — human-authored, no service needed), and keeps
  the standalone bridge-creator instance one quiet link deeper at
  `/cause/…/mediator`. The visitor's page shows the same rows, published clusters
  only, with no authoring affordances. An attached mediator is one compact row on
  both pages — name, opt-in toggle, link out. What it *proposes* lives on
  `/cause/…/mediator` (`BridgeDisplayBlock`), never inlined into the cause. See
  [bridge-causes.md](../specs/product/bridge-causes.md). Commonality does not
  notify the quoted organizer ([ADR 0011](../specs/decisions/0011-organizer-contact-is-pull.md)):
  citations are public on the cause page; optional `contactUrl` is a pointer they
  already use, not an inbox.
- **A pasted link is the parent picker.** Since there is no directory to search,
  the bridge editor takes the link the other organizer circulated and pulls
  `owner`/`slug` out of it (`parseCauseLink`) — full URL, hash-routed URL, bare
  path, or `0xowner/slug`, tolerating `@versionCid` and trailing page segments.
  It refuses anything ambiguous rather than guessing at an owner.
- **Retrieval first; organizer approval is deterministic.** Start gathers ordinary-language
  intent, searches published statements before asking cause-assist for new drafts, and exposes
  rejection/correction and manual-writing paths. Suggestions enter the same page-level review
  as existing drafts; exact immutable text and CIDs remain visible before publication or signing.
- **Views** (`CauseViewStrip` + `useViewCounts`) are client-side set operations
  over the planks: a union count, and a conjunction shown as **two bands**
  (signed-all, plus signed-some-disagreed-with-none). Never render a bare
  intersection — `noOpinion` is the default, so it collapses on silence.
- **Alignment is per statement.** The fundable-projects dashboard is inlined on
  the statement page (`/statement/:cid`) and, as a union of planks, on the
  cause page. `/statement/:cid/board` redirects to the statement.
- **Cause store** (`src/lib/causeStore.ts`) keeps planks in `localStorage` so
  unpublished wording survives reloads.
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
| `home-start-cause` | Home CTA → create a draft and open the cause editor |
| `nav-start` | Desktop/mobile nav “Start” → same (creates a new draft) |
| `cause-detail-page` | Cause page root (where all editing happens; brand-new drafts show “Start a cause” coach copy here) |
| `issue-guidance` | Static coach copy for what an issue is |
| `cause-add-plank` | Add an issue |
| `plank-text-N` | Nth issue's editable text (drafts only) |
| `plank-publish-N` | Publish the Nth issue |
| `plank-review-button-N` | Request phrasing feedback for the Nth draft |
| `plank-review-N` | Feedback panel for the Nth draft |
| `plank-use-example-N` | Explicitly adopt the example rewording into the field |
| `plank-row-draft` / `plank-row-published` | Issue rows by state |
| `cause-view-strip` | Union / conjunction counts over selected statements |
| `plank-in-totals-N` | Include/exclude the Nth statement from those totals (view only) |
| `view-count-any` / `view-count-all` / `view-count-none-disagreed` | The counts themselves |
| `cause-keep-on-device` / `cause-remove-from-device` | Bookmark / remove a published cause you do not organize |

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
> click “Start a cause”, describe the cause, click Continue, then add and publish
> issues on the cause page.

This package stays thinner than `ui/` (no multi-domain matrix, no Privy). Product posture:
[`specs/product/founder-first.md`](../specs/product/founder-first.md).
