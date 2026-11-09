# Replace Ponder with a raw-log sync loop

Status: **accepted direction, not implemented.** A fresh implementer should follow this note. It does not authorize a schema wipe, a chain resync, or a switch of the testnet RPC to `https://sepolia.base.org`.

Related: [indexer architecture](./README.md), [the Graph (deferred)](./the-graph.md), [continuity: 200ms blocks](../../../continuity/2026-11-09-alchemy-cap-base-sepolia-200ms-blocks.md), live ops notes in [`indexer/README.md`](../../../indexer/README.md).

## Why

The indexer is already a thin event cache. One `events` table, raw logs, client-side folding in the SDK. Ponder is only the sync engine, the schema wrapper, and the database handle behind the REST routes.

That engine is the wrong shape for this chain. Ponder 0.15 realtime sync fills every missed block with `eth_getBlockByNumber(n, true)` and calls `eth_getLogs` only when the bloom matches. Base Sepolia switched from 2s blocks to 200ms blocks at block 48953176 (2026-10-22). Caught-up indexer cost then tracks block rate, about 10x, against a fixed Alchemy monthly cap. The existing idle-head cache only skips repeat `latest` polls. The 10k `eth_getLogs` window only cheapens historical catch-up. There is no Ponder setting that turns the per-block fetch off.

A replacement that polls `latest` and requests logs for the gap does the same job with orders of magnitude fewer compute units. That is the point of the change. Speed of historical backfill, GraphQL, and a nicer handler API are not.

## What was rejected

- **Envio, Subsquid, The Graph, Goldsky.** They are handler-and-schema frameworks. We already removed that layer. Envio's speed comes from HyperSync, a bulk historical source, not from a better model for a one-table cache. Adopting one would re-couple the REST API to another runtime. The Graph remains the deferred option in [the-graph.md](./the-graph.md) for independent operators, not the fix for this RPC bill.
- **A small third-party TypeScript indexer** (OpenIndex and similar). Same shape as the loop below, without our factory, deployment-manifest, and confirmation rules. Not worth the dependency.
- **Extracting a store port and keeping Ponder.** Useful only as a stepping stone inside this change. Do not ship the seam by itself.
- **Periodic historical-only sync that trails by minutes, or a second RPC just for per-block fetches.** Both were options while staying on Ponder. Neither is needed once the realtime loop is gone. Do not point history at the pruned public Base Sepolia endpoint.

HyperSync, or any other bulk historical source, is out of scope. Add one later only if a schema rebuild or a new chain makes catch-up itself the cost.

## What stays

- Client-side folding. No derived tables, no aggregation, no IPFS, no content bytes.
- The `events` row shape: `id`, `chainId`, `contractAddress`, `eventName`, `blockNumber`, `blockTimestamp`, `transactionHash`, `logIndex`, `topic0`–`topic3`, `data`. `id` is `chainId + txHash + logIndex`. Inserts are idempotent on that key.
- REST behavior documented in [`indexer/README.md`](../../../indexer/README.md): `/api/events` (filters, `follow`, cursors, `checkpoint`), `/api/event-segments/...`, `/api/published-data/...`, `/api/project-read-demand`, `/api/sync`, `POST /api/indexer-wake`.
- `DATABASE_SCHEMA` (`commonality_base_sepolia_v6` on testnet). Renaming it drops the cache and replays history. Do not bump it. New code writes the existing `events` rows. Verify the live column types before assuming Ponder's Drizzle types match what Postgres will accept; adapt the writer, do not migrate the table.
- Contract set, ABIs, start blocks, and `INDEXER_DEPLOYMENT_MANIFEST`, including the conceptspace-only mode that omits funding contracts.
- RPC budget behavior in `indexer/start.sh`: on Alchemy monthly capacity, park and back off. Do not crash-loop. Do not change the archive RPC.

## Sync loop

One chain per process, as today. A cursor row (new table in the same schema, not a replacement for `events`) stores the last block whose logs have been committed. Advance it in the same transaction as the inserts for that range.

**Catch-up.** `eth_getLogs` from the cursor to a capped head, in windows. Start from the existing `PONDER_ETH_GET_LOGS_BLOCK_RANGE` (10_000 on Render). If the provider rejects the range or the body, split and retry, and log the one-shot hint that already exists for that failure. Filter by the addresses and topic0s we care about. Never scan the chain by fetching every block.

**Live.** On an interval (`PONDER_POLL_INTERVAL_MS`, default 4s on hosted chains; hardhat stays fast), read `latest` once, then one logs query for `(cursor, head]`. Quiet intervals cost one head call, not one call per block. Keep the idle-head cache: while nobody is reading, reuse the last `latest` for `INDEXER_IDLE_HEAD_INTERVAL_MS`. A GraphQL-or-REST read of application data, or `POST /api/indexer-wake`, opens the fast window. Health checks must not.

**Ordering.** Commit a window only when every log in it is inserted. Do not advance the cursor past a hole.

## Factory contracts

This is the only indexing feature that is not "filter logs for a fixed address list."

`AssuranceContractFactory`, `FixedControllerFactory`, `ERC1155Factory`, and `ProjectFactory` emit the addresses of contracts that must then be indexed from their creation block. On each committed window:

