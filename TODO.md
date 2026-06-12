# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

----

## Service bundling → Follow-up cleanup

- [x] Move service-specific env parsing out of `service-host/src/envConfig.ts` and into each logical service package.
- [x] Make the service-host env path lazy: only require env vars for enabled service entries.
- [x] Rename remaining canonical `worker-host` type/env names to `service-host` names and remove aliases.
- [x] Let env-config mode run multiple instances of the same service kind with distinct prefixes.


- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

## Code-quality cleanups (from project-wide review 2026-06-12)

Harvested from the 2026-06-12 project-wide review (code-quality findings 9–13); this section is now the canonical task list.

- [ ] Tear down the dead GraphQL layer in `sdk`: delete `sdk/src/generated/` (nothing imports it — queries migrated to event-cache + folds), remove the `codegen` step from `sdk`'s build script, drop the `@graphql-codegen/*` devDependencies, and fix the `machinery.indexerUrl` docstring (it still says "GraphQL indexer"; only `indexer-sync.ts` uses it, to extract the origin).
- [ ] Rename `TestClients` (`sdk/src/utils/ethereum.ts:20`) to something like `WriteClients` — it's the production write-path type for all SDK actions, despite the name. Add a shared `useWriteClients()` hook in `ui/src/shared/hooks/` (beside `useMachinery()`) to replace the ~22 hand-rolled `walletClient as any / publicClient as any` cast sites across 12+ UI files.
- [ ] Split `ui/src/conceptspace/pages/SettingsPage.tsx` (971 lines, a single component with 24 `useState`s) into per-section components. (Lower priority: `MyRefsPage.tsx` is 966 lines but already internally factored into 13 components — just split the file; `CreateContractPage.tsx` 849 and `NoteDetailPage.tsx` 786 are also large.)
- [ ] Consolidate `truncateAddress` into one shared util — currently implemented 4× in `ui` (`delegation/utils.ts`, `CauseLeaderboardPage`, `PrivyWalletButtonImpl`, `Leaderboard`).
- [ ] (Cosmetic) Cross-package naming drift: ui `mutablerefs/`/`fundingportal/` vs sdk `mutable-refs/`/`fundingportals/`; camelCase `lazyGiving` vs kebab-case elsewhere. Defeats grep-by-name; align if ever touching these anyway.

## Architecture robustness (from project-wide review addendum 2026-06-12)

Harvested from the 2026-06-12 project-wide review addendum (architecture robustness findings 27–29); this section is now the canonical task list.

- [ ] Wire read-your-writes into the UI: after a write, components currently refetch immediately (`refreshKey` bump) and race the indexer — the user's own action can be missing from the refreshed view. Use `waitForIndexerToSyncToTxHash` (`sdk/src/indexer-sync.ts`, currently used only by integration-tests) in the post-write refresh path. Natural fit: build it into the planned `useWriteClients()` hook (see code-quality item above) or a sibling `useWriteAndSync()`.
- [ ] Add exponential backoff (with cap) and a restart counter to the service-host supervisor (`service-host/src/supervisor.ts:56`) — currently a crashed service restarts forever at a fixed 1s delay: hot-loop on startup crashes, repeated paid-API/LLM calls if the crash is post-call.
- [ ] Add a truncation guard to the `limit: 10000` global queries (4 sites in `sdk/src/subsystems/conceptspace/queries.ts`): warn or error when a response exactly hits the limit, so browse-by-most-supporters fails loudly instead of silently ranking on a truncated event set.

## Tech-debt items (from project-wide review 2026-06-12)

Harvested from the 2026-06-12 project-wide review (tech-debt findings 21–23); this section is now the canonical task list.

- [ ] Run `npm audit fix` (non-breaking) and verify it clears the vitest/vite/react-router-dom/shell-quote critical+high findings; rerun the affected test suites. (Ignore the ponder "high" — its suggested fix is `ponder@0.0.1`, a semver-range artifact.)
- [ ] Decide hardhat 2→3 migration timing deliberately (whole toolbox/ignition stack — a real migration project). Not needed for testnet; should be a conscious decision before mainnet rather than drift.
- [ ] Fold the 5 open live-environment items from `testnet-verifier-todo.md` into `verifier/PLAN.md` (they're about funded-wallet/guarded testnet runs already echoed in CONTINUITY.md), then delete the file.

## Finish the "funding portal" → "cause board" rename (Tell)

Adam has ruled (2026-06-12): **"cause board" is the term.** The rename was started but never finished — domain landing pages/manifests (`ui/src/domains/alignment/`, `ui/src/domains/common-sense-majority/`) and `specs/product/ui-domains.md` already say "cause board", but the rest still says "funding portal". This is *user-facing copy only* — do **not** rename code identifiers, file/directory names (`ui/src/fundingportal/`, `sdk/src/subsystems/fundingportals/`), routes (`/portal/:statementCid`), or event/contract names; that's covered (if ever) by the cosmetic naming-drift item above. `specs/tech/subsystems/fundingportals/README.md` already documents the convention: "cause board (historically called a funding portal in code and older docs)".

Where "funding portal" still appears in user-facing text:

- [ ] **UI copy** (headings, buttons, link text, error messages shown to users):
  - `ui/src/fundingportal/pages/StatementFundingPortalPage.tsx` ("Funding Portal" heading, error strings)
  - `ui/src/fundingportal/components/FundingPortalSummary.tsx` ("Funding Portal" heading, "View Funding Portal" button, error strings)
  - `ui/src/fundingportal/pages/ExplorerPage.tsx` ("Open Funding Portal" links — note line 263 already says "cause board"; the same file is inconsistent with itself)
  - `ui/src/fundingportal/pages/CauseLeaderboardPage.tsx` ("← Back to Funding Portal")
  - `ui/src/conceptspace/pages/BrowseStatementsPage.tsx`, `HomePage.tsx`, `StatementPage.tsx`
  - `ui/src/domains/civility/ContentPages.tsx`, `ui/src/domains/content-funding/ContentPages.tsx`
  - Update the corresponding `.test.tsx` assertions (`FundingPortalSummary.test.tsx`, `StatementFundingPortalPage.test.tsx`, `ExplorerPage.test.tsx`).
- [ ] **End-user docs**: 22 files under `docs/end-user/` (grep `-ri "funding portal" docs/end-user` — e.g. `tldr-for-llms.md`, `alignment/`, `tally/`, `shared/key-ideas/`, `shared/use-case-walkthroughs/`, `commonality/`, `civility/index.md`, `lazyGiving/get-your-project-funded.md`, `common-sense-majority/`).
- [ ] **Other docs**: `specs/dev/testing/pregenerated-worker-outputs.md`. Leave alone: `docs/chats/` (transcripts are historical records), `workflow/reviews/` (point-in-time reviews), and the parenthetical in `specs/tech/subsystems/fundingportals/README.md` (it intentionally documents the old name).
- [ ] After the sweep, rerun `npm run verifier:docs` so the docs-coherence terminology finding clears.
