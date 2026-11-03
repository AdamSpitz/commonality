# Statement-set projections for verticals

Status: planned; current focus. Architecture agreed with Adam on 2026-11-03.

## Goal and deployment boundary

A vertical chooses a set of statements (for example, 100) and its UI efficiently
fetches their direct signer and indirect supporter counts without downloading all
their signature histories on every client.

**Projections run in a separate, vertical-specific service, outside the generic
indexer.** Provide reusable SDK machinery and a configurable service so each
vertical need not implement its own follower. The service follows the shared raw
event feed; it does not need its own Ponder deployment or blockchain backfill.

The generic indexer remains a content-blind raw-event cache. Its enhancements are
general-purpose filtering, pagination, database indexes, and sync watermarks. It
does not store vertical configurations or compute supporter counts.

Flow: chain → generic event indexer → vertical projection service → vertical UI.
Small verticals can continue computing in-browser. The projection is an optional,
rebuildable acceleration layer using the same SDK semantics, not a new authority
for what support means.

## What exists today

- `/api/events` supports indexed-topic filters, topic lists, and block ranges.
  Topic lists allow 32 values; SDK helpers already split larger sets into batches.
- Conceptspace queries fetch direct support by statement and incoming implication
  attestations/revocations by target statement. Counts are computed client-side.
- Indirect support fetches signatures on the implying statements, deduplicates
  supporters, excludes explicit target disbelievers, and checks source statement
  retraction status. Repeated per-target queries can duplicate substantial work.
- Complete retrieval currently splits block ranges around the 10,000-row cap.
  A single block with at least that many matching events cannot be completely
  fetched through that mechanism. Follower reads use log-index cursors instead.
- The events table indexes chain/contract/event and chain/block, but not statement
  topics. Filtering response bytes does not establish efficient database access.
- Resumable SDK folds and finalized event archives provide useful building blocks,
  but there is no packaged statement-set follower with dependency backfill.

Implementation references: [event API](../../../indexer/src/api/index.ts),
[event schema](../../../indexer/schemas/events.schema.ts),
[SDK event client](../../../sdk/src/utils/eventCacheClient.ts),
[support computation](../../../sdk/src/subsystems/conceptspace/queries/indirect-support.ts),
and [resumable folds](../../../sdk/src/utils/resumableFold.ts).

## Counting contract

Use the existing SDK's belief-state, implication, identity, and retraction rules.
Extract shared pure computation as needed so browser and service cannot silently
diverge. Pin chain, admitted contract deployments, trusted attesters, relevant
policy configuration, and fold version in the projection identity.

Expose an explicitly disjoint breakdown:

- Direct signers: latest belief on the target is `believes`.
- Indirect-only supporters: supported through an accepted incoming implication,
  excluding direct signers and explicit target disbelievers.
- Total supporters: deduplicated union of direct and indirect support.

The current SDK's indirect set can overlap its direct set; do not add those raw
counts together. A signer signed the exact statement; indirect support is not an
additional signature. Counts use the SDK's identity convention and must not be
presented as verified unique humans without the corresponding identity evidence.

Preserve current implication semantics: explicitly attested incoming edges, not
arbitrary recursive transitive inference. Resolve any discrepancies between SDK
comments and executable behavior with parity tests before changing semantics.

## Scope and dependencies

The displayed statement set and the required event set differ. If A implies B,
and B is displayed, signatures on A affect B even when A is outside the vertical's
chosen set. A small target set does not guarantee a small dependency set.

Maintain a dependency map from accepted source statements to affected targets.
Follow target beliefs, incoming implication additions/revocations, source beliefs,
and publication lifecycle events needed for the existing retraction semantics.
Keep dependencies shared across targets rather than fetching and folding them
once per target. Multiple attesters and multiple supporting sources must not
double-count a supporter or remove support while another accepted source remains.

When a new edge introduces a source, backfill that source's history through the
same checkpoint before publishing updated target counts. Following only events
after the new edge would miss existing signatures. Removing an edge must update
affected targets; discard source state only when no remaining target needs it.
Changes to target set, trust policy, deployments, or fold version require explicit
reconciliation or rebuilding under a new configuration identity.

## Implementation sequence

### 1. Make the raw feed dependable for followers

