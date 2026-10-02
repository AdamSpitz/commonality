# Medium realistic v2 — local run (2026-10-02)

V2 ran on a clean local chain (31337) after `./scripts/data.sh --wipe` and `./scripts/services.sh --start`. It was not run on testnet. The default plan contained 100 users, 14 causes, 58 statements, 29 projects, and 1,502 actions.

## Result

- Execution: 1,502 mined, 0 failed, 0 pending. The persisted execution state is under `output/campaigns/medium-realistic-v2/execution/` (gitignored).
- Reconciliation: **1,502/1,502 verified**, with 0 missing, duplicate, or derived-mismatch actions. Chain and indexer both ended at block 2,085 (lag 0). The machine-readable report is `output/campaigns/medium-realistic-v2/reports/reconciliation.json`.
- The 1,502 actions include 587 project purchases, 376 beliefs, 198 note deposits, 141 delegations, 49 alignment attestations, and 29 project creations. Recorded action gas was 260,317,474 units; recorded action native cost was 0.204758290638062980 ETH. Wallet provisioning and ERC20 approvals are separate from these action totals.
- The encrypted test-data run `20261002T174521960Z` lists 30 cause boards, four bridge clusters, and all 29 projects. Browser inspection visited every board and all nine hobby project pages. The board pages rendered headings without errors; the hobby pages rendered their titles and project details. The Grey County guitar songbook page showed Noah's founder bio and a funding total.

## Execution fixes found during the run

The local stack startup had rerun `hardhat-deploy` while starting app services, causing an incremental ownership revert. `services.sh` now starts app services with `--no-deps` after core deployment. A fresh wipe and restart then completed cleanly.

At the first funding action, four workers waited for three approval confirmations. Local Anvil mines only when a transaction is sent, so the confirmation wait stalled. Local campaign approvals now wait for one confirmation; remote approvals retain three. The first interrupted approval mined successfully, but its action was recorded as failed after a receipt timeout. I reset that one local action to planned in the gitignored execution state and resumed it. The final state and reconciliation include its successful purchase.

The first admin run document omitted projects, so `TestDataRunPage` had no project links. Campaign run publications now include bound project addresses and curated titles. The UI accepts those assurance-address links without requiring an ERC1155 address in the run document. The refreshed encrypted run and republished local IPFS UI rendered all 29 project links.

## Reproduce

From a clean local stack, run `npm run gen:campaign:plan --workspace=fake-data-generation`, then `npm run gen:campaign:execute --workspace=fake-data-generation -- --concurrency 4`, then `npm run gen:campaign:reconcile --workspace=fake-data-generation`. Local campaign output and wallet secrets are gitignored. The run can be resumed with the execute command; it reads the persisted action state.
