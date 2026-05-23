# Continuity notes for ephemeral AI instances

I'm confused about whether this is forward or reverse chronological order; I think some pieces got mixed up. Pick one and stick with it. Okay, let's append new entries to the end of the file.


## 2026-05-21 — Bridge-creator rewrite step 3 partial: extracted statement/publication helpers

- Started the bridge-creator rewrite from `specs/product/bridge-creator-redesign.md`, focusing on implementation-plan step 3 ("Lift the keepers") rather than gutting the old behavior yet.
- Added `bridge-creator/src/statementPublisher.ts` with `publishBridgeStatement(...)`, extracting the bridge-created text-statement IPFS upload shape out of `nudger.ts` while preserving existing metadata (`extras.statement`, `extras.createdBy = bridge-creator`). `BridgeCreatorNudger` now calls this helper.
- Added `bridge-creator/src/publication.ts` with thin `createBridgeNudgePublisher(...)` / `publishBridgeNudgeBatch(...)` wrappers around `nudger-core` publication, so the future synthesizer has a bridge-creator-local publication seam before the old nudger is gutted.
- Exported the new helpers from `bridge-creator/src/index.ts` and added focused coverage in `bridge-creator/test/statementPublisher.test.ts`.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and LSP diagnostics clean.
- Next bridge-creator work: continue step 3 by extracting the implication-attester submission path once its intended API/config is identified (there was no such bridge-creator-local path in the current old `nudger.ts`), then proceed toward step 4/5.

## 2026-05-21 — Bridge-creator rewrite step 3 complete: implication submission seam

- Continued `specs/product/bridge-creator-redesign.md` implementation-plan step 3 ("Lift the keepers") after the statement/publication helper extraction.
- Added `bridge-creator/src/implicationPublisher.ts`, a small bridge-creator-local seam over SDK `createTestClients` + `attestImplication` for submitting modified-statement → common-ground implications. It supports single and sequential submissions and keeps dependencies injectable for tests/future synthesizer wiring.
- Exported the implication submitter helpers/types from `bridge-creator/src/index.ts`.
- Added focused coverage in `bridge-creator/test/implicationPublisher.test.ts`.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and LSP diagnostics clean.
- Next bridge-creator work: step 3 keepers are now in place; proceed to step 4 (gut old `src/nudger.ts`, `src/config.ts`, `prompts/*`, and old tests while keeping the exported shell and extracted modules), then build the new synthesizer around CSM beat-agent `/context`, anchors, publication, and implication submission.

## 2026-05-21 — Bridge-creator rewrite: anchor store seed foundation

- Continued bridge-creator rewrite work from `specs/product/bridge-creator-redesign.md`, focusing on the live anchor-management foundation (implementation-plan step 6) without gutting the old nudger yet.
- Added `bridge-creator/src/anchors.ts` with the spec anchor record shape, JSON store normalization/loading, duplicate-id validation, and active-anchor filtering.
- Added curated seed anchors in `bridge-creator/data/seed-anchors.json` from existing `hidden-majority` seed statements: abortion, immigration, gun-policy, and drug-policy clusters, each with moderate-left, moderate-right, and common-ground records.
- Exported the anchor helpers/types from `bridge-creator/src/index.ts` and added focused coverage in `bridge-creator/test/anchors.test.ts`.
- Checks passed: `npm test --workspace=@commonality/bridge-creator -- anchors.test.ts` (Mocha warning: direct pattern did not narrow, full workspace suite ran and passed), `npm run build --workspace=@commonality/bridge-creator`, and LSP diagnostics clean.
- Note: pre-existing uncommitted docs changes (`docs/common-sense-majority/vision-and-strategy/...`) were not touched.

## 2026-05-21 — Bridge-creator rewrite: CSM context-source seam

- Continued `specs/product/bridge-creator-redesign.md` bridge-creator-side rewrite work, focusing on the step 5 synthesizer prerequisite of reading trusted CSM beat-agent `/context` summaries.
- Added `bridge-creator/src/contextSources.ts` with `BRIDGE_CREATOR_CSM_CONTEXT_SOURCES` JSON parsing, `/context` fetching, signer-address validation, and readiness aggregation (`allContextsReady`). Exported the seam from `bridge-creator/src/index.ts` and wired it into `BridgeCreatorConfig.trustedContextSources`.
- Added focused tests in `bridge-creator/test/contextSources.test.ts` and extended config coverage. Updated `bridge-creator/README.md` and the redesign spec to describe the new partial scaffolding.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and LSP diagnostics for `bridge-creator/src/contextSources.ts` clean.
- Next bridge-creator work: wire these context snapshots into the new `runBridgeCreator` loop/synthesizer, then proceed with gutting the legacy request-time `nudger.ts` once the replacement shell is ready.