1. Read factory logs in that window.
2. Register each child address.
3. Backfill that address from its creation block through the window end before advancing the global cursor past the window.

A child created inside the window must not miss logs, and must not be fetched twice on restart. Persist the discovered address set next to the cursor so a restart does not depend on replaying factory history from genesis. Re-deriving it from the `events` table on startup is also acceptable if that scan is cheap and tested.

Conceptspace mode does not register funding factories. Do not register a handler for a contract the selected config omitted; Ponder used to refuse to start in that case, and the new loop must simply not watch those addresses.

## Reorgs

Shallow, on purpose. Do not build Ponder's checkpoint graph.

Durable rows and the public segment API stay behind `EVENT_SEGMENT_CONFIRMATIONS` (default 12). The durable cursor never passes `head - confirmations`.

Logs between the durable cursor and the head are a tip. Serve them from `/api/events` so followers can see recent activity, but they must be deletable. On each poll, if the canonical hash at the tip's oldest block disagrees with what we stored, delete tip rows from that block forward and re-fetch. A reorg deeper than the confirmation depth is an operational incident, not an automatic full rewind: log it loudly and stop advancing rather than silently corrupting durable history.

`/api/sync` must keep these meanings:

- `indexedThrough` advances on quiet blocks. It is the committed head, not the newest matching event.
- `finalizedThrough` is the durable cursor (`head - confirmations`, once caught up).
- `ready` is false until historical backfill has committed. Followers must not freeze a checkpoint while `ready` is false. The first cursor write happens before backfill finishes; that is not readiness.
- `upstreamId` changes only when this event cache is rebuilt (schema wipe or an explicit rebuild id), not on every code deploy. Ponder's `build_id` did the wrong thing here; do not preserve that eagerness.
- Raw checkpoint strings may stay in the response for callers that compare them. They no longer have to be Ponder's 75-digit encoding, but a caller that parses them with `blockFromPonderCheckpoint` must be updated in the same change, and a regressing cursor must still be detectable.

## API compatibility

Keep the Hono routes and their tests. Point them at SQL you own instead of `ponder:api`.

Do not reimplement GraphQL. Render's health check, `pausedHealthServer.mjs`, and a few probes still hit `/graphql`. Replace those with a small `/health` (and a temporary `/graphql` stub that returns 200 so an old probe does not crash-loop the service during deploy). Update `render.yaml`, `verifier/environments/testnet.json`, and the deployment docs in the same change. Application data access remains `GET /api/events`.

`POST /graphql` with `{ _meta { block { number } } }` is an old liveness probe. Either keep answering that one query from the cursor, or update every caller. Grep before deleting it.

Drop the idle-head rule that treats `/graphql` as a reader wake once health checks no longer use it. A health check must not open the fast-poll window.

## RPC and process

- One archive RPC, the existing `PONDER_RPC_URL_*`. No second provider for block bodies.
- No `eth_getBlockByNumber` in the steady state except the hash read used to detect a tip reorg, and that only for the confirmation window, not for every block since genesis.
- Keep monthly-capacity parking in `start.sh`. The stub it serves moves from "Ponder's `/graphql`" to the new health route.
- Local dev stays a single process with the REST API. Hardhat polling stays tight enough for tests. No Ponder dev UI, codegen, or Vite watch in production start.
- `ponder` leaves `package.json` when nothing imports it. Delete `ponder.config.ts`, the conceptspace Ponder config, and `ponder:schema` imports. Keep the contract-capability and deployment-manifest code; it is not Ponder-specific.

## Tests the implementer must add

- A window commit is atomic: crash between insert and cursor advance does not duplicate or skip. Restart resumes from the cursor.
- A provider range rejection splits the window and continues.
- A factory child created at block N is backfilled from N before the cursor passes N, including across a restart.
- Conceptspace mode does not watch funding factories and does not serve project-read-demand.
- A reorg inside the confirmation depth removes tip rows and does not change a served event segment.
- A deep reorg stops the loop instead of rewriting durable rows.
- Caught-up live sync issues one head read and one `eth_getLogs` per poll, not one `eth_getBlockByNumber` per block. This is the regression that matters.
- Existing cursor, segment, and published-data tests still pass against the new store.

## Out of scope

- The two Render workers suspended for `ETHEREUM_RPC_URL` vs `RPC_URL`, and the ops-pager `/status` 404. Those are separate from this replacement.
- Raising the Alchemy cap. Adam may still need to do that before the new loop is deployed, so the current Ponder process does not sit parked through the cutover.
- A projected-spend probe. Worth doing, but not part of the sync loop.
- Multi-chain in one process, websocket subscriptions, a derived schema, or a CDN change for segments.

## Cutover

Deploy as a new release of the same Render service and the same `DATABASE_SCHEMA`. First start must adopt the existing `events` rows and set the cursor from the current indexed head, not from `START_BLOCK`. If the cursor cannot be derived safely, stop and ask. Do not replay history to "be sure."

After deploy, confirm Alchemy (or the RPC dashboard) shows head polls plus sparse `eth_getLogs`, and no per-block `eth_getBlockByNumber` storm. Then update [`indexer/README.md`](../../../indexer/README.md) so it describes this loop instead of Ponder 0.15.
