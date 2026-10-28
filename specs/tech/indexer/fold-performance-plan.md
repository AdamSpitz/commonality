# Plan: make cold-start folds cheap

Status: **active plan** (filed 2026-10-28). Work the steps in order. Each step is its own feature branch and PR into `dev` (see [branching](/workflow/branching.md)). Check a step off here in the same PR that finishes it. When every step is checked, delete this plan's item from [`/TODO.md`](/TODO.md), keep the "Ideas for later" section, and update [README.md § Fold Versioning and Upgrades](./README.md#fold-versioning-and-upgrades) so it describes the new state.

Autonomy: Adam has approved steps 1–5 as **Tell** ([tiers](/workflow/task-tiers.md)). Do them, then leave a Tell Report in [`/inbox.md`](/inbox.md). **Breaking backward compatibility is explicitly allowed.** That covers contract event signatures, the `/api/events` API, SDK function signatures, and the stored accumulator format. Local data can be wiped and reindexed at any time (`./scripts/data.sh --wipe`). Do **not** redeploy testnet or touch mainnet as part of this plan. If a step changes contracts, add a separate (Tell) item to `/TODO.md` for the testnet redeploy instead.

The ideas in "Ideas for later" are **not** approved. Do not build them.

## Background (read this first)

The indexer is a deliberately dumb event cache. It stores raw logs and serves them at `GET /api/events` (`indexer/src/api/index.ts`), with filters for `chainId`, `contractAddress`, `eventName`, `topic1..3`, and a block range. `limit` is capped at 10 000. When a query is truncated, the API returns the **newest** N events, so the **oldest** ones are the ones dropped. All entity state comes from SDK fold functions (`sdk/src/subsystems/*/folds.ts`). Why it's built this way: [README.md](./README.md).

We want to keep these benefits:

- the indexer holds no business logic and needs no derived tables;
- fold logic is versioned with the SDK, so changing it never requires reindexing;
- everything a client sees can be checked against the chain;
- dead entities cost nothing.

The problem: **single-entity folds are cheap, global folds are not.** A single-entity fold is bounded by indexed topics or a contract address (a statement page, a project page). Global folds download *every* event of some type and fold from scratch on *every* cold load. The cost is mostly the download and request count, not the fold CPU. The only per-device persistence today is the per-project accumulator in `ui/src/shared/stores/foldCache.ts`, plus the cause-board "view snapshot" (paint the last result while revalidating). Neither helps a first visit.

Inventory of global fetches/folds as of this writing (re-grep before starting; it will drift):

| SDK entry point | What it pulls | Notes |
|---|---|---|
| `conceptspace/queries/browse.ts`: `browseStatements*`, `getAllStatements` | every `DirectSupport` | UI: StatementPicker, BrowseStatementsPage, DepositPage |
| `conceptspace/queries/indirect-support.ts`: `getImplicationSourceActivity` | every implication event | UI: `useImplicationSourceActivity` |
| `content-funding/queries/fetch-state.ts`: `fetchAndFoldContentFundingState`; also `content-funding/queries/onchain.ts` | all 16 content-funding event types via `fetchAllContentFundingEvents` | 3 UI hooks |
| `delegation/queries.ts`: `getDonationActivityByRoot` | all delegation + intent events, **plus `getAllProjects()`** (a full fold of every project) | UI: MyNotesPage, a per-user page |
| `delegation/queries.ts`: `getNoteIntentAggregate` | all intents, then all delegation events | 15 s in-memory cache only |
| other `delegation/queries.ts` users of `fetchAllDelegationEvents` / `fetchAllNoteIntentEvents` | as named | |
| `delegation/recurring-pledges.ts`: `getStandingPledges` | the whole RecurringPledges contract | cause board, leaderboard |
| `lazy-giving/queries.ts`: `getAllProjectAddresses`, `getAllProjects`, `getUserContributions` (`fetchAllBoughtEvents`) | all factory events, then N project folds | |
| `mutable-refs/queries.ts`: `getRefsByName`; `work-requests/queries.ts`: `loadWorkRequestBoard` | every `RefUpdated` | |
| `suggested-names/queries.ts` | see file | |
| UI `ui/src/shared/trust/subjectivTrust*` | trust-graph walk | already runs in a Web Worker; use it as the precedent for step 5 |

Useful search: `grep -rnE "fetchAll[A-Za-z]*\(|fetchEventsComplete\(|limit: 10000" sdk/src ui/src`.

