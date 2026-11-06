# Commonality backlog

Known incompleteness for the founder-first surface. Merge is allowed with these
open **if they stay listed here**. Delete items when done; do not check them off.

## Product / UX

- Make the published bridge convergence diagram preserve every implication target and its attestation status. It currently chooses one common-ground statement and draws shared support unconditionally, which can misrepresent multi-plank clusters or pairs the attester refused. Keep loose pairs visible and distinguish intended links from attested implications.

- [ ] **Disjunctive (`any`) mint path.** Do not auto-create from bridges.
  Next candidate: a surface that needs a coalition CID (Tally / public
  alliance count / "sign the name"). Ask before wiring it into
  bridge-cluster publish.

- [ ] Safety filter is MVP/heuristic + LLM policy text — not legal-grade; version/align with operator/legal specs later.
- [ ] Unpublished draft state still in `localStorage` only — multi-device recovery of *drafts* later (published rosters are on chain; published *bookmarks* follow the wallet `bookmarked-causes` ref).
- [ ] Cause bookmarks: `bookmarked-causes` is a public wallet `updateRef`; the only user-facing warning is the Causes list-page disclaimer. Keep/remove, reconnect hydrate, and tombstoned union-sync (a later keep can restore) are in place; Playwright covers keep/remove + reconnect.
- [ ] Statement `bookmarks` ref is still reserved infrastructure only — no Commonality (or main `ui`) surface for remembering a statement without signing it.
- [ ] Product: how Commonality ranks vs other domains in nav/marketing once it’s “the main thing.”
## Architecture

- [ ] Optional: extract Hardhat local connectors for reuse by main `ui` local DX.

## Local stack notes

- Default `./scripts/services.sh --start` **does** build/start Commonality (IPFS domain + `:8090` SPA), `cause-assist`, and `ui-ipfs-publisher-commonality`.
- Focused path: `./scripts/deploy-commonality.sh`.
- Statement **content** publish is **PublishedData-only** (`VITE_PUBLISHED_DATA_CONTRACT_ADDRESS` from hardhat deploy / `.env`). Missing address → clear config error, not IPFS upload.
- Optional durability: run [`published-data-ipfs-mirror`](../published-data-ipfs-mirror/README.md); no browser Kubo write path.
