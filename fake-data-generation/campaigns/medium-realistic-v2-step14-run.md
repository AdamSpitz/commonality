# Medium realistic v2 — step 14 funding redesign, local and Base Sepolia stages

Operator notes for the 2026-10-02 step-14 run of `TESTNET-SIMULATION-PLAN.md` item 14. Per-stage execution files, wallet secrets, and reconciliation JSON stay gitignored under `output/campaigns/medium-realistic-v2-step14/`. This page records the measurements those files support. The run is synthetic activity on accepted seed statements. It is not a capacity or adoption claim.

Chain 84532. Campaign sends used the public RPC `https://sepolia.base.org`; the hosted indexer stayed at `https://commonality-indexer.onrender.com`.

## What changed

- V2 `fund-project` actions now buy varied ERC1155 receipt quantities at each project's real price instead of the fixed v1 purchase unit; wallet provisioning and SDK-derived checks use the resulting amounts. V1 legacy actions keep their fixed-purchase behavior.
- The campaign now exercises cross-camp contributions: an abortion common-ground project has 20 prerequisite purchases totaling its 2 USDZZZ success threshold, split between two backers with explicit left/right natural-statement beliefs.
- Retroactive reimbursement is exercised: four later actions donate 0.25 USDZZZ each into the reimbursement waterfall.
- Fixes found by the remote stages: remote publisher wallets now get explicit gas provisioning (the 10-user canary exposed an otherwise inactive publisher), and campaign belief writes carry explicit gas limits after a 25-user belief tx reverted at gas used = gas limit (26,795).

## What reconciled

| Stage | Actions | Reconciliation | Indexer lag |
| --- | --- | --- | --- |
| local | 1508 mined | 1508/1508 verified, zero lag | 0 |
| 10 | 95 mined | 95/95 verified at chain head 47598305 | 2 |
| 25 | 167 mined | 167/167 verified at chain head 47598625 | 2 |
| 100 | 1508 mined | 1508/1508 verified at chain head 47602006 (indexer head 47602005) | 1 |

All stages reconciled with zero indexing or derived-state discrepancies (`verified` only; no pending, missing, duplicate, derived-mismatch, or not-mined rows). Stage-100 actions by type: 58 publish-statement, 14 create-cause, 16 create-bridge-board, 4 create-bridge, 378 set-belief, 20 attest-implication, 29 create-project, 49 attest-alignment, 591 fund-project, 198 deposit-note, 141 delegate-note, 10 revoke-delegation.

## Stage 100

- Preflight quote (2026-10-02, `stage-100/reports/remote-canary-preflight.md`): 100 users, 1508 writes, gas-price snapshot 6,000,000 wei, native quoted **0.0106332875 ETH**, payment-token units **36,420,000 (36.42 USDZZZ)**. Funder held 0.03296849 ETH and over 1 million USDZZZ before starting.
- Execution used public RPC, a 0.02 ETH action budget, a 1508-transaction cap, and resumed from concurrency 1 to 4 after a handoff pause at 392 mined / 4 submitted hashes / 1112 planned. The runner's receipt lookup resumed the submitted hashes without resending; every remaining action mined on its first attempt (max attempts 1).
- Receipt cost across 1,151 unique transaction hashes: **203,162,446 gas**, **0.0011711038 ETH** — under both the 0.02 ETH budget and the gross quote.
- The four retroactive donation actions' SDK-derived reimbursement check reports expected = actual = **1,000,000 units (1 USDZZZ total)** in `getProjectReimbursementState().totalRetroactiveDonations`, confirming the waterfall indexed correctly.

`./scripts/verifier-testnet.sh` passed DNS, HTTP, RPC, indexer, app shell/config, contracts, sponsored gas, and policy enforcement before mutation. Its overall rollup stayed red only from stale/failing older browser and guarded-journey results, which are not readiness blockers.

## Reproduction

Preflight and execution follow `campaigns/medium-realistic-v1-testnet-run.md`; the stage-100 resume command is recorded in `continuity/2026-10-02-v2-funding-step14-handoff.md`. The local `.env` profile was pointed at Base Sepolia for these runs and restored to localhost with `./scripts/setup-env.sh localhost` afterward.