## 2026-05-21 — Bridge-creator rewrite: discovery and anchor endpoints

- Continued bridge-creator rewrite work from `specs/product/bridge-creator-redesign.md`, focusing on the public inspection surfaces needed before the synthesizer replaces the legacy request-time nudger.
- Extended `BridgeCreatorConfig` with anchor/discovery fields: `BRIDGE_CREATOR_ANCHOR_STORE_PATH`, `BRIDGE_CREATOR_STRATEGY_PROMPT_URL`, `BRIDGE_CREATOR_PUBLIC_BASE_URL`, and optional `BRIDGE_CREATOR_CONTACT`.
- Added `GET /anchors`, which loads the configured anchor store and returns only active anchors.
- Updated `GET /.well-known/nudger.json` to emit the redesign discovery shape (`nudger_type`, `signer_address`, strategy/anchor URLs, trusted sources, contact) and to derive `status: warming | ready` from trusted CSM context-source readiness.
- Updated `bridge-creator/README.md` and the redesign spec with the new scaffolding.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and LSP diagnostics clean for touched TypeScript files.
- Next bridge-creator work: add/serve the actual CSM strategy prompt content, then wire the new `runBridgeCreator` synthesizer loop to load context snapshots + anchors and hand synthesized triples to the extracted publication/implication modules.

## 2026-05-21 — Bridge-creator rewrite: CSM strategy prompt surface

- Continued `specs/product/bridge-creator-redesign.md` bridge-creator-side rewrite work, focusing on implementation-plan item 8 and the strategy-prompt inspection surface needed by `.well-known/nudger.json`.
- Added `bridge-creator/prompts/csm-strategy.md`, an initial CSM mediator strategy prompt covering popular-and-sane filtering, moderate-left/moderate-right compatibility, settle-it-once compromises, the abortion worked pattern, and no-op discipline for warming/thin context.
- Added `bridge-creator/src/strategyPrompt.ts`, exported `loadDefaultStrategyPrompt`, and wired `GET /strategy-prompt` to serve the prompt as Markdown.
- Added focused prompt coverage in `bridge-creator/test/strategyPrompt.test.ts` and updated `bridge-creator/README.md` plus the redesign spec to reflect the new scaffold.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and LSP diagnostics clean for touched TypeScript files.
- Next bridge-creator work: wire the strategy prompt, context snapshots, and anchors into the new `runBridgeCreator` synthesizer loop; then remove the legacy request-time nudger/prompts/tests once the replacement shell is ready.

## 2026-05-21 — Bridge-creator rewrite: synthesis LLM seam

- Continued `specs/product/bridge-creator-redesign.md` bridge-creator-side rewrite work, focusing on the step-5 synthesizer seam before publication wiring.
- Added `bridge-creator/src/synthesizer.ts`, which renders the synthesis input from trusted CSM context snapshots, active anchors, and previous publication summary; calls the LLM with the CSM strategy prompt as `staticUserPrompt`; and normalizes `{ modified_left, modified_right, common_ground, rationale, anchor_cluster_id }` output into typed triples.
- Exported `synthesizeBridgeTriples`, `renderSynthesisUserPrompt`, and related types from `bridge-creator/src/index.ts`.
- Added focused coverage in `bridge-creator/test/synthesizer.test.ts` for prompt payload contents, LLM request shape, output normalization, and malformed-output rejection.
- Updated `bridge-creator/README.md` and the redesign spec to note that synthesis normalization exists while run-loop/publication wiring is still pending.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and LSP diagnostics clean for touched TypeScript files.
- Next bridge-creator work: create the `runBridgeCreator` tick/loop that checks context readiness, loads anchors + strategy prompt, invokes `synthesizeBridgeTriples`, publishes synthesized statements/nudge batches, and submits modified→common-ground implications. Keep publication-level dedup in mind before emitting repeatedly.

