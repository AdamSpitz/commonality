# Handoff: Alchemy cap hit on Nov 9, caused by Base Sepolia's switch to 200ms blocks

Diagnosis is done. Nothing has been changed yet. Next session does the work below.

## Root cause (verified 2026-11-09)

- Base Sepolia went from 2s blocks to **200ms blocks** at block **48953176** (2026-10-22 23:41 UTC). Verified with block timestamps from the public endpoint (used only for reading timestamps, not as the indexer RPC).
- When the indexer is caught up, Ponder 0.15.18 fetches every block one at a time with `eth_getBlockByNumber(n, true)`: `node_modules/ponder/dist/esm/sync-realtime/index.js` ~line 709–735 (missing-block fill, `MAX_QUEUED_BLOCKS = 50`). It runs `eth_getLogs` only when the bloom filter matches (line ~150). So indexer cost grows with block count, and 10x the blocks means about 10x the cost.
- Neither earlier fix touches this. The 10k `eth_getLogs` range (see `continuity/2026-09-05-testnet-indexer-10k-and-alchemy-cap.md`) only helps catch-up on old blocks. `indexer/src/rpc/idleHeadCache.ts` only caches the `latest` head poll, and Ponder still fetches each missed block afterwards. The comment there saying it catches up "with one eth_getLogs" is wrong for realtime mode.
- Rough estimate: indexer usage went from about 25M to about 250M CU/month, against a $30/month cap. Not confirmed against Alchemy's per-method dashboard or current pricing. Ask Adam to confirm from the dashboard.
- The workers (`alignment-trust-bootstrap`, `coherence-badge-worker`, `published-data-ipfs-mirror`) poll every 10s over block ranges, so the faster blocks barely affect them.

## Other problems found

1. **Two Render workers are suspended** for crash-looping, not because of the cap: `commonality-alignment-trust-bootstrap` (`srv-dactj2f10e5c73fi9640`) and `commonality-published-data-ipfs-mirror` (`srv-d9rq8lfavr4c739t40b0`). Logs show `Error: ETHEREUM_RPC_URL is required` (from `alignment-trust-bootstrap/dist/src/config.js`). `render.yaml` sets `RPC_URL` for them. This likely came from the Nov 4 deploy `4fa26e83`. Fix the code/config mismatch, then they need resuming in Render. Ask before resuming or deploying.
2. **The ops-pager indexer-lag probe gets `/status` HTTP 404** (issue #241, opened 2026-11-08 and still open). Either the route moved or the probe is wrong.

## Decisions pending with Adam

Recommended order, which Adam has not confirmed yet:
1. Adam raises the Alchemy cap to cover about 10x the old usage. This is a manual dashboard action.
2. Optionally, stop per-block realtime fetching on testnet. Ponder has no setting for this. One option is periodic historical-only sync, which trails the chain by minutes. Another is sending only recent-block `eth_getBlockByNumber` to a second provider, which must not become the old "use `sepolia.base.org` for history" mistake (see `workflow/testnet-ops-pager.md`, `indexer/README.md`). Get Adam's choice before building either.
3. **Warning:** add a projected-spend probe to `scripts/testnet-ops-pager.mjs` (spec: `workflow/testnet-ops-pager.md`; tests: `scripts/testnet-ops-pager.test.mjs`). It should measure the chain block rate and multiply by the known per-block CU cost, plus a worker baseline. Page when projected monthly spend is more than about 70% of the cap, with the cap and CU price set by env or config. This would have warned around Oct 23. Also suggest that Adam turn on any usage alerts Alchemy's billing settings offer.

Adam's question at the end of the previous session: should we go ahead with the probe and fix the two suspended workers, and which cost fix does he want? Ask again if it's still unanswered.

## Pointers

- Render API key: gitignored `.env.render` (`RENDER_API_KEY`). Owner id is fetched from `/v1/owners`. Logs: `GET /v1/logs?ownerId=…&resource=<srv>`.
- Indexer service `srv-d8ctfd6k1jcs73a71d2g`, schema `commonality_base_sepolia_v6`. Do not bump `DATABASE_SCHEMA`/`START_BLOCK`, because a full resync burns CUs.
- Existing capacity handling: `indexer/src/rpc/monthlyCapacity.ts`, `sdk/src/utils/rpc-budget.ts`.
- Record the 200ms-block fact and cost model somewhere durable, e.g. `specs/tech/costs.md` (which has no Alchemy numbers yet) and `indexer/README.md` (RPC budget section).

## Suggested skills

- `using-verifier`: if the spend warning fits better as a verifier check than a pager probe.
- `thorough-tester`: for the new probe's tests.
- `proactive-assistant`
