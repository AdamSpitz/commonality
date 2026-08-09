# CauseStarter backlog

Known incompleteness for the founder-first surface. Merge is allowed with these
open **if they stay listed here**.

## Product / UX

- [ ] Safety filter is MVP/heuristic + LLM policy text — not legal-grade; version/align with operator/legal specs later.
- [ ] Cause drafts in `localStorage` only — multi-device / recovery later.
- [ ] No Privy path / full parity with main `ui` wallet story yet.
- [ ] No Playwright / full e2e suite for CauseStarter yet.
- [ ] No bridge-building / mediator tool yet. Once the bridge-creator is generalized (see [bridge-building-for-founders.md](../specs/product/bridge-building-for-founders.md) and the root [TODO.md](../TODO.md) item), add a `SUPPORTING_TOOLS` entry in `src/lib/tools.ts` plus a cause-record field holding the founder's mediator address + service URL, and surface the opt-in deep link and featured-bridges block.
- [ ] Product: how CauseStarter ranks vs other domains in nav/marketing once it’s “the main thing.”

## Architecture

- [ ] Long-term: fold CauseStarter into the real domain/shell model (shared machinery, runtime config, domain manifests) as we make it the primary surface; avoid unbounded parallel app growth under a second package forever.
- [ ] Optional: extract Hardhat local connectors for reuse by main `ui` local DX.
- [x] Browser `/ipfs-api` proxy removed; product publish is PublishedData-only.

## Local stack notes

- Default `./scripts/services.sh --start` **does** build/start CauseStarter (IPFS domain + `:8090` SPA), `cause-assist`, and `ui-ipfs-publisher-causestarter`.
- Focused path: `./scripts/deploy-causestarter.sh`.
- Statement **content** publish is **PublishedData-only** (`VITE_PUBLISHED_DATA_CONTRACT_ADDRESS` from hardhat deploy / `.env`). Missing address → clear config error, not IPFS upload.
- Optional durability: run [`published-data-ipfs-mirror`](../published-data-ipfs-mirror/README.md); no browser Kubo write path.