Started: `GET /api/events?follow=1` pages forward by block and log index, binds `after` to filter scope plus a frozen `checkpoint`, and reports `truncated` / `completeThroughCheckpoint`. A full legacy page now also sets `truncated`. `GET /api/sync` reads Ponder's committed checkpoint (`indexedThrough`, `finalizedThrough`, raw checkpoint strings, `ready`). Follow mode uses `indexedThrough` as the default freeze point only when `chainId` is set and `ready` is true, so quiet blocks advance after backfill. `fetchEventsComplete` walks that cursor, including inside one block; responses that omit follow fields still use block-range splitting, which cannot finish a single block at the 10,000 cap. Composite topic indexes are on `events` (`chainId` + `topic1`/`topic2`/`topic3` + `blockNumber` + `logIndex`). They match statement-scoped and publisher-scoped filters ordered for followers. Adding them does not require a `DATABASE_SCHEMA` bump under `PONDER_EXPERIMENTAL_DB=platform`; the first hosted start builds them while holding the schema lock. Archive segments still derive finality from the newest stored event, because empty finalized windows are omitted and clients would skip them.

- Add bounded cursor pagination in deterministic chain order, including the
  ability to page within a block. Bind cursors to query scope and a fixed upper
  checkpoint so concurrent ingestion cannot create gaps or inconsistent pages.
- Expose a cheap per-chain indexed-through and finalized-through watermark.
  Derive progress from indexing completion, not just the newest matching event;
  quiet statements and event-free blocks must still advance safely. Include
  enough chain/checkpoint identity to detect resets or invalidated checkpoints.
- Retain statement-topic lists, chain/contract scoping, and existing API behavior
  for compatibility. Add a follower-oriented SDK iterator with durable cursors.
- Composite indexes for topic-filtered follower order are in the schema.
  Assessed against Ponder 0.15: index-only schema edits change `build_id` but
  platform mode keeps the existing tables and runs `CREATE INDEX` (not
  `CONCURRENTLY`) on startup. Do not bump `DATABASE_SCHEMA` for indexes.
- Make truncated/partial results explicit. No follower may silently treat a full
  bounded page as the complete history.

### 2. Build the reusable statement-set computation and follower

- Separate fetching from shared SDK support computation where necessary.
- Bootstrap targets, implications, and their source histories at one finalized
  checkpoint. Persist required belief/edge state and dependency relationships.
- Follow filtered deltas, backfill new dependencies, and update only affected
  targets. Persist state and progress atomically; replay must be idempotent.
- Start with finalized counts for a simpler reliable baseline. Treat an optional
  unfinalized preview as later work with explicit rollback/replay behavior.
- Detect upstream resets or checkpoint invalidation and rebuild or roll back;
  never continue displaying invalid state as current. Make configuration changes
  and fold-version changes similarly explicit.

### 3. Package a separate vertical service and integrate a UI

- Supply configuration for upstream feed, chain/deployments, target statements,
  trusted attesters, and applicable policy. Keep storage owned by this service.
- Provide a batched count read for configured targets, with a shared `asOfBlock`,
  configuration identity, fold version, finality status, and sync status.
  Exact route/type names are implementation decisions, not frozen by this plan.
- Distinguish valid zero counts from not-yet-ready, stale, or failed projections.
  During backfill, retain a clearly dated complete snapshot or report unavailable;
  do not publish a mixture of old and partially updated counts as one checkpoint.
- Document startup, persistence, recovery, and independent reconstruction with
  the SDK. UI consumption should return roughly one count record per target,
  rather than signer histories. A count response alone is not a proof; retain
  the ability to recompute from the raw feed.

## Acceptance and validation

Use a 100-target fixture with shared sources and unrelated activity. Compare the
projection to SDK reconstruction at the same checkpoint and configuration.

Cover belief changes (`believes`, `disbelieves`, `no opinion`), overlapping direct
and indirect support, duplicate sources/attesters, implication revocation,
publication retraction/reactivation where supported, new edges to sources with
old signatures, and target/trust configuration changes. Test restart/replay,
interrupted backfill, atomic checkpoint persistence, upstream reset/reorg recovery,
and pagination across boundaries including more than 10,000 matches in one block.

Measure database query plans, bootstrap bytes/time, steady-state feed bytes,
projection memory/storage, update latency, and batched UI response size/latency.
Verify that unrelated statements' signature histories are not downloaded and that
shared dependencies are processed once. Record dataset sizes and measured limits;
do not claim scalability merely because the target set has 100 entries.

## Scope and effort

No contract changes are expected. Raw-feed improvements are relatively small;
the reliable service is moderate work, with most complexity in dependency
changes, deduplication, backfills, and checkpoint correctness. This is a planning
assessment, not a delivery estimate or benchmark result.

Funding totals, arbitrary graph inference, multi-statement union/intersection
views, and hosting projections inside the generic indexer are outside this first
implementation. Counts alone cannot answer union/intersection questions across
targets; add that separately if a real vertical needs it.

This extends the [shared-feed topology](./shared-feed-topology.md): verticals may
optionally operate a derived read service while the shared origin stays raw.
Reconcile that document's server-side fold guidance when implementing, preserving
its requirement that the same answer remain independently reconstructible with
SDK logic.