**Step 0, before any code: measure.** Write a small script (`sdk/scripts/bench-cold-load.ts` is fine to keep) that runs each inventory query against a running local stack and prints the request count, the response bytes, and the wall time. Seed enough data that the numbers mean something; [`fake-data-generation/PLAN.md`](/fake-data-generation/PLAN.md) describes the stress-traffic seeding, so do not build a parallel seeder. Record the baseline numbers in this file under each step as you go, so the later steps can show the improvement.

The script is `sdk/scripts/bench-cold-load.ts` (`npm run bench:cold-load` in `sdk/`). It needs a running local indexer. The first recorded run is under step 2. There is no earlier run, so that table is the baseline for steps 3–5. It used the local chain that was already indexed (not a fresh `--seed=small`): about 104 `DirectSupport`, 55 `ProjectCreated`, 12 `NoteCreated`, 8 `NoteDelegated`, 48 `RefUpdated`, and no `NoteIntentAttested`, `ERC1155Bought`, or standing pledges.

## Steps

### [x] 1. Stop silently truncating global fetches (correctness)

Done on `feature/stop-silent-event-truncation`. Wide helpers go through `fetchEventsComplete`. `fetchEvents` throws when an unfiltered query with `limit >= 1000` comes back full, unless the caller sets `allowTruncation` (the complete fetcher does). Topic-filtered queries still accept a limit. The first bench is the step 2 table; this step had no separate run.

Several "fetch everything" helpers call plain `fetchEvents(..., { limit: 10000 })`. Once there are more than 10k events of that kind, they quietly return only the newest 10k, and the folds come out **wrong**. `fetchEventsComplete` (in `sdk/src/utils/eventCacheClient.ts`) already handles this by splitting block ranges; conceptspace uses it.

- Convert every unfiltered or global fetch to `fetchEventsComplete`. At least these: `fetchAllDelegationEvents`, `fetchAllContentFundingEvents`, `fetchAllRefUpdatedEvents`, `fetchAllNoteIntentEvents`, `fetchAllBoughtEvents`, `fetchAllSoldEvents`, `fetchERC1155TransferEvents`, `getStandingPledges`, and `getAllProjectAddresses`. The `*Complete` variants that already exist (`fetchAllDelegationEventsComplete`, `fetchAllNoteIntentEventsComplete`) then become the only versions; delete the truncating twins and update their callers.
- Per-entity fetches with a topic or contract filter can keep a limit only if a single entity really can't exceed it. When in doubt, use `fetchEventsComplete`.
- Make truncation impossible to reintroduce quietly. One way: give `fetchEvents` a `limit` that has no default for unfiltered queries, or have it throw when an unfiltered query returns exactly `limit` rows.
- Tests: a unit test with a fake event cache returning more than 10k events, which must come back complete through each converted helper (look for an existing `eventCacheClient` test to extend).

### [x] 2. Narrow queries that don't need to be global

Done on `feature/narrow-cold-start-queries` (stacked on the truncation branch, which is not on `dev` yet).

First recorded bench, 2026-10-28, indexer `http://localhost:42069`, chain 31337, world described under Step 0. `getAllProjects` is the expensive row (223 event-cache requests, 401 ms) because each project is still folded on its own. `getDonationActivityByRoot` took 20 requests and returned 0 rows for the owner of the newest `NoteCreated`.

| Query | Requests | Bytes | ms | Detail |
|---|---:|---:|---:|---|
| browseStatements (believerCount) | 1 | 69171 | 176 | 10 statements |
| getAllStatements | 1 | 69171 | 133 | 46 statements |
| getImplicationSourceActivity | 2 | 12569 | 5 | 17 implications |
| fetchAndFoldContentFundingState | 16 | 47876 | 29 | folded |
| getDonationActivityByRoot | 20 | 1948 | 37 | 0 rows |
| fetchAllNoteIntentEvents | 1 | 12 | 2 | 0 events |
| getNoteIntentAggregate | 1 | 12 | 2 | 0 notes |
| getStandingPledges | 1 | 12 | 2 | 0 pledges |
| getAllProjectAddresses | 3 | 40295 | 9 | 55 projects |
| getAllProjects | 223 | 83140 | 401 | 55 projects |
| getUserContributions | 1 | 12 | 2 | 0 contributions |
| getRefsByName | 1 | 50219 | 7 | 0 refs |
| loadWorkRequestBoard | 1 | 50219 | 6 | folded |
| getKnownProofTiers | 1 | 12 | 4 | 0 tiers |

Landed in that branch:

