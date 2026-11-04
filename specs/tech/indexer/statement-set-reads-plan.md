# Browser-first statement-set reads

Status: current direction, agreed with Adam on 2026-11-03. Replaces the earlier
plan for a separate vertical-specific counts service.

## Decision and rationale

Preserve the thin raw-event cache and static-site vertical model. Improve how
the SDK retrieves, reuses, and processes evidence before introducing an operated
service that publishes derived counts. A founder should normally need a static
UI and configuration, not another stateful service.

The working hypothesis is that most individual objects have manageable event
histories. Indirect support can be more expensive because a target depends on
many source statements. That calls first for shared fetching, persistent browser
state, and bounded progressive evaluation—not an assumption that every vertical
needs server-computed counts. Measure the hypothesis rather than claiming it is
already established.

This follows [ADR 0006](../../decisions/0006-shared-pointer-index.md) and the
[shared-feed topology](./shared-feed-topology.md). Client-side derived state is
fine; the boundary is that the shared feed serves raw evidence and the SDK
applies the viewer's configured interpretation.

## What we kept and removed

The branch was returned to `ea99696c` (Index statement topics for follower-ordered
event reads), retaining:

- Query-bound cursor pagination, including pagination within a block.
- Indexed-through and finalized-through watermarks that advance on quiet blocks.
- SDK complete-history reads using follower cursors, with legacy fallback.
- Composite statement-topic indexes for filtered, ordered reads.

The subsequent counts computation and projection-service commits (`24eb08a6`,
`9ff8b6dc`) were removed from this branch. Their implementation is not a dependency
of this plan. No product screen had been integrated with that service.

Existing building blocks include immutable raw-event archives partitioned by
event name and block window, SDK resumable folds, and a browser IndexedDB fold
store. Those facilities are not yet a complete statement-set reader.

## Intended behavior

A vertical supplies its chosen statements and trust/display policy. The SDK
retrieves direct beliefs and accepted incoming implications, shares source
histories across targets, and computes support locally.

For ordinary workloads, return exact results at a common completed checkpoint.
On repeat visits, reuse persisted state and fetch only subsequent events. Quiet
statements and statements with no events must advance to the scanned checkpoint;
a valid zero is not an unavailable result.

For expensive indirect queries, permit a bounded amount of work and expose
completeness explicitly. Exact direct counts can appear before indirect work
finishes. A screen may continue in the background or offer a request for more
complete results. Do not silently present partial totals as exact.

## Counting semantics

Preserve existing executable SDK semantics, with parity tests before changing
them:

- Direct signers have a latest target belief of `believes`.
- Indirect support uses accepted explicit incoming implications, one hop only.
- Explicit target disbelievers are excluded from indirect support.
- Apply source retraction and applicable policy rules, including when a source
  is also a displayed target.
- Deduplicate supporters across sources and direct support. If exposing a
  breakdown, use direct signers, indirect-only supporters, and their union.
- Use the SDK's identity convention; counts are not automatically unique humans.

If a new implication introduces source A, retrieve A's earlier beliefs before
including it. Changes of belief, revocations, and retractions can reduce support.
Never treat a partially read source history as its current belief state.

## Implementation sequence

### 1. Establish an exact browser baseline

Started: `readStatementSet` batches incoming-implication and direct-support
queries for a chosen set, fetches each source statement once, and freezes every
page at the chain's finalized checkpoint. Counts are exact direct signers,
indirect-only supporters, and their union. A not-ready indexer returns
`not-ready` rather than zeros. Completed scans are stored per statement in the
machinery fold store: the position is the block fully scanned through, not the
last matching event. A higher finalized head fetches `blockNumber_gte` of that
position plus one. Policy is applied at read time, so a trust-config change does
not require a new event scan. A lower head, or the same head with a different
checkpoint, discards the scan. A failed refresh keeps a previous complete scan
as `stale` instead of presenting it as exact. Positions for a read advance
together: a refresh that fails after fetching one event family does not persist
that family ahead of the others.

