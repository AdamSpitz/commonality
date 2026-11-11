# Bounded raw-log prototype

Experimental implementation of [replace-ponder.md](../../../specs/tech/indexer/replace-ponder.md).
Local Docker and hosted `PONDER_SCRIPT=start` (`indexer/start.sh`) run this process instead of Ponder unless `INDEXER_ENGINE=ponder`. Hosted start forces the spend guard, opens `INDEXER_PROTOTYPE_SCHEMA` (default `raw_log`) on `DATABASE_URL`, and refuses Ponder's `DATABASE_SCHEMA`. Do not resume the suspended Render indexer until Adam says the replay fits the cap. It binds `0.0.0.0`, polls latest, and writes `INDEXER_SNAPSHOT_PATH` (default `/app/.ponder/raw-log-snapshot.json` on the existing Ponder volume). Hardhat uses a 100ms poll and `depth:0` finality because Hardhat's `finalized` tag is not a dependency. `GET /status` returns Ponder's chain block shape so the SDK sync wait works. A failed poll is logged and retried; the last committed snapshot keeps being served.

`--serve PORT` without `--local` still binds `127.0.0.1` unless `--host 0.0.0.0` is set, and serves the same REST routes as the indexer (`/api/events`, `/api/sync`, `/api/event-segments`, `/api/published-data`, `/api/project-read-demand`, `POST /api/indexer-wake`) plus `GET /status` and `GET /health`. It does not serve `/graphql` or `/sql`. Segment eligibility uses the committed durable watermark from `/api/sync`, not `max(events.blockNumber)` minus confirmations. `GET /health` is liveness (200 while parked; `ready` is false). `/api/sync` reports the snapshot head, durable block, and persisted `upstreamId` (minted once per snapshot, not the catalog scope). Checkpoint strings are 16-digit zero-padded block numbers.

Non-Hardhat runs also enforce a spend guard (`INDEXER_HOURLY_CU` default 100000, `INDEXER_DAILY_CU` default 1000000, plus request ceilings). Exceeding it parks the sync loop and marks `/status` parked and `/api/sync` not ready. `INDEXER_SPEND_GUARD=0` disables it; Hardhat enables it only with `INDEXER_SPEND_GUARD=1`. Hosted start also sets `INDEXER_CATCHUP=1` unless that is set to `0`: while the committed head is more than one log window behind, or backfill has not committed, calls draw a separate allowance (`INDEXER_CATCHUP_REQUESTS` default 10000, `INDEXER_CATCHUP_CU` default 500000) instead of the quiet hourly and daily ceilings. The allowance is process-lifetime and turns off once the cursor is caught up. A reader keeps the fast-poll window open but does not shorten the poll interval; otherwise API traffic aborts the 12s sleep and a quiet day exceeds the 1M CU ceiling.

A caught-up poll (chain id already checked) is `latest` plus `finalized` (or the depth header, skipped when depth is 0) and one combined `eth_getLogs`. It does not re-read the anchor or the headers it was given. At Alchemy's published weights that is 20+20+60 = 100 CU. Non-Hardhat `--local` defaults to a 12s interval (21.6M CU per 30-day month before idle: 216,000 polls × 100 CU), under the 30M target. The earlier 7.2M figure divided the 4s cost by 3 and then divided again. Extra header reads happen only for event-bearing blocks; a second log query happens only for children first seen in that poll.

From the repository root:

```sh
npm run prototype --workspace=indexer -- --help
npm run prototype --workspace=indexer -- --estimate --head N --event-blocks N
npm run test:prototype --workspace=indexer
```

Set the existing deployment environment and `PONDER_RPC_URL_<chainId>` explicitly;
the command does not load env files automatically. Example with a configured local chain:

```sh
npm run prototype --workspace=indexer -- --from 1 --to 100 --contracts PublishedData --out ../tmp/raw-log-snapshot.json --compare http://localhost:42069
```

Paths are relative to the indexer workspace when invoked through npm. The output's
parent directory must exist. `--compare` requires the entire range durable in both
indexers. It compares every stored row field. Without `--contracts`, Ponder rows
outside the configured and discovered set fail the comparison, so a missed child
cannot look like parity. With `--contracts`, those other rows are reported as
`excluded` and are not a mismatch. Factory discovery is still also unit-tested.

