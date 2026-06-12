# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

----

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] Hardhat 2→3 migration — defer until after current testnet stabilization, but revisit before mainnet. Treat as a standalone
migration project, not a dependency bump:
  - migrate `hardhat.config.cjs` to ESM `hardhat.config.ts`
  - replace `@nomicfoundation/hardhat-toolbox` with `@nomicfoundation/hardhat-toolbox-mocha-ethers`
  - update tests/deploy scripts for explicit Hardhat 3 network connections
  - replace/remove Hardhat-2-only plugins (`@typechain/hardhat`, `solidity-docgen`, `solidity-coverage`, `hardhat-gas-reporter` as
needed)
  - verify `compile`, `test`, contract docs, deployment scripts, and verifier checks
