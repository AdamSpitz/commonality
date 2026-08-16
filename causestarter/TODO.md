# CauseStarter backlog

Known incompleteness for the founder-first surface. Merge is allowed with these
open **if they stay listed here**.

## Product / UX

- [ ] **Content contracts on the cause board — leftover after first slice.**
  Product rule (settled): list the *contract* (not individual posts) on the
  cause project list when any post in that contract has a current positive
  content attestation to a published plank. Dedup by address with vouched
  LazyGiving projects. Prospective / not-yet-materialized rounds appear
  only via a project-level vouch. Do **not** add an include/exclude
  checkbox. Do **not** mix post rows into the project list. The dedicated
  content board (`/cause/.../content`) stays as a post-level surface.

  **Already landed (do not redo):**
  - Inclusion helper: `ui/src/content-funding/selectAlignedContent.ts`
    (`selectAlignedContentContracts`).
  - Cause page union: `causestarter/src/hooks/useCauseProjects.ts` merges
    those contracts into the plank-aligned project list; cards in
    `CauseDetailPage.tsx` show “N of M posts attested” and a Content chip,
    and link with `?aligned=<plankCids>`.
  - Shared statement boards: `ui/src/fundingportals/components/AlignedProjectsList.tsx`.
  - Contract detail: `ContentFundingProjectSection.tsx` labels each post
    **Aligned** vs **Not attested as aligned**, and explains the batch
    succeeds or fails as a whole.

  **Still to do:**
  1. **Verify on a live local cause** (`http://localhost:5174`) that has
     both a vouched LazyGiving project and a content contract with mixed
     attested/unattested posts. Confirm one contract row, honest N-of-M
     copy, and the detail-page labels. Seed data may not already have this
     mix — add a focused seed or fake-data scenario if the board is empty.
  2. **Trust filter.** Inclusion currently treats *any* positive content
     attestation as enough. Decide whether it should require a trusted
     content attester (same spirit as Subjectiv filtering of project
     vouches) and implement that if yes.
  3. **Update founder e2e copy** in
     `verifier/checks/review/founder-e2e/causestarter.md` so the cause
     board is described as projects *plus* relevant content contracts, not
     only a separate specialized content board.
  4. **Effect deps.** `useCauseProjects` / `AlignedProjectsList` re-merge
     on `channels.length` and `contentAttestations.size` only, to avoid
     infinite re-renders from unstable hook identities. If attestations
     change without those counts changing, the list can go stale — tighten
     if you see that.
  5. Delete this item from *root* `TODO.md` when the leftovers above are
     done; keep a one-liner here only if a product gap remains.

- [ ] **Anchors are not built.** A founder cannot promote a proven view into a published statement, so the three things only an anchor can do — sign the combination, earmark to it, align a project with it — remain unavailable. See [shaping-your-cause-statements.md § Promotion](/docs/founder/shaping-your-cause-statements.md#promotion). The seat for it is the cause page's view strip.
- [ ] View counts fetch believer sets per plank, and each fetch walks events for the plank *plus* every statement implying it, under a `limit: 10000` that truncates silently. Fine locally; measure before it matters. Remedy is an indexer-side aggregate ([§ Scale](/docs/founder/shaping-your-cause-statements.md#scale-the-fold-is-fine-the-transport-isnt)), optionally sketch-backed — but band 1 must stay exact.

- [ ] Safety filter is MVP/heuristic + LLM policy text — not legal-grade; version/align with operator/legal specs later.
- [ ] Unpublished draft state still in `localStorage` only — multi-device recovery of *drafts* later (published rosters are on chain; published *bookmarks* follow the wallet `bookmarked-causes` ref).
- [ ] Cause bookmarks: Playwright for keep/remove + reconnect hydrating from `bookmarked-causes`. Union-sync can resurrect a bookmark removed on another device (no tombstones). Hydrated list cards may show plank CIDs as text until the cause page is opened. Bookmarking is a public wallet `updateRef` with only the list-page disclaimer.
- [ ] Statement `bookmarks` ref is still reserved infrastructure only — no CauseStarter (or main `ui`) surface for remembering a statement without signing it.
- [ ] No Privy path / full parity with main `ui` wallet story yet.
- [ ] Product: how CauseStarter ranks vs other domains in nav/marketing once it’s “the main thing.”

## Architecture

- [ ] Long-term: fold CauseStarter into the real domain/shell model (shared machinery, runtime config, domain manifests) as we make it the primary surface; avoid unbounded parallel app growth under a second package forever.
- [ ] Optional: extract Hardhat local connectors for reuse by main `ui` local DX.

## Local stack notes

- Default `./scripts/services.sh --start` **does** build/start CauseStarter (IPFS domain + `:8090` SPA), `cause-assist`, and `ui-ipfs-publisher-causestarter`.
- Focused path: `./scripts/deploy-causestarter.sh`.
- Statement **content** publish is **PublishedData-only** (`VITE_PUBLISHED_DATA_CONTRACT_ADDRESS` from hardhat deploy / `.env`). Missing address → clear config error, not IPFS upload.
- Optional durability: run [`published-data-ipfs-mirror`](../published-data-ipfs-mirror/README.md); no browser Kubo write path.