The default finality policy uses RPC `finalized`. `--finality depth:N` explicitly
opts into a weaker policy for experiments. `--to latest --polls 5` runs a finite
polling experiment. Defaults: 4-second interval, 10,000-block total experiment
limit, 10,000-block query windows, and 1,000 RPC attempts across the whole process.
`--max-blocks` and `--max-requests` can raise these limits, each up to 100,000.
The request budget counts retries and failed requests. Output reports per-method
counts per poll and cumulative totals; these are not provider-weighted CU estimates.

Without `--contracts`, all configured sources in the selected capability are used.
Factory discovery requires `--from` at/before every selected factory's deployment
(and >= 1); otherwise it refuses an incomplete scan. Fixed-address experiments can
start later. A new source address is backfilled from its own start block. If that history is already durable, `upstreamId` changes. Changing a watched address's start block or event set still requires an explicit coverage plan. Removed addresses keep their cached rows. Snapshots written before source coverage cannot admit a changed catalog.

Rows, discovered children, and watermarks commit together by synced file write and
atomic rename. Restart reads that snapshot and replaces the entire provisional
tail above the durable anchor. A sidecar lock excludes competing writers. If that `.lock` records a PID that is no longer running, the next start removes it and continues. That matters on Render, where `/tmp` survives a crash restart and a leftover lock otherwise exit-loops with `EEXIST` before `/health` can bind. Uncommitted `.PID.tmp` files can then be discarded. This
bounded in-memory/file store is not a production database implementation. `INDEXER_PROTOTYPE_DATABASE_URL` switches load/commit to a schema this process creates (`INDEXER_PROTOTYPE_SCHEMA`, default `raw_log`) instead of the snapshot file. Do not point it at Ponder's `DATABASE_URL`. The file lock is still taken. A second database writer blocks on a session advisory lock. Hosted `start` sets it. Local Docker does not. `postgres.live.test.ts` covers that lock, a killed uncommitted write, and a provisional reorg against a real Postgres when `INDEXER_PROTOTYPE_TEST_DATABASE_URL` is set; the default suite skips it.

Other gaps: the HTTP server is a swap surface over the snapshot, not a production store adapter. `--serve` follows the existing idle-head flag: on `base-sepolia` (or `INDEXER_IDLE_HEAD_CACHE=1`) it skips the whole sync cycle for `INDEXER_IDLE_HEAD_INTERVAL_MS` unless a REST application read or `POST /api/indexer-wake` opens a fast window. `/health` and `/status` do not. Finite `--polls` experiments always sync. Also still missing: production adoption,
cache epochs or immutable segment migration, provider-weighted spending benchmark,
or independently verified RPC completeness. Do not deploy it as the service.

## Local evidence, 2026-11-09

An isolated Hardhat chain with a real PublishedData deployment and a separate
Ponder 0.15.18 instance returned exactly the same three rows (two publications,
one retraction), including all raw fields, through the existing REST API.

After both engines caught up, ordinary `evm_mine` produced quiet gaps. Ponder's
poll interval was set to 4 seconds for this experiment:

| Gap | Ponder numbered block reads | Prototype header reads | Prototype log queries | Prototype chain-ID reads |
| --- | ---: | ---: | ---: | ---: |
| 20 blocks | 19 | 8 | 1 | 1 |
| 150 blocks | 149 | 8 | 1 | 1 |

Ponder additionally fetched `latest` (one and four calls respectively). Its local
Hardhat log-query totals were 20 and 153; do not extrapolate those to Base, whose
bloom filtering/provider behavior differs. These results demonstrate removal of
per-block scanning, not a production CU savings ratio. The prototype had one fixed
source; busy/factory workloads and a long unfinalized Base tail remain unmeasured.

A later isolated Hardhat node, not the Docker stack, deployed a factory, indexed the created child and its constructor event, dropped that child after a provisional reorg, refused a rewritten durable anchor, restarted from the snapshot file, and satisfied `waitForIndexerToSyncToBlockNumber` against `GET /status`. The SDK wait used to throw on its success log when `machinery.testConfig` was missing, then retry until timeout; that access is now optional.

The temporary harness bypassed the installed Ponder CLI through its internal dev
entry point because the CLI currently fails on Commander's `-vv` option parsing.
No installed dependency was modified. All local test processes were stopped.
