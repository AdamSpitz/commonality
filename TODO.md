# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

----

## Service bundling → Follow-up cleanup

- [ ] Move service-specific env parsing out of `service-host/src/envConfig.ts` and into each logical service package.
- [ ] Make the service-host env path lazy: only require env vars for enabled service entries.
- [ ] Rename remaining canonical `worker-host` type/env names to `service-host` names and remove aliases.
- [ ] Let env-config mode run multiple instances of the same service kind with distinct prefixes.


- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.