- `/api/events` accepts `topic1_in`, `topic2_in`, and `topic3_in` (at most 32 comma-separated topics).
- `getDonationActivityByRoot` starts from `NoteCreated` filtered by owner, walks descendant note ids, and loads only those notes' intents. It no longer calls `getAllProjects()`. Project rows come from `ProjectCreated` filtered by the receipt token. `ERC1155Purchased`, `RefundedIntoNote`, and `ReimbursementClaimedIntoNote` stay whole-event fetches because their note ids are not indexed. Standing pledges are still the whole registry, then filtered to this root.
- `NoteIntentAttested` now indexes `intendedStatementId` instead of `noteContract`. `getNoteIntentAggregate` and `getNoteIntentAttestationsByStatement` fetch that topic, then the notes those intents name (and their ancestors). `noteContract` is still in the event data. This needs a local reindex. Testnet redeploy is a separate TODO; do not do it in this step.

`fetchNoteIntentEvents(noteContract)` is gone. It downloaded every intent and filtered `noteContract` out of the event data. Callers that know a statement or note ids use `fetchNoteIntentsForStatement` and `fetchNoteIntentsForNoteIds`. `fetchAllNoteIntentEvents` remains for a true global fold.

Per-note and per-owner delegation reads (`getNote`, `getDelegationChain`, `getDelegationChainsForNotes`, `getNotesByOwner`, `getNotesByRoot`, `getNoteIntentAttestation`, `getNoteIntentAttestationsByNote`) now use the same topic filters as the donation page. Purchase, refund, and reimbursement events stay a whole-event download there, because those note ids are not indexed and the fold copies chains from them. `getPurchasedNoteEventsByTxHashes` stays global: the transaction hash is not indexed.

These inventory rows stay global on purpose. Steps 3–4 cover them:

- statement browse and `getAllStatements` (`DirectSupport`)
- implication source activity
- content-funding state
- standing pledges
- the project registry (`getAllProjects`) and `getUserContributions` (`ERC1155Bought` has no participant topic)
- `getRefsByName` and the work-request board (every `RefUpdated`)
- `getKnownProofTiers` (every `AccountAssertionSet`; a single account already filters topic1)

Prefer asking for less over caching more. Contracts and the events API can both change.

- **`getDonationActivityByRoot`** (MyNotesPage) must not fetch every note on the chain or fold every project to render one user's page. Instead, start from `NoteCreated` filtered by `owner` (topic2). Then walk descendants through the indexed parent/child ids on `NoteDelegated`, `ChainSplit`, and `NoteSplitSameChain` (read `foldDonationActivityByRoot` and `foldDelegationState` to learn which events matter). Fetch intents by `attester` (topic1) = the root. Fold only the projects the user's notes actually touched. If the descendant walk needs too many round-trips, add a list filter to `/api/events` (e.g. `topic1_in=a,b,c`, bounded length) rather than reverting to a global fetch.
- **`getNoteIntentAggregate`** filters by `intendedStatementId`. That field is now indexed in place of `noteContract` (`hardhat/contracts/delegation/NoteIntent.sol`). Fetch that statement's intents, then only those notes (by `noteId`). `noteContract` stays in the event data. Changing an event requires `npm run sync-abis` in `sdk/` and `indexer/`, updating the decoder in `sdk/src/utils/event-decoders/`, and wiping and reindexing locally.
- Look at each remaining inventory row and ask the same question. Totals the contracts already store (e.g. `totalReceived`) should come from chain view reads, multicall-batched, as [scalability.md](/specs/tech/scalability.md) recommends.
- Leave in place what is truly global (statement browsing by supporter count, implication-attester activity, the project registry). Steps 3–4 handle those.

### [x] 3. Immutable archive segments for finalized history

Done on `feature/event-archive-segments` (stacked on `feature/narrow-cold-start-queries`, which is not on `dev` yet).

Choices recorded here:

- Segment size is `EVENT_SEGMENT_BLOCKS` (default 50 000). Finality lag is `EVENT_SEGMENT_CONFIRMATIONS` (default 12), measured from the newest indexed block for that chain, not from an RPC head the API does not have.
- Only complete windows are segments. A window that is finalized but shorter than the segment size stays out, so a segment's bytes never change. The SDK tail therefore starts at `lastSegment.toBlock + 1`, which can be earlier than `finalizedThrough + 1`. The manifest still reports `finalizedThrough`.
- The segment body is a JSON array of tuples. `chainId` and `eventName` come from the path. `sha256` is of that uncompressed JSON. The response is gzipped when the client accepts it, and `Cache-Control` is `public, max-age=31536000, immutable`.
- The gateway returns origin cache headers as-is and stores a hit in the Worker cache only for `GET /indexer/api/event-segments/:chainId/:eventName/:fromBlock` when the origin says `immutable`. The manifest is not cached there.
- `fetchEventsComplete` uses the archive only for an `eventName` query with no contract or topic filter and `fromBlock === 0`. A missing manifest, an empty segment list, or a bad hash falls back to the block-range split. Results are sorted by `(blockNumber, logIndex)`.

