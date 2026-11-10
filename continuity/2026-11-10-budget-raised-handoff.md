# Handoff: raw-log indexer is on; spend guard parked after catch-up

Read this instead of [2026-11-10-hosted-raw-log-start-handoff.md](./2026-11-10-hosted-raw-log-start-handoff.md). Adam said yes on 2026-11-10 to turn the hosted indexer on. Do not open a PR or merge unless he asks.

## Do not

- Resume or redeploy `commonality-indexer` (`srv-d8ctfd6k1jcs73a71d2g`) from `master`. That branch is still the old Ponder image. The service is already running, not suspended.
- Start Ponder. `INDEXER_ENGINE=ponder` is the old expensive loop.
- Deploy or restart that service from this branch.
- Point any indexer RPC at `https://sepolia.base.org`.
- Print Render or Alchemy credentials. `.env.render` has `RENDER_API_KEY`. The indexer database can be read through the Render API without printing the URL. Do not spend Alchemy credits to measure.
- Leave the alignment-trust bootstrap or published-data IPFS mirror workers suspended. They are off for a separate crash loop.

## Budget

This month's Alchemy cap was $50. That was used up in 8 days, mostly by the old indexer. Adam raised it to $60, then to $70 on 2026-11-10. About $20 remains for the rest of this month. He hopes to drop the cap to $20–30 next month.

The one-time catch-up is under $1. Numbers are in [specs/tech/indexer/replace-ponder.md](../specs/tech/indexer/replace-ponder.md): about 155k compute units, from catalog arithmetic plus a read-only count of the old database (9,546 events, 3,481 blocks). A quiet new indexer is about $11 per month if it polls the whole time. $20 left is enough for the rest of this month. $20–30 next month is reasonable only if the old indexer stays off.

The earlier "$10 raise" notes are stale.

## Already done

Branch `feature/raw-log-prototype` (not pushed). Hosted start runs the raw-log engine unless `INDEXER_ENGINE=ponder`. Plan: [specs/tech/indexer/replace-ponder.md](../specs/tech/indexer/replace-ponder.md). Prototype notes: [indexer/src/prototype/README.md](../indexer/src/prototype/README.md).

The monthly cost note was wrong (7.2M). A 12-second quiet poll is 21.6M compute units per 30-day month before idle. `steadyStateMonthlyCu` locks that in. Indexer tests: 63 pass, 1 skipped live Postgres test.

## Hosted state (2026-11-10)

The service is not suspended. It is running commit `b5e5cf0140df` from `feature/raw-log-prototype`, not Ponder. Render health check is `/health`. Docker command is empty, so `start.sh` runs the raw-log engine. The service branch is the feature branch on purpose: a `master` auto-deploy would bring Ponder back. Do not point it at `master` until that branch contains this engine.

The first replay parked on the quiet 2,000 hourly request ceiling. Hosted start now sets `INDEXER_CATCHUP=1`: while the cursor is more than one log window behind, calls use a separate 10,000-request / 500,000 CU allowance and do not consume the quiet hourly ceiling. They still count toward the daily ceiling. The allowance turns off once the cursor is caught up. A deploy of that change restarts the process and clears the in-memory park.

Rollback is still redeploying Ponder against the old schema. Do not do that unless Adam asks.

## Next

1. Confirm the guard unparks and `/api/sync` becomes ready without another request burst. Watch the Alchemy bill.
2. Remove the Ponder dependency only after that ready check. That is cutover step 7 in the spec. No PR has been opened.

## Suggested skills

- `workflow/roles/developer.md` before editing.
- `workflow/branching.md` before any PR. Feature PRs target `dev`.
- `thorough-tester` when adding the remaining reorg and restart tests.
- `using-verifier` if probe or health-check definitions move again.