Persist reusable per-statement state and completed scan positions in the browser.
Fetch deltas on subsequent reads; do not download full histories and filter them
locally. Scope stored state by chain, deployments, upstream identity, and fold
version, and include policy identity wherever cached results depend on policy.
`GET /api/sync` now returns Ponder's `build_id` as `upstreamId`. Statement-set
scan keys include that id plus both statement-contract addresses, so a rebuilt
indexer or a deployment change is not resumed as a delta. A failed refresh
still requires the previous scan to have recorded source retraction, which is how configuration changes and upstream invalidation stay explicit.

Separate a completed scan position from the last matching event. Distinguish
not loaded, complete zero, partial, stale, and failed results. Keep a previously
complete snapshot clearly dated when refreshing fails.

### 2. Measure and improve raw-event organization

Measure cold and warm browser loads before adding new storage formats. Current
topic indexes and batching may be sufficient.

If delivery is still expensive, investigate immutable finalized raw-event chunks
partitioned by statement and block window, with a small mutable tail. The same
chunks should be reusable across viewers and vertical policies through ordinary
caching. Preserve event order, deployment scoping, completeness, and checkpoint
identity. Compare partition overhead and cache reuse against existing archives.

These are alternate organizations of raw logs, not tables of supporter counts.
Do not implement a new archive layout without evidence that it improves the
relevant workload.

### 3. Add budgeted indirect evaluation if needed

Limit time, bytes, or source work for a read. Reuse already-complete source state
first; schedule additional sources using locally known size, activity, or prior
contribution as hints. Reserve effort for unexplored sources and periodically
revisit skipped sources so the same known set does not monopolize discovery.

Adam's top-N known-biggest sources proposal is a fetching heuristic, not a
guarantee of approximation accuracy. Large sources may overlap heavily; many
small sources may contribute more distinct supporters. Discovering source size
also costs work. No new server ranking/count service is assumed.

The union of a subset of fully processed sources can provide a lower bound only
when target beliefs, accepted edges, retractions, and policy are complete and
consistent at the same checkpoint. In that case expose “at least N,” not an
unsupported “approximately N.” If those prerequisites are incomplete, report
partial/unavailable status without asserting a lower bound.

Record which sources are complete and whether all accepted sources were
enumerated. A fraction of sources inspected is not a percentage of supporters
covered. Refreshes can lower counts; monotonicity applies only while adding
complete sources at a fixed checkpoint and policy.

Choose presentation per screen. In particular, ranking statements by unevenly
complete lower bounds can bias ordering; do not silently use partial counts as
an exact popularity ranking. Statistical estimation with an error bound is a
separate design, not part of this first implementation.

## Validation and decision gate

Use representative statement sets (including a 100-target fixture) with shared
sources, unrelated activity, overlapping supporters, and a large indirect fan-in.
Include an unusually popular individual statement to test the bounded-history
hypothesis rather than assuming every direct history stays small.

Verify parity with independent exact SDK reconstruction at the same checkpoint.
Cover belief changes, direct/indirect overlap, duplicate sources and attesters,
revocations, retractions, old signatures behind new edges, empty histories,
quiet blocks, policy changes, restarts, interrupted reads, upstream resets, and
pagination exceeding 10,000 matching events in one block.

Measure cold-load and repeat-load bytes/time, browser memory and storage, request
counts, database query plans, cache reuse, and latency to first useful and exact
results. Verify shared dependencies are fetched once per read and warm reads
fetch deltas. Test adversarial source overlap and long tails for progressive
evaluation; measure the gap against the exact answer without claiming an error
bound from a favorable fixture.

Only reconsider a narrowly scoped derived-data service if these measurements
show a product requirement that raw-event organization, local persistence, and
acceptable progressive results cannot meet. Exact first-visit counts for a huge
history remain a possible hard case: organizing logs does not remove the need
to process them. Global popularity discovery is also a separate workload from
reading a chosen set of statements.

No counts service, contract changes, global ranking system, or arbitrary
transitive inference is required by this plan.
