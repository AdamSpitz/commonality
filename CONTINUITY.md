# Continuity notes for ephemeral AI instances

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

## 2026-04-21 - AI Services Review Plan: Chunk 7 (Completed)

**Task**: Chunk 7 of [AI-SERVICES-REVIEW-PLAN.md](AI-SERVICES-REVIEW-PLAN.md) — rewrite TODO.md to consolidate AI-services items into a clean, prioritized list.

**What was done**:
- Rewrote TODO.md with a dedicated **AI Services** section organized into:
  - **Critical path** (3 items: SDK nudger publication fetching, two nudger-core code gap fixes)
  - **UI — nudge display** (3 items: nudge display, nudge UX, nudger metadata)
  - **UI — explorer** (2 items: explorer pages, explorer nudger strategy)
  - **Enhancements and new services** (5 items: content submission, bridge-creator, bridge-priority, intersection prompts, immune system)
- Removed all completed DONE items (e2e tests, fold cache, AI skills spec rewrite) — those are documented in CONTINUITY.md and git history.
- Removed notebook-of-ideas content that is now covered by specs (bridge-finder thinking, evil-nudger thinking, adversarial AI, content submission question) — replaced with brief pointers to the relevant specs.
- Kept non-AI-services items (seed content, fake-data simulation, GitHub migration, DNS/ENS, deployment, smart contract audit, Sam's chat notes, etc.) intact.
- Marked Chunk 7 complete in AI-SERVICES-REVIEW-PLAN.md.

**Key decisions**:
- Organized AI-services items by dependency order (critical path first), not by domain.
- Left the author's thinking-out-loud voice in the non-AI-services sections (seed content, Sam notes, etc.) — it's useful context, not noise.
- Did not create a "recently completed" section — completed items belong in CONTINUITY.md/git log, not TODO.md.

**Files changed**:
- `TODO.md`
- `AI-SERVICES-REVIEW-PLAN.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. All 7 chunks of AI-SERVICES-REVIEW-PLAN.md are now complete. The ecosystem review is done. A good next step would be to start implementation work on the critical-path items in TODO.md (SDK nudger publication fetching), or use the `project-wide-reviewer` skill for a broader health check now that the specs are cleaned up.

## 2026-04-21 - AI Services Review Plan: Chunk 6 (Completed)

**Task**: Chunk 6 of [AI-SERVICES-REVIEW-PLAN.md](AI-SERVICES-REVIEW-PLAN.md) — clarify the noninflammatory-content attester and the statement-creator / lattice-completion service.

**What was done**:

1. **Noninflammatory content attester clarification** — added a prominent "Architecture note" block near the top of `specs/tech/subsystems/content-funding/noninflammatory-content/README.md`:
   - Explains that the "noninflammatory content attester" is NOT a separate service type.
   - It is the `content-attester/` service deployed with different config (prompt template, topic statement CID, attester name, Ethereum key).
   - Multiple personas (neutral, left-evaluates-right, right-evaluates-left) are separate deployments of the same code.
   - Also updated step 3 of "Practical path" which previously said "fork the implication attester architecture" — replaced with correct pointer to `content-attester/` and `content-attesters.md`.
   - `content-attesters.md` already stated this clearly; the fix ensures the use-case README (the most likely entry point) says it too.

2. **Statement-creator / lattice-completion architecture note** — added a "Where the statement-creator service fits in the architecture" section to `specs/tech/subsystems/conceptspace/content-patterns/intersections.md`:
   - It's a **specialized finder** (not a new tier).
   - The loop: observe two statements accumulating signers → detect missing conjunction → use LLM to generate natural-language text for it → submit (C, S1) and (C, S2) to the implication attester.
   - Builds on `finder-core/` (polling loop, batch submission helpers) with an added LLM generation step.
   - Not on the critical path; only useful once the graph has enough activity for lattice gaps to be obvious.

- Marked Chunk 6 complete in AI-SERVICES-REVIEW-PLAN.md.

**Key decisions**:
- Added the architecture note near the top of the noninflammatory README rather than only in `content-attesters.md`, because the use-case README is the most likely entry point for someone who hasn't read the architecture specs.
- Kept the lattice-completion note inside `intersections.md` rather than creating a new file — the idea is closely tied to the geo×topical example there, and it's a sketch note not a full spec.

**Files changed**:
- `specs/tech/subsystems/content-funding/noninflammatory-content/README.md`
- `specs/tech/subsystems/conceptspace/content-patterns/intersections.md`
- `AI-SERVICES-REVIEW-PLAN.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. Chunk 6 is complete. Only Chunk 7 remains: update TODO.md to consolidate AI-services items into a clean, prioritized list.

## 2026-04-21 - AI Services Review Plan: Chunk 5 (Completed)

**Task**: Chunk 5 of [AI-SERVICES-REVIEW-PLAN.md](AI-SERVICES-REVIEW-PLAN.md) — write a brief spec for user-facing content submission.

**What was done**:
- Read the content finder source (`content-finder/src/submissions.ts`, `config.ts`, `README.md`) and the platform-api-service README to understand the current architecture.
- Created `specs/product/content-submission.md` covering:
  - Current state: content finder reads from a local JSON file; no user-facing submission path exists.
  - Recommended approach: a `POST /content-submission` + `GET /content-submission` endpoint pair in the platform-api-service (already handles content-related work; right home for this).
  - Content finder change: add a `submissionsApiUrl` config option; poll the API when set, fall back to the local file otherwise.
  - Storage: JSON file on the platform-api-service filesystem for now, proper DB later if needed.
  - Minimal UI form in the content-funding surface (URL + statement selector + optional perspective).
  - Spam/abuse: deduplication + IP rate limiting; no auth for now; content attester is the real gatekeeper.
- Marked Chunk 5 complete in AI-SERVICES-REVIEW-PLAN.md.

**Key decisions**:
- Kept the spec short and practical — this is genuinely a simple CRUD feature.
- Chose platform-api-service as the host (not a new service) because it already owns content URL resolution.
- Did not over-engineer spam handling — the content attester's evaluation cost is low and the content of a bad attestation is harmless.

**Files changed**:
- `specs/product/content-submission.md` (new)
- `AI-SERVICES-REVIEW-PLAN.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. Chunk 5 is complete. Continue with Chunk 6 (clarify the noninflammatory-content attester and the statement-creator service) or Chunk 7 (update TODO.md).

## 2026-04-21 - AI Services Review Plan: Chunk 4 (Completed)

**Task**: Chunk 4 of [AI-SERVICES-REVIEW-PLAN.md](AI-SERVICES-REVIEW-PLAN.md) — write a brief spec for the anti-evil-nudger immune system.

**What was done**:
- Read the nudger spec's trust model and publication model sections.
- Created `specs/product/nudger-immune-system.md` — a sketch spec covering:
  - The problem: anyone can run a nudger, so bad actors could abuse the system
  - Key insight: nonrepudiability is already solved by the `NudgePublications` contract (the TODO.md item about "putting CIDs on-chain" is already done). The immune system just reads those receipts.
  - Architecture: the immune system service is itself a nudger — it publishes `nudger-assessment` publications via the same infrastructure. Users subscribe by adding it to their trusted nudgers in Settings.
  - New publication kind: `nudger-assessment` (with fields for assessed nudger, specific publication CID, assessment level, reasoning, evidence, optional alternative nudger recommendation).
  - Evaluation methodology options: statistical signals, contradiction patterns, gradient bias detection, and the adversarial AI approach (pro/con/judge) for deeper review of flagged cases.
  - Build priority: low — only useful once nudger ecosystem has real traction.
- Marked Chunk 4 complete in AI-SERVICES-REVIEW-PLAN.md.

**Key decisions**:
- Made the immune system a first-class nudger (same `NudgePublications` infrastructure, same trust model) rather than a separate attestation/signaling system. This is cleaner and requires zero new infrastructure.
- Preserved the author's thinking-out-loud voice.
- Kept the spec brief — it's a sketch, not a full design.

**Files changed**:
- `specs/product/nudger-immune-system.md` (new)
- `AI-SERVICES-REVIEW-PLAN.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. Chunk 4 is complete. Continue with Chunk 5 (write a brief spec for user-facing content submission) or Chunk 6 (clarify the noninflammatory-content attester and the statement-creator service).

## 2026-04-21 - AI Services Review Plan: Chunk 3 (Completed)

**Task**: Chunk 3 of [AI-SERVICES-REVIEW-PLAN.md](AI-SERVICES-REVIEW-PLAN.md) — check nudger-core and implication-graph-nudger code against the publication-model spec.

**What was done**:
- Read the nudger spec, then audited all source files in `nudger-core/src/` and `implication-graph-nudger/src/`.
- Finding: the code mostly **already matches the spec**. Both packages use the batch publication model (upload to IPFS, write CID on-chain). Neither implements the per-message HTTP API that the old READMEs described.
- Identified two remaining code gaps (documented in updated READMEs, not fixed):
  1. `NudgeBatch` type (in `nudger-core/src/signer.ts`) is missing `kind: 'nudge-batch'` and `schemaVersion: 1` — the spec's typed publication envelope requires these so the SDK can dispatch by type.
  2. `NudgerConfig` (and therefore `implication-graph-nudger/src/config.ts`) requires `OPENROUTER_API_KEY` even though the implication-graph strategy is purely graph-based and never calls an LLM. These fields should be moved to strategy-specific config types.
- Rewrote both READMEs to describe the actual current architecture.
- Marked Chunk 3 complete in AI-SERVICES-REVIEW-PLAN.md; also checked off the Chunk 1 items that were still shown as `[ ]`.

**Key decisions**:
- Did not fix the code gaps (task says "document, do NOT implement"). Both gaps are captured in the README "Code gap" callouts and in the updated reconciliation table in AI-SERVICES-REVIEW-PLAN.md.
- implication-graph-nudger README previously described `/nudges?targetStatementCid=` and `/nudges/bulk` endpoints that were never in the code. Removed completely.

**Files changed**:
- `nudger-core/README.md`
- `implication-graph-nudger/README.md`
- `AI-SERVICES-REVIEW-PLAN.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. Chunk 3 is complete. Continue with Chunk 4 (write a brief spec for the anti-evil-nudger immune system).

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

## 2026-04-21 - AI Services: Split LLM config out of base NudgerConfig (Completed)

**Task**: Complete the remaining nudger-core configuration cleanup from [TODO.md](TODO.md) by moving OpenRouter-only fields out of the base `NudgerConfig`.

**What was done**:
- Updated `nudger-core/src/signer.ts` so `NudgerConfig` now contains only shared signer/IPFS/service settings, and added `LlmNudgerConfig` for strategies that actually call an LLM.
- Made `NudgerStrategy` generic over its config type, then exported the new config type from `nudger-core/src/index.ts`.
- Updated `implication-graph-nudger/src/config.ts` so the graph-based nudger no longer requires `OPENROUTER_API_KEY` / `OPENROUTER_MODEL`.
- Tightened `bridge-creator/src/config.ts` and `bridge-creator/src/nudger.ts` to use the LLM-specific config explicitly.
- Added `implication-graph-nudger/src/config.test.ts` covering the intended behavior: implication-graph nudgers can load config without any OpenRouter env vars.
- Updated `nudger-core/README.md`, `implication-graph-nudger/README.md`, [AI-SERVICES-REVIEW-PLAN.md](AI-SERVICES-REVIEW-PLAN.md), and [TODO.md](TODO.md) to reflect that this code gap is now closed.

**Key decisions**:
- Kept the shared base config narrow rather than making LLM fields optional on every nudger. That preserves a clean type signal: non-LLM strategies do not know about OpenRouter at all, while LLM-based strategies still require those fields.
- Made `NudgerStrategy` generic instead of relying on repeated casts in each nudger implementation.

**Verified**:
- `npm run typecheck --workspace=nudger-core`
- `npm run lint --workspace=nudger-core`
- `npm run build --workspace=nudger-core`
- `npm test --workspace=nudger-core -- --require tsx/cjs "src/**/*.test.ts"`
- `npm run typecheck --workspace=implication-graph-nudger`
- `npm run lint --workspace=implication-graph-nudger`
- `npm run build --workspace=implication-graph-nudger`
- `npm test --workspace=implication-graph-nudger -- --require tsx/cjs "src/**/*.test.ts"`
- `npm run typecheck` (in `bridge-creator/`)
- `npm run lint` in `bridge-creator/` still fails because that package has no `eslint.config.js`; added a follow-up note to `TODO.md` under "Suggestions from AI".

**Files changed**:
- `nudger-core/src/signer.ts`
- `nudger-core/src/nudger-strategy.ts`
- `nudger-core/src/index.ts`
- `nudger-core/README.md`
- `implication-graph-nudger/src/config.ts`
- `implication-graph-nudger/src/config.test.ts`
- `implication-graph-nudger/README.md`
- `bridge-creator/src/config.ts`
- `bridge-creator/src/nudger.ts`
- `AI-SERVICES-REVIEW-PLAN.md`
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. The nudger-core code gaps called out in the AI-services review are now both closed. The next meaningful AI-services task is still the SDK work to fetch and fold typed nudger publications from the indexer.
