# Handoff: next step after the Alchemy cap raise

Adam raised the Alchemy monthly limit by $10 on 2026-11-10 and asked a fresh agent to do whatever is next. Do not resume the old indexer to "use" that budget.

## Do not

- Resume Render service `commonality-indexer` (`srv-d8ctfd6k1jcs73a71d2g`). It is suspended. Resuming it starts Ponder and spends at the old per-block rate.
- Deploy or restart that service from this branch as-is. Hosted `PONDER_SCRIPT=start` still execs Ponder (`indexer/start.sh`). `render.yaml` still health-checks `/graphql`.
- Point the indexer RPC at `https://sepolia.base.org`.
- Print Render or Alchemy credentials. `.env.render` has `RENDER_API_KEY`. The indexer, coherence worker, service-host workers, attesters, and platform API share one Base Sepolia Alchemy URL. The indexer's mainnet URL is a different key.

## Already done

Plan and gates: [specs/tech/indexer/replace-ponder.md](../specs/tech/indexer/replace-ponder.md). Prototype behavior: [indexer/src/prototype/README.md](../indexer/src/prototype/README.md). Earlier checkpoint: [2026-11-09-raw-log-prototype-handoff.md](./2026-11-09-raw-log-prototype-handoff.md).

Branch `feature/raw-log-prototype` (not pushed). Tip `e9566db2` records the catalog replay arithmetic and `indexer/src/prototype/postgres.live.test.ts`. That test skips unless `INDEXER_PROTOTYPE_TEST_DATABASE_URL` is set. Local Docker already runs the prototype; hosted start does not.

Checked just before this handoff: indexer still `suspended`. Live services on the same Base Sepolia key are the coherence badge worker, service-host workers, attesters, and platform API. They are low-rate pollers. The alignment-trust bootstrap and published-data IPFS mirror workers are suspended for a separate `ETHEREUM_RPC_URL` crash loop. Leave them suspended.

## Next

Finish cutover steps 5–7 in the spec before any hosted indexer process is allowed to call Alchemy.

1. Drop `/graphql` and `/sql`, move probes and the Render health check to `/health` (and `/status` or `/api/sync` for height), and delete Ponder checkpoint decoding in that same change. Callers are listed in the spec. Update `render.yaml`, `render.yaml.template`, verifier env, and deployment docs there too.
2. Make hosted start run the raw-log engine against its own fresh schema, with the spend guard on. Do not adopt Ponder tables. Readiness stays false until backfill commits.
3. Only then resume or replace the suspended indexer, under a new `DATABASE_SCHEMA`, with Ponder not running. Confirm actual RPC cost after catch-up. Rollback is redeploying Ponder against the old schema, which resumes the expensive loop, so do not do that unless Adam asks.
4. Remove the Ponder dependency only after that process is the one serving testnet.

The $10 raise is the budget for that replay and the following months, not a license to measure by spending. The spec's replay figure is log-query arithmetic only. Factory-child backfill, retries, and event-block header reads are extra. The prototype spend guard is the backstop. If catch-up would exceed what $10 can cover, stop and tell Adam instead of letting it run.

No PR, push, or deploy has been requested.

## Suggested skills

- `workflow/roles/developer.md` before editing.
- `workflow/branching.md` before any PR. Feature PRs target `dev`. Do not merge or fast-forward `master` unless Adam asks.
- `thorough-tester` when adding the API-cutover and reorg tests.
- `using-verifier` if probe or health-check definitions move.
