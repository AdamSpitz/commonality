# Continuity notes for ephemeral AI instances

## 2026-05-18 — Beat Agent text-native hybrid retrieval baseline (P1 #5 partial)

- Implemented the first-pass text-native retrieval baseline from P1 #5 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- `BeatMemoryObservation` / extracted observations now support optional plain-text `tags` for accounts, factions, slogans, phrase meanings, events, etc. The LLM extractor prompt asks for them, and loaded memory normalizes them.
- `retrieveRelevantObservations` now uses a local BM25-style scorer over observation text, keywords, tags, and purpose tags, blended with existing recency and source-diversity/time-span weighting plus exact phrase, tag, hashtag, and handle boosts. No vector embeddings or external search service added.
- Evaluation context now includes the latest relevant purpose summary snapshots as ambient orientation before specific retrieved observations; citeable observations remain separate evidence.
- Updated `beat-agent/README.md` and the beat-agents spec to record this as a partial P1 #5 implementation. Remaining P1 #5 work: evaluate against real pilot examples, tune misses/false positives, and consider bounded LLM reranking/paraphrase/stemming only if pilot failures justify it.
- Checks passed: `npm test --workspace=@commonality/beat-agent -- --runInBand memory.test.ts` (Mocha still ran the workspace suite, 131 passing), `npm run build --workspace=@commonality/beat-agent`, and LSP diagnostics clean.

## 2026-05-18 — Beat Agent source-management meta-purpose (P1 #3 complete)

- Implemented P1 #3 from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md` at the scaffolding level.
- Added `source_management` as a valid `BeatAgentPurpose`, including LLM extraction prompt support and package exports.
- Added `generateSourceManagementObservations` in `beat-agent/src/memory.ts`: turns purpose summaries, source-coverage notes, coverage-gap notes, current source lists, and finder/evaluation outcome notes into natural-language `source_management` observations about source-list health (under-coverage, skew, noisy sources, narrow assignments, repeated outside-beat demand). This is advisory evidence, not auto-rebalancing.
- Updated `beat-agent/README.md` and marked the spec item complete. Added memory coverage for generated source-management observations.
- Checks passed: `npm test --workspace=@commonality/beat-agent -- --runInBand memory.test.ts types.test.ts` (Mocha warning: direct file patterns were not matched, so the workspace suite ran and passed 129 tests), `npm run build --workspace=@commonality/beat-agent`, and LSP diagnostics clean.
- Next P1 item: periodic source-management reflection and manager reporting over beat definition, source overlay, summaries, metrics, outcomes, and coverage gaps.

## 2026-05-18 — Content Funding copy clarifies channel-centric scope

- Updated Content Funding UI copy to make the product boundary explicit: Content Funding is organized around creator/channel/content-item contracts, while statement- and cause-centric funding portals belong on Alignment.
- Changed the landing-page description/sections and `/explore` copy so it no longer implies Content Funding hosts an Alignment-style cause aggregator.
- Left the route structure unchanged: Content Funding still has channel/platform browsing, channel contract pages, contract creation, creator dashboard, and content contract detail pages.
- Files changed: `ui/src/domains/content-funding/LandingPage.tsx`, `ui/src/domains/content-funding/ContentPages.tsx`, `ui/src/domains/content-funding/LandingPage.test.tsx`.
- Checks passed: `cd ui && npx vitest run src/domains/content-funding/LandingPage.test.tsx src/domains/content-funding/ContentPages.test.tsx src/domains/CrossDomainSmoke.test.tsx`.
- Note: `TODO.md` and `specs/product/ui-domains.md` had pre-existing uncommitted edits and were intentionally left out of this commit.

## 2026-05-18 — Funding portal trusted implication attester filtering

