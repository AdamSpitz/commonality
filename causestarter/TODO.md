# CauseStarter backlog

Known incompleteness for the founder-first surface. Merge is allowed with these
open **if they stay listed here**.

## Product / UX

- [ ] Safety filter is MVP/heuristic + LLM policy text — not legal-grade; version/align with operator/legal specs later.
- [ ] Cause drafts in `localStorage` only — multi-device / recovery later.
- [ ] No Privy path / full parity with main `ui` wallet story yet.
- [ ] No Playwright / full e2e suite for CauseStarter yet.
- [ ] Product: how CauseStarter ranks vs other domains in nav/marketing once it’s “the main thing.”

## Architecture

- [ ] Long-term: fold CauseStarter into the real domain/shell model (shared machinery, runtime config, domain manifests) as we make it the primary surface; avoid unbounded parallel app growth under a second package forever.
- [ ] Optional: extract Hardhat local connectors for reuse by main `ui` local DX.
- [ ] Optional: main `ui` same-origin IPFS API proxy only if we still need legacy browser uploads.

## Local stack notes

- Default `./scripts/services.sh --start` **does** build/start CauseStarter (IPFS domain + `:8090` SPA), `cause-assist`, and `ui-ipfs-publisher-causestarter`.
- Focused path: `./scripts/deploy-causestarter.sh`.
- Statement **content** publish is **PublishedData-first** (`VITE_PUBLISHED_DATA_CONTRACT_ADDRESS` from hardhat deploy / `.env`). Missing address → clear config error, not silent IPFS upload.
- Local Kubo API CORS and optional `/ipfs-api` proxy are for legacy/hosting edge cases, not the product requirement for launch.
