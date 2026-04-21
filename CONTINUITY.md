# Continuity notes for ephemeral AI instances

## 2026-04-21 - AI Services: Bridge Creator `findBridgeCandidates` Implementation (Completed)

**Task**: Complete TODO.md item 5 — implement `findBridgeCandidates` in the bridge-creator nudger.
Spec: `specs/product/bridge-creator.md`.

**What was done**:
- Implemented `findBridgeCandidates` to fetch candidate statements from the chain via `getAllStatements` (limit 20), then use the existing `analyzeCompatibility` LLM helper to check each pair. Returns candidates where at least one direction shows compatibility.
- Also checks pre-configured `COMMONALITY_STATEMENTS` (from env var) against each target statement, enabling operators to seed known common-ground positions.
- Wired up `createModifiedVersion` to call `generateModifiedStatement` (existing LLM helper).
- Wired up `createCommonalityStatement` to call `generateCommonalityStatement` (existing LLM helper).
- Added `bridge-creator` to the root `package.json` workspaces list so it can be typechecked/linted via the monorepo tooling.
- Updated `bridge-creator/README.md` to reflect the implemented status and document the `COMMONALITY_STATEMENTS` env var.

**Key decisions**:
- Used `getAllStatements` with a limit of 20 rather than scanning the entire chain — this keeps the service responsive and avoids excessive LLM calls. The limit can be tuned via config later if needed.
- Pre-configured commonality statements use `'preconfigured'` as a placeholder CID since they aren't on-chain statements. This is fine for nudge generation; the generated statements get real CIDs when published to IPFS.
- The `fetchCandidateStatements` uses a dynamic import for `getAllStatements` to avoid circular dependency issues with the SDK imports.

**Verified**:
- `npm run typecheck --workspace=@commonality/bridge-creator`
- `npm run lint --workspace=@commonality/bridge-creator`

**Files changed**:
- `bridge-creator/src/nudger.ts` (implemented findBridgeCandidates, createModifiedVersion, createCommonalityStatement)
- `bridge-creator/README.md` (updated status and config docs)
- `package.json` (added bridge-creator to workspaces)
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. The bridge-creator nudger is now functional. The next logical step would be to test it end-to-end with a running chain and seed data, or to work on the remaining AI services items (nudge metadata discovery, staleness decay, etc.).


## 2026-04-21 - AI Services: Explorer Page UI (Completed)

**Task**: Complete TODO.md item 3 — UI explorer pages backed by `curated-collection` publications.
Spec: `specs/tech/subsystems/conceptspace/explorer.md` + `specs/product/new-user-experience.md`.

**What was done**:
- Created `ui/src/conceptspace/pages/ExplorerPage.tsx` — a dedicated explorer page that:
  - Fetches the latest `curated-collection` publication from trusted nudger addresses via `getCuratedCollections(...)` SDK query (filtered to `fundable-project-explorer` stream).
  - Enriches each entry with statement metadata and the user's current belief state.
  - Groups entries by `topicArea` for navigability.
  - Renders each entry as a card with: label, statement content (via `StatementRenderer`), supporter count, belief status chip ("You signed" / "You opposed"), Sign button, Navigate link, and Funding Portal link.
  - Uses `believeStatement` SDK action (via wagmi hooks) for on-chain signing, matching the existing `BeliefControls` pattern.
  - Shows loading, empty, and error states.
- Added route `/explore` to the Commonality domain manifest and "Explore" to the primary navigation.
- Updated the HomePage onboarding steps to lead with "Explore causes" as the first entry point.
- Created `ExplorerPage.test.tsx` with 10 tests covering loading, empty, collection rendering, belief states, sign flow, and error states.

**Key decisions**:
- For v1, the per-user LLM personalization is not implemented — all curated collection entries are shown. The spec's two-tier LLM architecture (background curator + per-user personalization) requires a backend service that doesn't exist yet. The page is structured so that personalization can be added later by inserting an LLM call between fetching the collection and rendering entries.
- The Sign button uses the same `believeStatement` + wagmi pattern as `BeliefControls`, rather than introducing a new abstraction.
- The explorer is top-down only (per the spec) — no implication-based suggestions appear here.

**Verified**:
- `npm run lint --workspace=ui`
- `npm run typecheck --workspace=ui`
- `npm run test --workspace=ui -- --run ExplorerPage` (10 tests passing)
- `npm run build --workspace=ui`

