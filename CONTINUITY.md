# Continuity notes for ephemeral AI instances

## 2026-05-16 — Beat Agent coverage-gap mining + e2e integration test (reviews #7 and #4)

- Completed two more beat-agent review items:
  - **Coverage-gap mining (#7):** New `beat-agent/src/coverage.ts` with `mineCoverageGaps` and `mineCoverageGapsFromFile` helpers. Parses JSONL evaluation log → `CoverageGapSummary` with overall counts/abstention rate, abstentions by reason with content examples, per-platform breakdowns, and repeated-abstention content IDs. 9 tests.
  - **End-to-end integration test (#4):** New `beat-agent/test/e2e.test.ts` exercises full pipeline: ingest stubbed platform posts → extract observations into memory → retrieve ambient context → evaluate with context → publish attestations → verify idempotency → mine coverage gaps. Also tests abstention path when context is insufficient. 2 tests.
- All 34 tests pass, build/lint clean.
- Remaining beat-agent review items: #2 (platform adapter), #8 (adversarial hardening).

- Implemented LLM-backed observation extractor for beat-agent context memory.
- New `beat-agent/src/extractor.ts` with `createLlmObservationExtractor` — creates a `BeatObservationExtractor` that calls OpenRouter per ingested item, asking the LLM to extract structured discourse observations (phrase usage, running arguments, in-group references, factional meanings).
  - Per-item processing isolates failures; empty items return empty arrays.
  - Fallback text-parsing path when LLM returns non-JSON.
  - Configurable via `BEAT_AGENT_LLM_EXTRACTION_ENABLED=true` in config.
  - Uses the same `openRouterApiKey`/`openRouterModel` as the evaluator.
- Added 3 new tests (23 total), build/lint clean.
- Review items now complete: #1 (idempotency), #3 (LLM extractor), #5 (default model), #6 (tokenizer+reduce), #9 (finder retry), #10 (README framing).
- Remaining: #2 (platform adapter), #4 (e2e test), #7 (coverage-gap mining), #8 (adversarial hardening).

## 2026-05-15 — Beat Agent review fixes: finder retry tracking, README status

- More beat-agent review fixes:
  - **Persist failed finder submissions (review #9):** Added `'failed'` status to `BeatFinderProcessedStatus`, `retries`/`lastError` fields to `BeatFinderProcessedItem`, and `maxRetries` option (default 3) to `RunBeatFinderOnceParams`. Items with `status: 'failed'` are retried on subsequent runs until `retries >= maxRetries`, at which point they're skipped. Previously, failures were silently retried forever with no persistence.
  - **Soften "Finished" framing (review #10):** Updated `beat-agent/README.md` to describe the package as "v1 scaffolding" and explicitly list the three pre-deploy gaps: no platform adapter, inert ambient context (default extractor is raw text), and minimal adversarial defenses.
- All 20 tests pass, build/lint clean.
- Review items completed so far: #1 (idempotency), #5 (default model), #6 (tokenizer+reduce), #9 (finder retry), #10 (README framing).
- Remaining: #2 (platform adapter), #3 (LLM extractor), #4 (e2e test), #7 (coverage-gap mining), #8 (adversarial hardening).

## 2026-05-15 — Beat Agent review fixes: default model, tokenizer, reduce guard

- More review fixes from Beat Agents Review #1:
  - **Default model (review #5):** Changed `evaluator.ts:31` and `config.ts` from `anthropic/claude-3.5-haiku` → `anthropic/claude-3-sonnet`. Also updated `app.test.ts` hardcoded model name. Sonnet is a proper v3 model already in the `attester-core` payment pricing table ($3/$15 per 1M input/output).
  - **Tokenizer minimums (review #6):** `memory.ts` tokenizer now allows tokens ≥2 chars (was ≥3), with a 23-word stop list for common low-signal 2-letter English words. This preserves short acronyms (`AI`, `US`) and short hashtags/cashtags (`#X`) while filtering noise.
  - **`reduce` over `Date.parse` (review bug):** `minIso`/`maxIso` now guard against empty arrays with explicit length check before `reduce`, preventing runtime errors when `minObservationsToCompact: 0`.
- All 20 tests pass, build/lint clean.
- Next priority: real platform adapter (X) or llm-backed observation extractor.

## 2026-05-15 — Beat Agent idempotency fix (review item #1)

- Implemented the top-priority item from Beat Agents Review #1: idempotency on `/evaluate-content`.
- `processBeatAgentEvaluation` now accepts an optional `findExistingAttestation` dep that checks for a prior positive attestation with the same `(contentCanonicalId, statementCid)` pair before doing any work.
- When a match is found, returns `alreadyAttested: true` immediately with the existing result fields — no content resolution, no LLM call, no publishing, and no new log entry.
- Only previously-published positive attestations (with a `transactionHash`) are treated as idempotency matches; negative/abstain pairs are not.
- Added `findExistingAttestationFromJsonl(filePath)` in `app.ts` — streams the JSONL log file in reverse, matches on `contentCanonicalId` + `statementCid` + `decision === 'positive'` + `transactionHash`, returns the most recent match.
- Wired into `createBeatAgentServiceApp` (`findExistingAttestation` dep) and `createBeatAgentApp` (from `evaluationLogFilePath`).
- Added new `BeatAgentExistingAttestation` type exported from `beat-agent/src/attester.ts`.
- Added regression tests: attester-core test verifies skip-on-existing (no deps called), HTTP app test verifies `alreadyAttested: true` response with prior data and no new log entry.
- Updated beat-agent README and beat-agents spec review section.
- Checks passed: `npm run test --workspace=@commonality/beat-agent` (20/20), `npm run build --workspace=@commonality/beat-agent`, `npm run lint --workspace=@commonality/beat-agent`, `npm run build --workspace=@commonality/service-host`.
- Next priority from the review: #2 One real platform adapter (X).

## 2026-05-15 — Beat Agent UI/settings integration complete (step 9)

- Completed step 9 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- Enhanced `ContentAttestationSummary.tsx` to visually distinguish beat-agent attestations from content-attester attestations:
  - Beat agents get a brain icon (`PsychologyIcon`) and `primary` (blue) color chip.
  - Content attesters (trusted) get a `success` (green) chip.
  - Tooltips explain the evaluation model: beat agents use ambient discourse context, content attesters are stateless evaluators.
  - Tooltips show beat identity, attester address, and statement CID.
- Added "uncovered" coverage-gap indicators to `ChannelPage.tsx` and `ContentFundingProjectSection.tsx`:
  - Content items without trusted attestations get an "Uncovered" warning chip, dimmed opacity, and grey background.
  - Content-list headers show summary chips (e.g., "2 uncovered", "3 trusted") alongside total counts.
  - Uncovered tooltip distinguishes truly unattested content from content with only untrusted attestations.
- Updated tests in `ContentAttestationSummary.test.tsx`, `ContentFundingProjectSection.test.tsx`, `ChannelPage.test.tsx`.
- Marked step 9 as complete in the beat-agents spec; marked the beat-agents TODO as done.
- All 10 implementation-plan steps are now complete.
- Checks passed: `npm run test:vitest --workspace=ui -- src/content-funding/` (176 tests), `npm run typecheck --workspace=ui`, `npm run build --workspace=ui`.

## 2026-05-15 — Beat Agent trusted-only content filtering

- Continued step 9 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md` by adding trusted-only filtering to content-funding views.
- `ui/src/content-funding/components/ContentFundingProjectSection.tsx` and `ui/src/content-funding/pages/ChannelPage.tsx` now show a "Trusted only" switch when at least one listed content item has an attestation from a trusted content attester/beat agent. Turning it on hides untrusted/unattested content items and updates the content count (e.g. `1/2 trusted`).
- Added regression coverage in `ContentFundingProjectSection.test.tsx` and `ChannelPage.test.tsx`.
- Remaining step 9 work: explanation/detail UI that can show beat-agent beat identity and local/ambient context citations when an explanation document is available, plus operator-facing abstention/lack-of-coverage surfaces.
- Checks passed: `npm run test:vitest --workspace=ui -- src/content-funding/components/ContentFundingProjectSection.test.tsx src/content-funding/pages/ChannelPage.test.tsx`; `npm run typecheck --workspace=ui`.

## 2026-05-15 — Beat Agent overlapping-docs clarification

- Completed step 10 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`: clarified overlapping docs around stateless content attesters, content-finder responsibilities, Subjectiv/trust-model language, and beat-agent delegation/abstention.
- Updated `content-attester/README.md`, `specs/tech/subsystems/content-funding/content-attesters.md`, `specs/tech/subsystems/content-funding/noninflammatory-content/README.md`, and `docs/common-sense-majority/vision-and-strategy/trust-model.md` to distinguish self-contained/local-context evaluation from ambient-context beat-agent evaluation.
- Marked implementation-plan step 10 as done in `beat-agents.md`. Step 9 remains partially done: trusted identity settings/highlighting are in place, but trusted-only filtering, explanation/context-citation detail UI, and operator-facing abstention/lack-of-coverage surfaces remain.
- Checks: documentation-only change; no build/test run.

## 2026-05-15 — Beat Agent trusted-attestation highlighting

- Continued step 9 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md` by wiring the trusted content-attester/beat-agent settings into content-funding display surfaces.
- Added a reusable trusted-attestation matcher in `ui/src/content-funding/components/ContentAttestationSummary.tsx` and used it to visually mark content items with a `Trusted attested` chip/background in both project content lists and channel content lists.
- Added regression coverage in `ui/src/content-funding/components/ContentFundingProjectSection.test.tsx` for a trusted beat-agent attestation.
- Remaining step 9 work: actual trusted-only filtering controls, explanation/detail UI that can show beat-agent beat identity and context citations when an explanation document is available, and operator-facing abstention/lack-of-coverage surfaces.
- Checks passed: `npm run test:vitest --workspace=ui -- src/content-funding/components/ContentAttestationSummary.test.tsx src/content-funding/components/ContentFundingProjectSection.test.tsx`; `npm run typecheck --workspace=ui`; `npm run build --workspace=ui` (same existing Privy/Rollup pure-annotation and chunk-size warnings plus chunk-size warning).

## 2026-05-15 — Beat Agent UI/settings trusted identities

- Started step 9 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md` with the settings-side trust list for content attestation identities.
- Added `ui/src/shared/hooks/useTrustedContentAttesters.ts` and tests. It stores structured trusted entries under `commonality:trustedContentAttesters`, supports `content-attester` vs `beat-agent`, optional name/service URL metadata, backward-compatible string entries, and env defaults via `VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS` plus `VITE_DEFAULT_TRUSTED_BEAT_AGENTS`.
- Updated `ui/src/conceptspace/pages/SettingsPage.tsx` with a "Trusted content attestation sources" section where users can add stateless content attesters or beat agents by wallet address.
- Updated the beat-agent spec to note that this is only the first UI/settings slice. Next step within step 9: use this trusted list in content-funding views (filter/highlight trusted content attestations) and add attestation detail UI that can show beat-agent beat identity/context citations when an explanation document is available.
- Checks passed: `npm run test:vitest --workspace=ui -- src/shared/hooks/useTrustedContentAttesters.test.ts`; `npm run typecheck --workspace=ui`; `npm run build --workspace=ui` (same existing Privy/Rollup pure-annotation and chunk-size warnings).

## 2026-05-15 — Beat Agent service-host integration

- Completed step 8 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`: initial `service-host` integration.
- Added `beat-agent` as a `ServiceKind`, registered `runBeatAgent` with the supervisor and `createBeatAgentApp` as an HTTP app factory, and added `@commonality/beat-agent` as a `service-host` dependency.
- `service-host` env config now supports `BEAT_AGENT_ENABLED=true` for single-kind bundles (default false) and multiple beat-agent instances via `SERVICE_HOST_INSTANCES` with instance-specific env overrides such as `BEAT_AGENT_US_POLITICS_BEAT_ID` / `BEAT_AGENT_LOCAL_NEWS_PRIVATE_KEY`.
- Updated service-host tests/docs plus beat-agent README/spec. Next step: step 9, UI/settings integration for trusting beat-agent attester identities and showing beat/context-citation reasoning.
- Checks passed: `npm run test --workspace=@commonality/service-host`, `npm run build --workspace=@commonality/service-host`, `npm run lint --workspace=@commonality/service-host`, and workspace LSP diagnostics.

## 2026-05-15 — Beat Agent finder-mode v1

- Completed step 7 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`: initial finder mode.
- Added `beat-agent/src/finder.ts` with JSON finder-state load/save helpers and `runBeatFinderOnce`, which reads ingested beat items, skips already-processed content canonical IDs, applies a pluggable candidate selector, submits selected candidates to a configured attester `/evaluate-content` endpoint with optional `x-finder-key`, records submitted/not-promising outcomes, and leaves failed submissions unprocessed for retry.
- Exported finder APIs from `beat-agent/src/index.ts`, added regression tests in `beat-agent/test/finder.test.ts`, and documented finder mode in `beat-agent/README.md` plus the beat-agent spec.
- Next step: step 8, integrate `beat-agent` with `service-host` so deployments can run configured beat-agent instances (eventually including ingestion/finder loops plus HTTP attester mode).
- Checks passed: `npm run test --workspace=@commonality/beat-agent`, `npm run build --workspace=@commonality/beat-agent`, `npm run lint --workspace=@commonality/beat-agent`, and workspace LSP diagnostics.

## 2026-05-15 — Beat Agent attester-mode HTTP wrapper

- Completed step 6 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`: attester mode now has the `attester-core` HTTP/payment wrapper.
- Added `beat-agent/src/app.ts`, `config.ts`, `content.ts`, and `context.ts`. The runnable service now exposes `/evaluate-content`, `/quote`, `/health`, and `/status/:statementCid/:contentCanonicalId`; validates x402-style payments; supports optional trusted finder key auth; resolves text/URL/IPFS content; retrieves optional platform local context plus JSON memory observations; uploads explanations; publishes positive `AlignmentAttestations`; and writes optional JSONL operator logs.
- Updated `beat-agent/src/index.ts` with `createBeatAgentApp`/CLI wiring and exported the new helpers; added balance/error handling in `blockchain.ts`; added HTTP tests; updated README/spec.
- Next step: step 7, finder mode — scan ingested beat items for promising posts, submit candidates to the beat agent's own attester endpoint or another trusted attester, and track processed items to avoid repeats.
- Checks passed: `npm run test --workspace=@commonality/beat-agent`, `npm run build --workspace=@commonality/beat-agent`, `npm run lint --workspace=@commonality/beat-agent`, and workspace LSP diagnostics.

## 2026-05-15 — Beat Agent attester-mode core

- Started step 6 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`: attester mode. This pass implements the core evaluation/publishing flow, not yet the Express/payment wrapper.
- Added `beat-agent/src/evaluator.ts` for context-aware beat-agent LLM prompts using `attester-core` OpenRouter JSON completion, result normalization, and conservative abstention handling.
- Added `beat-agent/src/attester.ts` for request validation, injected content/context/evaluation dependencies, positive-only explanation upload and `AlignmentAttestations` publishing, and operator-visible logs for every paid evaluation including negative/abstain.
- Added `beat-agent/src/blockchain.ts` with the same content-canonical-ID subject hash/publish scheme used by `content-attester`. Added `@commonality/attester-core` dependency and tests for the new core flow.
- Next step: finish step 6 by wrapping this core in an `attester-core` Express app with `/evaluate-content`, `/quote`, `/health`, payment validation, config loading, IPFS upload wiring, and likely local-context/memory retrieval wiring.
- Checks passed: `npm run test --workspace=@commonality/beat-agent`, `npm run build --workspace=@commonality/beat-agent`, `npm run lint --workspace=@commonality/beat-agent`, and workspace LSP diagnostics.

## 2026-05-15 — Beat Agent context memory v1

- Completed step 5 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`: initial JSON-backed context-memory primitives.
- Added `beat-agent/src/memory.ts` with timestamped observation storage, default/pluggable observation extraction from ingested items, keyword+recency retrieval, and coarse compaction of old item observations into summary records.
- Exported the memory API from `beat-agent/src/index.ts`; documented the v1 memory boundary in `beat-agent/README.md`; marked the beat-agent plan step as done.
- This is intentionally not a full LLM memory system yet: LLM-backed extraction/summarization and stronger poisoning defenses remain future service work. Next step is attester mode using `attester-core`, local context, and retrieved ambient observations.
- Checks passed: `npm run test --workspace=@commonality/beat-agent`, `npm run build --workspace=@commonality/beat-agent`, `npm run lint --workspace=@commonality/beat-agent`, and workspace LSP diagnostics.

## 2026-05-15 — Beat Agent minimal ingestion

- Completed step 4 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`: initial minimal beat-ingestion state loop.
- Added `beat-agent/src/ingestion.ts` with beat/source config types (`account`, `query`, `list`, `rss`), a pluggable source-adapter interface, JSON state load/save helpers, per-source cursor/fetch timestamps, canonical-ID deduplication, and skip handling for rate limits, missing credentials, and missing adapters.
- Exported the ingestion API from `beat-agent/src/index.ts`; documented the current boundary in `beat-agent/README.md`; marked the beat-agent plan step as done.
- No concrete platform fetch adapters were added yet. Next step is context memory v1: extract timestamped observations from ingested items, store/retrieve relevant observations, and add coarse compaction/decay.
- Checks passed: `npm run test --workspace=@commonality/beat-agent`, `npm run build --workspace=@commonality/beat-agent`, `npm run lint --workspace=@commonality/beat-agent`, and workspace LSP diagnostics.

## 2026-05-15 — Beat Agent local-context primitives

- Completed step 3 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`: initial platform local-context primitives.
- `platform-api-service` now exposes `POST /context/local`, backed by new `LocalContentContext` / `PlatformContentItem` schemas in `src/types.ts` and a `PlatformApiService.getLocalContentContext(...)` method.
- Twitter/X v1 local context fetches the target tweet, included replied-to parent/quoted tweets, and recent author posts (excluding the target). Thread and reply arrays are currently present in the schema but not populated yet. YouTube/Substack return target-only local context for now.
- Updated `platform-api-service/README.md` and marked beat-agent plan step 3 done. Next step is minimal beat ingestion: configuring beats as accounts/queries/lists/feeds, persisting ingested items/timestamps, and respecting platform credentials/rate limits.
- Checks passed: `npm run test --workspace=@commonality/platform-api-service`, `npm run lint --workspace=@commonality/platform-api-service`, and workspace LSP diagnostics.

## 2026-05-15 — Beat Agent service boundary and schemas

- Completed the first two implementation-plan steps in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`: defined the initial beat-agent package/service boundary and extended the shared evaluation schemas.
- Added new workspace package `beat-agent/` (`@commonality/beat-agent`) with README, TypeScript schemas for three-valued beat-agent evaluations (`positive` / `negative` / `abstain`), abstention reasons, context-citation explanation documents, operator-visible evaluation log entries, and helper validation/publish-threshold/document-builder semantics.
- Decision recorded in the spec/README: store all paid evaluations in an operator-visible log. Negative/abstain results do not publish positive attestations, but they are useful demand and coverage-gap signals.
- Updated root `package.json`, `package-lock.json`, and `tsconfig.json` so the new package is part of the workspace/typecheck graph.
- Marked implementation-plan steps 1 and 2 as done in the beat-agent spec. Next logical step is platform local-context primitives (likely platform-api-service/shared adapter work for canonical resolution plus parent/thread/quote/reply/author-recent lookup).
- Checks passed: `npm run test --workspace=@commonality/beat-agent`, `npm run build --workspace=@commonality/beat-agent`, `npm run lint --workspace=@commonality/beat-agent`, and workspace LSP diagnostics.

## 2026-05-15 — Thin CSM movement site

- Completed TODO.md “Thin CSM to a Commonality-shaped movement site”.
- `ui/src/domains/csm/manifest.tsx` now exposes only movement/thesis routes (`/`, `/about`, `/popular-statements`, `/organize`) and no longer mounts local Civility/Pubstarter/Alignment product routes (`/content`, `/projects`, `/portal`). CSM feature flags for content funding, pubstarter, and funding portals are now false.
- `ui/src/domains/csm/CsmPages.tsx` now keeps the about thesis, popular statement prompts, and CSM nudger discovery, with signpost cards to Civility, Tally, Alignment, and Pubstarter instead of embedded product surfaces.
- Updated CSM landing copy/actions and route/feature smoke tests for the thin movement-site shape. Removed the completed item from `TODO.md`.
- Checks: `npm run test:vitest --workspace=ui -- src/domains/csm/CsmPages.test.tsx src/domains/domainRoutes.test.tsx src/domains/CrossDomainSmoke.test.tsx`; `npm run build --workspace=ui` (passes with existing Privy/Rollup pure-annotation and chunk-size warnings). Note: an earlier mistargeted root `npm test -- --run ...` started integration-test Docker services and timed out; services were stopped with `docker compose down`.

## 2026-05-15 — Bridge Creator config loader cleanup

- Completed TODO.md “Duplicate config functions” item for Bridge Creator.
- `bridge-creator/src/config.ts` now has one real loader (`loadConfig(env = process.env)`), with `loadConfigFromEnv` kept as a compatibility alias for service-host imports.
- Standardized Bridge Creator-specific env vars (`BRIDGE_CREATOR_PRIVATE_KEY`, `BRIDGE_CREATOR_NAME`, `BRIDGE_CREATOR_COMMONALITY_STATEMENTS`, etc.) while retaining shared infra fallbacks where already used (`ETHEREUM_RPC_URL`, `INDEXER_URL`, `IPFS_API`, `IPFS_GATEWAY`, `OPENROUTER_MODEL`). Removed old generic nudger/commonality names from this package.
- Added `bridge-creator/test/config.test.ts` coverage and updated `bridge-creator/README.md` config docs.
- Checks passed: `npm run test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, `npm run lint --workspace=@commonality/bridge-creator`, `npm run test --workspace=@commonality/service-host`, and LSP diagnostics for `bridge-creator/src/config.ts`.

## 2026-05-12 — Bridge Creator prompts as open files

- Completed the TODO.md “Prompts as open files” item for Bridge Creator.
- Added standalone prompt Markdown files in `bridge-creator/prompts/` for compatibility analysis, modified-statement generation, and commonality-statement generation.
- Updated `bridge-creator/src/nudger.ts` to load and render those prompt templates from disk instead of keeping the prompt bodies as inline strings.
- Updated `bridge-creator/README.md` to point readers at the inspectable prompt files and removed the completed TODO item.
- Also removed an obsolete `port` field from the Bridge Creator test config helper to clear the workspace TypeScript diagnostic.
- Verified with `npm run test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and workspace LSP diagnostics.

## 2026-05-08 — Target testnet chain set to Base Sepolia

- Completed TODO.md item: decided and configured the target testnet chain as **Base Sepolia** (chain ID 84532).
- All Ethereum Sepolia (`sepolia`, chain ID 11155111) references in deployment scripts and config replaced with `base-sepolia` (chain ID 84532).
- Key changes:
  - `hardhat/hardhat.config.cjs`: network `sepolia` → `base-sepolia`, RPC default `https://rpc.sepolia.org` → `https://sepolia.base.org`
  - `hardhat/scripts/deploy.js`: updated comment
  - `deployments/sepolia.env` deleted; `deployments/base-sepolia.env` created in its place
  - `indexer/ponder.config.ts`: supported chain `sepolia` → `base-sepolia`, chain ID 11155111 → 84532, env var `PONDER_RPC_URL_11155111` → `PONDER_RPC_URL_84532`
  - `indexer/README.md`: updated chain and env var names
  - `ui/src/wagmi.ts`: `sepolia` → `baseSepolia` (wagmi/chains import), `VITE_SEPOLIA_RPC_URL` → `VITE_BASE_SEPOLIA_RPC_URL`
  - `.env.example`: `SEPOLIA_RPC_URL` → `BASE_SEPOLIA_RPC_URL`
  - `scripts/setup-env.sh`: `sepolia` case → `base-sepolia`, `SEPOLIA_RPC_URL` → `BASE_SEPOLIA_RPC_URL`
  - `scripts/deploy-ui.sh`: network name references updated
  - `render.yaml`: PONDER_CHAIN comment and `PONDER_RPC_URL_11155111` → `PONDER_RPC_URL_84532`
  - `workflow/deployment.md`: all Sepolia references updated to Base Sepolia; Etherscan → Basescan
  - `scripts/update-ens.sh`: added comment clarifying ENS lives on Ethereum L1 (not Base), so `--network sepolia` in that script refers to Ethereum Sepolia
- Checks passed: `npm run typecheck --workspace=ui`, `npm run build --workspace=ui`.

## 2026-05-07 — Funding portal zero labels use payment currency

- Completed TODO.md item to replace portal funding summary `0 ETH` labels with the actual payment-token symbol.
- `formatCurrencyTotals` now accepts a fallback currency for empty totals/bigint formatting.
- `FundingPortalSummary` derives its fallback display currency from actual raised totals, aligned project funding currency, delegatable totals, configured payment token, or the default USDZZZ payment currency; empty summary cards now show e.g. `0 USDZZZ`/`0 USDC` instead of `0 ETH`.
- Added a regression test for empty funding labels on a USDZZZ portal.
- Checks passed: `npm run test:vitest --workspace=ui -- src/fundingportal/components/FundingPortalSummary.test.tsx src/shared/currency.test.ts`; `npm run typecheck --workspace=ui`.

## 2026-05-07 — Alignment attestation subject ID fix

- Completed TODO.md BLOCKS TESTNET item for invisible project alignment attestations.
- Root cause was address subject IDs: on-chain `AlignmentAttestation.subjectId` is a bytes32 left-padded address, but the project-detail UI queried with the raw 20-byte project address and submitted raw addresses for new vouches.
- `getSubjectStatements` / `getAlignmentAttestation` now normalize 20-byte address inputs to padded bytes32 topic values, preserving bytes32 callers. `AlignmentAttestationsSection` now submits `toSubjectId(projectAddress)`.
- Added SDK/UI regression tests for subject-topic padding and attestation submission. Also verified against the running local Ponder cache that an indexed alignment event resolves via both raw project address and bytes32 subject ID, and that the corresponding portal returns aligned projects.
- Checks passed: `npm run test --workspace=sdk -- src/subsystems/fundingportals/queries.test.ts src/subsystems/fundingportals/folds.test.ts`; `npm run test:vitest --workspace=ui -- src/fundingportal/components/AlignmentAttestationsSection.test.tsx`; `npm run typecheck --workspace=sdk`; `npm run typecheck --workspace=ui`.

## 2026-05-07 — Pubstarter amount display cache regression fix

- Completed TODO.md BLOCKS TESTNET item for Pubstarter amount display regression.
- Root cause found in project fold caching rather than currency formatting: cached project accumulators were being passed back through `getProject` with a block-only inclusive cursor, so already-folded events could be re-applied and inflate `totalReceived`/progress displays.
- `foldProject` now records a last-event block/log cursor on accumulators and ignores replayed events when resuming. UI project loading now refetches full project state when an old cache entry exists, rewrites it, and bumps the IndexedDB cache key version to invalidate corrupted `v1` cache entries.
- Files changed: `sdk/src/subsystems/pubstarter/folds.ts`, `sdk/src/subsystems/pubstarter/folds.test.ts`, `ui/src/shared/foldCache.ts`, `ui/src/shared/hooks/useCachedProject.ts`, `ui/src/shared/hooks/useCachedProject.test.ts`, `TODO.md`, `CONTINUITY.md`.
- Checks passed: `npm run test --workspace=sdk -- src/subsystems/pubstarter/folds.test.ts`; `npm run test:vitest --workspace=ui -- src/shared/hooks/useCachedProject.test.ts src/shared/foldCache.test.ts`; `npm run typecheck --workspace=sdk`; `npm run typecheck --workspace=ui`; `npm run build --workspace=sdk`; `npm run build --workspace=ui` (existing Privy/Rollup pure-annotation and chunk-size warnings).

## 2026-05-07 — Seed project alignment attestations

- Implemented TODO.md “Seed alignment attestations” for demo/local seed data.
- `fake-data-generation/fundingAndDelegationActions.ts` now gives Pubstarter seed projects explicit `seedProjectKind` values and formal `alignedStatementRefs` in uploaded metadata.
- `fake-data-generation/runSimulation.ts` now reuses real created Pubstarter assurance-contract addresses for random project-alignment actions instead of mock addresses, and `gen:seed:local` publishes five deterministic project↔fundable-statement alignment attestations after seed worker outputs.
- Updated fake-data-generation README and seed metadata tests for the new project-kind/alignment-ref metadata.
- Checks passed: `npm run test --workspace=fake-data-generation`, `npm run lint --workspace=fake-data-generation`, `npm run typecheck --workspace=fake-data-generation`.

## 2026-05-07 — Fundable Project Explorer moved to Alignment

- User clarified that Tally should not have `/explore` yet, and that the existing `fundable-project-explorer` is the Alignment cause/funding explorer rather than a generic explorer.
- Removed Tally `/explore` route and primary-nav item. Updated Tally `/start` onboarding cards so they no longer link to `/explore`.
- Wired Alignment `/explore` to the existing `ExplorerPage` so it consumes the seeded `fundable-project-explorer` curated collection. Removed the old hardcoded `AlignmentExploreCausesPage` placeholder.
- Updated docs/specs/TODO wording to say the seeded worker output is the Alignment/Fundable Project Explorer fixture and that Tally intentionally has no `/explore` route for now.
- Updated route-ownership tests to assert Tally has no explorer route/nav item.
- Checks passed: targeted UI Vitest (`CrossDomainSmoke`, `domainRoutes`, `ExplorerPage`, `HomePage`) and `npm run typecheck --workspace=ui`. An earlier mistargeted `npm test --workspace=ui -- --run ...` ran the full Vitest suite successfully but then failed because the extra args were forwarded to Playwright E2E as nonexistent test files.

## 2026-05-07 — DelegatableNotes purchase shares refactor

- User asked to implement the `DelegatableNotes.sol` TODO: remove parallel delegated-note purchase APIs, remove multi-token delegated-note purchases, and use explicit purchased-output shares instead of proportional payment splitting/remainder checks.
- Implemented `PurchaseShare { noteId, chain, shares }` in `hardhat/contracts/delegation/DelegatableNotes.sol`. `shares` is the exact number of purchased ERC1155 units allocated to that note/chain; delegated-note primary/secondary purchases now require one token ID per transaction and `sum(shares) == count`.
- Removed `purchaseFromPrimaryMarketWithSplits` / `purchaseFromSecondaryMarketWithSplits`; clean Solidity functions are now `purchaseFromPrimaryMarket(PurchaseShare[], primaryMarket, erc1155Contract, tokenId, count)` and `purchaseFromSecondaryMarket(PurchaseShare[], secondaryMarket, saleListingId, tokenCount)`.
- Payment consumed per note is derived as `requiredPayment * shares / count`, with exact-divisibility checks; ERC1155 output notes are created directly with `amount = shares`, so no arbitrary rounding recipient remains.
- Updated SDK wrapper types/calls, regenerated SDK/indexer ABI snapshots, updated UI note-funded purchase flows to send `purchaseShares`, and made Pubstarter note-funded buys reject multiple token types in one transaction.
- Updated hardhat, UI, integration-test, e2e, and fake-data-generation callers/tests.
- Removed the completed `TODO.md` item.
- Checks passed: targeted Hardhat DelegatableNotes audit/purchase tests; `npm run test:fast`; `npm run build`; `npm run lint` (Slither still reports unrelated existing informational findings around ChannelRegistry shadowing, missing inheritance, and unindexed event addresses, but no new divide-before-multiply finding after the final arithmetic tweak).

## 2026-05-06 — Bookmarkable local UI admin page

- User asked for an easy bookmark page with links to all nine stable local domain URLs.
- Renamed/enhanced the local UI gateway root page as a local admin page and documented `http://localhost:8088/admin` in local-development docs and `ui/README.md`.
- The gateway already serves this admin link list for unmatched hosts/paths; domain hosts still proxy to the IPFS bundles.

## 2026-05-06 — Local stable UI gateway for IPFS domain bundles

- User chose the local gateway/reverse-proxy approach first, with the same pattern planned for testnet later.
- Added `scripts/local-ui-gateway.mjs` and a `ui-local-gateway` docker-compose service on port 8088. It maps `http://<domain>.localhost:8088/#/` to the latest CID in `data/ui-ipfs/<domain>/cid.txt` and proxies to the local Kubo gateway.
- Updated IPFS publishing to emit `stable-url.txt`/`metadata.stableUrl` and to default cross-domain `VITE_*_URL` values to the stable local hostnames during local publisher builds.
- Updated `services.sh --url` and local docs to present stable URLs; `TODO.md` now leaves only the testnet version of this strategy.
- Important fix: `ui/vite.config.ts` now includes process env in generated `config.json` (whitelisted keys only), so env passed by publisher containers is captured in runtime config.
- Checks passed: `node --check scripts/local-ui-gateway.mjs`, `node --check scripts/publish-ui-to-ipfs.mjs`, `docker compose config --quiet`, and `npm run ui:build` (existing Rollup/Privy annotation/chunk-size warnings).

## 2026-05-06 — Smart-contract audit fixes implemented

- User asked to implement fixes from `workflow/reviews/smart-contract-audit-2026-05-06.md`, with the one discussion-needed item moved to `TODO.md`.
- Implemented H-01 by gating third-party content-funding success: `CancellableCondition` now consults `ChannelRegistry.canThirdPartyContractSucceed(channelId)`, which only becomes true after the creator has taken channel control and the veto window has elapsed. This lets creators veto during the window even if the funding threshold was reached earlier.
- Implemented M-01 mitigations: `CreatorAssuranceContractFactory` now has `thirdPartyMaxDuration` (default 7 days) and rejects third-party deadlines beyond it; docs now call out meaningful `thirdPartyMinPurchase` configuration and standard-token assumptions.
- Implemented L-01: `AlignmentRevoked` now includes `topicStatementId`; updated hardhat tests and SDK/indexer ABI snapshots.
- Implemented part of L-02: `verifyChannel` rejects zero-address claimants. I did not require caller == claimant; `_msgSender()` only becomes meta-tx-aware if the contract opts into an ERC2771-style context, so this should be decided deliberately before disabling relayed/third-party proof submission.
- Added `TODO.md` item for M-02 DelegatableNotes scarce ERC1155 output allocation, per user request.
- Checks passed: `npm run test --workspace=hardhat`; `npm run build` (with existing UI Rollup/Privy annotation and chunk-size warnings); `npm run lint --workspace=hardhat` (Slither reported existing-style informational findings but exited successfully).

## 2026-05-06 — Pre-testnet review fixes/TODO triage

- User asked to read `workflow/reviews/before-testnet.md` and either implement fixes or write TODOs.
- Implemented three small UI/code fixes:
  - Pubstarter SDK queries now read assurance-contract/marketplace `paymentToken()` plus ERC-20 `symbol()`/`decimals()` when a public client is available, so project/token/contribution/secondary-market currency display is no longer hardcoded to ETH (falls back to ETH if chain reads are unavailable).
  - Threshold-zero / open-ended projects now display “No minimum” and omit the misleading 0% progress bar in project cards, headers, and aligned-project cards.
  - Project headers truncate recipient addresses and add a copy-recipient button.
- Also switched several Content Funding read-only funding displays to use the project funding currency when available.
- Added TODOs for larger pre-testnet work: stable cross-domain URL strategy, Explorer/Alignment curated fixtures, seed alignment attestations, and remaining form-label currency cleanup.
- Checks passed: `npm run build --workspace=sdk`; targeted UI Vitest for changed components/pages; `npm run build --workspace=ui` (with existing Rollup/Privy pure-annotation and chunk-size warnings).


## 2026-05-06 — Landing-page links made non-placeholder

- User asked to go through landing-page links and make sure each one goes somewhere, implementing small missing pages/features where reasonable.
- Removed `#` placeholder links from landing pages.
- Added small destination pages/routes:
  - Commonality `/participate` for “How can I participate?”
  - Alignment `/explore` for “Explore causes”
  - Content Funding `/content/new` and `/explore` for starting content contracts / exploring content criteria
  - Civility `/filters`, `/popular-statements`, and `/nominate`
  - CSM `/popular-statements`
  - Delegation `/supported-sites` as a fallback destination for supported-site links
- Updated Conceptspace landing repo actions to real GitLab monorepo subdirectory URLs.
- Updated landing/domain route smoke tests, including an assertion that landing-page links are no longer `#` placeholders.
- Checks passed: targeted Vitest (`CrossDomainSmoke`, `domainRoutes`, and landing tests before the final test tightening), targeted Vitest re-run for `CrossDomainSmoke` + `domainRoutes`, and `npm run build --workspace=ui` (with existing Rollup/Privy annotation and chunk-size warnings).


## 2026-05-06 — Landing pages synced to UI-domain product copy

- User asked to reread `specs/product/ui-domains.md` and update the nine domain landing pages to match the current title/description/spotlight/section/action wording.
- Updated landing pages for Commonality, Pubstarter, Alignment, Delegation, Content Funding, Civility (`noninflammatory`), CSM, and Conceptspace. Tally already matched the spec copy and has no concrete action in the spec yet.
- Added/updated hero actions where the product spec listed actions; cross-domain actions use `getDomainUrl(..., { fallbackHref: '#' })` where the destination lives on another domain or is not wired yet.
- Updated domain smoke and landing-page tests to assert the current product-spec wording/actions.
- Checks passed: targeted Vitest (`npm run test:vitest --workspace=ui -- src/domains/commonality/LandingPage.test.tsx src/domains/noninflammatory/LandingPage.test.tsx src/domains/content-funding/LandingPage.test.tsx src/domains/csm/LandingPage.test.tsx src/domains/CrossDomainSmoke.test.tsx`) and `npm run build --workspace=ui` (with existing Rollup/Privy annotation and chunk-size warnings).


## 2026-05-05 — Delegation UI domain split complete

- User asked to split delegation-system UI out of Alignment into its own `Delegation` UI domain, based on `specs/product/ui-domains.md`.
- Product/spec/docs updates made:
  - `specs/product/ui-domains.md` now treats Delegation as its own site and removes delegation-management ownership from Alignment/Conceptspace wording.
  - `specs/tech/ui-domains.md`, `specs/tech/README.md`, `ui/README.md`, `workflow/local-development.md`, `workflow/BUILD.md`, `workflow/deployment.md`, `TODO.md`, and `docs/common-sense-majority/README.md` updated from eight/six to nine domains where relevant.
  - Historical `specs/product/ui-domains-may5.md` was adjusted to say Delegation was later split out, rather than rewriting the whole historical note.
  - User-facing delegate docs now direct people to Delegation instead of telling them to open Alignment's old My Notes routes; subsystem UI docs note that note-detail links are cross-domain.
- UI implementation made:
  - Added `ui/src/domains/delegation/` with `LandingPage.tsx` and `manifest.tsx`; owns `/notes`, `/notes/new`, `/notes/:noteId` and has delegation feature flag true.
  - Removed `/notes*` routes from Alignment; Alignment now owns root + `/portal/:statementCid` routes and links to Delegation for donor-delegate setup.
  - Added `delegation` to `DomainId`, domain registry, domain URL helper/runtime config (`VITE_DELEGATION_URL`), Vite domain resolver, build-domain script, deploy script, publish script, Docker build planner, docker-compose publisher service, and `scripts/services.sh` domain loops/service lists.
  - Updated Commonality compatibility `/notes/*` target to Delegation; added cross-links from Commonality/Pubstarter/Content Funding where appropriate.
  - Updated funding portal and Pubstarter components so cross-domain delegation links use `getDomainUrl('delegation', ...)` instead of assuming local Alignment `/notes*` routes.
  - Updated domain smoke/route/url tests and affected component tests.
- Checks run and passed:
  - Targeted Vitest: `npm run test:vitest --workspace=ui -- src/domains/CrossDomainSmoke.test.tsx src/domains/domainRoutes.test.tsx src/domains/domainUrls.test.ts src/domains/commonality/LandingPage.test.tsx src/delegation/components/AvailableDelegatableFunding.test.tsx src/fundingportal/components/DelegatableNotesSection.test.tsx src/pubstarter/components/BuyTokensSection.test.tsx` (passed; expected stderr from tests that intentionally exercise error paths).
  - `npm run typecheck --workspace=ui` passed.
  - `bash -n scripts/services.sh`, `bash -n scripts/deploy-ui.sh`, `node scripts/docker-build-plan.mjs list ui-ipfs-publisher-delegation`, and `docker compose config --services | grep -x ui-ipfs-publisher-delegation` passed.
  - `VITE_DOMAIN=delegation npm run build --workspace=ui` passed with existing Rollup pure-annotation/chunk-size warnings.
  - `npm run build:domains --workspace=ui` passed with the same existing Rollup warnings.
- Completion pass:
  - Inspected status/diff for overreach.
  - Searched active docs/code for stale “eight domains” / “six domains” / “Alignment owns delegation” wording; remaining matches are historical notes or intended cross-domain references.
  - Task is complete; no known blockers.

## 2026-05-05 — May 5 UI-domain reshuffle completion pass

- Completed the May 5 UI-domain reshuffle checklist in `specs/product/ui-domains-may5.md` after re-reading founder-level docs, user-level docs, `specs/README.md`, and `specs/product/ui-domains.md`.
- Product/copy fixes: reduced overstuffed hero CTAs on Tally and the CSM organizing page to the two-CTA rule; fixed stale Content Funding copy that still described escrow/payout mechanics as “Commonality” rather than Pubstarter-style content contracts; updated affected landing-page tests.
- Verified active docs/UI no longer use “built on Commonality” for specific downstream dependencies; only historical reshuffling notes still contain that language.
- Checks passed: targeted domain Vitest (`CrossDomainSmoke`, `domainRoutes`, `domainUrls`, Commonality/Content Funding/Noninflammatory/CSM landing tests), `npm run typecheck --workspace=ui`, `npm run build:domains --workspace=ui`, and `npm run build:ipfs:domains --workspace=ui` (with existing Rollup dependency annotation/chunk-size warnings).
- Manual/static smoke checks: used temporary Playwright scripts (removed afterward) to visit all eight local Vite domain roots and all eight static IPFS/hash-router build roots, checking H1s, nonblank links, and console/page errors.
- Updated `TODO.md` to mark the UI-domain split item done.

## 2026-05-04 — Per-site docs task 3: Conceptspace developer docs route

- Completed TODO.md per-site docs item 3.
- Added `docs/conceptspace.md`, a developer-facing Conceptspace docs entry point linking to the existing subsystem specs, SDK API docs, contract docs, and implementation package READMEs.
- Wired Conceptspace `/docs` to redirect to `/docs/conceptspace`, added `/docs/*` via the shared `DocsPage`, enabled `features.docs`, and added `Developer Docs` to the Conceptspace primary nav.
- Updated the Conceptspace landing-page docs CTAs and the relevant DocsPage, domain route, and cross-domain smoke tests.
- Marked TODO.md item 3 as done.
- Verification: `npm run test:vitest --workspace=ui -- src/domains/domainRoutes.test.tsx src/domains/CrossDomainSmoke.test.tsx src/docs/DocsPage.test.tsx` passed; `npm run build --workspace=ui` passed (with existing Rollup/Privy annotation and chunk-size warnings). An earlier attempted `npm run test --workspace=ui -- --run ...` ran the Vitest suite successfully but then failed in Playwright because those arguments were not E2E test files.

## 2026-05-04 — UI domains reshuffle task 11: documentation/spec cleanup

- Completed Task 11 (the final task) from `ui-domains-reshuffling.md`.
- Updated `specs/product/ui-domains.md`: changed the status section from "mid-reorganization" to "reorganization complete"; updated the explanatory text accordingly.
- Marked Task 11 as ✅ Done in `ui-domains-reshuffling.md`.
- All other doc files (`specs/tech/ui-domains.md`, `ui/README.md`, `workflow/local-development.md`, `workflow/deployment.md`, `workflow/BUILD.md`, `README.md`) were already up to date from previous tasks (Tasks 9 and 10 updated them).
- No stale "four domains" or `movement` domain-ID references found anywhere.
- Verified with `npm run lint --workspace=ui` (clean).
- The full ui-domains-reshuffling.md plan is now complete. All 11 tasks are marked done.

## 2026-05-04 — UI domains reshuffle task 10: deployment docs/scripts for final domain list

- Completed Task 10 from `ui-domains-reshuffling.md`.
- `deploy-ui.sh` already had all six domains; no script changes needed.
- Updated `workflow/deployment.md`: "four branded SPAs" → "six branded SPAs"; example updated to `tally`; supported domain list updated to `commonality, tally, content-funding, noninflammatory, csm, conceptspace`.
- Rewrote `specs/tech/ui-domains.md`: updated all "four" → "six" counts, replaced `movement` with `csm` and added `tally`/`conceptspace` throughout directory shape, build outputs, and docker-compose publisher list.
- Updated `specs/tech/README.md`: "four sites" → "six sites".
- Verified with `npm run lint --workspace=ui`.
- Note for next task: Task 11 is documentation/spec cleanup (check for any remaining stale "four domains" claims).

## 2026-05-04 — UI domains reshuffle task 9: local IPFS/docker publishing for all six domains

- Completed Task 9 from `ui-domains-reshuffling.md`.
- Added `ui-ipfs-publisher-tally` and `ui-ipfs-publisher-conceptspace` services to `docker-compose.yml` (same pattern as the existing four).
- Updated the "four services" comment in docker-compose.yml to "six services".
- Updated `scripts/services.sh`: added `tally` and `conceptspace` to the domain loops in `print_spa_urls`, `wait_for_spa_gateway`, `wait_for_ui_ipfs_publish`, and `start_services` (both `compose_services` and `buildable_services` arrays and the `mkdir -p` pre-create block).
- Updated `scripts/docker-build-plan.mjs`: replaced stale `ui-ipfs-publisher-movement` alias with `ui-ipfs-publisher-csm`, and added `ui-ipfs-publisher-tally` and `ui-ipfs-publisher-conceptspace` aliases (all share the same `ui-ipfs-publisher-commonality` build config).
- Updated `workflow/BUILD.md`: "all four" → "all six" (two occurrences).
- Updated `workflow/local-development.md`: rewrote the one-liner to name all six domains.
- Updated `ui/README.md`: replaced the "being reshuffled incrementally" note with the final six-domain description.
- Verified with `bash -n scripts/services.sh`, `node scripts/docker-build-plan.mjs list ...` (new service names accepted), and `npm run lint --workspace=ui`.
- Note for next task: Task 10 is updating deployment docs/scripts for the final domain list.



## 2026-05-04 — UI domains reshuffle task 8: rework E2E test domain assumptions

- Completed Task 8 from `ui-domains-reshuffling.md`.
- `ui/playwright.config.ts` now launches three dev servers (tally:5173, commonality:5174, content-funding:5175) and three matching Playwright projects, each with `testMatch` routing tests to the domain that owns the routes they exercise.
- Added `/portal/:statementCid` and `/portal/:statementCid/leaderboard` routes to the tally manifest (and set `fundingportal: true`) so the subjectiv-flow test runs against tally.
- Updated `CrossDomainSmoke.test.tsx` to reflect tally's new `fundingportal: true` and extended tally route list.
- `delegation-flow.spec.ts`: replaced `goto('/start')` + tally assertion with `goto('/')` + direct primary-nav link click (runs under commonality).
- `pubstarter-flow.spec.ts`: replaced `goto('/start')` + tally assertion with `goto('/projects')` or `goto(\`/projects/...\`)` (runs under commonality).
- `content-funding-flow.spec.ts`: replaced `goto('/start')` + tally assertion with `goto('/content')` (runs under content-funding).
- `subjectiv-flow.spec.ts`: updated "My Trust Network" nav label to "Trust & Nudger Settings" to match tally's secondaryNavigation (runs under tally).
- `negative-paths.spec.ts`: split into two `describe` blocks — statement-route tests run under the tally project (default), project-route tests override `baseURL` to `http://localhost:5174` via `test.use({ baseURL })`.
- Verified with `npm run test:vitest --workspace=ui` (87 files / 1581 tests), `npm run lint --workspace=ui`, `npm run typecheck --workspace=ui`, and `VITE_DOMAIN=tally npm run build --workspace=ui`.
- Note for next task: Task 9 is updating local IPFS/docker publishing for the final six-domain list.

## 2026-05-04 — UI domains reshuffle task 7: strip downstream statement UX

- Completed Task 7 from `ui-domains-reshuffling.md`: Content Funding, Noninflammatory, and CSM no longer host local statement browsing/detail/profile routes.
- Removed `/statements`, `/statement/:statementCid`, `/profile`, and `/user/:address` from `ui/src/domains/content-funding/manifest.tsx`, `ui/src/domains/noninflammatory/manifest.tsx`, and `ui/src/domains/csm/manifest.tsx`.
- Replaced downstream statement/profile navigation and landing/about/organizing links with Tally cross-domain anchors via `getDomainUrl('tally', '/statements', { fallbackHref: '#' })`.
- Updated product copy so Content Funding is built on Commonality's funding infrastructure, Noninflammatory is built on Content Funding and links to Tally, and CSM uses Noninflammatory Content, Tally, and Commonality.
- Updated the domain smoke/route/landing/page tests and the shared not-found statement action to point statement browsing at Tally.
- Verified with targeted domain tests, full `npm run test:vitest --workspace=ui`, `npm run lint --workspace=ui`, `npm run typecheck --workspace=ui`, and builds for `VITE_DOMAIN=content-funding`, `VITE_DOMAIN=noninflammatory`, and `VITE_DOMAIN=csm`.
- Note for next task: Task 8 should move E2E statement/signing/profile assumptions to the `tally` domain and keep funding/content tests on their owning domains.

## 2026-05-04 — UI domains reshuffle task 6: reshape Commonality

- Completed Task 6 from `ui-domains-reshuffling.md`: Commonality is now framed as the internet-age coordination / better public-goods funding movement, not the full foundation site or statement-signing destination.
- Updated `ui/src/domains/commonality/LandingPage.tsx` to focus on movement thesis, projects/funding portals, and delegated funds; related product links point to Tally, Content Funding, and Conceptspace through `getDomainUrl(..., { fallbackHref: '#' })`.
- Trimmed `ui/src/domains/commonality/manifest.tsx` to docs, projects, funding portals, and notes routes only. Removed local `/start`, `/explore`, `/statements`, `/statement/:statementCid`, `/profile`, `/user/:address`, `/settings`, `/refs`, and `/content*` routes from Commonality.
- Updated Commonality navigation/footer/feature flags and the relevant domain smoke/route/landing tests.
- Verified with `npm run test:vitest --workspace=ui`, `npm run lint --workspace=ui`, and `VITE_DOMAIN=commonality npm run build --workspace=ui`.
- Note for next task: Task 7 should strip remaining statement UX from Content Funding, Noninflammatory, and CSM, replacing their local statement/profile links with cross-domain Tally links.

## 2026-05-04 — UI domains reshuffle task 5: cross-domain links

- Completed Task 5 from `ui-domains-reshuffling.md`: introduced internal/external link target support for domain navigation and landing-page actions/cards.
- Added shared link target helpers in `ui/src/shared/linkTypes.ts` and domain URL helpers in `ui/src/domains/domainUrls.ts`.
- Added runtime/build-time config keys for `VITE_COMMONALITY_URL`, `VITE_TALLY_URL`, `VITE_CONTENT_FUNDING_URL`, `VITE_NONINFLAMMATORY_URL`, `VITE_CSM_URL`, and `VITE_CONCEPTSPACE_URL`; documented them in `ui/README.md`.
- Updated `AppShell` and `DomainLandingPage` to render external links as normal anchors while preserving React Router links for internal paths. Landing page action/card props now use `path` for internal links instead of `to`.
- Updated Conceptspace's "Open Tally" CTA to use the new Tally URL helper with `#` fallback.
- Verified with `npm run test:vitest --workspace=ui`, targeted link tests, `npm run lint --workspace=ui`, and `VITE_DOMAIN=tally npm run build --workspace=ui`.
- Note for next task: Task 6 should use the new link support when replacing Commonality's statement/content-funding links with Tally/Content Funding cross-domain anchors.

## 2026-05-04 — UI domains reshuffle task 3: add Conceptspace

- Completed Task 3 from `ui-domains-reshuffling.md`: added a thin `conceptspace` domain as the infrastructure-facing surface.
- Added `ui/src/domains/conceptspace/` with a root-only landing page explaining statements, implication graph, signing/trust primitives, attesters, and nudgers; the Tally CTA uses `VITE_TALLY_URL` when configured and a placeholder otherwise.
- Wired `conceptspace` into domain IDs/manifests, Vite domain resolution, all-domain build script, local IPFS publish domain resolver, and deploy domain allowlist.
- Updated domain smoke/route tests for Conceptspace's root-only route ownership and added AppShell support for domains with no secondary navigation.
- Updated `ui/README.md` build-output list to include `csm` and `conceptspace`.
- Verified with `npm run test:vitest --workspace=ui`, `npm run lint --workspace=ui`, and `VITE_DOMAIN=conceptspace npm run build --workspace=ui`.
- Note for next task: Task 4 is the docs-domain strategy decision; do not broadly rewire docs until the product decision is made.

## 2026-05-04 — UI domains reshuffle task 2: rename movement → csm

- Completed Task 2 from `ui-domains-reshuffling.md`: renamed domain ID `movement` → `csm` throughout.
- Created `ui/src/domains/csm/` with renamed exports (`CsmLandingPage`, `Csm*Pages`, `csmManifest`), deleted `ui/src/domains/movement/`.
- Updated `DomainId` type, `domainManifests`, `getDomainIdFromEnv()`, `vite.config.ts`, `build-domains.mjs`, `deploy-ui.sh`, `publish-ui-to-ipfs.mjs`, `services.sh`, and `docker-compose.yml`.
- Updated `CrossDomainSmoke.test.tsx` and `domainRoutes.test.tsx` to use `csm`.
- Verified with `npm run test:vitest --workspace=ui` (86 files / 1587 tests all pass), `npm run lint --workspace=ui`, and `VITE_DOMAIN=csm npm run build --workspace=ui`.
- Product copy about "organizing a movement" kept unchanged; only the domain ID/manifest identifier changed.
- Note for next task: Task 3 is to add a thin `conceptspace` domain.

## 2026-05-04 — UI domains reshuffle task 1: add Tally

- Completed Task 1 from `ui-domains-reshuffling.md`: added the additive `tally` domain without removing existing Commonality statement routes.
- Added `ui/src/domains/tally/` with a Tally landing page and routes to the existing conceptspace statement/signing/profile/settings pages.
- Wired `tally` into domain IDs/manifests, Vite domain resolution, domain build script, local IPFS publish domain resolver, and deploy domain allowlist.
- Updated cross-domain smoke/route tests and light README copy for the new five-domain interim state.
- Verified with `npm run test:vitest --workspace=ui`, `npm run lint --workspace=ui`, and `VITE_DOMAIN=tally npm run build --workspace=ui`.
- Note for next task: local Docker/IPFS publisher services still list the older four domains; that is intentionally deferred to the later local-IPFS task in `ui-domains-reshuffling.md`.

## 2026-05-01 — data seeding existing-indexer guard

- Changed `scripts/data.sh --seed` to fail when the Ponder indexer already has events, unless `--allow-seed-on-existing-data` is passed.
- Documented the override in `workflow/local-development.md` and `workflow/BUILD.md`.
- Verified with `bash -n scripts/data.sh`.

## 2026-05-01 — before-testnet review fixes 1-3

- Removed developer-facing statement metadata, unknown fields, and successful-render CID footers from `ui/src/conceptspace/components/StatementRenderer.tsx`; error/not-found states still show the CID for troubleshooting.
- Updated Browse Statements to suppress excerpts that normalize to the same text as the statement title, avoiding duplicate statement text on cards.
- Added local-dev stale-Ponder guardrails: `scripts/services.sh --start` clears Ponder data when no saved local chain state exists, `scripts/data.sh --seed` warns if the indexer already contains events, and `workflow/local-development.md` documents the clean reset flow.
- Verified with targeted Vitest (`StatementRenderer`, `BrowseStatementsPage`), shell syntax checks for scripts, and `npm run build --workspace=ui`.

## 2026-05-07 — Demo seed payment-token funding fix

- User asked to get `./scripts/data.sh --seed=demo` working and allowed wiping local dev data.
- Reproduced failure after clean restart: seed users had ETH but payment-token funding failed because the fake-data generator was still using 18-decimal `parseEther` units for payment-token budgets/prices after local payment tokens switched to 6 decimals, causing content-funding initial purchases to revert with ERC20 insufficient balance.
- Added `fake-data-generation/paymentTokenUnits.ts` and updated fake-data payment-token funding/prices/thresholds/listings to use `PAYMENT_TOKEN_DECIMALS` (default 6) instead of ETH units. User funding still falls back to local `FreeERC20.mintTo` if a normal transfer is unavailable/underfunded.
- Wiped/restarted services and verified `./scripts/data.sh --seed=demo` now completes successfully with 6-decimal token amounts, including seed worker outputs, content-funding scenarios, and all invariant checks.
- Check passed: `npm run build --workspace=fake-data-generation`.

## 2026-05-15 — Beat Agent content-funding trusted-attester highlighting

- Continued step 9 in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md` by wiring the trusted content-attester/beat-agent settings into content-funding attestation chips.
- `ui/src/content-funding/components/ContentAttestationSummary.tsx` now reads `useTrustedContentAttesters()`, fills/highlights chips for trusted attesters, uses configured display names where present, and distinguishes trusted beat agents vs stateless content attesters in tooltips. Untrusted attestations remain outlined chips.
- Added regression coverage in `ui/src/content-funding/components/ContentAttestationSummary.test.tsx` for trusted beat-agent highlighting.
- Remaining step 9 work: add content-funding filtering and attestation detail/explanation UI that can show beat identity plus local/ambient context citations from explanation documents.
- Checks passed: `npm run test:vitest --workspace=ui -- src/content-funding/components/ContentAttestationSummary.test.tsx`; `npm run typecheck --workspace=ui`; `npm run build --workspace=ui` (same existing Privy/Rollup pure-annotation and chunk-size warnings).

## 2026-05-16 — Beat Agent X platform adapter

- Completed the remaining “One real platform adapter” beat-agent review item using Twitter/X as the first concrete platform.
- Added `beat-agent/src/twitterAdapter.ts` with `createTwitterBeatSourceAdapters` and `TwitterBeatSourceClient` for X API v2 account timeline, recent-search query, and list tweet sources. The adapter resolves account handles/URLs/canonical `twitter:uid:*` IDs where needed, fetches author-expanded tweets, maps them to canonical Commonality content IDs (`twitter:uid:<authorId>:<tweetId>`), stores newest tweet ID cursors, and uses `since_id` on later polls.
- Exported the adapter from `@commonality/beat-agent`, documented usage in `beat-agent/README.md`, and updated `beat-agents.md` review notes to mark platform adapter work complete.
- Added `beat-agent/test/twitterAdapter.test.ts` covering account, query, and list source requests/mapping.
- Checks passed: `npm run test --workspace=@commonality/beat-agent` (36/36), `npm run build --workspace=@commonality/beat-agent`, `npm run lint --workspace=@commonality/beat-agent`, workspace LSP diagnostics.
- Remaining beat-agent review gap: adversarial hardening (#8).
