# Handoff: hosted start runs raw-log; do not turn the indexer back on

Superseded by [2026-11-10-budget-raised-handoff.md](./2026-11-10-budget-raised-handoff.md). The "$10 raise" figure below is stale. Adam raised this month's cap to $70.

Adam does not need to do anything before the next coding step. He must say yes before anyone turns the hosted indexer back on, opens a PR, or pushes.

## Do not

- Resume Render service `commonality-indexer` (`srv-d8ctfd6k1jcs73a71d2g`). It is suspended. Resuming it now would start the new engine and spend credits on the replay.
- Deploy or restart that service from this branch.
- Point any indexer RPC at `https://sepolia.base.org`.
- Print Render or Alchemy credentials. `.env.render` has `RENDER_API_KEY`. The indexer, coherence worker, service-host workers, attesters, and platform API share one Base Sepolia Alchemy URL. The indexer's mainnet URL is a different key.
- Spend Alchemy credits to measure. The $10 raise is the budget for the replay and the following months, not a license to measure by spending.
- Set `INDEXER_ENGINE=ponder` on the hosted service. That escape hatch still runs the old expensive loop.

## Already done

Plan: [specs/tech/indexer/replace-ponder.md](../specs/tech/indexer/replace-ponder.md). Prototype notes: [indexer/src/prototype/README.md](../indexer/src/prototype/README.md). Previous handoff: [2026-11-10-health-routes-handoff.md](./2026-11-10-health-routes-handoff.md).

Branch `feature/raw-log-prototype` (not pushed). Hosted `PONDER_SCRIPT=start` now runs the raw-log engine, not Ponder, unless `INDEXER_ENGINE=ponder`. The spend guard is forced on. The database is the same Postgres URL, but the schema is `raw_log` unless `INDEXER_PROTOTYPE_SCHEMA` is set. It refuses Ponder's `DATABASE_SCHEMA` and any schema that already has Ponder's tables. Readiness stays false until a snapshot is committed with `backfillCommitted`. A monthly-capacity refusal still parks behind the stub health page.

Checked: `npm test --workspace=indexer` (62 pass, 1 skipped live Postgres test).

Live services on the same Base Sepolia key are the coherence badge worker, service-host workers, attesters, and platform API. They are low-rate pollers. The alignment-trust bootstrap and published-data IPFS mirror workers are suspended for a separate crash loop. Leave them suspended.

## Next

Adam is not blocked. The next agent can keep coding. Do not turn the hosted indexer on.

1. Stop and tell Adam before resuming or replacing the suspended indexer. Replay itself fits a $10 raise (about 155k CU: 85,740 of `eth_getLogs` plus 69,620 for 3,481 event-bearing blocks in `commonality_base_sepolia_v6`, queried read-only, no Alchemy). Factory-child backfill is an extra in-window batch, not a second full scan. Caught-up polling at 12s is 21.6M CU/month before idle (~$11), so the $10 raise does not also cover the following months. Do not resume until Adam accepts that.
2. Only after Adam says so: resume or replace the indexer with Ponder not running. Confirm actual RPC cost after catch-up. Rollback is redeploying Ponder against the old schema, which resumes the expensive loop, so do not do that unless Adam asks.
3. Remove the Ponder dependency only after the raw-log process is the one serving testnet. That is cutover step 7 in the spec.

No PR, push, or deploy has been requested.

## Suggested skills

- `workflow/roles/developer.md` before editing.
- `workflow/branching.md` before any PR. Feature PRs target `dev`. Do not merge or fast-forward `master` unless Adam asks.
- `thorough-tester` when adding the remaining reorg and restart tests.
- `using-verifier` if probe or health-check definitions move again.
