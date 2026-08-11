# CauseStarter backlog

Known incompleteness for the founder-first surface. Merge is allowed with these
open **if they stay listed here**.

## Product / UX

- [ ] **Anchors are not built.** A founder cannot promote a proven view into a published statement, so the three things only an anchor can do — sign the combination, earmark to it, align a project with it — remain unavailable. See [shaping-your-cause-statements.md § Promotion](/docs/founder/shaping-your-cause-statements.md#promotion). The seat for it is the cause page's view strip.
- [x] **Roster is a publication.** Stable `/cause/:owner/:slug` + pinned `@version`, PublishedData roster document, MutableRef tip, history UI, preview-before-publish with peer "Publish anyway", separate coherence check, on-chain positive-only coherence attestation by the **CauseStarter operator** (the trusted `RefUpdated` worker's key is `msg.sender`; founder never self-attests), atomic publish+updateRef when the wallet supports EIP-5792 (sequential fallback), per-plank "added later" markers from ref history.
- [ ] View counts fetch believer sets per plank, and each fetch walks events for the plank *plus* every statement implying it, under a `limit: 10000` that truncates silently. Fine locally; measure before it matters. Remedy is an indexer-side aggregate ([§ Scale](/docs/founder/shaping-your-cause-statements.md#scale-the-fold-is-fine-the-transport-isnt)), optionally sketch-backed — but band 1 must stay exact.
- [x] Phrasing help is coach-only: no seed→auto-atomize into form fields; **Check phrasing** shows feedback (+ optional example wording). Sibling planks are passed as review context.

- [ ] Safety filter is MVP/heuristic + LLM policy text — not legal-grade; version/align with operator/legal specs later.
- [ ] Unpublished draft state still in `localStorage` only — multi-device recovery of *drafts* later (published rosters are on chain).
- [ ] No Privy path / full parity with main `ui` wallet story yet.
- [ ] No Playwright / full e2e suite for CauseStarter yet.
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
