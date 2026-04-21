# Continuity notes for ephemeral AI instances

## 2026-04-21 - AI Services Review Plan: Chunk 2 (Completed)

**Task**: Chunk 2 of [AI-SERVICES-REVIEW-PLAN.md](AI-SERVICES-REVIEW-PLAN.md) — reconcile `specs/product/bridge-finder.md` with the current architecture.

**What was done**:
- Rewrote [specs/product/bridge-finder.md](specs/product/bridge-finder.md) to resolve the architecture confusion. The old file was a pre-architecture sketch asking "should we build a separate bridge-finder service?" The answer is now clear: no. The two bridge problems are:
  1. **Active synthesis** (creating new statements) → handled by the bridge-creator nudger (already specced)
  2. **Priority discovery** (finding cross-side moderate pairs worth evaluating) → a scoring enhancement to the existing implication finder, not a new service
- The new bridge-finder.md explains the distinction, recommends implementing bridge-priority scoring as a mode of the implication finder, describes what metadata would be needed (polarity, isModerate, hasConditionalClauses), and notes that this is not blocking anything.
- Updated [specs/product/bridge-creator.md](specs/product/bridge-creator.md):
  - Fixed two broken relative paths (`specs/tech/...` → `../tech/...`)
  - Updated "signed nudge messages" language to match the current nudger publication model (`nudge-batch` publications, IPFS CID on-chain)
  - Replaced the hints.md reference with a direct link to the nudger spec (`../tech/subsystems/nudger/README.md`)
- Marked Chunk 2 complete in AI-SERVICES-REVIEW-PLAN.md.

**Key decisions**:
- Did not change the bridge-creator.md's thinking-out-loud voice or the worked abortion example — that's still the clearest illustration of what the bridge-creator does.
- The bridge-finder.md path fixes were needed because the file was using repo-root-relative paths in markdown links (e.g. `specs/tech/...`) rather than relative paths from `specs/product/` (e.g. `../tech/...`).

**Files changed**:
- `specs/product/bridge-finder.md`
- `specs/product/bridge-creator.md`
- `AI-SERVICES-REVIEW-PLAN.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. Chunk 2 is complete. Continue with Chunk 3 (check nudger-core and implication-graph-nudger code against the publication-model spec).

## 2026-04-21 - AI Services Review Plan: Chunk 1 (Completed)

**Task**: Chunk 1 of [AI-SERVICES-REVIEW-PLAN.md](AI-SERVICES-REVIEW-PLAN.md) — rewrite `specs/product/ai-assistance.md`.

**What was done**:
- Rewrote [specs/product/ai-assistance.md](specs/product/ai-assistance.md) from scratch.
- The old file mixed autonomous AI services with user-facing interactive skills, and had an outstanding TODO note to reconcile it with the new attester/finder/nudger ecosystem.
- New structure:
  1. A "three layers" intro (primitives → services → user-facing skills) replacing the old "two layers" framing.
  2. A **Services** section covering attesters, finders, nudgers, and explorers — each with a brief description and pointer to the relevant spec.
  3. A **User-facing AI skills** section with only genuinely interactive skills: onboarding/education, delegation advisor, funding strategy advisor, project creation assistant, analytics and insights, attester/nudger trust configuration.
  4. Removed skills now handled by services: statement finder/writer (→ explorer+nudger), cause discovery/coalition building (→ bridge-creator+explorer), bridge creator/statement synthesis (→ bridge-creator nudger service), watchdog (→ nudger pipeline).
- Updated TODO.md to mark the "Think through AI skills" item as done.

**Key decisions**:
- Preserved the author's thinking-out-loud voice and kept descriptions concise.
- Kept "attester management" as a user-facing skill (it's about trust configuration choices, which are genuinely interactive) but renamed it to "Attester and nudger trust configuration" to reflect the full settings surface.
- Removed "social verification and identity linking" — it's a one-time setup task, not really an AI skill, and didn't fit cleanly in either layer. (Worth reconsidering if/when verification gets more complex.)

**Files changed**:
- `specs/product/ai-assistance.md`
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. Chunk 1 is complete. Continue with chunks 2–7 of AI-SERVICES-REVIEW-PLAN.md, each as a separate fresh LLM instance.

## 2026-04-19 - Docker BuildKit Cache Mounts For Compose Images (Completed)

**Task**: Continue the build-improvement thread from [TODO.md](/home/adam/Projects/commonality/TODO.md) by adding package-manager cache mounts where they speed up local image rebuilds without changing correctness.

**Changes made**:
- Added `# syntax=docker/dockerfile:1.7` plus `RUN --mount=type=cache,target=/root/.npm ...` to the dependency-install layers in the compose-built Node images:
  - [ui/Dockerfile](/home/adam/Projects/commonality/ui/Dockerfile)
  - [hardhat/Dockerfile](/home/adam/Projects/commonality/hardhat/Dockerfile)
  - [indexer/Dockerfile](/home/adam/Projects/commonality/indexer/Dockerfile)
  - [platform-api-service/Dockerfile](/home/adam/Projects/commonality/platform-api-service/Dockerfile)
  - [content-attester/Dockerfile](/home/adam/Projects/commonality/content-attester/Dockerfile)
  - [implication-graph-nudger/Dockerfile](/home/adam/Projects/commonality/implication-graph-nudger/Dockerfile)
