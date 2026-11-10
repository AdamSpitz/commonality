# Replace Ponder with a raw-log sync loop

Status: **reasonable direction; implementation and cutover gates below are not yet satisfied.** Reviewed against the current code on 2026-11-09. This note does not authorize a switch of the testnet RPC to `https://sepolia.base.org`.

**Decision (Adam, 2026-11-09): clean break, no backward compatibility.** We are pre-mainnet and testnet has little real use. The new indexer starts in a **fresh `DATABASE_SCHEMA`** with its own tables and replays from each source's start block using range `eth_getLogs` (not Ponder's block-by-block path). Do not adopt Ponder's tables, metadata, or checkpoints. Do not keep Ponder-compatible checkpoint strings, `/graphql`, or `/sql`; update every caller in the same change. Client-side caches (SDK folds, followers, saved segments) are invalidated once at cutover via a new `upstreamId`. Rollback means redeploying Ponder against its old schema. The Ponder-era "never bump `DATABASE_SCHEMA`" rules in `workflow/deployment.md` and `indexer/README.md` still apply to Ponder until cutover, and to the new schema afterwards. Before the replay, estimate its request count (windows × sources from each start block) and confirm it is small against the Alchemy cap.

## Assessment

Replacing Ponder is reasonable here because the application uses raw logs rather than its projection framework. But this is a small indexing engine, not just a polling loop: we take ownership of source coverage, canonical-chain reconciliation, crash recovery, and database adoption. Proceed only if a bounded prototype demonstrates both API parity and lower measured RPC cost. A store adapter is useful during that work; removing Ponder is the end state, not the first step.

Related: [indexer architecture](./README.md), [the Graph (deferred)](./the-graph.md), [continuity: 200ms blocks](../../../continuity/2026-11-09-alchemy-cap-base-sepolia-200ms-blocks.md), live ops notes in [`indexer/README.md`](../../../indexer/README.md).

A bounded experimental implementation now exists: [prototype usage and measured local results](../../../indexer/src/prototype/README.md). `--serve` exposes the same REST routes (and a `_meta`-only GraphQL stub) so a client can point at either process. It is not a production replacement; adoption and deployment gates below remain outstanding.

## Why

The indexer is already a thin event cache. One `events` table, raw logs, client-side folding in the SDK. Ponder is only the sync engine, the schema wrapper, and the database handle behind the REST routes.

That engine is the wrong shape for this chain. Ponder 0.15 realtime sync fills every missed block with `eth_getBlockByNumber(n, true)` and calls `eth_getLogs` only when the bloom matches. Base Sepolia switched from 2s blocks to 200ms blocks at block 48953176 (2026-10-22). Caught-up indexer cost then tracks block rate, about 10x, against a fixed Alchemy monthly cap. The existing idle-head cache only skips repeat `latest` polls. The 10k `eth_getLogs` window only cheapens historical catch-up. There is no Ponder setting that turns the per-block fetch off.