- Fixed Alignment/funding-portal indirect project alignment to respect the user's trusted implication attesters instead of accepting every `ImplicationAttestation` by default.
- `sdk/src/subsystems/fundingportals/queries.ts` now accepts a `TrustedAddressInput` set for implication attesters across indirect-alignment, total-funding, aligned-project, and leaderboard query paths; filtering reuses the existing trusted-address normalization helper.
- Wired trusted implication attesters from `useTrustedAttesters()` through `StatementFundingPortalPage`, `FundingPortalSummary`, `AlignedProjectsList`, and the statement-page embedded portal summary. Empty trusted-attester config is normalized to `undefined` so existing unfiltered behavior remains the fallback.
- Added basic regression coverage in `StatementFundingPortalPage.test.tsx`, `AlignedProjectsList.test.tsx`, and `FundingPortalSummary.test.tsx` verifying trusted implication attesters are threaded into SDK calls and passed down to child components.
- Checks passed: `npm --workspace @commonality/sdk run build`, `npm --workspace ui run typecheck`, and focused Vitest coverage for the changed funding portal/statement components.
- Note: `TODO.md` and `specs/product/ui-domains.md` had pre-existing uncommitted edits not related to this task and were intentionally left out of the commit.

## 2026-05-17 — Beat Agent canonical-ID local context (P0 #4 complete)

- Implemented P0 #4 from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- `platform-api-service` `/context/local` now accepts either `url` or `canonicalId`; `LocalContentContextRequest` supports both. Twitter lookup can fetch by tweet ID parsed from canonical ID, YouTube/Substack can build target-only context from canonical IDs where appropriate.
- `beat-agent` content resolution and evaluation-context building now call platform local-context lookup by URL when available, otherwise by `contentCanonicalId`, so `contentText`/`contentCid` social submissions can still get parent/quote/recent-author context from the platform service. URL submissions still validate resolved canonical ID against the request.
- Updated `beat-agent/README.md`, `platform-api-service/README.md`, and marked the spec item done.
- Checks passed: `npm test --workspace=@commonality/beat-agent -- --runInBand content.test.ts`, `npm test --workspace=@commonality/platform-api-service`, `npm run build --workspace=@commonality/beat-agent`, `npm run build --workspace=@commonality/platform-api-service`, and LSP diagnostics clean.
- Remaining P0: run and record one realistic end-to-end testnet rehearsal.

## 2026-05-16 — Beat Agent UI trust-policy filter (P1 #3 partial)

- Implemented the UI trust-policy filter sub-item of P1 #3 from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- Added `useBeatAgentTrustPolicy` hook (`ui/src/shared/hooks/useBeatAgentTrustPolicy.ts`): loads/saves a `BeatAgentTrustPolicy` (`minAmbientDiversityThreshold: number`, 0–1) to localStorage under `commonality:beatAgentTrustPolicy`. Also exports `checkTrustPolicyViolation(explanation, threshold)` — returns true when any ambient citation has a diversity score below the threshold.
- Refactored `ContentAttestationSummary.tsx`: lifted explanation loading out of the Tooltip into a `useBeatAgentExplanation` hook at the chip level. This lets `BeatAgentAttestationChip` check the trust policy against the loaded explanation and change the chip color to `warning` (with a `WarningAmberIcon`) when the policy is violated. The tooltip and audit dialog both receive the same pre-loaded explanation state, eliminating duplicate fetches.
- Added Settings UI in `SettingsPage.tsx` (under "Trusted content attestation sources"): a MUI `Slider` for `minAmbientDiversityThreshold` (0–1, step 0.05) with a description explaining what the filter does.
- Added 7 tests for the hook (load/save/clamp/error cases) and 8 new tests in `ContentAttestationSummary.test.tsx` (6 unit tests for `checkTrustPolicyViolation`, 2 integration tests: chip turns warning color, tooltip shows policy warning message). Total 21 tests pass, typecheck and lint clean.
- Remaining P1 #3 gap: account/source reputation weighting (requires an external reputation data source or historical author-trust store — not yet buildable without that data).

## 2026-05-16 — Beat Agent finder keyword filtering (P1 #2 complete)