- Updated [TODO.md](/home/adam/Projects/commonality/TODO.md) to mark this build follow-up done.
- Updated [README.md](/home/adam/Projects/commonality/README.md) high-level status to mention the new Docker cache layer improvement.

**Verified**:
- `docker compose build hardhat-deploy ui-ipfs-publisher-commonality platform-api-service indexer implication-graph-nudger content-attester-neutral`

**Key decisions**:
- Keep the scope to the Dockerfiles actually built through the repo's compose/local-development path, because this environment's plain `docker build` still uses the legacy builder unless `buildx` is installed.
- Only cache the package-manager download directories; do not cache build outputs or `node_modules`, so correctness still depends on the image layer inputs and not on mutable shared state.

**Files changed**:
- `ui/Dockerfile`
- `hardhat/Dockerfile`
- `indexer/Dockerfile`
- `platform-api-service/Dockerfile`
- `content-attester/Dockerfile`
- `implication-graph-nudger/Dockerfile`
- `TODO.md`
- `README.md`

**Blockers / notes for next iteration**:
- `docker compose build` works with these cache mounts in the current environment even though it warns that Bake/buildx is missing; plain `docker build` with BuildKit syntax still fails here, so any future expansion to standalone Dockerfiles should either assume `buildx` or add a documented requirement.
- The remaining build-thread follow-up in `TODO.md` is still the direct attester/nudger workflow question: either route those entrypoints through the same planner or document the intended manual build convention.

**Interrupt point**:
- Yes. This is another clean stopping point inside the build-improvement thread.

## 2026-04-19 - Restore Pre-commit Lint Path (Completed)

**Task**: Fix the lint issue blocking the pre-commit hook.

**Changes made**:
- Updated [indexer/package.json](/home/adam/Projects/commonality/indexer/package.json) so the lint script uses `eslint .` instead of the deprecated `--ext` flag, which flat-config ESLint no longer accepts.
- Aligned the `indexer` workspace's ESLint dependency with the rest of the repo by upgrading it to ESLint 9, removing the stale `eslint-config-ponder` dependency that still enforced ESLint 7/8-era peers during isolated installs, and adding the flat-config packages that `indexer/eslint.config.js` actually imports.
- Refreshed [package-lock.json](/home/adam/Projects/commonality/package-lock.json) via `npm install --workspace indexer`.
- Added [nudger-core/eslint.config.js](/home/adam/Projects/commonality/nudger-core/eslint.config.js) by matching the existing flat-config setup used by the other shared TypeScript service libraries, so repo-wide Turbo lint can include `@commonality/nudger-core`.
- Updated [ui/src/conceptspace/pages/SettingsPage.test.tsx](/home/adam/Projects/commonality/ui/src/conceptspace/pages/SettingsPage.test.tsx) so the attester-management tests scope their queries to the correct settings section now that the page renders separate attester and nudger address forms.
- Updated [ui/src/conceptspace/components/StatementSuggestions.test.tsx](/home/adam/Projects/commonality/ui/src/conceptspace/components/StatementSuggestions.test.tsx) so it mocks `useTrustedNudgers()` directly instead of assuming there are no default trusted addresses in the environment.

