# Raw-log prototype handoff

User asked whether replacing Ponder made sense, authorized the proposal and a
bounded prototype, then asked for the prototype to serve the same REST API so a
client can point at either process. This is not a production cutover.

Branch: `feature/raw-log-prototype`, created from `fix/rpc-naming-and-spend-warning`,
which itself is ahead of `dev`. A PR of this branch would carry those parent
commits unless it is rebased. No push, PR, deployment, production RPC experiment,
or database mutation has been requested.

## Local drop-in (2026-11-09, later the same day)

Not a production cutover. Local Docker now starts the prototype instead of Ponder.

- `indexer/start.sh`: if `PONDER_SCRIPT` is not `start` or `start:conceptspace`, `INDEXER_ENGINE` defaults to `raw-log`. `INDEXER_ENGINE=ponder` is the escape hatch. Hosted `start` still runs Ponder, including the monthly-capacity parking loop. `start:conceptspace` still execs Ponder and is not in that loop.
- `--local --serve PORT --host 0.0.0.0` derives the start block from the catalog, polls `latest`, and writes `INDEXER_SNAPSHOT_PATH` (default `/app/.ponder/raw-log-snapshot.json` on the existing Ponder volume). Hardhat uses a 100ms poll and `depth:0` because this path does not depend on Hardhat's `finalized` tag. A failed poll is logged and retried; the last snapshot keeps being served. The lifetime 10k-block experiment cap does not apply to `--local`.
- `GET /status` returns `{ [chainName]: { id, block: { number, timestamp } | null } }` so `sdk/src/indexer-sync.ts` and the nginx upstream probe work. `/graphql` still answers only `_meta`.
- Next `./scripts/services.sh --start` should rebuild the indexer image; `start.sh` and prototype sources are image inputs, not a bind mount. Wiping `data/ponder` also removes the snapshot.

## Current artifacts

- Revised scope/correctness requirements: `specs/tech/indexer/replace-ponder.md`.
- Implemented behavior, CLI usage, limitations, measured local parity and request
  counts: `indexer/src/prototype/README.md`.
- CLI: `indexer/scripts/raw-log-prototype.ts`; new npm scripts in `indexer/package.json`.
- Core, configuration adapter, RPC meter, snapshot store, REST comparison, in-memory
  store, HTTP server, tests: `indexer/src/prototype/`.
- Shared REST handlers: `indexer/src/api/restApp.ts`, used by Ponder
  (`ponderEventStore.ts`) and the prototype (`memoryStore.ts`). `--serve PORT`
  binds `127.0.0.1` and keeps polling until SIGINT.
- Existing registration list extracted unchanged into
  `indexer/src/indexing/rawEventRegistrations.ts`, used by both Ponder and prototype.
  The production Ponder handler still uses the same capture function and schema.

## Validation and next review

Final checks: all 43 indexer tests passed, indexer TypeScript check passed, lint
passed with warnings, and `git diff --check` passed. The full indexer typecheck/ABI
check also passed before the final small hardening edits. Lint has advisory complexity warnings, including several new functions;
there are no lint errors. The real Ponder/Hardhat parity and quiet-gap benchmark
were run separately; results and caveats are in the prototype README.

No local stack was running. A temporary isolated chain and Ponder/pglite instance
were started for those experiments and stopped afterward. The temporary harness
and its data are cleaned up. Ponder CLI is currently blocked by the installed
Commander `-vv` incompatibility; the experiment imported the internal dev command
directly, with isolated configuration and no dependency changes. Bulk
`hardhat_mine` produced intermediate parent-hash behavior Ponder rejected; the
successful run used sequential `evm_mine` instead.

## What remains

The plan is [specs/tech/indexer/replace-ponder.md](../specs/tech/indexer/replace-ponder.md).
Do not claim the production migration is implemented. Local drop-in is the current stopping point. Still outstanding:

- Local Docker stack is still unproven. An isolated Hardhat node (not Docker) did prove factory-child discovery, provisional reorg drop, durable-reorg refusal, snapshot restart, and SDK `waitForIndexerToSyncToBlockNumber` via `/status`. See the prototype README. `machinery.testConfig` is now optional in that wait; a missing config used to throw on the success path and burn the timeout.
- Review RPC assumptions, snapshot validation, source selection, and comparison coverage.
- Real-chain factory/reorg exercise. Current factory coverage is deterministic RPC fixtures with the real ABIs.
- Independent child-discovery parity, long provisional-tail cost under Base finality, and provider-weighted CU measurement.
- Idle/wake is wired for `--serve` only, using the existing idle-head flag. Finite `--polls` experiments always sync. `/graphql` and `/status` do not open the fast window (`/status` is not in the wake list). A local chain that enables idle will not advance just because the SDK polls `/status`.
- Segment eligibility still uses `max(events.blockNumber) - confirmations`, not the durable watermark the spec requires at cutover.
- Checkpoint strings are 16-digit padded block numbers, not Ponder's 75-digit encoding. SDK length-reset behavior needs a check before swap in production.
- `/sql` and non-`_meta` GraphQL are Ponder-only. The local UI gateway still forwards `/sql/`.
- Production store, adoption report, exclusive writer lock, and the cutover steps in the spec. Source changes refuse snapshot reuse; historical backfill is unimplemented. `--local` still refuses a snapshot whose catalog scope changed.
- Tests cover simulated failures and atomic snapshot restart, not a full process-kill fault-injection matrix. Snapshot reads now reject a child creation block outside `[fromBlock, head]`. Row topic/data shape is still not revalidated on read.
- A chain longer than memory can hold is still one in-memory snapshot. Fine for local Hardhat; not a hosted store.

No PR or deploy has been requested.

## Suggested skills

- `thorough-tester` if expanding adversarial/reorg/transport coverage.
- `review-this-branch` only if the user asks for review/commit work.
- `handoff` for another bounded stopping point.
