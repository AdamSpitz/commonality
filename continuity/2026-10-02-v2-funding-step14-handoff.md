# Handoff: v2 simulation funding, step 14

User asked to do step 14 in `fake-data-generation/TESTNET-SIMULATION-PLAN.md`. Read `README.md` and developer guidance before continuing. Work is on branch `feature/v2-campaign-local-validation` with uncommitted edits; compare against `dev`. Step 14 remains unchecked because the 100-user testnet stage is still in progress.

## Implemented and tested

- V2 funding actions now buy varied ERC1155 receipt quantities at their real prices; wallet provisioning and SDK-derived checks use the resulting amounts. V1 legacy actions retain their fixed purchase behavior.
- An abortion common-ground project has 20 prerequisite purchases totaling its 2 USDZZZ success threshold, split between two backers with explicit left/right natural-statement beliefs. Four later actions donate 0.25 USDZZZ each into the reimbursement waterfall. Local execution mined and reconciled **1,508/1,508** at zero lag. Artifacts: `fake-data-generation/output/campaigns/medium-realistic-v2-step14/` (gitignored), including `reports/reconciliation.json`.
- Fixed remote publisher wallet gas provisioning after the 10-user canary exposed an otherwise inactive publisher. A 25-user belief write exhausted an exact RPC gas estimate; campaign belief writes now have explicit gas limits.
- Updated stale preflight approval wording and gates to match the plan's 2026-09-28 readiness decision. Run the read-only verifier before remote mutation; DNS, indexer and contract failures are blockers.
- Typecheck and focused tests passed. Full `fake-data-generation` tests passed before switching `.env` to Base Sepolia; afterward the live-local-stack test fails only because it expects the local indexer. Switch env back to localhost for that test later.

## Remote stages

- Read-only `./scripts/verifier-testnet.sh` passed DNS, HTTP, RPC, indexer (lag 1), app shell/config, contracts, sponsored gas, and policy enforcement. Its overall rollup was red due to stale/failing older browser and guarded-journey results; the readiness-critical checks passed.
- Stage 10: **95/95 mined and reconciled**, zero discrepancies, indexer lag 2. Initial run had 58 unsent publishes fail for unfunded publisher; after the provisioning fix those exact no-hash failures were reset and safely resumed. Two note actions from the first run remained mined.
- Stage 25: **167/167 mined and reconciled**, zero discrepancies, lag 2. One belief tx reverted at gas used = gas limit (26,795); its receipt was verified reverted, the single row reset, and the new gas limit succeeded.
- Stage 100: quote at 6,000,000 wei/gas was **0.0106332875 ETH** plus **36.42 USDZZZ**; funder had **0.03296849 ETH** and over 1 million USDZZZ before starting. Execution used public RPC, a 0.02 ETH action budget, 1,508-transaction cap, and resumed from concurrency 1 to 4. I stopped it for handoff; persisted state has **392 mined, 4 submitted hashes, 1,112 planned, 0 failed**. The runner's receipt lookup is designed to resume submitted hashes without resending. Stage state: `fake-data-generation/output/campaigns/medium-realistic-v2-step14/stage-100/execution/actions.jsonl`.

## Resume

The local `.env` profile currently points at Base Sepolia. The stage-100 runner is stopped. Resume with:

`RPC_URL=https://sepolia.base.org npm run gen:campaign:execute --workspace=fake-data-generation -- --mode remote --confirm-remote-mutation --chain-id 84532 --deployment-env ../deployments/base-sepolia.env --output output/campaigns/medium-realistic-v2-step14 --user-count 100 --concurrency 4 --pacing-ms 250 --native-budget-wei 20000000000000000 --transaction-cap 1508`

Re-run the read-only verifier first, per the readiness gate. Watch the persisted state for failed actions. If any fail, diagnose and reconcile before any new stage. After completion, run:

`RPC_URL=https://sepolia.base.org EVENT_CACHE_URL=https://commonality-indexer.onrender.com npm run gen:campaign:reconcile --workspace=fake-data-generation -- campaigns/medium-realistic-v2.json output/campaigns/medium-realistic-v2-step14 --user-count 100 --chain-id 84532`

Then verify reimbursement in the stage-100 reconciliation and indexed SDK state, write a concise v2 step-14 run report, check off item 14 in the plan, and review the diff. The current plan's preflight artifacts were generated before the wording fix; regenerate if reporting them. Restore localhost env with `./scripts/setup-env.sh localhost` when remote work is done. Temporary debug files `tmp/step14-*` should be removed.

## Suggested skills

No additional skill is needed for the campaign execution. Use `browser-driving` only if inspecting the resulting UI in a browser; `handoff` has already captured this checkpoint.