**Verified**:
- `npm run lint --workspace indexer`
- `npm run lint --workspace sdk`
- `npm run lint --workspace nudger-core`
- `npm run lint-precommit`
- `docker compose build indexer`
- `npm run test --workspace=ui`

**Key decisions**:
- Fix the actual workspace mismatch instead of downgrading the config: `indexer/eslint.config.js` was already written against ESLint 9's flat-config entrypoints.
- Keep the change minimal and limited to the ESLint migration issues directly blocking the current pre-commit hook path.

**Files changed**:
- `indexer/package.json`
- `package-lock.json`
- `nudger-core/eslint.config.js`
- `ui/src/conceptspace/pages/SettingsPage.test.tsx`
- `ui/src/conceptspace/components/StatementSuggestions.test.tsx`

**Blockers / notes for next iteration**:
- `TODO.md` already had unrelated in-progress user edits, so I left it untouched rather than mixing those changes into this maintenance commit.
- The initial narrow `lint-precommit` reproduction was not sufficient because the actual Git hook runs repo-wide `turbo run lint`, then repo-wide build/tests. Once the lint blockers were fixed, the hook also exposed two stale UI test files that needed to be updated to current app behavior before the commit could land.

**Interrupt point**:
- Yes. The pre-commit lint path is green again.

## 2026-04-19 - Docker Permission Layer Trim (Completed)

**Task**: Finish one build-follow-up item from TODO.md by removing the broad `chmod -R` layers from the UI and hardhat Docker images.

**Changes made**:
- Updated [ui/Dockerfile](/home/adam/Projects/commonality/ui/Dockerfile) so the image now creates and relaxes permissions only for the paths the non-root publisher actually writes at runtime: `ui/dist` and `ui/node_modules/.tmp`.
- Updated [hardhat/Dockerfile](/home/adam/Projects/commonality/hardhat/Dockerfile) so the image now relaxes permissions only on the Hardhat output directories (`artifacts`, `cache`, `typechain-types`, `deployments`) instead of the entire `/app` tree.

**Verified**:
- `docker compose build hardhat-deploy`
- `docker compose build ui-ipfs-publisher-commonality`
- `bash -n services.sh scripts/run-integration-tests.sh`
- `docker run --rm --user 1000:1000 commonality-ui-ipfs-publisher:dev sh -lc 'test -w /workspace/ui/dist && test -w /workspace/ui/node_modules/.tmp'`
- `docker run --rm --user 1000:1000 commonality-hardhat-deploy:dev sh -lc 'test -w /app/artifacts && test -w /app/cache && test -w /app/typechain-types && test -w /app/deployments'`
- `git commit` pre-commit hook was attempted and failed for unrelated existing lint issues:
  - `commonality-indexer` still invokes ESLint with the now-invalid `--ext` flag under ESLint 9
  - `@commonality/nudger-core` currently has no `eslint.config.*`, so `eslint .` fails before reaching this task's files

**Key decisions**:
- Keep the images runnable as the host UID/GID, but only open the directories that actually need runtime writes.
- Do not broaden the scope again unless a concrete runtime failure shows another path really needs to be writable.

**Files changed**:
- `ui/Dockerfile`
- `hardhat/Dockerfile`
- `TODO.md`
- `README.md`

**Blockers / notes for next iteration**:
- The broader Docker-build follow-up list still has two open items: BuildKit cache mounts and planner/documentation coverage for direct attester/nudger compose workflows.
- I did not run a full `./services.sh --start`; verification here stayed focused on the two rebuilt images and runtime writability under UID `1000`.
- If someone wants pre-commit to succeed again repo-wide, fix the existing ESLint 9 migration issues in `indexer/` and `nudger-core/`.

