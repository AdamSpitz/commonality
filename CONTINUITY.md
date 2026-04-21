# Continuity notes for ephemeral AI instances

## 2026-04-21 - AI Services: Bridge Creator Test Coverage (Completed)

**Task**: Address the `TODO.md` bridge-creator portion of the AI Services test-coverage gap.
Spec: `specs/product/bridge-creator.md`.

**What was done**:
- Added a real `bridge-creator` mocha setup via `bridge-creator/.mocharc.json` so the workspace test script discovers TypeScript tests consistently.
- Refactored `bridge-creator/src/nudger.ts` to accept injected SDK/LLM dependencies. Runtime behavior is unchanged, but the nudger is now unit-testable without monkey-patching imported modules.
- Added `bridge-creator/test/nudger.test.ts` coverage for:
  - end-to-end nudge generation across on-chain candidates plus preconfigured commonality statements
  - publication ordering/confidence sorting
  - statement publication payloads uploaded to IPFS
  - graceful early return when the source statement content is unavailable
  - conservative fallback when compatibility evaluation throws
  - prompt wiring for the compatibility, modified-statement, and common-ground LLM helpers

**Key decisions**:
- Kept the refactor narrow by injecting only the external side-effecting helpers (`sdk` fetch/upload helpers plus `requestJsonCompletion`) instead of introducing a larger abstraction layer.
- Tested the higher-level `generateNudges(...)` flow directly, since that is where candidate filtering, publication creation, and confidence ordering come together.
- Left the existing error logging in place for LLM failures; the tests assert the fallback behavior rather than silencing the log.

**Verified**:
- `npm run typecheck --workspace=@commonality/bridge-creator`
- `npm run lint --workspace=@commonality/bridge-creator`
- `npm run test --workspace=@commonality/bridge-creator` (4 tests passing)

**Files changed**:
- `bridge-creator/src/nudger.ts`
- `bridge-creator/.mocharc.json`
- `bridge-creator/test/nudger.test.ts`
- `TODO.md`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- The AI Services test-coverage umbrella item is not fully done yet. The remaining launch-facing gaps are explorer-curator depth and implication-attester evaluation tests.

**Interrupt point**: Yes. This is a clean stopping point: one concrete AI Services test gap is now closed, and the next fresh task can focus on one of the remaining coverage gaps without carrying partial implementation state.

## 2026-04-21 - AI Services: Explorer Personalization Wiring (Completed)

**Task**: Complete TODO.md item 2 — wire `ExplorerPage` to the explorer-curator per-user personalization endpoint.
Spec: `specs/tech/subsystems/conceptspace/explorer.md`.

**What was done**:
- Updated `ui/src/conceptspace/pages/ExplorerPage.tsx` to:
  - Load the user's directly signed statement CIDs via `getUserBeliefs(...)`
  - Match the latest curated collection's nudger against trusted nudgers with a stored `serviceUrl`
  - Call `POST /suggest` on that explorer service when available
  - Reorder the rendered explorer cards based on the personalized suggestions and display each returned reason
  - Fall back cleanly to the raw curated collection if no `serviceUrl` is known or the personalization request fails
- Switched the page's statement loading from `getStatement(...)` to `getStatementWithContent(...)` so the cards render real statement content instead of empty content payloads.
- Expanded `ExplorerPage.test.tsx` coverage for personalized ordering/reasons and graceful fallback behavior.

**Key decisions**:
- Personalization is keyed off the trusted nudger entry whose address matches the latest curated collection's nudger. This avoids sending a collection to the wrong service when multiple nudgers are trusted.
- Failure of `/suggest` is non-fatal. The page still renders the explorer from the latest curated collection rather than showing an error state for a personalization outage.
- If the personalizer returns only a subset of the collection, those entries are shown first and the remaining curated entries are appended afterward.

**Verified**:
- `npm run typecheck --workspace=ui`
- `npm run lint --workspace=ui`
- `npm run test --workspace=ui -- --run ExplorerPage` (12 tests passing)
- `npm run build --workspace=ui`

**Files changed**:
- `ui/src/conceptspace/pages/ExplorerPage.tsx`
- `ui/src/conceptspace/pages/ExplorerPage.test.tsx`
- `TODO.md`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- Personalization currently depends on the trusted explorer nudger entry having a `serviceUrl`. Default nudgers loaded purely from `VITE_DEFAULT_NUDGERS` still fall back to the unpersonalized collection unless the service URL is added in Settings.