## 2026-05-21 — Bridge-creator rewrite: tick-level runner orchestration

- Continued `specs/product/bridge-creator-redesign.md` bridge-creator-side rewrite work, wiring the previously-added context/anchor/strategy/synthesis seams into a tick-level runner.
- Added `bridge-creator/src/runner.ts` with `runBridgeCreatorTick(...)`: fetch trusted CSM context snapshots, skip while any source is `warming`, load active anchors + strategy prompt, call `synthesizeBridgeTriples`, publish generated modified-left / modified-right / common-ground statements, publish a nudge batch linking each modified statement to its common-ground statement, and optionally submit modified→common-ground implications through an injected submitter.
- Exported `runBridgeCreatorTick`, `createNudgesForPublishedTriples`, and runner result/dependency types from `bridge-creator/src/index.ts`.
- Added focused coverage in `bridge-creator/test/runner.test.ts` for warming skip, no-bridge skip, statement publication, nudge-batch shape, and optional implication submission.
- Updated `bridge-creator/README.md` and the redesign spec. The exported long-running `run(...)` handle is still a placeholder; production scheduling, publication-level dedup, and non-injected implication submitter configuration remain.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and LSP diagnostics clean for touched TypeScript files.
- Next bridge-creator work: add publication-level dedup state using `(anchor_cluster_version, upstream_context_summary_hash)`, then wire the long-running `run(...)` loop to call `runBridgeCreatorTick` on an interval with real SDK machinery and implication submitter configuration.

## 2026-05-21 — Bridge-creator rewrite: publication-level dedup state

- Continued `specs/product/bridge-creator-redesign.md` bridge-creator-side rewrite work, focusing on implementation-plan step 5 publication-level dedup.
- Added `bridge-creator/src/dedup.ts` with a small JSON state file for the last published input hash and previous publication summary. The hash covers trusted CSM context summaries plus active anchor records so repeated ticks can skip duplicate publication.
- Wired `runBridgeCreatorTick(...)` to load previous publication summary into the synthesis prompt, return `duplicate` without publishing when the input hash matches, and save the new dedup state after successful publication.
- Added `BRIDGE_CREATOR_PUBLICATION_DEDUP_STATE_PATH` config with default `bridge-creator/data/publication-dedup-state.json`; updated README and the redesign spec.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and LSP diagnostics clean for touched TypeScript files.
- Next bridge-creator work: wire the long-running exported `run(...)` loop to call `runBridgeCreatorTick` on an interval with real SDK machinery and production implication submitter configuration.

## 2026-05-21 — Bridge-creator rewrite: long-running synthesizer loop

- Continued `specs/product/bridge-creator-redesign.md` bridge-creator-side rewrite work, finishing the remaining step-5 scheduling/configuration piece.
- Added `BRIDGE_CREATOR_TICK_INTERVAL_MS` config (default 1 hour) and optional `IMPLICATIONS_CONTRACT_ADDRESS` wiring to `BridgeCreatorConfig`.
- Replaced the placeholder `run(...)` with a real loop: create SDK machinery, optionally create the bridge implication submitter, run one tick immediately, then repeat on the configured interval. Standalone startup now calls `run(config)` as well as serving the HTTP inspection endpoints.
- Updated README and the redesign spec to reflect that long-running scheduling and implication submitter configuration now exist.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and LSP diagnostics clean for touched TypeScript files.
- Next bridge-creator work: step-5 implementation is now scaffolded end-to-end; likely proceed to step 4 gut/removal of the legacy request-time nudger/prompts/tests, or do a production-style rehearsal against a real CSM beat-agent context source before gutting.

## 2026-05-21 — Bridge-creator rewrite: legacy request-time nudger gutted

- Continued `specs/product/bridge-creator-redesign.md`, focusing on implementation-plan step 4 after the synthesizer loop was scaffolded end-to-end.
- Removed the old request-time bridge strategy: deleted `bridge-creator/src/nudger.ts`, its legacy prompt files (`commonality-statement-generation.md`, `compatibility-analysis.md`, `modified-statement-generation.md`), and `bridge-creator/test/nudger.test.ts`.
- Removed `/nudges` and `/nudges/bulk` from `createBridgeCreatorApp`; HTTP surface is now inspection/discovery endpoints while publication happens from the scheduled `run(...)` tick loop.
- Removed `BRIDGE_CREATOR_COMMONALITY_STATEMENTS` / `commonalityStatements` from config and tests. Updated `bridge-creator/README.md` and the redesign spec to describe the new state.
- Checks passed: `npm test --workspace=@commonality/bridge-creator` and `npm run build --workspace=@commonality/bridge-creator`.
- Note: `lsp_diagnostics "*"` still showed stale diagnostics for the deleted `src/nudger.ts` and `test/nudger.test.ts` even after build/tests passed and the files were gone.
- Next bridge-creator work: production-style rehearsal against a real CSM beat-agent context source, then continue live anchor-management/reflection CLI work (implementation-plan step 6).

