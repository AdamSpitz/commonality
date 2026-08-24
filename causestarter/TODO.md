# CauseStarter backlog

Known incompleteness for the founder-first surface. Merge is allowed with these
open **if they stay listed here**.

- [x] Bridge cluster editor records intended plank pairs, wording-checks them, can pay the implication attester for those pairs, and can optionally publish parent→modified nudge batches. Attester refusals stay refusals (no invented arrows).

## Product / UX

- [ ] `normalizeSlug` slices to 64 *after* stripping hyphens, so a cut on a hyphen can fail `validateSlug`. Bridge-creator `slugifyCluster` now strips again after slice; align CauseStarter if organizers hit 64-char slugs.

- [x] **Cluster-page mediator opt-in** and **statement-level triples** (`/bridge/triple`) — [ADR 0012](/specs/decisions/0012-mediator-is-an-address.md).

- [ ] **Content contracts on the cause board — leftover after first slice.**
  Product rule (settled): list the *contract* (not individual posts) on the
  cause project list when any post in that contract has a current positive
  content attestation to a published plank. Dedup by address with vouched
  LazyGiving projects. Prospective / not-yet-materialized rounds appear
  only via a project-level vouch. Do **not** add an include/exclude
  checkbox. Do **not** mix post rows into the project list. The dedicated
  content board (`/cause/.../content`) stays as a post-level surface.

- [x] **Anchors are combinator statements.** Canonical CID, no founder title,
  deterministic pairwise arrows via the implication attester's structural gate.
  Roster stores optional `anchors` — each carrying the operand set it was minted
  from. Alignment stays on planks. Combinators are minted from the action that
  needs them (conjunction earmark), not a generic cause-page promote. See
  [combinator-statements.md](/specs/tech/subsystems/conceptspace/combinator-statements.md).
- [x] **Conjunction earmark.** Funding page: select ≥2 planks, publish `all`
  if needed, open the pledge form against that CID. Jobs for each operator:
  [shaping-your-cause-statements.md](/docs/founder/shaping-your-cause-statements.md#which-operator-to-mint-and-from-which-action-2026-08-19).
- [ ] **Disjunctive (`any`) mint path.** Do not auto-create from bridges.
  Next candidate: a surface that needs a coalition CID (Tally / public
  alliance count / "sign the name"). Ask before wiring it into
  bridge-cluster publish.
- [ ] View counts fetch believer sets per plank, and each fetch walks events for the plank *plus* every statement implying it, under a `limit: 10000` that truncates silently. Fine locally; measure before it matters. Remedy is an indexer-side aggregate ([§ Scale](/docs/founder/shaping-your-cause-statements.md#scale-the-fold-is-fine-the-transport-isnt)), optionally sketch-backed — but band 1 must stay exact.

- [ ] Safety filter is MVP/heuristic + LLM policy text — not legal-grade; version/align with operator/legal specs later.
- [ ] Unpublished draft state still in `localStorage` only — multi-device recovery of *drafts* later (published rosters are on chain; published *bookmarks* follow the wallet `bookmarked-causes` ref).
- [ ] Cause bookmarks: `bookmarked-causes` is a public wallet `updateRef`; the only user-facing warning is the Causes list-page disclaimer. Keep/remove, reconnect hydrate, and tombstoned union-sync (a later keep can restore) are in place; Playwright covers keep/remove + reconnect.
- [ ] **Project bookmarks are last-local-wins.** `bookmarked-projects` hydrates only when this device has no local key, then `persist` writes the local list over the wallet ref. A second device that bookmarked in between is clobbered. An in-flight hydrate no longer overwrites a click that landed during `getUserRef`. Reuse cause-bookmark keep/removed tombstones (or merge-before-write) before this is more than a personal list.
- [ ] Statement `bookmarks` ref is still reserved infrastructure only — no CauseStarter (or main `ui`) surface for remembering a statement without signing it.
- [ ] No Privy path / full parity with main `ui` wallet story yet.
- [ ] Product: how CauseStarter ranks vs other domains in nav/marketing once it’s “the main thing.”
- [ ] **Copy (Adam):** two-step rename in [cause-page-not-a-club.md](/specs/product/cause-page-not-a-club.md) — fundable-projects board first, then organizer **cause board**. Do not sweep until he says so; new strings should follow that note.

## Architecture

- [ ] Long-term: fold CauseStarter into the real domain/shell model (shared machinery, runtime config, domain manifests) as we make it the primary surface; avoid unbounded parallel app growth under a second package forever.
- [ ] Optional: extract Hardhat local connectors for reuse by main `ui` local DX.

## Local stack notes

- Default `./scripts/services.sh --start` **does** build/start CauseStarter (IPFS domain + `:8090` SPA), `cause-assist`, and `ui-ipfs-publisher-causestarter`.
- Focused path: `./scripts/deploy-causestarter.sh`.
- Statement **content** publish is **PublishedData-only** (`VITE_PUBLISHED_DATA_CONTRACT_ADDRESS` from hardhat deploy / `.env`). Missing address → clear config error, not IPFS upload.
- Optional durability: run [`published-data-ipfs-mirror`](../published-data-ipfs-mirror/README.md); no browser Kubo write path.