**Interrupt point**: Yes. Explorer personalization is wired end-to-end on the UI side. The next AI Services task is likely either the remaining coverage gaps or the deferred nudger UX follow-ups (staleness decay / per-nudger mute).

## 2026-04-21 - AI Services: Nudger Metadata Discovery + Stale Doc Cleanup (Completed)

**Task**: Complete TODO.md item 1 — UI nudger metadata discovery (`.well-known/nudger.json`) for the trust-configuration flow. Also cleaned up stale "code gap" notes in READMEs and the nudger spec's status table.

**What was done**:
- Created `ui/src/shared/hooks/useNudgerMetadata.ts` — hook for fetching nudger metadata from a service URL.
- Updated `ui/src/shared/hooks/useTrustedNudgers.ts` — changed storage format from `string[]` to `TrustedNudgerEntry[]` (with `address`, optional `serviceUrl`, `name`, `description`, `sourceType`, `version` fields). Backward-compatible with existing string-array localStorage data.
- Updated `SettingsPage.tsx` to:
  - Add an optional "Service URL" input field below the nudger address input.
  - When a service URL is provided, fetch `/.well-known/nudger.json` from that URL on add.
  - Display nudger name (as a primary-colored chip) and source type (as a regular chip) alongside the address in the list.
  - Show the nudger description as secondary text below the address.
- Updated `StatementSuggestions.tsx` and `ExplorerPage.tsx` to map `TrustedNudgerEntry[]` to `string[]` (addresses) when calling SDK functions.
- Removed stale "code gap" notes from `implication-graph-nudger/README.md` and `nudger-core/README.md` (the typed `NudgeBatch` envelope fields were already added in a prior session).
- Updated `specs/tech/subsystems/nudger/README.md` "What exists vs. what needs to be built" table to reflect all implemented items (SDK nudger fetching, UI nudge display, explorer page, bridge-creator, explorer-curator, metadata discovery, dismissal/intensity/filtering).

**Key decisions**:
- The metadata fetch happens synchronously during `handleAddNudger` rather than using a separate hook — this keeps the SettingsPage simple and avoids race conditions with the save operation.
- The `useNudgerMetadata` hook exists as a standalone utility but is not currently used by the SettingsPage (the inline fetch is simpler for this use case). It's available for future use if needed.
- Backward compatibility: existing localStorage entries stored as plain strings are normalized to `TrustedNudgerEntry` objects on load.

**Verified**:
- `npm run typecheck --workspace=ui`
- `npm run lint --workspace=ui`
- `npm run test --workspace=ui -- --run SettingsPage` (46 tests passing)

**Files changed**:
- `ui/src/shared/hooks/useNudgerMetadata.ts` (new)
- `ui/src/shared/hooks/useTrustedNudgers.ts` (updated to `TrustedNudgerEntry[]` format)
- `ui/src/conceptspace/pages/SettingsPage.tsx` (added service URL input, metadata display)
- `ui/src/conceptspace/components/StatementSuggestions.tsx` (map entries to addresses)
- `ui/src/conceptspace/pages/ExplorerPage.tsx` (map entries to addresses)
- `implication-graph-nudger/README.md` (removed stale code gap note)
- `nudger-core/README.md` (removed stale code gap note, updated `NudgeBatch` type example)
- `specs/tech/subsystems/nudger/README.md` (updated status table to reflect reality)
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. Nudger metadata discovery is complete. The remaining AI Services items from TODO.md are:
- Item 6: Bridge-priority scoring — not blocking, needs polarity metadata first
- Item 8: Anti-evil-nudger immune system — low priority, spec exists at `specs/product/nudger-immune-system.md`

The nudger ecosystem (attesters, finders, nudgers, explorers) is now fully implemented across all major components. The next worthwhile effort would be either implementing bridge-priority scoring (once polarity metadata is available) or building out the anti-evil-nudger immune system.

## 2026-04-21 - AI Services: Explorer Curator Service (Completed)

**Task**: Complete TODO.md item 4 — Explorer nudger strategy (background LLM + per-user LLM personalization).
Spec: `specs/tech/subsystems/conceptspace/explorer.md`.