- Implemented on-beat keyword filtering for the beat-agent finder candidate selector (P1 #2 from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`).
- Added `beatKeywords?: string[]` and `onBeatMinKeywordMatches?: number` (default 1) to `BeatFinderScoringConfig` in `beat-agent/src/finder.ts`. A private `countKeywordMatches` helper does case-insensitive substring matching; candidates with fewer matches than the threshold are rejected as `off_beat`.
- Added `beatKeywords?: string[]` to `BeatAgentConfig` and `BEAT_AGENT_BEAT_KEYWORDS` env var (comma-separated) in `loadConfigFromEnv` in `beat-agent/src/config.ts`.
- Wired into `runBeatAgentWorkerOnce` in `beat-agent/src/index.ts`: finder calls `createScoredBeatFinderCandidateSelector({ beatKeywords: config.beatKeywords })` instead of the unparameterized default selector.
- Added 5 new tests; all 120 pass, typecheck clean.
- Remaining open P1 items: #3 (reputation weighting + UI trust-policy filter).

## 2026-05-16 — Beat Agent time-series metrics persistence (P1 #4 complete)

- Implemented P1 #4 (time-series metrics persistence) from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- Added `appendMetricsToJsonl(filePath)` (returns an async function that appends a `BeatAgentWorkerMetrics` entry as JSONL, creating the directory if needed) and `loadMetricsHistory(filePath)` (reads all entries oldest-first, returns `[]` if file missing) to `beat-agent/src/metrics.ts`.
- Added `metricsLogFilePath?: string` to `BeatAgentConfig` and `BEAT_AGENT_METRICS_LOG_FILE` env var in `loadConfigFromEnv`.
- Wired into `runBeatAgentWorkerOnce`: after logging the formatted report, appends metrics to JSONL when `config.metricsLogFilePath` is set (inside the existing best-effort try/catch).
- Exported both functions from `beat-agent/src/index.ts`. Added 3 new tests; all 115 pass, typecheck clean.
- Remaining open P1 items: #2 (finder keyword/LLM screen), #3 (reputation weighting + UI trust-policy filter).

## 2026-05-16 — Beat Agent extraction retry/backoff (P1 #1 complete)

- Implemented P1 #1 (retry/backoff for observation extraction) from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- Added `ExtractionRetryOptions` interface and optional `retryOptions` param to `ExtractObservationsFromItemsParams` in `beat-agent/src/memory.ts`. A private `retryWithBackoff` helper implements exponential backoff.
- `extractObservationsFromItems` now retries transient extractor errors up to `maxAttempts` times (default 3) with configurable initial delay (default 1 s), max delay (default 30 s), and backoff factor (default 2). `retriedItemCount` and `totalRetryCount` added to `ExtractObservationsSummary`.
- Exported `ExtractionRetryOptions` from `beat-agent/src/index.ts`.
- Added 3 new tests: succeeds after transient failures, exhausts retries and fails, retries only the failing item. Updated existing summary `deepEqual` assertions in `memory.test.ts`, `extractor.test.ts`, and `metrics.test.ts` to include the new fields.
- All 112 tests pass; typecheck clean.
- Remaining open P1 items: #2 (finder keyword/LLM screen), #3 (reputation weighting + UI trust-policy filter), #4 (time-series metrics persistence).


## 2026-05-16 — Beat Agent adversarial hardening (P1 #9 partial)

- Implemented two of the five P1 #9 adversarial hardening items from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- **Ingestion anomaly detection** (`beat-agent/src/ingestion.ts`): Added `BeatIngestionAnomaly`, `BeatIngestionAnomalyOptions`, and `detectIngestionAnomalies`. Detects `low_source_diversity` (uniqueAuthors/newItems below configurable ratio threshold, default 0.25, min 5 items) and `volume_spike` (single-run count above configurable threshold, default 50). Anomalies are included in `BeatIngestionRunSummary.anomalies` and surfaced in the per-tick metrics report.
- **Contested observation detection** (`beat-agent/src/memory.ts`): Added `ContestedObservationGroup` and `detectContestedObservations`. Finds pairs of observations that share ≥2 keywords but come from completely non-overlapping author communities, flagging them as potentially carrying divergent meanings. Deduplicates by keyword signature.
- Updated `index.ts` exports, `metrics.ts` (`anomalyCount` in `BeatAgentIngestionMetrics`), beat-agents spec, and README.
- Added 14 new tests (6 anomaly, 8 contested); all 109 pass; typecheck and lint clean.
- Remaining P1 #9 gaps: account/source reputation weighting (requires external data), configurable UI trust-policy enforcement (diversity data already in explanation docs; filter UI not built).

## 2026-05-16 — Beat Agent deployment-level observability (P1 #10 complete)

- Implemented P1 #10 (deployment observability) from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- Added `beat-agent/src/metrics.ts` with `generateBeatAgentWorkerMetrics` (aggregates ingestion, memory, extraction, compaction, evaluation, and finder summaries into a typed `BeatAgentWorkerMetrics` struct) and `formatBeatAgentWorkerMetricsReport` (formats to human-readable text).
- Wired into `runBeatAgentWorkerOnce`: after each tick the worker reads the evaluation JSONL log and memory state, mines coverage gaps, generates metrics, and emits the formatted report through the `log` callback.
- Added 11 new tests; all 94 pass, typecheck and lint clean.
- Updated beat-agents spec to mark P1 #10 done. Remaining open item: P1 #9 (adversarial hardening).

## 2026-05-16 — Beat Agent concurrent duplicate safety (P0 #5 complete)

- Implemented P0 #5 (durable idempotency / concurrent duplicate safety) from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- Added optional `checkExistingBeforePublish?` hook to `ProcessBeatAgentEvaluationDependencies` in `beat-agent/src/attester.ts`. When provided and the evaluation result would be published, it re-queries for an existing attestation right before the blockchain transaction. If one is found (another instance already published), the publish is skipped and the existing attestation is returned as `alreadyAttested: true`.
- Added in-process deduplication in `createBeatAgentServiceApp` (`beat-agent/src/app.ts`): an `inFlightEvaluations: Map<string, Promise<...>>` keyed by `contentCanonicalId:statementCid`. Concurrent requests for the same key share the in-flight Promise; the second caller gets `alreadyAttested: true` without triggering a second evaluation or blockchain transaction. If the first request fails, the second falls through to its own evaluation.
- Wired `checkExistingBeforePublish: dependencies.findExistingAttestation` in the app — same existing check covers both the pre-evaluation guard and the pre-publish guard.
- Added 3 new tests: `checkExistingBeforePublish` finding existing (publish skipped), `checkExistingBeforePublish` returning null (publish proceeds), and in-process concurrent dedup (HTTP integration test with a gate-controlled evaluation).
- Updated beat-agents spec to mark P0 #5 fully done. All 83 tests pass, typecheck and lint clean.
- All P0 items are now done. Remaining open items: P1 #9 (adversarial hardening), P1 #10 (deployment observability).

## 2026-05-16 — Beat Agent stale-observation tracking

- Implemented the remaining open sub-item of P1 #6 (memory quality) from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- Added optional `lastActiveAt?: string` field to `BeatMemoryObservation`. During `extractObservationsFromItems`, existing observations whose keywords overlap with newly ingested items (≥2 keywords, or ≥1 if the observation has <3 keywords) get `lastActiveAt` updated to now.
- `scoreObservation` now uses `lastActiveAt ?? observedAtEnd` as the freshness timestamp for recency scoring, so compacted summaries about still-active topics stay properly ranked while those about dead topics decay naturally.
- Exported `getObservationStaleDays(observation, now)` helper for use in UI/logging.
- Added 5 new tests: reinforcement on keyword overlap, non-reinforcement on no overlap, retrieval ordering (stale summary loses to recent observation), and `getObservationStaleDays` with/without `lastActiveAt`.
- Updated beat-agents spec to mark P1 #6 fully done. All 80 tests pass, typecheck and lint clean.
- P1 #6 is now fully done. Remaining open items: P0 #5 (concurrent duplicate safety), P1 #9 (adversarial hardening), P1 #10 (deployment observability).

## 2026-05-16 — Beat Agent LLM-backed semantic memory compaction

- Implemented part of P1 #6 (memory quality) from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- Added `BeatMemoryCompactor` interface and optional `compactor` param to `compactBeatMemory` in `beat-agent/src/memory.ts`. When provided, the compactor's returned string is used as the summary observation text; falls back to the existing keyword-frequency string on empty/throw.
- Added `createLlmMemoryCompactor` factory to `beat-agent/src/extractor.ts`: calls OpenRouter (default `claude-3-haiku`) to produce a 2-4 sentence discourse narrative from batched older observations. Keywords are still computed from original observations for retrieval scoring.
- Wired into `runBeatAgentWorkerOnce` in `beat-agent/src/index.ts` under the existing `BEAT_AGENT_LLM_EXTRACTION_ENABLED` flag (same flag enables both extraction and compaction).
- Added 5 new tests covering: compactor used, empty fallback, throw fallback, interface shape, empty-observations short-circuit.
- Updated beat-agents spec to mark semantic compaction sub-item done; stale-observation tracking remains open.
- Checks passed: `npm test --workspace=@commonality/beat-agent` (75/75), `npm run typecheck --workspace=@commonality/beat-agent`, pre-commit hook clean.

## 2026-05-16 — Beat Agent finder candidate scorer

- Implemented P1 item 7 from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- Added `scoreBeatFinderItem` (configurable quality heuristics: substantive char/word count, URL density, all-caps ratio) and `createScoredBeatFinderCandidateSelector` factory to `beat-agent/src/finder.ts`.
- `defaultBeatFinderCandidateSelector` now delegates to the scored selector instead of accepting any non-empty text. Preferred `contentUrl` over `contentText` when submitting candidates so the attester can resolve and validate content independently.
- Added 14 new tests covering score acceptance, each rejection path, configurable thresholds, URL vs text source selection, and null handling.
- Updated beat-agents spec to mark item 7 done with the remaining gap noted (no on-beat keyword/semantic scoring yet).
- Checks passed: `npm test --workspace=@commonality/beat-agent` (70/70), `npm run typecheck --workspace=@commonality/beat-agent`, `npm run lint --workspace=@commonality/beat-agent`.

## 2026-05-16 — Beat Agent UI explanation tooltip

- Continued the beat-agent P1 auditability item in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- `ui/src/content-funding/components/ContentAttestationSummary.tsx` now loads a trusted beat agent's `/status/:statementCid/:contentCanonicalId` endpoint when that trusted entry has a `serviceUrl`, fetches the returned `explanationCid` from IPFS, and displays reasoning plus compact local/ambient citation details in the attestation tooltip.
- The tooltip shows source-author count, time span, and diversity score when available; if no service URL is configured, it tells users to add one in Settings.
- Updated the beat-agents spec to mark tooltip-level explanation/citation display done while leaving full audit/detail UI and stronger thin-context surfacing as follow-ups.
- Checks passed: `npm run test:vitest --workspace=ui -- src/content-funding/components/ContentAttestationSummary.test.tsx`, `npm run typecheck --workspace=ui`, `npm run lint --workspace=ui`, and LSP diagnostics clean for the changed component. LSP diagnostics for the `.test.tsx` file still show the repo's known test-file JSX config issue, but `tsc` and Vitest pass.

## 2026-05-16 — Beat Agent status API existing-attestation metadata

- Added a small common-attester extension point: `registerCommonAttesterRoutes` now accepts optional `getStatus`, while preserving the existing placeholder behavior when omitted.
- Wired beat-agent `/status/:statementCid/:contentCanonicalId` to return the same existing-attestation lookup used for idempotency (JSONL local optimization, then chain). This gives callers `exists: true` and prior metadata such as `explanationCid` when available from the log.
- Added HTTP coverage in `beat-agent/test/app.test.ts`; attester-core placeholder status behavior remains covered.
- Updated `beat-agent/README.md` and the beat-agents spec to mark the status-API slice of explanation/citation surfacing as partially done. UI retrieval/rendering of explanation documents is still open.
- Checks passed: `npm run build --workspace=@commonality/attester-core`, `npm test --workspace=@commonality/attester-core` (49/49), `npm test --workspace=@commonality/beat-agent` (56/56), typecheck/lint for both packages, LSP diagnostics clean.

## 2026-05-16 — Beat Agent chain-backed idempotency partial fix

- Continued the beat-agent P0 durable-idempotency item from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- Added on-chain `AlignmentAttestations.hasAttestation` lookup in `beat-agent/src/blockchain.ts`, exported it, and wired `createBeatAgentApp` to check JSONL first as a local optimization, then the chain before resolving/evaluating/publishing content.
- Added `beat-agent/test/blockchain.test.ts` for the exact attestation tuple: attester address, topic CID, content canonical ID hash, and statement CID.
- Updated `beat-agent/README.md` and the beat-agents spec. The P0 idempotency item is now partially done; remaining gap is safe duplicate suppression across multi-instance/concurrent deployments (transactional reservation/store or a publish path that avoids duplicate events).
- Checks passed: `npm test --workspace=@commonality/beat-agent` (55/55), `npm run typecheck --workspace=@commonality/beat-agent`, `npm run lint --workspace=@commonality/beat-agent`, LSP diagnostics clean.

## 2026-05-16 — Beat Agent full audit dialog

- Continued the beat-agent P1 auditability item in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- `ui/src/content-funding/components/ContentAttestationSummary.tsx` now lets users click trusted beat-agent chips to open a full audit dialog, loading the beat-agent status/explanation document and showing decision metadata, full reasoning, all local context citations, and all ambient citation details/examples.
- Kept the existing tooltip as the compact preview and added Vitest coverage for the full dialog path.
- Updated `beat-agent/README.md` and the beat-agents spec; the remaining P1 UI auditability gap is making thinly sourced ambient context visually/trust-policy distinct from well-supported context.
- Checks passed: `npm run test:vitest --workspace=ui -- src/content-funding/components/ContentAttestationSummary.test.tsx`, `npm run typecheck --workspace=ui`, `npm run lint --workspace=ui`, and LSP diagnostics clean for the changed component.

## 2026-05-16 — Beat Agent thin-context UI warnings

- Finished the remaining P1 beat-agent UI auditability item from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- `ContentAttestationSummary` now labels thinly sourced ambient citations (`<3` source authors, diversity `<0.5`, or no citation metadata/examples) and shows warning copy in both the compact tooltip and full audit dialog.
- Updated the beat-agent README/spec to distinguish thin-context warnings from future configurable trust-policy enforcement.
- Checks passed: focused `ContentAttestationSummary` Vitest, `npm run typecheck --workspace=ui`, `npm run lint --workspace=ui`, and LSP diagnostics clean for the changed component.

## 2026-05-16 — Beat Agent small P0 cleanup

- Implemented the small P0 cleanup items from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md` that were safe to do in this session.
- Fixed concurrent in-flight evaluation response semantics in `beat-agent/src/app.ts`: shared evaluations now return `deduplicated: true` while preserving `alreadyAttested` as true only for an actual existing/published positive attestation. Added `deduplicated?: boolean` to `BeatAgentEvaluateResponse`.
- Fixed `findExistingAttestationFromJsonl` to return the derived on-chain subject ID via `getSubjectIdForContentCanonicalId` instead of the raw `contentCanonicalId`.
- Updated `beat-agent/README.md` to reflect current UI trust-policy warning support and the scored/keyword finder selector. Updated the beat-agent spec P0 list to mark these small items done.
- Added regression tests for deduped abstentions and JSONL subject ID lookup. `npm test --workspace=@commonality/beat-agent` passes (122 tests); `npm run typecheck --workspace=@commonality/beat-agent` passes; LSP diagnostics clean.
- Remaining P0 items intentionally not started because they are larger/fresh-session tasks: canonical-ID-based local-context lookup and a realistic end-to-end testnet rehearsal.

## 2026-05-18 — Beat Agent purpose-guided first pass

- Implemented the first multi-purpose beat-agent pass from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- Added explicit `BeatAgentPurpose` values, config/env loading for `BEAT_AGENT_PURPOSES`, and purpose declarations on beat definitions.
- Threaded purposes into worker extraction and LLM observation extraction; memory observations can now carry purpose tags and retrieval can filter by requested purpose.
- Added `GET /metadata` (beat ID, purposes, capabilities) and `GET /context?topic=...` for read-only cited ambient context handoff; bridge synthesis remains outside beat-agent.
- Updated beat-agent README/spec and added tests for metadata, context endpoint, and purpose-filtered retrieval.
- Checks passed: `npm run typecheck --workspace=@commonality/beat-agent`; `npm test --workspace=@commonality/beat-agent` (126 passing).

## 2026-05-18 — Beat Agent purpose-level summary snapshots

- Implemented the P1 purpose-level summary snapshots item from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- `BeatContextMemoryState` can now store `purposeSummarySnapshots`; worker ticks refresh one timestamped snapshot per active beat purpose after extraction/compaction.
- Snapshots are deterministic scaffolding over recent purpose-filtered observations plus recent worker metrics: live topics, faction/phrase/uncertainty excerpts, recurring gaps, useful context, source/coverage notes, and source observation IDs. Empty-purpose snapshots are still generated as explicit coverage-gap signals.
- Exported `generatePurposeSummarySnapshots` and related types from `beat-agent/src/index.ts`; added memory and worker tests.
- Updated `beat-agent/README.md` and marked the P1 spec item done, noting that LLM-authored summaries can be a later improvement if pilot evidence calls for it.
- Checks passed: `npm test --workspace=@commonality/beat-agent -- --runInBand`; LSP diagnostics clean.

## 2026-05-18 — Beat Agent LLM-authored purpose summary refresh

- Implemented P1 #2 from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- `generatePurposeSummarySnapshots` now accepts a pluggable `BeatPurposeSummarySnapshotGenerator`, separates recent detailed observations from compacted evidence summaries, passes the previous snapshot for the same beat/purpose plus recent metrics, and keeps purpose snapshots out of ordinary memory compaction.
- Added `createLlmPurposeSummarySnapshotGenerator` using OpenRouter to return structured purpose snapshots (summary, live topics, factions, phrase meanings, uncertainties, recurring gaps, useful context, source/coverage notes). Worker ticks use it when `BEAT_AGENT_LLM_EXTRACTION_ENABLED=true`; the heuristic generator remains the fallback.
- Updated `beat-agent/README.md` and marked P1 #2 done in the beat-agents spec.
- Checks passed: `npm test --workspace=@commonality/beat-agent -- --runInBand memory.test.ts extractor.test.ts worker.test.ts` (Mocha ran the beat-agent suite, 128 passing), `npm run build --workspace=@commonality/beat-agent`, and LSP diagnostics clean.
- Next P1 item: add an LLM-reflective source-management meta-purpose.

## 2026-05-18 — Beat Agent source-management reporting (P1 #4 complete)

- Implemented P1 #4 from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md` at the advisory-reporting level.
- Added persisted `sourceManagementReports` to beat memory, with explicit health flags, manager notes, effective source list, source-management observation references, and structured proposed updates (`add`/`remove`/`downweight`/`upweight`/`split_beat`/`narrow_query`/`broaden_query`/`ask_manager`).
- Added `generateSourceManagementReport` plus an LLM-backed `createLlmSourceManagementReportGenerator`; worker ticks with the `source_management` purpose now refresh source-management observations and reports. The implementation validates and persists reports but does not auto-apply source changes.
- Updated `beat-agent/README.md` and marked the spec item complete. Added memory and worker coverage for advisory manager reports.
- Checks passed: `npm test --workspace=@commonality/beat-agent -- --runInBand memory.test.ts worker.test.ts` (Mocha warning: direct file pattern for worker was not matched, so the workspace suite ran and passed 130 tests), `npm run build --workspace=@commonality/beat-agent`, and LSP diagnostics clean.
- Next P1 item: improve memory quality beyond keyword retrieval (semantic or hybrid semantic+keyword retrieval) and evaluate against real examples from the first beat.

## 2026-05-19 — Reverted source-weight implementation; documented LLM source-assessment proposal

- Reverted commit `f2a18c4 Add beat-agent source author weights` because manual numeric source weights were too operator-heavy and too much like a brittle heuristic approximation of source-quality judgment. Revert commit: `dcd083d`.
- Updated P1 #6 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md` to propose LLM-authored source assessments and retrieval guidance instead: conventional code gathers/caches evidence and attaches assessments, while LLMs judge source usefulness/noisiness/corroboration needs in context.
- No code changes beyond the revert; spec-only proposal update after the revert.