## 2026-05-21 — Bridge-creator rewrite: anchor review CLI

- Continued `specs/product/bridge-creator-redesign.md` bridge-creator-side rewrite work, focusing on implementation-plan step 6 live anchor management.
- Added `bridge-creator/src/anchorCli.ts`, an operator CLI for the advisory-only anchor workflow. It can list proposed anchors and approve, retire, or delete anchor records in the JSON anchor store; approvals/retirements update `last_reviewed_at`.
- Added `npm run anchors --workspace=@commonality/bridge-creator -- ...`, exported the CLI helpers from `bridge-creator/src/index.ts`, documented usage in `bridge-creator/README.md`, and updated the redesign spec to mark this CLI scaffold as present.
- Added focused coverage in `bridge-creator/test/anchorCli.test.ts`.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and LSP diagnostics clean.
- Next bridge-creator work: implement the reflection job that reads CSM context plus publication/signing outcomes and writes `status: proposed` anchor changes for this CLI to review, or run the production-style rehearsal against a real CSM beat-agent context source.

## 2026-05-21 — Bridge-creator rewrite: anchor reflection proposal seam

- Continued `specs/product/bridge-creator-redesign.md` step 6 after clarifying the advisory reflection workflow with the user.
- Added `bridge-creator/src/anchorReflection.ts`, an LLM seam that reads trusted CSM context snapshots, current anchors, and an optional previous publication summary, then normalizes returned records into advisory-only `status: proposed` anchors. It can append those proposals to the JSON anchor store for later operator review via the anchor CLI.
- Exported reflection helpers from `bridge-creator/src/index.ts`, updated `bridge-creator/README.md`, and updated the redesign spec to note the reflection seam now exists.
- Added focused coverage in `bridge-creator/test/anchorReflection.test.ts` for prompt contents, forced proposed status, appending proposals, and expected output shape.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and LSP diagnostics clean.
- Remaining anchor-management work: schedule/configure reflection in the long-running service and feed it actual signing/ignore outcome summaries rather than only previous publication text.

## 2026-05-21 — Bridge-creator rewrite: scheduled anchor reflection

- Continued work from `specs/product/bridge-creator-redesign.md`, focusing on implementation-plan step 6 remaining scheduling/configuration for advisory anchor reflection.
- Added `BRIDGE_CREATOR_ANCHOR_REFLECTION_INTERVAL_MS` to bridge-creator config (default 24h) and documented it in `bridge-creator/README.md`.
- Updated `run(...)` so the long-running service runs anchor reflection immediately and on the configured interval, skipping while trusted CSM context is warming, reading the previous publication summary from dedup state, and appending only `status: proposed` anchor records for CLI review.
- Updated the redesign spec to mark reflection scheduling as scaffolded; remaining step-6 work is to feed real signing/ignore outcome summaries rather than only previous publication text.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and workspace LSP diagnostics clean.

## 2026-05-21 — Bridge-creator rewrite: context staleness and nudger discovery spec

- Continued `specs/product/bridge-creator-redesign.md` work after scheduling anchor reflection.
- Updated the generic nudger subsystem spec (`specs/tech/subsystems/nudger/README.md`) so `/.well-known/nudger.json` matches the redesign discovery shape: `nudger_type`, `signer_address`, optional strategy/anchors URLs, trusted sources, status, and contact.
- Added bridge-creator CSM context staleness enforcement: `BRIDGE_CREATOR_CONTEXT_MAX_AGE_MS` defaults to 24h, entries in `BRIDGE_CREATOR_CSM_CONTEXT_SOURCES` can override with `max_staleness_ms`/`max_age_ms`, and stale or unparseable `generatedAt` contexts are rejected before synthesis.
- Updated config/context-source tests and `bridge-creator/README.md`; marked redesign item 7 implemented in the product spec.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and workspace LSP diagnostics clean.

