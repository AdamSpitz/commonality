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