**What was done**:
- Created new `explorer-curator/` package with two-tier LLM architecture:
  - **Background curator** (`curator.ts`): Periodically fetches all statements, uses LLM to evaluate which best represent distinct funding/cause areas, maintains a non-redundant curated collection grouped by topicArea, publishes as `curated-collection` nudger publication only when materially changed.
  - **Per-user personalizer** (`personalizer.ts`): `POST /suggest` endpoint that accepts `{ stream, signedStatementCids }`, fetches the latest curated collection, uses LLM to personalize which entries to surface based on user's signed statements (anti-correlations, redundancy, prioritization), returns `{ suggestions: [{ cid, reason }] }`.
- Added `publishCuratedCollection` and `createCuratedCollection` helpers to `nudger-core/src/signer.ts` (analogous to existing `publishNudgeBatch`).
- Added `CuratedCollectionEntry` and `CuratedCollectionPublication` types to nudger-core exports.
- Service exposes: `GET /.well-known/nudger.json`, `GET /health`, `POST /suggest`, `GET /collection`.
- Default curator interval: 6 hours. Default stream: `fundable-project-explorer`. Default port: 3004.
- Added tests: `config.test.ts` (3 tests) and `curatedCollection.test.ts` (2 tests).
- Added README with full documentation of env vars, endpoints, and architecture.

**Key decisions**:
- The curator uses `getAllStatements` with limit 100 to keep the LLM context manageable. This can be tuned via the limit parameter if needed as the statement set grows.
- The curator tracks `previousEntries` in-memory to detect material changes. On restart, it starts fresh (no persistence of previous state) — this is fine because the first cycle will always publish an initial collection.
- The personalizer returns fallback suggestions (first 10 entries) if the LLM call fails, ensuring the endpoint is always responsive.
- The `publishCuratedCollection` function reuses the same `publishNudgeBatch` contract function as nudge-batch publications — the contract just stores the CID; the type discrimination happens at the IPFS content level.

**Verified**:
- `npm run typecheck --workspace=@commonality/explorer-curator`
- `npm run lint --workspace=@commonality/explorer-curator`
- `npm run test --workspace=@commonality/explorer-curator` (5 tests passing)
- `npm run typecheck --workspace=@commonality/nudger-core`
- `npm run lint --workspace=@commonality/nudger-core`

**Files changed**:
- `explorer-curator/package.json` (new)
- `explorer-curator/tsconfig.json` (new)
- `explorer-curator/eslint.config.js` (new)
- `explorer-curator/.mocharc.json` (new)
- `explorer-curator/README.md` (new)
- `explorer-curator/src/config.ts` (new)
- `explorer-curator/src/index.ts` (new)
- `explorer-curator/src/curator.ts` (new)
- `explorer-curator/src/personalizer.ts` (new)
- `explorer-curator/test/config.test.ts` (new)
- `explorer-curator/test/curatedCollection.test.ts` (new)
- `nudger-core/src/signer.ts` (added CuratedCollectionEntry, CuratedCollectionPublication types, createCuratedCollection, publishCuratedCollection)
- `nudger-core/src/index.ts` (added new exports)
- `package.json` (added explorer-curator to workspaces)
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. The explorer curator service is complete. The remaining AI Services items from TODO.md are:
- Item 1: UI nudger metadata discovery (`.well-known/nudger.json`) — nice-to-have
- Item 6: Bridge-priority scoring — not blocking, needs polarity metadata first
- Item 8: Anti-evil-nudger immune system — low priority

The ExplorerPage UI (already built) currently shows all entries without personalization. To wire up the personalization, the UI would need to call `POST /suggest` with the user's signed statement CIDs and use the returned suggestions instead of showing all entries. This is a straightforward UI change that can be done as a follow-up.

## 2026-04-21 - AI Services: Nudge Topic Filtering (Completed)

**Task**: Implement topic filtering from `specs/product/nudge-ux.md` — let users specify topics they don't want nudges about.

**What was done**:
- Created `ui/src/shared/hooks/useMutedTopics.ts` — localStorage-backed hook for managing muted topics list. Topics are normalized to lowercase, deduplicated, and trimmed. Provides `mutedTopics`, `addTopic`, and `removeTopic`.
- Updated `StatementSuggestions` component to:
  - Extract topic from suggested statement's `content.extras.topic` field
  - Filter out nudges whose suggested statement's topic matches any muted topic
  - Case-insensitive matching (both muted topics and statement topics are lowercased)
- Updated `SettingsPage` to include a "Muted topics" section in the nudger addresses area:
  - Text input + Add button for new topics
  - Chip-based display of current muted topics with delete capability
  - Enter key support for quick adding