**Interrupt point**:
- Yes. This is a clean stopping point inside the build-improvement thread.

## 2026-04-19 - Build/Test/Docker Incrementality (Completed First Pass)

**Task**: Make builds/tests/docker startup smarter about only rebuilding what changed, without reintroducing stale-image/stale-build bugs.

**Changes made**:
- Added `turbo` at the repo root and switched root `build` / `typecheck` / `lint` / `clean` scripts in [package.json](/home/adam/Projects/commonality/package.json) to use an explicit workspace task graph defined in [turbo.json](/home/adam/Projects/commonality/turbo.json).
- Removed the redundant `prebuild` / `pretypecheck` hooks from the SDK-dependent leaf workspaces that were repeatedly rebuilding `sdk` (and in a few cases `nudger-core`) even when the root command had already built them.
- Added [scripts/docker-build-plan.mjs](/home/adam/Projects/commonality/scripts/docker-build-plan.mjs), which hashes each managed image's declared inputs, checks whether the tagged image exists locally, and tells the shell scripts whether a rebuild is actually needed.
- Updated [services.sh](/home/adam/Projects/commonality/services.sh) and [scripts/run-integration-tests.sh](/home/adam/Projects/commonality/scripts/run-integration-tests.sh) to:
  - rebuild only the Docker services whose declared inputs changed or whose images are missing
  - do plain `docker compose up -d` afterward instead of unconditional `--build`
  - work with either `docker-compose` or `docker compose`
- Added explicit image names in [docker-compose.yml](/home/adam/Projects/commonality/docker-compose.yml) so identical build definitions can share one built image (`commonality-ui-ipfs-publisher:dev`, `commonality-content-attester:dev`, etc.).
- Narrowed the root-context Dockerfiles so they copy only the manifests and source trees they actually need before building:
  - [ui/Dockerfile](/home/adam/Projects/commonality/ui/Dockerfile)
  - [platform-api-service/Dockerfile](/home/adam/Projects/commonality/platform-api-service/Dockerfile)
  - [content-attester/Dockerfile](/home/adam/Projects/commonality/content-attester/Dockerfile)
  - [implication-graph-nudger/Dockerfile](/home/adam/Projects/commonality/implication-graph-nudger/Dockerfile)
- Updated [scripts/publish-ui-to-ipfs.mjs](/home/adam/Projects/commonality/scripts/publish-ui-to-ipfs.mjs) to use the root `ui:build:ipfs` command so the UI IPFS build also goes through the new task graph.

**Verified**:
- `npm install`
- `npm run build -- --filter=ui`
  - Verified that `turbo` built `@commonality/sdk` first, then `ui`, and did not fan out to unrelated workspaces.
- `bash -n services.sh scripts/run-integration-tests.sh`
- `node scripts/docker-build-plan.mjs list hardhat-deploy indexer platform-api-service ui-ipfs-publisher-commonality ui-ipfs-publisher-content-funding`
  - Before building images, it reported the expected missing-image rebuild set.
  - After building/tagging those images, it returned an empty list.
- `docker compose build platform-api-service ui-ipfs-publisher-commonality`
- `docker compose build hardhat-deploy indexer`

**Key decisions**:
- Use explicit declared inputs plus hashing for Docker rebuild decisions rather than trusting `docker compose up --build` or trusting stale local images.
- Keep Docker Compose as the orchestrator, but move rebuild policy into repo-owned scripts so it behaves more like a Makefile dependency graph.
- Share image tags across identical build definitions so Compose does not keep materializing equivalent images under separate service-local names.

**Known limitations / next likely improvements**:
- The `chmod -R` steps in `ui/Dockerfile` and `hardhat/Dockerfile` are still expensive. If startup/build speed is still annoying, trim those to the specific writable paths instead of the whole image tree.
- The Docker planner currently governs the flows used by `services.sh` and `scripts/run-integration-tests.sh`. If local workflows start commonly launching the content attesters or nudger directly, extend the same planner coverage to those entrypoints too.
- I did not run the full multi-minute test suite or a full `./services.sh --start` end-to-end after the refactor; verification was targeted at the task graph, script parsing, and representative image builds.