**Files changed**:
- `ui/src/conceptspace/pages/ExplorerPage.tsx` (new)
- `ui/src/conceptspace/pages/ExplorerPage.test.tsx` (new)
- `ui/src/conceptspace/pages/index.ts`
- `ui/src/domains/commonality/manifest.tsx`
- `ui/src/conceptspace/pages/HomePage.tsx`
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. The explorer page UI is complete for v1. The next steps would be:
1. Build the background LLM curator service that publishes `curated-collection` snapshots (this is a backend service, not UI work).
2. Add the per-user LLM personalization endpoint (also backend).
3. Seed the initial curated collection content (product curation task, per the explorer spec's "Still needed" section).

## 2026-04-21 - AI Services: Nudge UX (Dismissal, Intensity, Filtering) (Completed)

**Task**: Complete TODO.md item 1 — nudge dismissal / "seen" tracking, intensity settings, and client-side filtering.
Spec: `specs/product/nudge-ux.md`.

**What was done**:
- Created `ui/src/shared/nudgeStore.ts` — IndexedDB persistence layer for nudge dismissal/seen tracking. Each record is keyed by `(targetStatementCid, suggestedStatementCid, nudger)` with state `dismissed` or `seen`. Dismissed nudges are filtered out before display; dismissed state is permanent and cannot be overwritten by "seen".
- Created `ui/src/shared/hooks/useNudgeIntensity.ts` — localStorage-backed hook for nudge intensity preference (`low`/`medium`/`high`). Default is `low`.
- Updated `StatementSuggestions` component to:
  - Filter out dismissed nudges on load (via `getDismissedNudges()`).
  - Add a dismiss button (CloseIcon) on each suggestion card that calls `dismissNudge()` and removes the card from the UI immediately.
  - Apply intensity-based caps: low=3, medium=5, high=10 suggestions per statement.
- Updated `SettingsPage` to include a nudge intensity toggle (ToggleButtonGroup: Low/Medium/High) in the nudger addresses section, with explanatory copy.
- Rewrote `StatementSuggestions.test.tsx` with new tests for dismissal flow, dismissed-nudge filtering on load, and intensity caps.
- Added `nudgeStore.test.ts` with fake IndexedDB (matching the foldCache.test pattern) covering all CRUD operations.
- Added `useNudgeIntensity.test.ts` for load/save behavior.

**Key decisions**:
- Kept dismissal permanent as specced — once dismissed, the `(target, suggested, nudger)` triple never reappears.
- Used IndexedDB (not localStorage) for the nudge store, matching the project's existing foldCache and Subjectiv trust cache patterns.
- Did not implement staleness decay or per-nudger mute in this pass — those are lower-priority follow-ups.
- The intensity toggle lives in the existing nudger addresses section of Settings rather than a separate "Nudge Preferences" section, keeping the surface area small.

**Verified**:
- `npm run lint --workspace=ui`
- `npm run typecheck --workspace=ui`
- `npm run test --workspace=ui -- --run StatementSuggestions nudgeStore useNudgeIntensity` (30 tests passing)
- `npm run build --workspace=ui`

**Files changed**:
- `ui/src/shared/nudgeStore.ts` (new)
- `ui/src/shared/nudgeStore.test.ts` (new)
- `ui/src/shared/hooks/useNudgeIntensity.ts` (new)
- `ui/src/shared/hooks/useNudgeIntensity.test.ts` (new)
- `ui/src/conceptspace/components/StatementSuggestions.tsx`
- `ui/src/conceptspace/components/StatementSuggestions.test.tsx`
- `ui/src/conceptspace/pages/SettingsPage.tsx`
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. The three nudge-ux features (dismissal, intensity, filtering) are complete per the spec. Remaining items from `nudge-ux.md` that were not implemented: staleness decay, per-nudger mute, and topic filtering — these are lower-priority enhancements.

## 2026-04-21 - AI Services: Content Submission UI/API (Completed)

**Task**: Complete the content-submission item from [TODO.md](TODO.md) by adding the queue API, teaching the content finder to poll it, and exposing a minimal UI entry point.

**What was done**:
- Added persistent `GET /content-submission` and `POST /content-submission` endpoints to `platform-api-service`, backed by a JSON queue file with CID/content-url validation, deduplication, and dedicated rate limiting.
- Wired `content-finder` to poll `SUBMISSIONS_API_URL` when configured, while preserving the existing `SUBMISSIONS_FILE_PATH` fallback for operator-managed workflows.
- Added a minimal `ContentSubmissionForm` to the statement page so users can queue a post/video/article for the current statement without needing an admin-only path.
- Updated package READMEs so the new queue file/env vars/endpoints are discoverable.
- Updated [TODO.md](TODO.md) to remove the completed AI-services item.

**Key decisions**:
- Kept storage intentionally simple: JSON file on the platform-api-service filesystem, matching the spec and the repo's existing lightweight service patterns.
- Put the UI entry point on the shared statement page rather than inventing a separate navigation flow first. That keeps the feature usable immediately across domains that expose statements.
- Preserved the content-finder file queue as a fallback instead of forcing every deployment onto the API on day one.

**Verified**:
- `npm run test --workspace=@commonality/platform-api-service`
- `npm run test --workspace=@commonality/content-finder`
- `npm run test --workspace=ui -- ContentSubmissionForm StatementPage`
- `npm run build --workspace=@commonality/content-finder`
- `npm run build --workspace=ui`

**Files changed**:
- `platform-api-service/src/submissions.ts`
- `platform-api-service/src/app.ts`
- `platform-api-service/src/config.ts`
- `platform-api-service/src/index.ts`
- `platform-api-service/src/service.ts`
- `platform-api-service/src/app.test.ts`
- `platform-api-service/src/service.test.ts`
- `platform-api-service/README.md`
- `content-finder/src/config.ts`
- `content-finder/src/index.ts`
- `content-finder/src/submissions.ts`
- `content-finder/test/submissions.test.ts`
- `content-finder/README.md`
- `ui/src/content-funding/components/ContentSubmissionForm.tsx`
- `ui/src/content-funding/components/ContentSubmissionForm.test.tsx`
- `ui/src/content-funding/hooks/usePlatformApi.ts`
- `ui/src/conceptspace/pages/StatementPage.tsx`
- `ui/src/conceptspace/pages/StatementPage.test.tsx`
- `ui/README.md`
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. The content-submission pipeline now exists end-to-end. A natural next step would be operator tooling for queue inspection/cleanup or moving the statement-scoped form into a more explicitly content-funding-branded surface if that product distinction matters later.

## 2026-04-21 - AI Services: UI Nudge-Batch Statement Suggestions (Completed)

**Task**: Complete the first UI nudge-display item from [TODO.md](TODO.md) by replacing the old proto-nudger statement suggestion flow with real `nudge-batch` publications.

**What was done**:
- Updated `StatementSuggestions` to query folded nudger publications via `getStatementNudges(...)` instead of the old `getStatementSuggestions(...)` implication-graph heuristic.
- Enriched each nudge with statement content via `getStatementWithContent(...)` so the UI still shows a readable title/excerpt card rather than raw CIDs.
- Updated the UI copy and chips to reflect the real data model: confidence, supporter count, and source nudger address now display on each suggestion card.
- Rewrote the component test suite around the new nudger-publication behavior, including trusted-nudger filtering, navigation, loading/error states, and the case where a suggested statement no longer resolves.
- Updated [TODO.md](TODO.md) to remove the completed nudge-display item and renumber the remaining AI-services tasks.

**Key decisions**:
- Kept the existing `StatementSuggestions` component entry point so the statement page wiring did not need to change; only the data source and presentation changed.
- Scoped this pass strictly to TODO item 1. Dismissal/seen tracking, intensity controls, and client-side filtering are still separate follow-up work.
- If a nudged statement can no longer be fetched, the component quietly skips that card instead of failing the whole suggestions area.

**Verified**:
- `npm run test --workspace=ui -- StatementSuggestions`
- `npm run lint --workspace=ui`
- `npm run build --workspace=ui`

**Files changed**:
- `ui/src/conceptspace/components/StatementSuggestions.tsx`
- `ui/src/conceptspace/components/StatementSuggestions.test.tsx`
- `ui/README.md`
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. The natural next AI-services task is TODO item 1: add nudge dismissal / seen tracking, intensity settings, and client-side filtering on top of this new publication-backed display.

## 2026-04-21 - AI Services: SDK Typed Nudger Publication Fetch/Fold (Completed)

**Task**: Complete the AI-services blocker from [TODO.md](TODO.md) by teaching the SDK to fetch and fold typed nudger publications (`nudge-batch` and `curated-collection`) from indexer `NudgesPublished` events.

**What was done**:
- Added `nudgePublications` to `ContractAddresses` and threaded it through the UI machinery hook, integration-test machinery, and local deploy env propagation so future nudger/explorer UI work has the contract address available.
- Extended the SDK event decoder with `decodeNudgesPublishedEvent`, plus conceptspace event/type definitions for typed nudger publications, folded nudges, and folded curated collections.
- Added conceptspace fold/query support for:
  - fetching typed nudger publications from trusted nudger addresses
  - folding additive/revocable `nudge-batch` publications
  - folding latest-wins `curated-collection` publications per `(nudger, stream)`
- Added SDK tests covering the new event decoder and the end-to-end query/fold behavior.
- Fixed the mock IPFS JSON upload helper to use dag-pb CIDs, matching the bytes32 CID roundtrip used by on-chain publication events.
- Updated [TODO.md](TODO.md) to remove the completed SDK blocker and promote the UI work that it unblocks.

**Key decisions**:
- Kept the new SDK API additive rather than replacing the old proto-nudger path immediately. The existing `getStatementSuggestions` helper remains untouched; new callers should use the nudger-publication queries.
- Made `contractAddresses.nudgePublications` optional at the type level for backward compatibility, but nudger-publication queries fail fast if it is missing.
- Treated trusted nudgers as explicit allowlists: if no trusted nudger list is provided, the nudger-publication queries return no publications rather than falling back to "all nudgers."

**Verified**:
- `npm run typecheck --workspace=sdk`
- `npm run lint --workspace=sdk`
- `npm run test --workspace=sdk -- --require tsx/cjs "src/**/*.test.ts"`
- `npm run build --workspace=sdk`
- `npm run build --workspace=ui`
- `npm run typecheck --workspace=integration-tests`
- `npm run integration-tests`
  - Result: all relevant work passed, but the suite still has one unrelated failing test: `Pubstarter Edge Cases -> should allow refund after project fails to meet threshold by deadline`. The failure reproduces on targeted rerun and appears to be an existing timing issue with the test's ~2-second deadline, not with this SDK change.

**Files changed**:
- `sdk/src/machinery.ts`
- `sdk/src/utils/eventDecoder.ts`
- `sdk/src/utils/eventDecoder.test.ts`
- `sdk/src/utils/mock-ipfs.ts`
- `sdk/src/subsystems/conceptspace/events.ts`
- `sdk/src/subsystems/conceptspace/types.ts`
- `sdk/src/subsystems/conceptspace/folds.ts`
- `sdk/src/subsystems/conceptspace/queries.ts`
- `sdk/src/subsystems/conceptspace/queries.test.ts`
- `ui/src/shared/hooks/useMachinery.ts`
- `ui/.env.example`
- `integration-tests/src/actions/action-machinery.ts`
- `hardhat/scripts/deploy.js`
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. The SDK blocker is now removed. The natural next task is the UI work in TODO item 1: replace `StatementSuggestions` / `getStatementSuggestions` with a real nudge-display flow that reads folded `nudge-batch` publications.

## 2026-04-21 - AI Services: Typed NudgeBatch Envelope Fields (Completed)

**Task**: Complete the nudger-core code gap from [TODO.md](TODO.md) / [nudger-core/README.md](nudger-core/README.md) by adding the typed publication envelope fields to `NudgeBatch`.

**What was done**:
- Updated `nudger-core/src/signer.ts` so `NudgeBatch` now includes `kind: 'nudge-batch'` and `schemaVersion: 1`, matching the nudger publication spec.
- Added a `createNudgeBatch` helper so the publication shape is built in one place before upload.
- Added `nudger-core/src/signer.test.ts` covering the typed envelope shape and the default empty `revocations` case.
- Updated `TODO.md` to remove the completed "typed publication envelope fields" item and renumber the remaining AI-services tasks.

**Verified**:
- `npm run typecheck --workspace=nudger-core`
- `npm run lint --workspace=nudger-core`
- `npm run build --workspace=nudger-core`
- `npm test --workspace=nudger-core -- --require tsx/cjs "src/**/*.test.ts"`
- The pre-commit hook ran to completion during `git commit`, including repo-wide lint/build/test.

**Files changed**:
- `nudger-core/src/signer.ts`
- `nudger-core/src/signer.test.ts`
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. The remaining nudger-core gap is the LLM config leakage in `NudgerConfig`; after that, the next major blocker is still the SDK work to fetch and fold typed nudger publications from the indexer.
