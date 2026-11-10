# Handoff: indexer health routes are done; hosted start is still Ponder

Adam asked what is next in plain language, and for a fresh agent to pick up. He does not need to do anything before the next coding step. He does need to say yes before anyone turns the hosted indexer back on, opens a PR, or pushes.

## Do not

- Resume Render service `commonality-indexer` (`srv-d8ctfd6k1jcs73a71d2g`). It is suspended. Resuming it starts Ponder and spends at the old per-block rate.
- Deploy or restart that service from this branch. Hosted `PONDER_SCRIPT=start` still execs Ponder (`indexer/start.sh`).
- Point any indexer RPC at `https://sepolia.base.org`.
- Print Render or Alchemy credentials. `.env.render` has `RENDER_API_KEY`. The indexer, coherence worker, service-host workers, attesters, and platform API share one Base Sepolia Alchemy URL. The indexer's mainnet URL is a different key.
- Spend Alchemy credits to measure. The $10 raise is the budget for the replay and the following months, not a license to measure by spending.

## Already done

Plan and gates: [specs/tech/indexer/replace-ponder.md](../specs/tech/indexer/replace-ponder.md). Prototype notes: [indexer/src/prototype/README.md](../indexer/src/prototype/README.md). Previous handoff: [2026-11-10-after-alchemy-cap-handoff.md](./2026-11-10-after-alchemy-cap-handoff.md).

Branch `feature/raw-log-prototype` (not pushed). Last commit `e9566db2`. The health-route change is **uncommitted**. Do not assume it is on the remote.

That uncommitted change drops `/graphql` and `/sql`, moves probes and the Render health check to `GET /health`, and uses `GET /status` for block height. Public checkpoints are 16-digit block strings. `blockFromPonderCheckpoint` is gone. The Ponder escape hatch still reads Ponder's internal checkpoint table only so it can emit that public format. `/health` and `/status` do not open the fast-poll window.

Checked in that change: `npm test --workspace=indexer` (60 pass, 1 skipped live Postgres test) and `node verifier/checks/known-bad/indexer-lag.mjs`.

Live services on the same Base Sepolia key are the coherence badge worker, service-host workers, attesters, and platform API. They are low-rate pollers. The alignment-trust bootstrap and published-data IPFS mirror workers are suspended for a separate `ETHEREUM_RPC_URL` crash loop. Leave them suspended.

## Next

Adam is not blocked. The next agent can keep coding. Do not turn the hosted indexer on.

1. Make hosted start run the raw-log engine against its own fresh schema, with the spend guard on. Do not adopt Ponder tables. Readiness stays false until backfill commits. This is cutover step 6 in the spec. Until this is true, `render.yaml`'s `/health` check does not match what a hosted Ponder process serves as its main path, and resuming the service would still burn credits the old way.
2. Stop and tell Adam before resuming or replacing the suspended indexer. Confirm the replay would fit in the $10 raise. The spec's replay figure is log-query arithmetic only (85,740 CU of `eth_getLogs` plus 20 CU per event-bearing block; that header term was not queried). Factory-child backfill, retries, and event-block header reads are extra. If catch-up would exceed what $10 can cover, stop.
3. Only after Adam says so: resume or replace the indexer under a new `DATABASE_SCHEMA`, with Ponder not running. Confirm actual RPC cost after catch-up. Rollback is redeploying Ponder against the old schema, which resumes the expensive loop, so do not do that unless Adam asks.
4. Remove the Ponder dependency only after that process is the one serving testnet.

No PR, push, or deploy has been requested.

## Suggested skills

- `workflow/roles/developer.md` before editing.
- `workflow/branching.md` before any PR. Feature PRs target `dev`. Do not merge or fast-forward `master` unless Adam asks.
- `thorough-tester` when adding the hosted-start and reorg tests.
- `using-verifier` if probe or health-check definitions move again.