## 2026-05-22 — Bridge-creator anchor-reflection outcome-summary seam

- Continued `specs/product/bridge-creator.md` item 3 (feed anchor reflection signing/ignore outcomes), implementing the bridge-creator-side seam rather than a full live outcome collector.
- Added `AnchorReflectionInput.outcomeSummary`; the anchor-reflection prompt now includes `outcome_summary` and instructs the LLM to cite outcome signals when proposing advisory anchor changes.
- Added `BRIDGE_CREATOR_ANCHOR_REFLECTION_OUTCOME_SUMMARY_PATH`; the long-running `run(...)` loop reads an optional text/Markdown outcome-summary file and passes it into anchor reflection. Empty/missing file means no outcome summary.
- Updated bridge-creator tests/docs and `specs/product/bridge-creator.md` to mark this as a partial seam; remaining work is generating the summary from real Tally/client signing/ignore outcomes once the beat-agent/rehearsal stack is running.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run build --workspace=@commonality/bridge-creator`, and LSP diagnostics clean.

## 2026-05-22 — Bridge-creator / CSM next-step checklist

- Added `workflow/bridge-creator-csm-next-steps.md`, a focused checklist for the remaining CSM mediator work after the bridge-creator package rewrite.
- Checklist covers CSM beat-agent context-provider stand-up, bridge-creator wiring, civility-agent context adapter, signing/ignore outcome summary generation, and end-to-end rehearsal.
- Updated `TODO.md` to link to the new checklist from the bridge-creator / CSM mediator item.

## 2026-05-22 — CSM beat-agent Tally/indexer source chunk

- Started checklist item 1 from `workflow/bridge-creator-csm-next-steps.md`.
- Added a beat-agent Tally/indexer source adapter (`beat-agent/src/tallyIndexerAdapter.ts`) and source type `tally_indexer`. It polls the indexer's `/api/events?eventName=DirectSupport`, decodes signing events, fetches statement text from IPFS when possible, and emits ingestion items tagged as Tally direct-support activity.
- Wired the adapter into the default worker adapter set and exported it from `@commonality/beat-agent`.
- Added `beat-agent/config/us-political-csm.example.json`, a minimal named `us-political-csm` context-provider definition with a single Tally/indexer source and purpose `beat_context_provider`.
- Updated `beat-agent/README.md` with local env/run notes for the `us-political-csm` rehearsal and marked the corresponding checklist items complete.
- Added focused tests in `beat-agent/test/tallyIndexerAdapter.test.ts`.
- Checks passed: `npm test --workspace=@commonality/beat-agent`, `npm run build --workspace=@commonality/beat-agent`, and workspace LSP diagnostics clean.
- Next CSM beat-agent work: run the worker against a real local indexer/IPFS data set, verify JSON ingestion state + memory extraction + purpose summary snapshots, then start the HTTP service and check `GET /context?purpose=beat_context_provider` freshness/signature/readiness for bridge-creator trust validation.

## 2026-05-22 — Delegation navigation pre-testnet fix

- Addressed `workflow/reviews/before-testnet.md` critical Delegation navigation finding. Source was already routing delegation through Pubstarter/Content Funding; the stale local `ui/dist/delegation` standalone build was removed by rebuilding all UI domain bundles with `npm run build:domains --workspace=ui`.
- Verified `ui/dist` now contains only the eight deployed domains and `delegation.localhost` no longer appears in built bundles.
- Updated `workflow/reviews/before-testnet.md` to mark the delegation navigation/routing issue fixed and note that rebuilt bundles still need to be redeployed for testnet.
- Checks passed: `npm run build:domains --workspace=ui` and `npm run test:vitest --workspace=ui -- src/domains/CrossDomainSmoke.test.tsx src/domains/domainRoutes.test.tsx src/domains/domainUrls.test.ts`.

## 2026-05-22 — Tally About nav review update

- Rechecked the second pre-testnet review finding. The Tally About nav no longer points at `/#/about`; current source/rebuilt bundles point at `/#/docs`, which redirects to `/docs/tally`.
- Updated `workflow/reviews/before-testnet.md` to mark the Tally About nav finding fixed/no longer applicable.