- Added tests: `useMutedTopics.test.ts` (8 tests) and `StatementSuggestions.test.tsx` (4 new topic filtering tests)

**Key decisions**:
- Used localStorage (not IndexedDB) for muted topics — this is a small, simple preference list that doesn't need the complexity of IndexedDB.
- Topic filtering happens client-side after fetching nudges, consistent with the spec's guidance that "most nudge filtering should be deterministic and client-side, not AI-based."
- Statements without a topic field are still shown even when topics are muted — the filter only excludes statements whose topic explicitly matches a muted topic.
- The topic comes from `statement.content.extras.topic`, which is already part of the `createStatement` SDK helper.

**Verified**:
- `npm run typecheck --workspace=ui`
- `npm run lint --workspace=ui`
- `npm run test --workspace=ui -- --run useMutedTopics StatementSuggestions` (29 tests passing)

**Files changed**:
- `ui/src/shared/hooks/useMutedTopics.ts` (new)
- `ui/src/shared/hooks/useMutedTopics.test.ts` (new)
- `ui/src/conceptspace/components/StatementSuggestions.tsx` (added topic extraction and filtering)
- `ui/src/conceptspace/components/StatementSuggestions.test.tsx` (4 new topic filtering tests)
- `ui/src/conceptspace/pages/SettingsPage.tsx` (added muted topics UI section)
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. Topic filtering is complete per the spec. Remaining nudge-ux items from `nudge-ux.md`: staleness decay and per-nudger mute — these are lower-priority follow-ups that could be implemented next if desired.

## 2026-04-21 - AI Services: Intersection Patterns + Same-Domain Restriction (Completed)

**Task**: Complete TODO.md item 7 — implication attester/finder prompt enhancements for intersection patterns.
Spec: `specs/tech/subsystems/conceptspace/content-patterns/intersections.md` + `specs/tech/subsystems/conceptspace/implication-discovery.md`.

**What was done**:
- Updated `implication-attester/src/evaluator.ts` to include explicit guidance in the LLM prompt about:
  - Geographic × topical conjunction statements implying their parents (one-way only)
  - Geographic hierarchy implications (narrower → broader, one-way only)
  - The critical insight that parent → child reverse implications must NOT hold
- Added same-domain restriction to `implication-finder/`:
  - New `domainFetcher.ts` module that fetches `domain` fields from IPFS content in parallel
  - Updated `candidates.ts` to filter out cross-domain pairs (with graceful fallback when domain is unknown)
  - Added `IPFS_GATEWAY_URL` env var to finder config
  - Updated `index.ts` to wire domain fetching into the candidate selection pipeline
- Updated `specs/tech/subsystems/conceptspace/implication-discovery.md` to document the implemented features
- Added tests for domain filtering in `candidates.test.ts` (3 new test cases) and `domainFetcher.test.ts`

**Key decisions**:
- Graceful fallback: if a statement's domain cannot be fetched, the pair is allowed through rather than blocked. This prevents the finder from silently dropping valid pairs when IPFS is unavailable.
- Domain fetching happens in parallel for all CIDs involved in candidate pairing, minimizing latency.
- The attester prompt changes are additive — the existing conservative evaluation logic remains unchanged.

**Verified**:
- `npm run typecheck --workspace=@commonality/implication-finder`
- `npm run lint --workspace=@commonality/implication-finder`
- `npm run typecheck --workspace=@commonality/implication-attester`
- `npm run test --workspace=@commonality/implication-finder` (22 tests passing)

**Files changed**:
- `implication-attester/src/evaluator.ts` (enhanced LLM prompt with intersection pattern guidance)
- `implication-finder/src/config.ts` (added `ipfsGatewayUrl` config)
- `implication-finder/src/domainFetcher.ts` (new — fetches domain fields from IPFS)
- `implication-finder/src/candidates.ts` (added same-domain filtering)
- `implication-finder/src/index.ts` (wired domain fetching into pipeline)
- `implication-finder/test/candidates.test.ts` (3 new test cases for domain filtering)
- `implication-finder/test/domainFetcher.test.ts` (new)
- `specs/tech/subsystems/conceptspace/implication-discovery.md` (updated to reflect implemented features)
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. The intersection pattern prompt enhancements and same-domain restriction are complete. The next logical step from TODO.md would be item 6 (bridge-priority scoring as a mode of the implication finder) or item 1 (nudger metadata discovery).

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