**Files changed**:
- `package.json`
- `package-lock.json`
- `turbo.json`
- `services.sh`
- `scripts/run-integration-tests.sh`
- `scripts/docker-build-plan.mjs`
- `docker-compose.yml`
- `scripts/publish-ui-to-ipfs.mjs`
- `ui/Dockerfile`
- `platform-api-service/Dockerfile`
- `content-attester/Dockerfile`
- `implication-graph-nudger/Dockerfile`
- `ui/package.json`
- `platform-api-service/package.json`
- `content-attester/package.json`
- `implication-graph-nudger/package.json`
- `implication-attester/package.json`
- `implication-finder/package.json`
- `bridge-creator/package.json`
- `fake-data-generation/package.json`
- `.gitignore`
- `TODO.md`

**Interrupt point**:
- Yes. The first pass is in place and verified enough for handoff. The next fresh LLM can either do cleanup/perf follow-up on the slow `chmod -R` layers, extend planner coverage to more compose-driven services, or run a broader end-to-end validation pass.

## 2026-04-19 - E2E Test Triage (Completed)

**Task**: Fix the remaining failing Playwright e2e tests.

**Changes made**:
- Updated [ui/e2e/delegation-flow.spec.ts](/home/adam/Projects/commonality/ui/e2e/delegation-flow.spec.ts) to follow the current `More` menu navigation and current delegation UI copy (`My Delegated Funds`, `Funds I Control`, `Who Has Access`).
- Tightened the delegation test's synchronization to wait for the specific delegation and note-spend transaction hashes to reach the indexer, instead of only checking that the indexer service was up.
- Updated [ui/e2e/subjectiv-flow.spec.ts](/home/adam/Projects/commonality/ui/e2e/subjectiv-flow.spec.ts) to follow the current `More` menu navigation, current trust-settings copy, and scope form interactions to the `Your Trust Network` section so they do not collide with other settings forms.

**Verified passing**:
- `npm run test:e2e --workspace=ui -- e2e/delegation-flow.spec.ts`
- `npm run test:e2e --workspace=ui -- e2e/delegation-flow.spec.ts e2e/subjectiv-flow.spec.ts`

**Key decisions**:
- Treat the shell/menu copy drift as stale-test fixes, not UI regressions.
- Treat the delegation note-detail flake as a synchronization problem and fix it with tx-hash-based indexer waits rather than weakening the note-detail assertions away.

**Files changed**:
- `ui/e2e/delegation-flow.spec.ts`
- `ui/e2e/subjectiv-flow.spec.ts`

**Blockers / follow-up notes**:
- The delegation test still prints long `waitForIndexerToSyncToTxHash` "indexer appears stuck" warnings before the indexer catches up; the flow passes, but there is probably still low-hanging fruit in test-stack startup/indexer sync speed.

**Interrupt point**:
- Yes. The broken e2e triage task is complete and this is a reasonable point for broader test-speed or e2e-maintenance work if desired.

## 2026-04-19 - E2E Test Triage (Partially Completed)

**Task**: Fix failing Playwright e2e tests.

**Changes made**:
- Updated multiple Playwright specs that still assumed the connected conceptspace home route was `/`; the current route is `/start`.
- Updated belief-expression assertions to match current `SupportMetrics` UI copy (`signer` / `opposing signer` instead of `direct believer` / `disbeliever`).
- Fixed a real SDK bug in [sdk/src/subsystems/content-funding/actions.ts](/home/adam/Projects/commonality/sdk/src/subsystems/content-funding/actions.ts):
  - Stale `CreatorAssuranceContractFactoryAbi` usage was missing `paymentToken`, breaking `createContentFundingContract`.
  - Replaced that dependency in the action with a minimal local ABI for the functions/events the action actually needs.
  - Corrected `erc1155Address` to be read from `contractERC1155(contractAddress)` instead of incorrectly using the event's `creator` field.