Bench was not re-run. The local chain from step 2 has no 50 000-block window, so the archive path is empty and the numbers would match step 2. The comparison test is `event archive segments` in `sdk/src/utils/eventCacheClient.test.ts`.

This goes after the real bottleneck, the download, without adding any business logic or trust.

Design (adjust details if the code argues otherwise, and record what you chose here):

- **Segments are raw events, partitioned by `(chainId, eventName)` and by fixed block ranges.** Pick a size (e.g. 50 000 blocks) and make it a constant the manifest reports. Only *finalized* ranges become segments: `toBlock <= head - CONFIRMATIONS`, with a conservative, configurable `CONFIRMATIONS`. A segment's content then never changes.
- **Indexer routes** (in `indexer/src/api/index.ts`, generated lazily from the existing `events` table with no new tables):
  - `GET /api/event-segments/manifest?chainId=…&eventName=…` returns `{ segmentSize, finalizedThrough, segments: [{ fromBlock, toBlock, count, sha256 }] }`. Short cache lifetime.
  - `GET /api/event-segments/:chainId/:eventName/:fromBlock` returns that segment in a compact encoding (e.g. an array of tuples; leave out fields implied by the path). Compress it, and send `Cache-Control: public, max-age=31536000, immutable`. Empty segments can be omitted from the manifest.
  - Check that the Cloudflare gateway (`cloudflare-service-gateway/`) passes those cache headers through and actually caches `/indexer/api/event-segments/*`. If not, fix the gateway.
- **SDK**: inside `fetchEventsComplete`, when a query filters by `eventName` with no topic filters (the global case), read the manifest, fetch all segments in parallel, verify each against its `sha256`, then fetch the tail from `/api/events` with `blockNumber_gte = finalizedThrough + 1`. Topic-filtered or contract-filtered queries stay on `/api/events`, since they are entity-sized. Check that every caller gets the same results either way, sorted by `(blockNumber, logIndex)`. Add a test that compares the two paths.
- Trust model is unchanged: segments are the same raw logs the API serves, and anyone can check them against `eth_getLogs`.

### [ ] 4. A general resumable-fold primitive in the SDK

Started on `feature/resumable-folds`. Landed: `sdk/src/utils/resumableFold.ts` (`FoldStore`, `MemoryFoldStore`, `runResumableFold`, `foldStoreKey`), `readFinalizedThrough`, `machinery.foldStore`, and `createIndexedDbFoldStore`. `getProjectFold` uses the runner when `foldStore` is set. `getStandingPledges` always uses it (`STANDING_PLEDGES_FOLD_VERSION`). `fetchAndFoldContentFundingState` always uses it (`CONTENT_FUNDING_FOLD_VERSION`); the four content-funding folds accept a previous accumulator and ignore bare content-id keys when resuming. Statement browse (`browseStatements*`, `getAllStatements`) always uses it (`DIRECT_SUPPORT_BROWSE_FOLD_VERSION`). The stored state is the latest belief per user and statement, the earliest `(timestamp, block)` per statement, and the publisher list, so a resumed fold still sorts and enriches the same way. Implication source activity always uses it (`IMPLICATION_FOLD_VERSION`). The stored state is the active implication map. Finality is the earlier of the attestation and revocation manifests, because the fold reads both event names. `getProject` and `getAllProjects` always use it (`PROJECT_FOLD_VERSION`), including when the caller does not pass a store (the process default is used). `loadProjectWithCache` calls `getProject` and no longer keeps a second accumulator in `foldCache.ts`. The IndexedDB `FoldStore` on the UI machinery is the resume path. Still to move: delegation state and note intents. A true single-request project registry is still one fold per assurance contract, because those logs are keyed by contract address. Bench not re-run; a local chain shorter than the finality lag does not persist, so repeat-visit bytes do not change until history is finalized.

This makes repeat visits cost only the new events. The project accumulator in `foldCache.ts` is the special case to generalize.

