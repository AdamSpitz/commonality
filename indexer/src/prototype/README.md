# Bounded raw-log prototype

Experimental implementation of [replace-ponder.md](../../../specs/tech/indexer/replace-ponder.md).
It does not replace the running indexer or access its database. `--serve PORT` binds `127.0.0.1` and serves the same REST routes as the Ponder indexer (`/api/events`, `/api/sync`, `/api/event-segments`, `/api/published-data`, `/api/project-read-demand`, `POST /api/indexer-wake`) plus a `/graphql` stub that answers only `_meta` liveness probes. Point a client at that URL to swap readers. It does not serve `/sql` or the rest of Ponder's GraphQL schema. Segment eligibility still follows the current routes (`max(events.blockNumber)` minus confirmations), not the prototype's durable watermark. `/api/sync` reports the snapshot head and durable block; checkpoint strings are 16-digit zero-padded block numbers, not Ponder's 75-digit encoding.

From the repository root:

```sh
npm run prototype --workspace=indexer -- --help
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
start later. Configuration changes require a new snapshot; historical source
admission/backfill is not implemented.

Rows, discovered children, and watermarks commit together by synced file write and
atomic rename. Restart reads that snapshot and replaces the entire provisional
tail above the durable anchor. A sidecar lock excludes competing writers. After
an interrupted process, verify the recorded PID is no longer running before
removing its `.lock`; uncommitted `.PID.tmp` files can then be discarded. This
bounded in-memory/file store is not a production database implementation.

Other gaps: the HTTP server is a swap surface over the snapshot, not a production store adapter. Idle/wake scheduling is not wired into the sync loop (the wake route still returns the same JSON). Also still missing: production adoption,
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

The temporary harness bypassed the installed Ponder CLI through its internal dev
entry point because the CLI currently fails on Commander's `-vv` option parsing.
No installed dependency was modified. All local test processes were stopped.