- Rebuilt the SDK after the action change.

**Verified passing**:
- `ui/e2e/wallet-connection.spec.ts`
- `ui/e2e/belief-expression.spec.ts`
- `ui/e2e/content-funding-flow.spec.ts`

**Current remaining blocker from the last full run**:
- `ui/e2e/delegation-flow.spec.ts` timed out at the step that clicks a header link named `My Notes`.
- The failure happened at the navigation/UI layer after the earlier route and content-funding issues were already fixed, so this is a good fresh handoff point.

**Recommended next step**:
- Inspect the current shell/header navigation labels and routes used by the delegation flow.
- Update the spec to follow the current navigation structure, or patch the shell if `My Notes` is supposed to be directly accessible there.

## 2026-04-17 - Fold Cache Implementation (Completed)

**Task**: Implement client-side storage of fold accumulators per TODO.md

**Changes made**:
- Created `ui/src/shared/foldCache.ts` - IndexedDB persistence layer for project accumulators
  - Uses IndexedDB (not localStorage) following the Subjectiv trust cache pattern
  - Stores: accumulator, foldVersion, and blockNumber
  - Cache key includes: eventCacheUrl, assuranceContractFactory address, project address, foldType
  - On load: validates foldVersion matches CURRENT_PROJECT_FOLD_VERSION, returns null if stale
  - Handles bigint serialization/deserialization
- Created `ui/src/shared/foldCache.test.ts` - Tests for the cache (3 tests passing)
- Created `ui/src/shared/hooks/useCachedProject.ts` - React hook that integrates the cache with getProject
- Updated `sdk/src/utils/eventCacheClient.ts` - Added `blockNumber_gte` option to `fetchPubstarterProjectEvents`
- Updated `sdk/src/subsystems/pubstarter/queries.ts`:
  - Added `ProjectAccumulator` export from folds
  - Updated `getProject` to accept optional `initialAccumulator` and `blockNumber_gte` options for resumable folding
- Updated `sdk/src/subsystems/pubstarter/folds.ts` - Already had initialAccumulator support, just verified it's exported

**Integration**:
- The `useCachedProject` hook can be used in any UI component that needs project data with caching
- It automatically handles: loading from cache, fetching new events after cached block number, saving updated accumulators

**Next steps** (not yet implemented, lower priority):
- Wire up specific UI pages to use useCachedProject (e.g., BrowseProjectsPage, ProjectDetailPage)
- Add tests for incremental resume producing the same result as full refold
- Extend pattern to other fold types (contributions, secondary market, burns) if performance warrants

**Note**: The fold cache requires eventCacheUrl to be configured in the machinery - it gracefully falls back to regular loading if not available.

---

## 2026-04-16 - API/ABI/SDK Documentation Generation

**Task**: Added documentation generation for SDK (TypeScript) and smart contracts (Solidity NatSpec)

**Changes made**:
- Added `typedoc` to SDK workspace - generates HTML API docs to `sdk/docs/api/`
- Added `solidity-docgen` to hardhat workspace - generates contract docs to `hardhat/docs/contracts/`
- Added `docs` script to SDK package.json (`npm run docs`)
- Added `docs` script to hardhat package.json (`npm run docs`)
- Added `build:docs` script to root package.json (`npm run build:docs`)
- Added `typedoc.json` config in SDK
- Configured `docgen` in hardhat.config.cjs
- Added generated docs to `.gitignore`

**Usage**:
```bash
npm run build:docs  # generates both SDK and contract docs
# Or individually:
npm run docs --workspace=sdk
npm run docs --workspace=hardhat
```

**Next steps** (not yet implemented):
- Link docs from UI user-facing docs (add to `/docs/` or relevant UI pages)
- Consider copying generated docs to a location accessible from deployed UI
- Add docs generation to CI/CD pipeline

**Note**: The typedoc generates many warnings about viem types - these are noise from the SDK exposing viem clients. Could be suppressed with externalSymbolLinkMappings config.

No ongoing work in progress. See [TODO.md](TODO.md) for the next tasks.
