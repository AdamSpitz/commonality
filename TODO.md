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

## Code-quality cleanups (from project-wide review 2026-06-12)

Details in `workflow/reviews/architecture-2026-06-12.md` ("Code quality patterns" chunk, findings 9–13).

- [ ] Tear down the dead GraphQL layer in `sdk`: delete `sdk/src/generated/` (nothing imports it — queries migrated to event-cache + folds), remove the `codegen` step from `sdk`'s build script, drop the `@graphql-codegen/*` devDependencies, and fix the `machinery.indexerUrl` docstring (it still says "GraphQL indexer"; only `indexer-sync.ts` uses it, to extract the origin).
- [ ] Rename `TestClients` (`sdk/src/utils/ethereum.ts:20`) to something like `WriteClients` — it's the production write-path type for all SDK actions, despite the name. Add a shared `useWriteClients()` hook in `ui/src/shared/hooks/` (beside `useMachinery()`) to replace the ~22 hand-rolled `walletClient as any / publicClient as any` cast sites across 12+ UI files.
- [ ] Split `ui/src/conceptspace/pages/SettingsPage.tsx` (971 lines, a single component with 24 `useState`s) into per-section components. (Lower priority: `MyRefsPage.tsx` is 966 lines but already internally factored into 13 components — just split the file; `CreateContractPage.tsx` 849 and `NoteDetailPage.tsx` 786 are also large.)
- [ ] Consolidate `truncateAddress` into one shared util — currently implemented 4× in `ui` (`delegation/utils.ts`, `CauseLeaderboardPage`, `PrivyWalletButtonImpl`, `Leaderboard`).
- [ ] (Cosmetic) Cross-package naming drift: ui `mutablerefs/`/`fundingportal/` vs sdk `mutable-refs/`/`fundingportals/`; camelCase `lazyGiving` vs kebab-case elsewhere. Defeats grep-by-name; align if ever touching these anyway.