A replacement that polls `latest` and requests logs for ranges should substantially reduce empty-block work. The installed Ponder realtime code confirms the per-block fetch path. The exact Sepolia activation point above comes from the linked operational investigation; [Base's Denim announcement](https://www.base.org/blog/denim) independently describes native 200ms canonical blocks and distinguishes them from the older Flashblocks previews.

Do not promise orders-of-magnitude CU savings without measuring. Log queries, source shards, timestamp lookups, finality checks, and retries all cost RPC capacity. Measure quiet and busy workloads against the current baseline, including idle mode. Removing per-block work is the goal; historical backfill speed, GraphQL, and a nicer handler API are not.

## What was rejected

- **Envio, Subsquid, The Graph, Goldsky.** Deferred for this change: another indexing platform would need its own compatibility and cost evaluation. This note does not establish that those tools cannot solve the problem. The Graph remains the deferred option in [the-graph.md](./the-graph.md) for independent operators.
- **A small third-party TypeScript indexer** (OpenIndex and similar). Same shape as the loop below, without our factory, deployment-manifest, and confirmation rules. Not worth the dependency.
- **Extracting a store port and keeping Ponder.** Useful only as a stepping stone inside this change. Do not ship the seam by itself.
- **Periodic historical-only sync that trails by minutes, or a second RPC just for per-block fetches.** Both were options while staying on Ponder. Neither is needed once the realtime loop is gone. Do not point history at the pruned public Base Sepolia endpoint.

HyperSync, or any other bulk historical source, is out of scope. Add one later only if a schema rebuild or a new chain makes catch-up itself the cost.

## What stays

- Client-side folding. No derived tables, no aggregation, no IPFS, no content bytes.
- The `events` row shape: `id`, `chainId`, `contractAddress`, `eventName`, `blockNumber`, `blockTimestamp`, `transactionHash`, `logIndex`, `topic0`–`topic3`, `data`. `id` is `chainId + txHash + logIndex`. Inserts are idempotent on that key.
- REST behavior documented in [`indexer/README.md`](../../../indexer/README.md): `/api/events` (filters, `follow`, cursors, `checkpoint`), `/api/event-segments/...`, `/api/published-data/...`, `/api/project-read-demand`, `/api/sync`, `POST /api/indexer-wake`.
- A stable `DATABASE_SCHEMA` after cutover. The cutover itself mints one new schema (e.g. `commonality_base_sepolia_v7`, with `INDEXER_ALLOW_SCHEMA_BUMP=1`); the new code owns its table DDL there. The `events` row shape above is kept because the REST API and SDK consume it, not because of the old table.
- Contract set, ABIs, start blocks, and `INDEXER_DEPLOYMENT_MANIFEST`, including the conceptspace-only mode that omits funding contracts.
- RPC budget behavior in `indexer/start.sh`: on Alchemy monthly capacity, park and back off. Do not crash-loop. Do not change the archive RPC.

## Sync loop

One chain per process, as today. New metadata tables in the same schema hold committed and durable block numbers **and hashes**, cache identity, source coverage, and discovered children. Advance coverage in the same transaction as the corresponding event writes. Acquire a database-backed singleton writer lock before adoption or syncing; retain Render's stop-before-start setup. Check RPC chain ID against configuration before writing.

**Catch-up.** `eth_getLogs` from the cursor to a capped head, in windows. Start from the existing `PONDER_ETH_GET_LOGS_BLOCK_RANGE` (10_000 on Render). If the provider rejects the range or the body, split and retry, and log the one-shot hint that already exists for that failure. Filter by the addresses and topic0s we care about. Never scan the chain by fetching every block.

**Live.** On an interval (`PONDER_POLL_INTERVAL_MS`, default 4s on hosted chains; hardhat stays fast), obtain a numbered, hashed head and fetch the gap plus any tip overlap required below. This may take several queries for source shards or newly discovered children. Preserve idle scheduling via `INDEXER_IDLE_HEAD_INTERVAL_MS`: skip the whole sync cycle while idle instead of repeatedly querying logs against a cached head. A REST application-data read or `POST /api/indexer-wake` opens the fast window. Health checks must not.

**RPC completeness.** Use explicit numeric range bounds and an explicit address allowlist. Never turn an empty address set into an unrestricted query. Split address/topic batches as well as block ranges when needed. Distinguish range/size errors from transient 429s and monthly exhaustion; use bounded concurrency and jittered backoff. A single-block response that still exceeds limits must split filters or stop visibly, never skip that block. A successful response is trusted to be complete under the provider's documented limits; silently truncated responses cannot be made safe by idempotency.

**Row parity.** Derive event names from the configured address/ABI and registered event set, not a global topic-to-name guess. Preserve lowercase addresses, ID delimiters, and timestamp units from `captureRawEvent`. Validate logs against the requested source and range. If the provider supplies verified block timestamps in logs, use them; otherwise fetch a header with transactions disabled once per distinct event-bearing block, cached by block hash. Do not fetch transaction bodies just to get their hashes. The [execution API log schema](https://ethereum.github.io/execution-apis/api/methods/eth_getLogs/) includes `blockTimestamp`, but verify actual provider support before relying on it.

**Ordering.** Commit a window only when every log in it is inserted. Do not advance the cursor past a hole.

## Factory contracts

This is the only indexing feature that is not "filter logs for a fixed address list."

Use the actual `factory(...)` declarations in `indexer/src/indexing/fundingContracts.ts` as the inventory: AssuranceContractFactory, FixedControllerFactory, ERC1155Factory, CreatorAssuranceContractFactory, and both creation/materialization paths of ProspectiveContentRoundFactory. ProjectFactory emits registry events but currently has no Ponder child-source declaration; do not invent one as part of parity. On each committed window:

1. Read factory logs in that window.
2. Register each child address.
3. Backfill that address from its creation block through the window end before advancing the global cursor past the window.

A child created inside the window must not miss constructor logs, including logs earlier than its factory announcement in the same transaction. Scan the entire creation block. Re-fetching after a crash is allowed; duplicate stored rows are not. Commit child registration, child coverage, events, and the global cursor atomically. Record creation block hash and provenance so orphaned children disappear on a reorg. Re-deriving children from stored factory events on startup is acceptable if complete and tested.

## Source changes

A single global cursor is insufficient when deployments are added later. Persist source identity (chain, address, ABI/event selection, start block, factory rule) and coverage. Backfill a new source from its own start block before advertising complete coverage; never rewind every existing source. Changed start blocks or event selections require an explicit coverage plan. Removed sources retain their cached rows under today's behavior.

Adding historical rows can change already-published immutable segment bytes and invalidate saved SDK folds. Before allowing such a change after cutover, define cache invalidation: either prove it cannot affect published ranges, or bump `upstreamId` and version segment URLs, updating consumers together. Do not silently change bytes at an immutable URL. The cutover itself is covered by its one-time `upstreamId` change; the full policy for later deployment additions can come after it, but consumers must honor `upstreamId` from day one.

Conceptspace mode does not register funding factories. Do not register a handler for a contract the selected config omitted; Ponder used to refuse to start in that case, and the new loop must simply not watch those addresses.

## Reorgs

Do not build Ponder's checkpoint graph, but do define a complete reconciliation algorithm.

**Finality policy is a deployment gate.** Twelve blocks is only 2.4 seconds at 200ms/block, not consensus finality. Prefer the RPC `finalized` block for durable SDK folds and immutable segments on hosted chains. Base explicitly distinguishes inclusion, safety, and finality in the Denim reference above. A configurable depth is acceptable for local development or an explicitly chosen weaker testnet policy; never silently fall back when a finality tag fails. Preserve fresh UI reads via the provisional tip. Measure the resulting tip size and replay cost before choosing the algorithm.

The simplest correct first implementation re-reads the whole provisional interval `(durable, head]`, replacing that interval atomically, including child registrations. Validate the stored durable hash before proceeding; pin the head and range-boundary hashes before fetching and recheck them afterward, rejecting results when the chain changes during collection. Validate returned log block hashes against fetched headers where available. This assumes a coherent, trusted RPC, not cryptographic proof of log completeness.

Checking only the oldest tip block is **insufficient**: a reorg can fork after that block. If replaying the whole provisional interval is too expensive, use an explicit common-ancestor algorithm with persisted hashes and bounded rollback instead; specify and test it before deployment. Do not silently substitute an oldest-block check to meet the cost target.

Promote only fully covered, validated blocks into the durable prefix. A mismatch at the durable anchor is an operational incident: stop advancing, report unhealthy readiness, and stop serving potentially invalid immutable responses. Missing headers or a lagging provider are retryable failures, not permission to delete history. Recovery from a durable-history change needs a new cache epoch and segment namespace, not just an error log.

`/api/sync` must keep these meanings:

- `indexedThrough` advances on quiet blocks. It is the committed head, not the newest matching event.
- `finalizedThrough` is the fully covered durable cursor under the selected finality policy; it is never ahead of `indexedThrough`.
- `ready` is false until historical backfill has committed. Followers must not freeze a checkpoint while `ready` is false. The first cursor write happens before backfill finishes; that is not readiness.
- `upstreamId` is a persisted cache epoch, stable across ordinary code deploys; change it for a rebuild or a historical coverage correction that invalidates consumers. Audit SDK fold stores as well as followers to ensure they actually honor that invalidation.
- Checkpoints use the new format only (no Ponder 75-digit encoding). Remove `blockFromPonderCheckpoint` and update its callers in the same change; a regressing cursor must still be detectable.

## API compatibility

Keep the Hono routes and their tests. Point them at SQL you own instead of `ponder:api`.

Segment eligibility must use the committed durable watermark, not `max(events.blockNumber) - confirmations` (the current routes do the latter), nor latest RPC head. Quiet blocks still complete windows. Serve rows and watermarks from a consistent database snapshot. Numeric follower checkpoints alone cannot identify a replaced tip: either bind pagination to a tip revision and reject stale cursors, updating callers, or explicitly ensure consumers discard and re-fetch provisional pages rather than persist mixed-fork results.

Do not reimplement GraphQL or `/sql`. Render's health check, `pausedHealthServer.mjs`, the nginx upstream probe, the local UI gateway's `/sql/` forward, the `_meta` liveness probe, and a few verifier probes still hit Ponder routes. Grep for all of them, move them to a small `/health` (and `/status` or `/api/sync` for block height), and delete the Ponder routes in the same change. Update `render.yaml`, `render.yaml.template`, `verifier/environments/testnet.json`, and the deployment docs too. Application data access remains `GET /api/events`.

Drop the idle-head rule that treats `/graphql` as a reader wake once health checks no longer use it. A health check must not open the fast-poll window.

## RPC and process

- One archive RPC, the existing `PONDER_RPC_URL_*`. No second provider for block bodies.
- Header reads with transactions disabled are allowed for head/finality/anchor validation and event timestamps. No block-by-block walk of quiet history. Count these reads in the cost benchmark.
- Keep monthly-capacity parking in `start.sh`. The stub it serves moves from "Ponder's `/graphql`" to the new health route.
- Local dev stays a single process with the REST API. Hardhat polling stays tight enough for tests. No Ponder dev UI, codegen, or Vite watch in production start.
- `ponder` leaves `package.json` when nothing imports it. Delete `ponder.config.ts`, the conceptspace Ponder config, and `ponder:schema` imports. Keep the contract-capability and deployment-manifest code; it is not Ponder-specific.

## Tests the implementer must add

- A window commit is atomic: crash between insert and cursor advance does not duplicate or skip. Restart resumes from the cursor.
- A provider range rejection splits the window and continues.
- A factory child created at block N is backfilled from N before the cursor passes N, including across a restart.
- Conceptspace mode does not watch funding factories and does not serve project-read-demand.
- A reorg after an unchanged oldest tip block, a same-height replacement, and a reorg during RPC collection all remove orphaned rows and children without changing a served durable segment.
- A deep reorg stops the loop instead of rewriting durable rows.
- Caught-up quiet sync cost scales with poll count and filter batches, not every elapsed block. Measure tip replay and event-block timestamp costs separately; idle cycles perform no repeated log work.
- Source additions backfill only missing coverage; constructor logs and all six current child-source rules are covered.
- Missing timestamps, a one-block size rejection, rate limits, monthly exhaustion, wrong chain ID, and a competing writer fail without advancing coverage.
- Quiet-block segment publication, restart readiness, stale pagination, and cache-epoch invalidation work with the SDK.
- Existing cursor, segment, and published-data tests still pass against the new store.

## Out of scope

- The two Render workers suspended for `ETHEREUM_RPC_URL` vs `RPC_URL`, and the ops-pager `/status` 404. Those are separate from this replacement.
- Raising the Alchemy cap. Adam may still need to do that before the new loop is deployed, so the current Ponder process does not sit parked through the cutover.
- A projected-spend probe. Worth doing, but not part of the sync loop.
- Multi-chain in one process, websocket subscriptions, a derived schema, or a CDN change for segments.

## Cutover

Clean break (see the decision at the top). No adoption of Ponder's database.

0. **Budget freeze (in effect).** The Alchemy monthly cap is exhausted and Adam will not raise it until nothing can burn new credits on arrival. The Ponder service (`srv-d8ctfd6k1jcs73a71d2g`) was **suspended on Render on 2026-11-09**; do not resume it. Other services on the same key are low-rate block-range pollers, but check them before raising the cap.
1. **Cut per-poll cost, by arithmetic and test, not live measurement.** Cost is now `polls × calls per poll × CU weight`, which can be computed from code. Alchemy weights ([table](https://www.alchemy.com/docs/reference/compute-unit-costs), checked 2026-11-09): `eth_getBlockByNumber` 20 CU, `eth_getLogs` 60 CU. Ponder's caught-up cost was ~5 blocks/s × 20 CU ≈ 100 CU/s ≈ 260M CU/month. The prototype as written makes ~8 header reads + 2 log queries per poll (≈ 280 CU), i.e. ≈ 70 CU/s at a 4s poll — **only ~30% cheaper**. Before deploying:
   - Trim a steady-state poll to about `latest` + `finalized` headers + one combined `eth_getLogs` (≈ 100 CU), validating hashes from the log `blockHash`s and those two headers instead of re-reading anchor/durable/head. `eth_chainId` once at startup. Extra calls only when logs or children appear.
   - Raise the hosted poll interval (e.g. 12s) and keep idle mode, which now actually saves money (a wake costs one range query, not a block walk). A 12s quiet poll is 216,000 polls × 100 CU = **21.6M CU per 30-day month** before idle, not 7.2M.
   - Add a test that asserts the call count per quiet poll using the RPC meter, so regressions show up in CI.
   - Target: well under 30M CU/month caught-up, before idle savings.
   - Done in the prototype (2026-11-09): steady poll passes the two headers in and skips chain id, anchor re-read, and the closing re-read. One combined log query unless new children appear. Non-Hardhat local default interval is 12s. CI asserts the quiet follow-up call count. Not deployed.
   An optional sanity run against the public `https://sepolia.base.org` for **recent blocks only** with `--max-requests` is allowed (call counts only; never history, never production). Do not spend Alchemy credits to measure.
2. **Spending guard.** The new indexer enforces its own hourly and daily request/CU budgets and parks (like monthly-capacity parking) when exceeded, so a bug or retry storm cannot drain a freshly raised cap. Done in the prototype: sliding windows, default 100k CU/hour and 1M CU/day (about a month of the 30M target), off for Hardhat unless `INDEXER_SPEND_GUARD=1`. While parked, `/status` reports `parked` and `/api/sync` is not ready. The process keeps serving the last snapshot. Not deployed.
3. **Replay estimate.** Before raising the cap, compute the replay cost: windows from the earliest source start (10k-block windows) × address batches × 60 CU, plus one header read per event-bearing block (event count via a read-only query of the old Ponder schema). `npm run prototype --workspace=indexer -- --estimate --head N --event-blocks N` prints that arithmetic and does not call RPC. It excludes factory-child backfill and retries. Raise the cap to replay + a couple of months at the computed rate, with margin. Catalog arithmetic, 2026-11-10, no Alchemy: the Render `INDEXER_DEPLOYMENT_MANIFEST` has 24 base-sepolia sources, earliest start `42768673`. Public `eth_blockNumber` on `https://sepolia.base.org` was `57053503` (one recent-head call, not a history scan). That is 1,429 windows × 1 address batch × 60 CU = **85,740 CU** of `eth_getLogs`, plus 20 CU per event-bearing block. Read-only query of hosted `commonality_base_sepolia_v6.events` on 2026-11-10, no Alchemy: **9,546 events in 3,481 distinct blocks** (blocks 43884565–54456639). Header term = 3,481 × 20 = **69,620 CU**. Ponder's checkpoint had already advanced to about block 55,979,901 with no later events in that schema, so the indexed quiet tail adds no header reads. Replay total for that head is about **155k CU**, plus one extra `eth_getLogs` batch per window that discovers children (bounded by address batches of children born in that window, not a second full-history scan per child). At Alchemy's published ~$0.45–$0.525 per million CU, that replay is well under $1. Caught-up 12s polling is 21.6M CU/month before idle, about $11/month, and the same key still serves the live low-rate workers. Adam raised this month's cap from $60 to $70 on 2026-11-10 ($50 was already used in the first 8 days, so about $20 remains). That covers the replay and the rest of this month. A later $20–30 cap is the target only if the old per-block loop stays off. Do not resume the service until Adam says to turn it on.
4. **Postgres store.** Replace the snapshot file with a fresh schema the new code owns: `events`, sync state (durable and head block numbers and hashes, `upstreamId`, source coverage), and discovered children. Window commits are transactional; the singleton writer uses a Postgres advisory lock. Keep the reorg, crash, and factory tests passing against it. Started: `indexer/src/prototype/postgres.ts` owns a separate schema (not Ponder's), commits only the provisional tail in one transaction, and takes a session advisory lock. Opt-in via `INDEXER_PROTOTYPE_DATABASE_URL` (schema `INDEXER_PROTOTYPE_SCHEMA`, default `raw_log`). Not the local or hosted default. A live Postgres 16 run (`postgres.live.test.ts`, skipped unless `INDEXER_PROTOTYPE_TEST_DATABASE_URL` is set) kept durable rows after SIGKILL of an open uncommitted transaction, dropped a provisional child on the next commit, refused a regressed durable anchor, and blocked a second writer on the advisory lock. Source admission is in the sync loop: a new address backfills from its start; a changed start or event set is refused; removed addresses keep rows. A historical insert bumps `upstreamId`.
5. **Finish API changes:** Done in code, not deployed (2026-11-10). `/health` and durable-watermark segment eligibility are in the prototype and shared REST routes. `upstreamId` is persisted on the snapshot (not the catalog hash) and SDK fold keys include a non-empty epoch. `/graphql` and `/sql` are dropped. Probes, the local gateway, nginx, Docker, and the Render health check use `/health`; height probes use `/status`. Public checkpoints are 16-digit block strings. The Ponder process still reads its internal checkpoint table only so the local `INDEXER_ENGINE=ponder` escape hatch can emit that public format. Do not resume the hosted indexer from this change.
6. **Raise the cap, then deploy** under a new schema (Ponder stopped first, or on a separate service). Code path (not resumed, 2026-11-10): hosted `start` runs the raw-log engine with the spend guard forced on, against `INDEXER_PROTOTYPE_SCHEMA` (default `raw_log`) on `DATABASE_URL`. It refuses Ponder's `DATABASE_SCHEMA` and any schema that already has `_ponder_meta` / `_ponder_checkpoint`. `/health` and `/api/sync` stay not ready until a snapshot with `backfillCommitted` is committed. Do not resume `srv-d8ctfd6k1jcs73a71d2g` until Adam confirms the replay fits the raise. Then verify API/SDK behavior, lag, and actual RPC cost.
7. **Remove Ponder:** Done in code on `feature/raw-log-prototype` (2026-11-10). The dependency, Ponder configs, `ponder:schema` imports, the `INDEXER_ENGINE=ponder` escape hatch, and `ponderEventStore.ts` are gone. `INDEXER_ENGINE=ponder` now refuses to start. `pg` is a direct indexer dependency; the image installs only `indexer/package.json`, and Ponder used to pull `pg` in transitively. The persistent disk stays so Render still deploys stop-before-start around the advisory lock. Rollback is redeploying an older commit that still contains Ponder, against the old schema. Do not point the Render service at `master` until `master` contains this engine.

Rollback before step 7 is resuming/redeploying Ponder against its old schema; its data is untouched (but it resumes ~260M CU/month).
