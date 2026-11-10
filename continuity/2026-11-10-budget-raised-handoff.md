# Handoff: budget raised to $70; indexer still off

Read this instead of [2026-11-10-hosted-raw-log-start-handoff.md](./2026-11-10-hosted-raw-log-start-handoff.md). Adam does not need to do anything before the next coding step. He must say yes before anyone turns the hosted indexer back on, opens a PR, or pushes.

## Do not

- Resume Render service `commonality-indexer` (`srv-d8ctfd6k1jcs73a71d2g`). It is suspended. Resuming it starts the raw-log engine, which is what we want later, but Adam has not said to turn it on.
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

## Next

1. Wait for Adam to say the indexer can be turned on. Then resume or replace `srv-d8ctfd6k1jcs73a71d2g` with the raw-log engine, not Ponder. Watch the bill. Rollback is redeploying Ponder against the old schema, which brings back the expensive loop. Do not do that unless Adam asks.
2. Remove the Ponder dependency only after the raw-log process is the one serving testnet. That is cutover step 7 in the spec.

No PR, push, or deploy has been requested.

## Suggested skills

- `workflow/roles/developer.md` before editing.
- `workflow/branching.md` before any PR. Feature PRs target `dev`.
- `thorough-tester` when adding the remaining reorg and restart tests.
- `using-verifier` if probe or health-check definitions move again.