- Add `sdk/src/utils/resumableFold.ts` (exported from the `utils` subpath) containing:
  - a `FoldStore` interface (`get(key)`, `put(key, record)`) with an in-memory default. The UI supplies an IndexedDB implementation; move `foldCache.ts` onto it. Workers can use IndexedDB too, which matters for step 5.
  - a fold definition `{ id, version, fetch(fromCursor), step(acc, events) → acc, serialize, deserialize }`, where the cursor is `(blockNumber, logIndex)`.
  - a runner that loads the stored record, discards it if `version` doesn't match, fetches events after the cursor, and drops events at or before the cursor (the API's `gte` re-sends the boundary block). It folds the **finalized** events into the persisted accumulator and saves it. It folds the unfinalized tail into a throwaway copy, so a reorg can never corrupt stored state. "Finalized" means the same thing as in step 3; reuse the manifest's `finalizedThrough` when available.
  - Store keys must include `chainId`, the event-cache URL, the relevant contract addresses, and the fold id/version, as `foldCache.ts` keys already do.
- Rework the global folds into incremental `step` form and move them onto the runner. Suggested order (biggest win first): delegation state and note intents, standing pledges, content-funding state, `DirectSupport` counts for browsing, implications, then the project registry. Each fold gets a `*_FOLD_VERSION` constant. The bump rules are in [README.md](./README.md#fold-versioning-and-upgrades).
- Move the lazy-giving project accumulator (`PROJECT_FOLD_VERSION`, `loadProjectWithCache`, `useCachedProject(s)`) onto the same primitive so there is one mechanism.
- Tests: resuming from a stored accumulator must give exactly the same result as a from-scratch fold, across a boundary block that has several events, and after a simulated reorg in the tail.

### [ ] 5. Run heavy folds off the main thread

- Precedent: `ui/src/shared/trust/subjectivTrustWorkerClient.ts`, which has a worker, a main-thread fallback, and progress messages.
- Run the step-4 runner (fetch, decode, fold, persist) for the global folds inside a worker. The machinery has to be rebuilt in the worker from serializable config, as the trust worker does. BigInts survive structured clone. Maps do too, but check the result types.
- Use step 0's measurements to choose what moves: anything that blocks the main thread noticeably on the stress-seeded stack. A tiny fold isn't worth the worker overhead.
- Browser-check that the affected pages still render and stay responsive. Use the `dev-browser` flow described in [commonality-ui/README.md](/commonality-ui/README.md#agent--browser-automation).

### Finishing each step

- `npm run integration-tests` (or `verifier-run automated.test-full-integration`) must pass, as [sdk/README.md](/sdk/README.md) requires.
- Re-run the step-0 bench and record the numbers under the step.
- Update the docs the step made stale: `sdk/README.md` (Key concepts), [README.md](./README.md), and [scalability.md](/specs/tech/scalability.md) (it still asks "have we implemented cursors yet").

## Ideas for later (not approved; do not build)

### A. Published fold snapshots for first visits

Steps 3–4 make a cold first visit cost "download all finalized history once, compressed and from a CDN". If that is still too slow, ship the **folded state** instead of the events. Anyone (the indexer operator, a cron job, a founder) runs the SDK's own fold and publishes a content-addressed snapshot of the accumulator at block B. It is keyed by `(chainId, foldId, foldVersion, filter, B)` and includes a hash of the exact event list it folded. A client loads the snapshot, folds the tail from B, and paints.

Why it doesn't give up the benefits:

- **It's a cache, not an authority.** After painting, a background worker refolds from the archive segments and compares. On a mismatch, it discards the snapshot, uses its own result, and reports the bad publisher. Clients that skip verification are making an explicit, opt-in tradeoff.
- **Fold logic stays SDK-owned.** A `foldVersion` bump just means no snapshot exists yet, so clients fall back to the step-4 path until someone publishes one.
- More than one publisher can serve the same key; content addressing makes them interchangeable.

Costs: accumulators need deterministic serialization (bigints, Maps, stable key order); someone has to run the publisher; there's a staleness policy for B to decide.

### B. Narrow server-side projections for true global rankings

"Statements sorted by supporter count" needs global knowledge, however it's cached. [scalability.md](/specs/tech/scalability.md) already names statement browsing as the strongest candidate if we ever add a server-side derived query. Keep it narrow and deterministic: a table derived mechanically from events and rebuildable from scratch, not a return to the ~20-table indexer ([redesign.md](./redesign.md)). Idea A may make this unnecessary, since a published snapshot of the `DirectSupport` count fold gives the same ranking without indexer logic.
