# Handoff: deploy efficiency contracts, then run staged Base Sepolia campaigns

Adam asked the next LLM to deploy the new contracts and run the testnet simulations. This follows commit `c282b0a5` on `feature/both-efficiency-changes`. That branch also contains batching (`75c4f055`) and receipt-token clones (`5b66a1c0`). The code commit passed the full pre-commit lint/build/fast-test hook. Nothing from this branch has been pushed or merged in this session.

## Start here

- Read root `README.md`, `workflow/roles/developer.md`, `workflow/branching.md`, `workflow/deployment.md`, and `fake-data-generation/TESTNET-SIMULATION-PLAN.md` (especially readiness and items 9–11). Do not broadly explore `specs/`.
- Read `fake-data-generation/README.md` for campaign commands and `workflow/testnet-working-plan.md` for the shared testnet lab.
- Check Git status and branch. Follow the feature-PR-to-`dev` workflow; ensure deployed services use new contract addresses.

## Verified state on 2026-09-29

- Read-only Base Sepolia RPC (`https://sepolia.base.org`) returned a gas-price quote of **6,000,000 wei**. The read-only canary preflight, with `EVENT_CACHE_URL=https://commonality-indexer.onrender.com`, passed its technical gates (indexer lag 1 block) and estimated **0.00660745 ETH** for 10 users. Its artifact is gitignored at `fake-data-generation/output/campaigns/medium-realistic-v1/reports/remote-canary-preflight.md`. Re-run before execution; this is a transfer estimate, not measured gas spend.
- The deployed ERC1155 factory address in `deployments/base-sepolia.env` reverted on `implementation()`, indicating the new clone-capable factory was not yet deployed. The new `PublishedData.publishDataBatch` also needs deployment before batched statement publishing is enabled; the runner probes its bytecode and falls back to individual publishes.
- Local 100-user execution receipts in `fake-data-generation/output/campaigns/medium-realistic-v1/execution/actions.jsonl` showed **4,138,767 gas** per `create-project` action on the direct-token factory. `campaignBatching.ts` now estimates 4.5 million until clone-path receipts justify recalibration. The clone change's local measurement is documented in `hardhat/contracts/individual-projects/ProjectFactory.sol`.
- `campaignExecute.ts` uses one live RPC gas-price quote for provisioning and execution estimates. `campaignCanary.ts` uses a live quote for its report. `campaignProvisioning.ts` uses a 0.0001 ETH floor plus 25% of estimated gas on active wallets. The previous fixed 0.001 ETH per wallet is gone.

## Next actions

1. Read `workflow/deployment.md` and inspect the incremental deployment plan/manifest. Deploy the changed factory and PublishedData contracts to Base Sepolia with `./scripts/deploy-contracts.sh base-sepolia`, following the documented secret-custody and admin rules. Commit both changed deployment files. Confirm the ERC1155 factory's `implementation()` and the PublishedData batch selector on chain, and verify downstream addresses/configuration. Do not assume old contract addresses now have new code.
2. Run `./scripts/verifier-testnet.sh` and the read-only campaign preflight using the intended RPC and indexer endpoint. The old preflight artifact's `needs-adam` lines are superseded by the readiness decision in `TESTNET-SIMULATION-PLAN.md`; the remote mutation flag is the required opt-in. Check current deployer balance and actual wallet funding need, including any payment token balance.
3. Run the 10-user canary, reconcile it, and inspect a representative UI journey. Demonstrate resume without duplicate writes. Measure actual receipt gas/cost by action and compare with estimates, especially cloned project creation, batched publishes, and token approvals. The campaign SDK helpers may submit ancillary transactions (metadata publish and ERC20 approve) that are not represented by the returned action hash; assess their cost before expanding.
4. Only after a reconciled canary, stage 25 then 100 users per the plan. Stop on unexplained discrepancies. Capture gas, indexer lag, balances, and product observations in the campaign report. Update gas-unit estimates from deployed clone receipts.

## Suggested skills

- No specialist skill is required for deployment. Use the project developer and deployment guidance above.
- `browser-driving` is useful for the requested representative UI inspection after each run.
- `thorough-tester` can help design adversarial resume/reconciliation checks if the campaign exposes a concrete failure.
