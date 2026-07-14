# Continuity notes for ephemeral AI instances

Append new entries to the end of the file.

## 2026-07-01 — Beat-memory refactor started (mid-refactor, not build-clean)

- User asked to update the `beat-agents.md` planned refactor section and start implementation. I loaded `do-one-coding-task`/technical-lead guidance and began, but stopped because context was getting low.
- Spec update completed in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`: rewrote "Planned refactoring: split the substrate from its consumers" to include:
  - no backward-compatibility requirement (fix downstream code directly);
  - `beat-memory` as the follower/context substrate;
  - separate memory purposes vs consumer capabilities;
  - new memory-purpose names: `civility_context`, `bridge_opportunity_context`, `general_beat_context`, `source_management`;
  - consumer capability examples: `content_attestation`, `content_discovery`, `context_api`, `bridge_context_handoff`;
  - do not merge beat-aware attester into `content-attester` in the first split.
- Implementation is **in progress and not build-clean**. Current git state when stopping: modified `package.json`, `beat-agent/package.json`, `beat-agent/src/types.ts`, spec file; new `beat-memory/` directory.
- New `beat-memory/` workspace created and added to root `package.json` workspaces. `beat-agent/package.json` now depends on `@commonality/beat-memory`.
- Files copied from `beat-agent` into `beat-memory`: substrate-ish src files (`ingestion.ts`, `memory.ts`, `extractor.ts`, `twitterAdapter.ts`, `tallyIndexerAdapter.ts`, `promptSafety.ts`), related tests, example config, tsconfig/eslint/mocha config. New files added: `beat-memory/package.json`, `src/types.ts`, `src/structuredContent.ts`, `src/config.ts`, `src/app.ts`, `src/index.ts`.
- I ran a mechanical rename inside `beat-memory` only:
  - `BeatAgentPurpose` -> `BeatMemoryPurpose`
  - `BeatAgentConfidence` -> `BeatMemoryConfidence`
  - `civility_attestation` -> `civility_context`
  - `bridge_opportunity_detection` -> `bridge_opportunity_context`
  - `beat_context_provider` -> `general_beat_context`
  - `source_management` unchanged
- `beat-memory/src/structuredContent.ts` now owns `extractTextFromStructuredContent`/`stripHtmlToText`; `beat-memory/src/tallyIndexerAdapter.ts` import was changed to use it.
- `beat-memory/src/config.ts` is a first-pass `BEAT_MEMORY_*` config loader; likely needs review/tests.
- `beat-memory/src/app.ts` is a first-pass `GET /health`, `GET /metadata`, `GET /context` Express app plus JSON-file context query. I fixed immediate LSP issues there, but have not run typecheck.
- `beat-memory/src/index.ts` is a large first-pass export/runner file. It intentionally does **not** include finder/evaluation-log/coverage metrics; those should remain consumer-side or be reconsidered later. It may have type/build issues.
- `beat-agent/src/types.ts` is partially edited: old `BeatAgentPurpose` block was removed and `BeatAgentCapability = 'content_attestation'` added. I then removed an unused `BeatMemoryPurpose` import. This file and other beat-agent files still need cleanup because many imports/usages of `BeatAgentPurpose`, old purpose strings, and local substrate exports remain elsewhere.

Recommended next steps for a fresh instance:

1. Run bounded diagnostics/typecheck to see exact errors: start with `npm install` if package-lock/workspace links need refreshing, then `npm run typecheck --workspace=@commonality/beat-memory` and `npm run typecheck --workspace=@commonality/beat-agent`.
2. Finish `beat-memory` compile first:
   - Check imports in `beat-memory/src/*` for accidental references to `./types.js` or old names.
   - Ensure `extractor.ts` prompt/type text compiles with new `BeatMemoryPurpose` names.
   - Decide whether `beat-memory/src/index.ts` should keep the runner there or split into smaller files.
   - Fix copied tests to import from `@commonality/beat-memory` or local `../src/index.js` as appropriate and update expected purpose names.
3. Then clean `beat-agent`:
   - Replace substrate imports from local `./memory.js`, `./ingestion.js`, `./extractor.js`, adapters, promptSafety if needed, with `@commonality/beat-memory` imports.
   - Remove/move substrate files from `beat-agent/src` once imports no longer use them (or leave temporarily only if still needed, but the goal is no compatibility re-export).
   - Update `BeatAgentConfig`: use consumer capability/attester fields only plus `beatMemoryUrl` or local `memoryFilePath` for first pass. Avoid old `purposes` unless it means capabilities.
   - `createBeatAgentServiceApp` metadata should expose `capabilities: ['content_attestation']`, not old purpose-derived capabilities; `/context` should move out of beat-agent or be removed.
   - `buildBeatAgentEvaluationContext` should either query `beat-memory` HTTP or use `@commonality/beat-memory` JSON-file query/types. First pass can keep file-based query if easier, but conceptually attester is a consumer.
4. Update `service-host` to add a new `beat-memory` service kind/config loader/factory and decide whether `beat-agent` still has a worker (probably no; just HTTP attester). Update `service-host/package.json` dependency and tests.
5. Update docs/readmes after code settles. `beat-agent/README.md` still describes old combined service and old `BEAT_AGENT_PURPOSES`; it will be stale.
6. Run focused tests/typechecks, then `lens_diagnostics mode=all` before claiming done.

Important caveat: because this stopped mid-refactor, do not assume current code compiles. Treat the current tree as a checkpoint/scratch start, not a completed implementation.

## 2026-07-01 — Beat-memory refactor continued (better but still mid-refactor)

I continued the beat-memory split from the previous checkpoint. Current tree is still not conceptually complete, but the focused packages are mostly type/test clean.

What I changed:

- Ran `npm install` after adding the `beat-memory` workspace, so `package-lock.json` now includes it.
- Verified `@commonality/beat-memory` compiles and tests pass:
  - `npm run typecheck --workspace=@commonality/beat-memory` ✅
  - `npm test --workspace=@commonality/beat-memory` ✅ (51 passing)
- Updated root `tsconfig.json` to include `beat-memory/src/**/*.ts`.
- In `beat-agent`:
  - `BeatAgentAppConfig` now exposes `capabilities: string[]` instead of old `purposes`; `/metadata` returns capabilities only.
  - `/context` was simplified to no longer validate/pass old beat-agent purpose params; it just calls `queryBeatContext({ topic })`. This endpoint arguably should be removed from beat-agent entirely once callers use beat-memory.
  - `BeatAgentConfig` now has `capabilities: ['content_attestation']`; memory purposes use `BeatMemoryPurpose` from `@commonality/beat-memory`.
  - Config loading maps `BEAT_MEMORY_PURPOSES` (legacy fallback `BEAT_AGENT_PURPOSES`) through `normalizeBeatMemoryPurposes`.
  - Added try/catch around beat-definition JSON parse in `beat-agent/src/config.ts`.
  - `context.ts`, `extractor.ts`, `ingestion.ts`, and `memory.ts` import `BeatMemoryPurpose`/memory types from `@commonality/beat-memory` where needed. Note: copied substrate files still exist under `beat-agent/src`; these are transitional and should be deleted/re-export cleanup later.
  - Mechanical old purpose strings in `beat-agent/src` and tests were mostly renamed:
    - `civility_attestation` -> `civility_context`
    - `bridge_opportunity_detection` -> `bridge_opportunity_context`
    - `beat_context_provider` -> `general_beat_context`
  - `createBeatAgentApp` uses `['civility_context', 'general_beat_context']` for attester evaluation context and `['general_beat_context', 'bridge_opportunity_context']` for its temporary context query.
  - Updated beat-agent tests enough for the existing test suite to pass.
  - Updated parts of `beat-agent/README.md` to say beat-memory owns the substrate/purposes; not fully polished.
- In `service-host`:
  - Added new service kind `beat-memory`.
  - Added `@commonality/beat-memory` dependency.
  - Env config loader supports `BEAT_MEMORY_ENABLED`.
  - Registry wires `run` and `createBeatMemoryApp`.
  - Added try/catch around service-host JSON config parse.

Focused checks that passed after these changes:

- `npm run typecheck --workspace=@commonality/beat-memory` ✅
- `npm run typecheck --workspace=@commonality/beat-agent` ✅
- `npm run typecheck --workspace=@commonality/service-host` ✅
- `npm test --workspace=@commonality/beat-memory` ✅
- `npm test --workspace=@commonality/beat-agent` ✅ (150 passing)
- `npm test --workspace=@commonality/service-host` ✅

Important caveats / unfinished work:

1. `lens_diagnostics mode=all` still reported stale blocking errors saying `@commonality/beat-memory` could not be resolved in beat-agent files. Immediately after that, `lsp_diagnostics` on those files reported no diagnostics, and package typechecks pass. I also tried `lens_diagnostics mode=full` but it returned no useful output. Treat lens cache as stale, but re-check in a fresh session.
2. `beat-agent/src` still contains copied substrate files (`memory.ts`, `ingestion.ts`, `extractor.ts`, adapters, promptSafety) and exports many substrate symbols from `index.ts`. This is not the intended final architecture. Next LLM should remove/move these transitional exports once downstream tests/imports are updated to import from `@commonality/beat-memory`.
3. `beat-agent` tests still include many substrate tests (memory/ingestion/extractor/adapters) duplicated from beat-memory. They pass, but they should probably be moved/deleted from beat-agent so beat-agent tests focus on attestation/finder/metrics.
4. `beat-agent` still has a worker that does ingestion/memory/finder. Conceptually beat-memory should own ingestion/memory worker; beat-agent probably should be HTTP attester + maybe finder only. `service-host` now supports beat-memory, but beat-agent worker was left mostly intact for compatibility/test passing.
5. `beat-agent/README.md` is only partially updated and may still mention old `BEAT_AGENT_*` memory env vars and old examples. Needs a deliberate docs pass after architecture settles.
6. Need update service-host tests to explicitly cover `beat-memory` env/config/route. Existing service-host tests still pass, but no new coverage was added.
7. Need update any docs/configs outside beat-agent README that mention old purpose strings (`rg civility_attestation bridge_opportunity_detection beat_context_provider`).
8. Need decide whether `beat-memory/src/app.ts` API shape and `config.ts` env names are final enough; I did not deeply review them beyond type/test pass.
9. Before final claim, run broader checks (`npm run typecheck`/`npm run build` or at least affected turbo filters) and `lens_diagnostics` again.

Suggested next steps for fresh LLM:

1. Re-run focused checks above plus `lsp_diagnostics` on edited files.
2. Clean up architecture: make beat-agent import substrate functions directly from `@commonality/beat-memory` and remove local substrate files/tests/exports from beat-agent.
3. Split beat-agent worker responsibilities: keep attester/finder in beat-agent; move ingestion/memory worker usage to beat-memory/service-host config.
4. Add service-host tests for `beat-memory` single-kind enablement and multi-instance derivation.
5. Finish docs/readmes and replace stale old purpose names.

## 2026-07-01 — Beat-memory refactor continued (substrate files removed from beat-agent)

I continued the split and made the next architectural cleanup pass. Current focused state:

- `beat-agent/src` no longer contains local substrate implementations. Deleted local `memory.ts`, `ingestion.ts`, `extractor.ts`, `twitterAdapter.ts`, `tallyIndexerAdapter.ts`, and `promptSafety.ts`.
- Deleted the duplicate beat-agent substrate tests (`memory`, `ingestion`, `extractor`, `twitterAdapter`, `tallyIndexerAdapter`). Those tests now live under `beat-memory/test`.
- Updated beat-agent internals (`index.ts`, `config.ts`, `finder.ts`, `metrics.ts`, `evaluator.ts`) to import/re-export substrate symbols from `@commonality/beat-memory`. Beat-agent still has a transitional worker API that delegates ingestion/memory work through beat-memory exports; removing that worker is still a later conceptual cleanup.
- Added missing exports from `beat-memory/src/index.ts` for ingestion state/run params, adapter configs, retry/failure types, etc., so existing downstream imports can move to the new package.
- Added `types: "src/index.ts"` to `beat-memory/package.json` so dependent workspace typechecks work without requiring `beat-memory/dist`. Runtime tests still need built JS because package `main` is `dist/index.js`; I added `pretest` scripts to `beat-agent` and `service-host` to build `@commonality/beat-memory` before their tests. I removed generated `beat-memory/dist/` before stopping.
- Updated `beat-agent/config/us-political-csm.example.json` from old `beat_context_provider` to `general_beat_context`. Updated the purpose-model table in `beat-agents.md` to use memory-purpose names and consumer capabilities. One mention of old names remains intentionally in the warning saying not to preserve old names.
- Added service-host tests for single `beat-memory` enablement and multi-instance `beat-memory-*` derivation.

Focused checks run after this pass:

- `npm run typecheck --workspace=@commonality/beat-memory` ✅
- `npm run typecheck --workspace=@commonality/beat-agent` ✅ (works without `beat-memory/dist`)
- `npm run typecheck --workspace=@commonality/service-host` ✅ (works without `beat-memory/dist`)
- `npm test --workspace=@commonality/beat-memory` ✅ (51 passing)
- `rm -rf beat-memory/dist && npm test --workspace=@commonality/beat-agent -- --reporter dot` ✅ (99 passing; pretest builds beat-memory)
- `rm -rf beat-memory/dist && npm test --workspace=@commonality/service-host -- --reporter dot` ✅ (22 passing; pretest builds beat-memory)
- `lsp_diagnostics` on the edited beat-agent TS files reported no errors. `lens_diagnostics mode=all` still shows stale `@commonality/beat-memory` resolution errors even though package typechecks and LSP diagnostics are clean.

Remaining recommended next steps:

1. Remove or redesign the transitional `runBeatAgentWorkerOnce` ingestion/memory responsibilities. Beat-memory now owns the substrate; beat-agent should probably be HTTP content attester + maybe finder only.
2. Finish docs: `beat-agent/README.md` still references old `BEAT_AGENT_*` ingestion/memory env vars because the transitional worker still exists. Once the worker moves out, document `beat-memory` as the owner of those env vars and keep only attester/finder config in beat-agent.
3. Consider whether `beat-memory/package.json` should use a more formal dev-time export strategy than `types: src/index.ts` + `main: dist/index.js` + consumer `pretest` build scripts. This is now functional for focused checks but a monorepo-wide pattern would be better.
4. Run a broader build/test pass when ready; I only ran the focused packages.

## 2026-07-01 — Beat-memory refactor continued (beat-agent worker slimmed)

Continued the beat-memory split and removed the remaining beat-agent ingestion/memory worker responsibilities from `beat-agent/src/index.ts`.

What changed:

- `beat-agent/src/index.ts` no longer imports or re-exports beat-memory substrate APIs (`runBeatIngestionOnce`, memory helpers, source adapters, prompt-safety helpers, etc.). Downstream/test imports that still needed substrate utilities now import them from `@commonality/beat-memory` directly.
- Restored/kept `createBeatAgentApp` as the attester app wiring function, with memory reads only for attestation context/query compatibility.
- `runBeatAgentWorkerOnce` is now finder/metrics-only. It reads the beat-memory-produced ingestion state when finder mode is enabled, submits candidates, and emits best-effort metrics. It no longer polls sources, extracts observations, compacts memory, updates purpose snapshots, or writes source-management reports.
- Deleted `beat-agent/test/worker.test.ts`, which tested the old combined ingestion→memory worker. Updated `beat-agent/test/e2e.test.ts`, `evaluator.test.ts`, and `finder.test.ts` to import substrate helpers/types directly from `@commonality/beat-memory`.
- Updated `beat-agent/README.md` to describe beat-memory as owner of ingestion/memory worker responsibilities and beat-agent as attester + finder worker.

Focused checks passed:

- `npm run typecheck --workspace=@commonality/beat-agent` ✅
- `npm run typecheck --workspace=@commonality/service-host` ✅
- `npm test --workspace=@commonality/beat-agent -- --reporter dot` ✅ (97 passing)
- `npm test --workspace=@commonality/service-host -- --reporter dot` ✅ (22 passing)
- `lsp_diagnostics` on edited TS files ✅
- `lens_diagnostics mode=all severity=error` ✅ for current-session diagnosed files; it reported one stale changed file omitted.

Remaining recommended next steps:

1. Run broader repo checks when ready (`npm run build` or verifier fast loop) because this session only exercised the affected packages.
2. Consider simplifying `BeatAgentConfig`: it still carries beat-memory-ish env/config fields (`purposes`, beat definition, memory compaction knobs, LLM extraction flag) for compatibility with current app/context/finder config loading. Now that worker responsibilities are split, those can probably be moved out of beat-agent config or renamed to explicit read-only compatibility fields.
3. Finish any docs/config cleanup outside `beat-agent/README.md` that still points operators at old `BEAT_AGENT_*` ingestion/memory env names.

## 2026-07-01 — Beat-memory refactor continued (deployment/env cleanup)

Continued from the previous checkpoint with a docs/config cleanup pass rather than deeper code reshaping.

What changed:

- Moved testnet/render rehearsal env defaults for ingestion, memory, purpose config, beat definition, worker poll interval, and LLM extraction from `BEAT_AGENT_*` to `BEAT_MEMORY_*`.
- Updated `scripts/setup-testnet-ai-policy.mjs` to emit `BEAT_MEMORY_*` entries, new memory-purpose names (`civility_context`, `general_beat_context`, `source_management`), and beat-memory data paths. Beat-agent still gets read-only `BEAT_AGENT_INGESTION_STATE_FILE` / `BEAT_AGENT_MEMORY_FILE` pointing at beat-memory files for attestation/finder compatibility.
- Regenerated `render.yaml` from `render.yaml.template` + `deployments/base-sepolia.env`.
- Updated setup-env allowlist, testnet render/deployment docs, bridge-creator CSM notes, and beat-agent spec mentions to stop directing operators at old beat-agent ingestion/memory env names.
- Added a small try/catch around seed upload JSON parsing in `scripts/setup-testnet-ai-policy.mjs` after diagnostics flagged it.

Checks run:

- `npm run typecheck --workspace=@commonality/beat-agent` ✅
- `npm run typecheck --workspace=@commonality/service-host` ✅
- `npm test --workspace=@commonality/service-host -- --reporter dot` ✅
- `node --check scripts/setup-testnet-ai-policy.mjs` ✅
- `npm test --workspace=@commonality/beat-agent -- --reporter dot` ✅
- `lens_diagnostics mode=all severity=error` ✅ (reported one stale changed file omitted)

Remaining recommended next steps:

1. Decide whether to remove the remaining legacy beat-agent config fallbacks/fields (`BEAT_AGENT_PURPOSES`, `BEAT_AGENT_BEAT_DEFINITION_*`, worker poll/LLM extraction fields) now that deployment config no longer uses them.
2. Run a broader repo build/test or verifier fast loop before considering the refactor done.
3. Continue polishing docs once the final beat-memory API/config shape is settled.

## 2026-07-01 — Beat-memory refactor completed for legacy beat-agent config cleanup

Continued from the deployment/env cleanup checkpoint and removed the remaining legacy beat-agent memory-purpose config surface.

What changed in this pass:

- Removed beat-agent config fallbacks/fields for memory substrate ownership:
  - no more `BeatAgentConfig.purposes` or `BEAT_MEMORY_PURPOSES`/`BEAT_AGENT_PURPOSES` loading in beat-agent;
  - no more `BeatAgentConfig.beatDefinition` or `BEAT_AGENT_BEAT_DEFINITION_*` parsing in beat-agent;
  - no more beat-agent memory compaction fields/env loading;
  - no more beat-agent LLM extraction flag/env loading.
- Beat-agent still keeps finder/attester config: `BEAT_AGENT_INGESTION_STATE_FILE` and `BEAT_AGENT_MEMORY_FILE` are read-only paths to beat-memory-produced state, and `BEAT_AGENT_WORKER_POLL_INTERVAL_MS` still controls the supervised finder loop.

Checks run in this pass:

- `npm run typecheck --workspace=@commonality/beat-agent` ✅
- `npm test --workspace=@commonality/beat-agent -- --reporter dot` ✅
- `npm run typecheck --workspace=@commonality/service-host` ✅
- `npm test --workspace=@commonality/service-host -- --reporter dot` ✅

Next step: run the pre-commit hook and commit the full refactor checkpoint.

## 2026-07-01 — Beat finder refactor chunk: generic JSON candidate submission

- Continued the beat-agent/finder-core consolidation from `beat-agents.md` piece 5.
- Added `postJsonCandidate` to `finder-core/src/http.ts` with coverage in `finder-core/test/http.test.ts`.
- Updated `beat-agent/src/finder.ts` so beat-specific submission uses the finder-core helper; beat-agent now only supplies the beat attester request, endpoint, optional finder key, and response types.
- Updated `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md` to mark generic JSON candidate submission as done for the finder consolidation.
- Checks passed: `npm run typecheck --workspace=@commonality/finder-core`, `npm test --workspace=@commonality/finder-core -- --reporter dot`, `npm run typecheck --workspace=@commonality/beat-agent`, `npm test --workspace=@commonality/beat-agent -- --reporter dot`.

## 2026-07-01 — Beat finder refactor chunk: generic scored evaluation candidates

- Continued `beat-agents.md` piece 5 (fold beat finder logic toward `finder-core`).
- Added `createScoredTextEvaluationCandidateSelector` plus typed request/candidate helpers to `finder-core/src/contentScoring.ts`; it turns a scored text item into a canonical-id evaluation request with `contentUrl` when available and trimmed `contentText` otherwise.
- Updated `beat-agent/src/finder.ts` to use the new finder-core helper; beat-agent now keeps only the beat-memory item mapping, beat-specific keyword aliases, and attester endpoint/finder-key wiring.
- Updated `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md` to record this chunk as done.
- Checks passed: `npm run typecheck --workspace=finder-core`, `npm run build --workspace=finder-core`, `npm run typecheck --workspace=beat-agent`, `npm run test --workspace=finder-core`, and `npm run test --workspace=beat-agent -- finder.test.ts` (the last command matched all beat-agent tests because Mocha did not match the bare file pattern; 97 passing).

## 2026-07-03 — Beat-agent refactor stopping point for bridge context and finder consolidation

- Finished the current good stopping point for `beat-agents.md` refactor pieces #3 and #5.
- #3 bridge/context boundary: `bridge-creator` trusted context sources now send a default/configured `topic` query to `GET /context`, support optional `purpose`, and normalize native `beat-memory` observation responses into bridge context snapshots. This means a real bridge-creator can point directly at a real beat-memory context API without bespoke bridge memory or a separate adapter.
- #5 finder consolidation: no new code extraction was needed beyond the existing finder-core helpers; updated the spec to record the current state as the intended stopping point: reusable mechanics are in `finder-core`, while `beat-agent` keeps only the beat-memory item adapter/config aliases/attester wiring.
- Docs updated: `bridge-creator/README.md` env table and `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md` status table/target-shape text.
- Checks passed: `npm test --workspace=@commonality/bridge-creator`, `npm run typecheck --workspace=@commonality/bridge-creator`, and focused beat-agent finder tests via `npm test --workspace=@commonality/beat-agent -- --grep "beat finder|scoreBeatFinderItem|createScoredBeatFinderCandidateSelector"`.

## 2026-07-05 — Lockfile / Docker install robustness

Completed the TODO item to make npm lockfile and service Docker installs robust:

- Aligned all direct workspace `viem` dependencies to exact `2.53.1` and updated the root npm override to the same version, so a normal `npm install` produces a hoisted lockfile instead of relying on hand-shaped nested workspace entries.
- Updated `package-lock.json` by running a normal root `npm install`.
- Updated workspace service Dockerfiles (`platform-api-service/Dockerfile`, `service-host/Dockerfile`, `ui/Dockerfile`) to copy every workspace `package.json` before `npm ci`; subset installs now validate against the full workspace dependency graph.
- Pinned service/local Dockerfiles to `node:24.14.1-alpine`, pinned npm inside them to `11.16.0`, and updated root `packageManager` to `npm@11.16.0`.
- Documented the new invariant in `workflow/deployment.md`; removed the completed TODO entry.

Validation performed:

- `npm install` ✅
- Synthetic Docker-install equivalent: copied root lockfile plus all workspace `package.json`s into `tmp/lockfile-ci-test` and ran `HUSKY=0 npx npm@11.16.0 ci` ✅
- `npm run build:raw` ✅
- After installing Ubuntu's `docker-buildx` package locally: real BuildKit Docker builds passed for `platform-api-service/Dockerfile`, `service-host/Dockerfile`, `ui/Dockerfile`, `indexer/Dockerfile`, and `hardhat/Dockerfile` ✅

## 2026-07-05 — Package-lock dependency baseline refreshed

- Completed the TODO item to reconcile `security.package-lock-dependencies`: regenerated `verifier/security-baselines/package-lock-dependencies.json` from the current `package-lock.json` using the same node_modules-only package filter as the verifier check.
- Removed the completed TODO entry. `verifier-run security.package-lock-dependencies` now passes with 2360 current packages and no added/removed drift.
- Note: `automated.dependency-audit` is still red for 4 unallowlisted wallet/WebSocket advisories (`@privy-io/are-addresses-equal`, `@privy-io/react-auth`, `viem`, `ws`); that remains a separate TODO item.

## 2026-07-05 — Dependency audit triage completed

- Completed TODO item for `automated.dependency-audit` red.
- Upgraded direct workspace `viem` deps and root override from 2.53.1 to 2.54.3, added root `ws` override 8.21.0, and bumped UI wallet deps: `@privy-io/react-auth` to ^3.33.1, `@privy-io/wagmi` to ^4.0.14, `wagmi` to ^3.6.21.
- Ran `npm update viem ws` after `npm install` so the hoisted lockfile actually moved root viem/ws to fixed versions.
- Updated dependency audit allowlist with 2026-07-05 rationales for the remaining Privy/WalletConnect/x402 nested viem/ws exposure; direct/root viem now uses ws 8.21.0, but nested transitive copies remain below fixed ranges and npm audit suggests an invalid Privy downgrade.
- Refreshed package-lock dependency baseline for the resulting lockfile drift (`@base-ui/react`, `@base-ui/utils`, `reselect` added; nested viem ws removed).
- Removed the completed TODO entry. Checks passed: `verifier-run automated.dependency-audit`, `verifier-run security.package-lock-dependencies`, and `npm run typecheck --workspace=ui`.

## 2026-07-05 — Verifier local-stack-health canary added

- Completed verifier backlog item 1a from `verifier/PLAN.md`: added `operations.local-stack-health`, a cheap unguarded canary for the local Dockerized stack.
- The canary probes Hardhat RPC `eth_blockNumber`, indexer GraphQL `_meta`, platform API `/health`, and the UI shell, then emits a markdown artifact naming missing/unhealthy services.
- Wired `operations.local-stack-health` into `functionality.deep-stack` so stack-down conditions propagate into the functionality facet instead of hiding as guarded-check staleness.
- Added `known-bad.local-stack-health` and wired it into `meta.verifier-health`; fixture covers healthy pass, unreachable-service fail, and wrong-status/unhealthy fail.
- Checks run: `node --check` on both new scripts; `VERIFIER_WORKSPACE=verifier verifier-run known-bad.local-stack-health` passed. A live `operations.local-stack-health` run correctly failed on this machine because platform API and UI were not running while Hardhat RPC and indexer GraphQL were reachable.


## 2026-07-05 — Deep verifier cadence now runs local-stack-health first

- Follow-up to the local-stack-health canary: added `operations.local-stack-health` as the first check in `scripts/verifier-deep-cadence.mjs`, before destructive/E2E checks.
- Updated `verifier/README.md` and `verifier/PLAN.md` so cadence docs list the new health preflight.
- Checks run: `node --check scripts/verifier-deep-cadence.mjs` and `node scripts/verifier-deep-cadence.mjs --help`.


## 2026-07-05 — Local stack health shortcut added

- Added `npm run verifier:local-stack-health` as a discoverable shortcut for `verifier-run operations.local-stack-health`.
- Added a command-menu entry and README note so developers can run the cheap preflight before the guarded deep cadence.
- Smoke-tested the npm shortcut; it correctly reported the current partial local stack state (Hardhat/indexer up, platform API/UI down).


## 2026-07-05 — Local stack health errors made more actionable

- Improved `operations.local-stack-health` fetch error messages to include low-level cause details such as `ECONNREFUSED`, address, and port when Node exposes them.
- Smoke-tested with the current partial stack; failures now name `ECONNREFUSED 127.0.0.1 port 3000` and `port 5173` instead of only `fetch failed`.
- Checks run: `node --check verifier/checks/operations/local-stack-health.mjs`, `VERIFIER_WORKSPACE=verifier verifier-run known-bad.local-stack-health`, and `npm run verifier:local-stack-health` (expected fail due platform API/UI down).

## 2026-07-05 — Testnet indexer backfill investigation

- Investigated the TODO about the Base Sepolia Render indexer being ~950k blocks behind with `/ready` returning "Historical indexing is not complete".
- Confirmed the committed/rendered start block is already pinned near deployment (`START_BLOCK=42768673`), not an unexpectedly ancient chain start. The deployed Ponder `_meta` was at block `42844671` while public Base Sepolia head was `43755194`, so the remaining problem was catch-up throughput.
- Found `PONDER_ETH_GET_LOGS_BLOCK_RANGE=10` in the Render blueprint, which makes a million-block catch-up require roughly 100k `eth_getLogs` batches. Raised the blueprint default to `1000`, regenerated `render.yaml`, documented the tuning note in `indexer/README.md`, and removed the completed investigation TODO.
- Checks run: `node scripts/generate-render-yaml.mjs`, `node --check scripts/generate-render-yaml.mjs`.
- Next operational step: deploy/redeploy `commonality-indexer` on Render and watch `/ready`/GraphQL `_meta` catch up. If the RPC provider rejects range `1000`, lower to the largest accepted value rather than returning to `10`.


## 2026-07-05 — Local stack health recovery hints

- Continued verifier backlog work around making the local deep-stack preflight actionable.
- `operations.local-stack-health` now preserves optional per-service `recoveryHint` metadata in findings and includes deduplicated hints in its markdown artifact for unhealthy services.
- Added concrete hints to the default Hardhat/indexer/platform API/UI probes pointing operators at `./scripts/services.sh --start`, `--status`, and relevant Docker logs.
- Extended the known-bad fixture to prove recovery hints survive on failing services.
- Checks run: `node --check verifier/checks/operations/local-stack-health.mjs`, `node --check verifier/checks/known-bad/local-stack-health.mjs`, `VERIFIER_WORKSPACE=verifier verifier-run known-bad.local-stack-health`, and `npm run verifier:local-stack-health` (expected fail on this machine because platform API/UI are down; output now includes service-specific hints).

## 2026-07-05 — Local stack health response excerpts

- Follow-up verifier polish while local-stack-health was in context.
- `operations.local-stack-health` now records a whitespace-normalized response excerpt when a service returns the wrong status, invalid JSON, a missing required JSON path, or missing required text.
- The markdown artifact shows the excerpt under the unhealthy service, so a 404/HTML error/proxy response is visible without rerunning with curl.
- Extended `known-bad.local-stack-health` to prove wrong-status response excerpts are captured.
- Checks run: `node --check verifier/checks/operations/local-stack-health.mjs`, `node --check verifier/checks/known-bad/local-stack-health.mjs`, `VERIFIER_WORKSPACE=verifier verifier-run known-bad.local-stack-health`, and `npm run verifier:local-stack-health` (expected fail because platform API/UI are down).

## 2026-07-05 — Performance source canary storage allowlist

- Continued verifier backlog item 9. `operations.performance-source-canary` now supports `allowSynchronousStorageFiles`, mirroring `allowLargeFiles` for explicit known-acceptable synchronous localStorage/sessionStorage render-path exceptions while still failing new unallowlisted findings.
- The markdown artifact and JSON findings now separate gated synchronous-storage findings from allowed ones.
- Extended `known-bad.performance-source-canary` with an allowed-storage fixture.
- Checks run: `node --check verifier/checks/operations/performance-source-canary.mjs`, `node --check verifier/checks/known-bad/performance-source-canary.mjs`, `VERIFIER_WORKSPACE=verifier verifier-run known-bad.performance-source-canary`, and `VERIFIER_WORKSPACE=verifier verifier-run operations.performance-source-canary`.

## 2026-07-05 — Performance source canary allowed-file visibility

- Follow-up in the same verifier/performance canary area: allowed oversized source files are now reported separately as `allowedLargeFiles`, matching the new allowed synchronous-storage reporting. This keeps existing `allowLargeFiles` exceptions visible instead of silently suppressing them.
- Extended `known-bad.performance-source-canary` with an allowed oversized-file fixture.
- Checks run: `node --check verifier/checks/operations/performance-source-canary.mjs`, `node --check verifier/checks/known-bad/performance-source-canary.mjs`, `VERIFIER_WORKSPACE=verifier verifier-run known-bad.performance-source-canary`, and `VERIFIER_WORKSPACE=verifier verifier-run operations.performance-source-canary`.

## 2026-07-05 — Performance source canary catches prefixed/bracket storage calls

- Continued verifier backlog item 9 static-scan hardening. `operations.performance-source-canary` now detects render-path synchronous storage calls written as `window.localStorage`, `globalThis.sessionStorage`, and bracket-call forms like `localStorage["getItem"](...)`, not just bare `localStorage.getItem(...)`.
- Extended `known-bad.performance-source-canary` with a window-prefixed bracket-call fixture.
- Checks run: `node --check verifier/checks/operations/performance-source-canary.mjs`, `node --check verifier/checks/known-bad/performance-source-canary.mjs`, `VERIFIER_WORKSPACE=verifier verifier-run known-bad.performance-source-canary`, and `VERIFIER_WORKSPACE=verifier verifier-run operations.performance-source-canary`.

## 2026-07-05 — Performance source canary catches optional-chained storage calls

- Small follow-up while the performance-source canary was in context: the synchronous storage scan now also catches optional-chained forms such as `globalThis?.sessionStorage?.getItem(...)` and optional bracket calls.
- Extended `known-bad.performance-source-canary` with an optional-chaining fixture.
- Checks run: `node --check verifier/checks/operations/performance-source-canary.mjs`, `node --check verifier/checks/known-bad/performance-source-canary.mjs`, `VERIFIER_WORKSPACE=verifier verifier-run known-bad.performance-source-canary`, and `VERIFIER_WORKSPACE=verifier verifier-run operations.performance-source-canary`.

## 2026-07-06 — Cleaned up leaked landing-page draft copy

- Completed the TODO item from `review.page-copy-sense`: replaced visible authoring-note/draft copy on `ui/src/domains/commonality/LandingPage.tsx` with first-visitor-facing copy, avoiding unexplained `substrate`/`vertical` jargon on the landing page.
- Fixed the mojibake em dash in `ui/src/delegation/pages/MyNotesPage.tsx`.
- Removed the completed TODO item from `TODO.md`.
- Checks run: `rg` for the flagged strings/mojibake in the touched files, LSP diagnostics on both touched TSX files, and `npm run typecheck --workspace=ui`.

## 2026-07-06 — Fixed content-funding dead-ends for new channels

- Completed the `review.workflow-clarity.content-funding` fail item from `TODO.md`.
- The "Channel not found" bare-warning branch (fires when the folded content-funding `state` is `null`, i.e. no indexed data for the channel) on `ChannelPage.tsx` and `CreateContractPage.tsx` now renders a recoverable empty state instead of a dead-end `Alert`. It keeps the "Channel not found" heading but adds CTAs: on `ChannelPage`, a parseable-but-unindexed channel gets a "Start first contract for this channel" link to `/content/{platform}/{channelId}/new`; both pages always offer "Start a contract" (`/content/new`) and "Browse creators" (`/content`).
- `CreatorDashboardPage.tsx` empty-state button relabeled from the misleading "Verify or claim a channel" to "Start a contract for your channel" (it links to `/content/new`, which is contract creation, not a verify/claim flow — there is no standalone verify/claim page; claiming happens via `ClaimFlowModal` on a `ChannelPage` with escrowed funds).
- Added a ChannelPage test asserting the first-contract CTA href for a parseable-but-unindexed channel.
- Checks run: `npx vitest run` on the three affected page test files (33 passing) and `npm run typecheck --workspace=ui` (clean). Note: vitest must be run from inside `ui/` (its workspace config); running from repo root fails with "React is not defined".

## 2026-07-06 — Humanized contribution-flow wallet/on-chain errors (bridges workstream 3)

- Chipped at the code-doable slice of TODO item #11 (contribution sequencing "retry/error states") that doesn't depend on the blocked Privy/Pimlico spike.
- Added `ui/src/shared/utils/txError.ts` — `humanizeTxError(err, fallback)`: a small pure helper that turns the raw multi-line wallet/RPC error into a calm one-liner for the two failures a contributor can act on: user-cancelled-in-wallet (viem `ACTION_REJECTED`/code 4001, MetaMask "User denied", etc.) and insufficient-ETH-for-gas. Anything unrecognized falls through to the raw revert reason / fallback so real errors aren't hidden. Exported from `ui/src/shared` (`shared/index.ts`).
- Wired it into both catch blocks of `BuyTokensSection.tsx` (direct buy + delegatable-note buy), replacing the raw `err.message`.
- Updated the existing "note purchase fails" test (it mocked an `Insufficient funds` throw) to assert the new gas hint. Added `txError.test.ts` (7 cases: cancel/gas/pass-through/shortMessage precedence/empty fallback).
- Deliberately scoped to `BuyTokensSection` only; `SecondaryMarketSection`/`ProjectDetailPage` still show raw messages (their tests assert raw "User rejected approval" strings). A follow-up could adopt `humanizeTxError` there too and update those tests.
- Checks run: `npx vitest run` on `txError.test.ts` + `BuyTokensSection.test.tsx` (36 passing) and `npm run typecheck --workspace=ui` (clean), from inside `ui/`.

## 2026-07-08 — Fixed verifier copy-encoding failure

- Completed TODO item: fixed visible UI mojibake reported by `review.copy-encoding`.
- Changed `ui/src/delegation/pages/NoteDetailPage.tsx`: replaced mojibake em dash/left arrow with real Unicode characters and replaced the corrupted clipboard emoji button label with plain `Copy`.
- Verification: `npx verifier-run review.copy-encoding` passed; `npm run verifier:fast` passed, including lint/build/test-fast and `validation.pr`.

## 2026-07-08 — Docs coherence UI tree/status cleanup

- Completed TODO item for verifier `review.docs-coherence` doc drift.
- Updated `specs/tech/ui-domains.md` to name the actual `ui/src/domains/lazy-giving/` source directory and clarify that only the manifest/build id remains `lazyGiving`; left `fundingportals` as the shared feature-module name.
- Updated `ui/README.md` with the same LazyGiving source-vs-build distinction and explicit `src/domains/lazy-giving/` source path.
- Fixed stale `fundingportal/...` paths in `ui/test-plan.md` to `fundingportals/...` because it is part of the docs-coherence review surface.
- Refreshed `workflow/project-status.md` to align with README/MVP: pre-mainnet, testnet stabilization/MVP validation, operational work next.
- Removed the completed TODO entry.

## 2026-07-08 — Re-verified deployed testnet website/config checks

- Completed the TODO item for deployed testnet website/config verifier failures.
- Reran the focused read-only testnet checks with `COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1`: `testnet.http`, `testnet.app-shell`, and `testnet.app-config` now pass. The prior endpoint/config failures appear to have been transient IPFS/Cloudflare fetch aborts rather than a code/config issue.
- Reran `testnet.environment`; it is now `uncertain` with the website/config leaves green. Remaining uncertainty is from separate guarded journey checks (`testnet.website-journeys` timeout and `testnet.onchain-to-indexer` requiring mutation opt-in), not the completed TODO item.
- Removed the completed TODO entry.

## 2026-07-08 — Verified local deep-stack user journeys

- Completed the TODO item for local deep-stack verifier failures by rerunning the remaining expensive `stack.user-journeys` check after the fresh-server fixes noted by the prior session.
- Command run: `COMMONALITY_VERIFIER_ALLOW_E2E_STACK=1 verifier-run stack.user-journeys`. Result: pass, 27 Playwright E2E tests passed in about 5 minutes; verifier run ID `2026-07-08T18-54-14.006Z-a3d322d8`.
- Removed the completed TODO entry. No code changes were needed.

## 2026-07-08 — AccountAssertions testnet verification partially completed

- Picked the AccountAssertions live verification TODO as one of the few partially unblocked remaining items.
- Verified the live on-chain/indexer path on Base Sepolia with the funded testnet verifier wallet `0x6295d57fe20FFB1C6f1f44b753441F18AA4ec1cB`:
  - `assertSingleAccount` tx `0x9d7b3869cf0a6cc736d15622dc5d1be79b30b5cb1a43ea936cd7f2c5ce0637b5`; deployed event cache exposes `AccountAssertionSet`.
  - CSM mission `setBelief` tx `0xaf3ccded8e3a0b9f154ba3dfc4a419a2297cf8dd8d2c794d0985dd9a474bd20e`; deployed event cache exposes `DirectSupport`.
- Could not complete the browser UX assertion: deployed Tally loaded HTML, but JS/CSS asset requests returned 504 (`/assets/index-BpDteptu.js`, `/assets/index-BjXZfCtm.css`), leaving the statement page blank. Updated TODO with this progress/blocker instead of deleting it.

## 2026-07-09 — Completed AccountAssertions testnet UX verification

- Completed and removed the TODO item for the already-deployed `AccountAssertions` testnet UX.
- Rechecked the previously failing deployed Tally IPFS assets: both `/assets/index-BpDteptu.js` and `/assets/index-BjXZfCtm.css` now return HTTP 200 from `https://tally.testnet.commonality.works`.
- Ran a headless Playwright smoke against `https://tally.testnet.commonality.works/#/statement/bafybeihjlhptg6m37bhnrfzf3b5rj32mricws3gfwrhifbipb7pb264vw4`; the statement page renders and shows the AccountAssertions tier-1 line: `— 1 claimed this is their one account`.
- No code changes were needed. Remaining non-blocking observation: statement content itself still timed out through the public IPFS gateway during the smoke, but the deployed app shell, support metrics, and tier-1 assertion display were visible.

## 2026-07-09 — Ported Coinbase on-ramp session + USDC-arrival service

- Chipped at the contribution sequencing TODO by porting the successful `spikes/coinbase-onramp/` reference code into `platform-api-service`.
- Added `platform-api-service/src/onramp.ts` with:
  - Coinbase CDP JWT/session-token minting for Base USDC into a supplied donor wallet address.
  - Hosted `pay.coinbase.com` URL construction with default Base/USDC/card parameters.
  - Base mainnet native-USDC balance polling plus `addressDeployed` reporting for arrival detection against counterfactual 4337 addresses.
- Added platform API routes:
  - `POST /onramp/coinbase/session`
  - `GET /onramp/base-usdc-balance?address=…`
- Added config/env support for Coinbase CDP credentials, Base RPC override, and separate on-ramp rate limits; added Render env placeholders and README endpoint/config docs.
- Updated the contribution sequencing TODO with this progress rather than removing it; remaining work is UI state-machine/wallet wiring and the Privy/Pimlico/sponsored `buyERC1155` leg.
- Checks run: `npm run typecheck --workspace=platform-api-service`, `npm run test --workspace=platform-api-service` (49 passing), `npm run lint --workspace=platform-api-service`, and LSP diagnostics on `platform-api-service/src/onramp.ts`.

## 2026-07-09 — Added UI client for no-custody on-ramp endpoints

- Chipped at the contribution sequencing TODO by adding `ui/src/lazy-giving/onrampClient.ts`, a small typed browser client for the platform API on-ramp endpoints.
- The client trims `VITE_PLATFORM_API_URL`, creates Coinbase Onramp sessions via `POST /onramp/coinbase/session`, polls Base USDC arrival via `GET /onramp/base-usdc-balance`, and fails fast with actionable copy when the platform API URL is not configured.
- Added `ui/src/lazy-giving/onrampClient.test.ts` covering session creation, balance polling, platform API error propagation, and missing-config behavior.
- Updated the contribution sequencing TODO with this progress rather than removing it; remaining work is wiring this client into the visible contribution state machine and Privy/Pimlico/sponsored `buyERC1155` flow.
- Checks run: `npm run test:vitest --workspace=ui -- src/lazy-giving/onrampClient.test.ts`, `npm run typecheck --workspace=ui`, and LSP diagnostics on `ui/src/lazy-giving/onrampClient.ts`.

## 2026-07-09 — Lazy Giving card/on-ramp UI partial wiring

- Picked up the TODO item for the no-custody on-ramp contribution path and completed a small visible UI slice in `BuyTokensSection`.
- Added a "Pay by card" panel that calls the typed `createCoinbaseOnrampSession` client with the connected wallet address and typed amount, opens the returned Coinbase checkout URL, persists a reopen link, and surfaces API/config errors.
- Added a "Check USDC arrival" action that calls `getBaseUsdcBalance` and reports detected Base USDC balance plus whether the smart-wallet address is still counterfactual/deployed.
- Added focused Vitest coverage for checkout creation, balance checking, and checkout error display in `BuyTokensSection.test.tsx`.
- Validation run: `npm run test:vitest --workspace=ui -- BuyTokensSection.test.tsx` passed; `npm run typecheck --workspace=ui` passed. An accidental `npm test --workspace=ui -- BuyTokensSection.test.tsx` timed out because it also started the Playwright e2e suite; use `test:vitest` for focused component tests.
- Remaining on that TODO: Privy/Pimlico embedded-wallet login/signing, sponsored `buyERC1155`, automatic/interval polling and enough-USDC gating, confirmation/leaderboard refresh integration.

## 2026-07-09 — On-ramp USDC polling/gating in BuyTokensSection

- Picked up the no-custody on-ramp sequencing TODO and completed a small remaining UI slice: automatic Base USDC balance polling/gating after Coinbase Onramp checkout starts.
- `ui/src/lazy-giving/components/BuyTokensSection.tsx` now stores the latest raw on-ramp USDC balance, starts a quiet balance check after checkout launch, polls every 10s while the checkout-linked contribution amount is not covered, disables `Give` while waiting for enough USDC, and shows waiting/enough-USDC alerts.
- Added focused coverage in `ui/src/lazy-giving/components/BuyTokensSection.test.tsx` for insufficient on-ramp balance keeping `Give` disabled and sufficient balance re-enabling it.
- Updated `TODO.md` progress on the no-custody on-ramp task; remaining work there is Privy/Pimlico embedded-wallet login/signing, sponsored `buyERC1155`, and confirmation/leaderboard status.
- Checks run: `npm run test:vitest --workspace=ui -- BuyTokensSection.test.tsx` (pass, with expected console.error noise in existing error-path tests); `npm run typecheck --workspace=ui` (pass); LSP diagnostics clean except pre-existing deprecated `inputProps` hints in `BuyTokensSection.tsx`.

## 2026-07-09 — Card contribution sign-in CTA

- Continued the same no-custody on-ramp sequencing TODO with a small UX step for the Privy/login leg.
- `BuyTokensSection` now shows an inline sign-in/wallet CTA inside the Pay by card box whenever there is no connected address, explaining that sign-in creates the non-custodial destination wallet address needed before Coinbase Onramp starts; Pay by card stays disabled until that address exists.
- Added a focused component test and adjusted the test helper so tests can intentionally render the disconnected state.
- Checks run: `npm run test:vitest --workspace=ui -- BuyTokensSection.test.tsx` (pass); `npm run typecheck --workspace=ui` (pass).

## 2026-07-09 — Contribution confirmation copy mentions indexer/leaderboard refresh

- Continued the no-custody on-ramp/contribution sequencing TODO with a tiny confirmation/status polish.
- `ui/src/lazy-giving/components/BuyTokensSection.tsx` now tells users after direct wallet buys and delegatable-note buys that project totals and the contributor leaderboard are refreshing from the indexer, in addition to the transaction link/receipt-token confirmation.
- Added a `Refresh status` action on the success alert so donors can retry the project/leaderboard refresh if the indexer lagged on the automatic refresh.
- Added assertions in `BuyTokensSection.test.tsx` for the new leaderboard/status refresh copy in both success paths and the manual refresh action.
- Checks run: `npm run test:vitest --workspace=ui -- src/lazy-giving/components/BuyTokensSection.test.tsx` (pass), `npm run typecheck --workspace=ui` (pass), and LSP diagnostics clean on touched files except pre-existing deprecated `inputProps` hints. Note: an initial root `npm test -- --run ...` invocation was invalid because the root test script is verifier-backed, not a Vitest passthrough.

## 2026-07-09 — Privy Kernel smart-wallet UI wiring

- User asked to read TODO.md and do an item. I took a small concrete piece from the contribution-sequencing / Privy+Pimlico cluster: wire Pimlico URLs into the Privy Kernel smart-wallet UI config.
- Changed `scripts/setup-env.sh` so `.env.secrets` values `BASE_SEPOLIA_BUNDLER_URL` / `BASE_SEPOLIA_PAYMASTER_URL` (or mainnet `BASE_BUNDLER_URL` / `BASE_PAYMASTER_URL`) generate `VITE_PRIVY_SMART_WALLET_BUNDLER_URL` / `VITE_PRIVY_SMART_WALLET_PAYMASTER_URL` in `ui/.env`.
- Changed `ui/src/wagmi.ts` to expose those generated Privy smart-wallet URL settings.
- Changed `ui/src/privy/PrivyAppProvider.tsx` to enable Privy `smartWallets` with `smartWalletType: kernel` when the bundler URL is configured, targeting Base Sepolia except in `COMMONALITY_ENVIRONMENT=mainnet` where it targets Base. The paymaster URL is optional.
- Updated `workflow/privy-pimlico-setup.md` and TODO progress notes to remove the stale “Pimlico is not wired” handoff.
- Checks run: `lsp_diagnostics` on `ui/src/privy/PrivyAppProvider.tsx` and `ui/src/wagmi.ts` clean; `npm run typecheck --workspace=ui` passed.
- Next useful step: with real Privy/Pimlico env present, run the embedded-wallet spike in-browser and verify that wagmi writes use the Kernel smart wallet/UserOp path, then move `buyProjectTokens` to the sponsored path and record the calldata shape for `CreatorGasTank`.


## 2026-07-09 — Sponsored gas calldata validation hardening

- Picked a small sponsored-gas task slice from TODO.md.
- Hardened `hardhat/contracts/sponsored-gas/CreatorGasTank.sol` so malformed account calldata (length < 4) and malformed inner sponsored calldata (length < 4) revert with explicit custom errors instead of relying on selector decoding/slicing behavior.
- Added focused coverage in `hardhat/test/CreatorGasTank.test.js` for both malformed cases.
- Verified with `npm test --workspace=hardhat -- test/CreatorGasTank.test.js` (10 passing).
- Updated the sponsored-gas TODO progress note; the broader TODO remains open because live Privy+Pimlico trace confirmation, testnet wiring, cap tuning, and GasTankFunder are still outstanding.


## 2026-07-09 — Sponsored gas approval-only drain hardening

- Continued the sponsored-gas TODO slice.
- Updated `CreatorGasTank` so approval calls remain allowed only as helper calls in a sponsored batch that also contains a primary `buyERC1155` or `refundERC1155` action.
- Added `MissingSponsoredPrimaryAction` and changed sponsored-call validation to return whether a primary action was present.
- Updated `hardhat/test/CreatorGasTank.test.js` to reject approval-only batches and still allow approval+buy batches.
- Verified again with `npm test --workspace=hardhat -- test/CreatorGasTank.test.js` (10 passing).

## 2026-07-09 — On-ramp balance status UX tightened

- Picked up the TODO contribution-sequencing item and made a focused UI improvement in `ui/src/lazy-giving/components/BuyTokensSection.tsx`.
- On-ramp USDC balance polling now uses info vs success severity: partial funding reports the detected USDC and says how much is still required before the Give button is enabled; enough funding reports that the donor can now Give.
- Added/updated `ui/src/lazy-giving/components/BuyTokensSection.test.tsx` coverage for the partial-funding status.
- Checks run: `npm run lint --workspace=ui` ✅; `npm run test:vitest --workspace=ui -- BuyTokensSection --run` ✅; `npm run typecheck --workspace=ui` ✅. LSP only reports pre-existing MUI `inputProps` deprecation hints.

## 2026-07-11 — Sponsored-gas GasTankFunder implemented

- User asked to finish sponsored-gas TODO enough to clear it. I implemented the code-level missing `GasTankFunder` piece, but did not clear the TODO because the remaining blockers are live/operational: Privy+Pimlico trace confirmation, production cap tuning, testnet swap-address deployment, and UI/bundler exercise of sponsored UserOps.
- Added `hardhat/contracts/sponsored-gas/GasTankFunder.sol`: pulls USDC, swaps via a Uniswap-v3-compatible `exactInputSingle`, unwraps WETH to ETH, and calls `CreatorGasTank.fundTank(creator)`. It intentionally stays decoupled from assurance-contract internals.
- Added test mocks `hardhat/contracts/test/MockWETH.sol` and `hardhat/contracts/test/MockUniswapV3SwapRouter.sol`, plus focused coverage in `hardhat/test/GasTankFunder.test.js` for successful funding, slippage propagation, and invalid inputs.
- Wired optional deploy support in `hardhat/scripts/deploy-incremental.js`: local deploys use mocks; non-local deploys deploy `GasTankFunder` only when `SPONSORED_GAS_WETH_ADDRESS` and `SPONSORED_GAS_SWAP_ROUTER_ADDRESS` are supplied. Env output includes `GAS_TANK_FUNDER_ADDRESS` and related swap config when deployed.
- Updated `specs/tech/sponsored-gas.md` and `TODO.md` to record this progress and keep the remaining operational blockers visible.
- Validation run: `npm run test --workspace=@commonality/hardhat -- test/GasTankFunder.test.js test/CreatorGasTank.test.js` passed (13 tests).

## 2026-07-14 — Securities redesign contract pass started (not full-suite clean)

User asked to read TODO.md and do the “Securities redesign” task. I focused on the first/contracts item, not UI/docs. Current tree is intentionally mid-redesign and **not full Hardhat-suite clean** because old secondary-market tests still expect transferable receipts.

Changed files currently in git diff:

- `hardhat/contracts/utils/PremintingERC1155.sol`
- `hardhat/contracts/individual-projects/AssuranceContract.sol`
- `hardhat/contracts/individual-projects/AssuranceContracts.sol`
- `hardhat/contracts/individual-projects/ERC1155PrimaryMarket.sol`
- `hardhat/contracts/individual-projects/ProjectFactory.sol`
- `hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol`
- `hardhat/test/PremintingERC1155.test.js`
- `hardhat/test/AssuranceContracts.test.js`
- `hardhat/test/AssuranceContractProperties.test.js`
- `hardhat/test/SecurityRegression.test.js`
- `TODO.md`

Implemented so far:

- `PremintingERC1155` receipt tokens now reject ordinary holder-to-holder transfers with `NonTransferableReceipt`. Minting and burning still work. Owner-configured `isReceiptTransferBridge` addresses are allowed as `from` or `to` so assurance contracts can distribute receipts on primary purchase and receive them during failed-project refunds.
- `ProjectFactory` and `CreatorAssuranceContractFactory` call `setReceiptTransferBridge(address(ac), true)` before renouncing token ownership.
- `ERC1155PrimaryMarket` now has hooks `recordPrimaryPurchase` and `recordPrimaryRefund`; `MultiERC1155AssuranceContract` overrides them to maintain early-contribution totals.
- `MultiERC1155AssuranceContract` now has:
  - `totalEarlyContributions`
  - `totalRetroReceived`
  - `totalReimbursementsWithdrawn`
  - `earlyContributions(address)`
  - `reimbursementsWithdrawn(address)`
  - `outstandingReimbursementTotal()`
  - `reimbursableAmount(address)`
  - `donateRetroactive(uint256)` capped at outstanding reimbursement
  - `withdrawReimbursement()` pull-based O(1) pro-rata withdrawal
  - events `RetroactiveDonationReceived` and `ReimbursementWithdrawn`
- `AssuranceContract.withdraw()` now calls virtual `withdrawableRecipientBalance()` so successful-project recipient withdrawals reserve unwithdrawn retroactive reimbursement funds instead of sweeping them to the project recipient.
- Tests updated/added for non-transferability and reimbursement. Older tests that manually transfer tokens into assurance contracts now authorize the assurance contract bridge first.

Focused checks that passed:

- `npm test --workspace=hardhat -- --grep "Retroactive reimbursement|PremintingERC1155"` ✅ (36 passing)
- Broader targeted grep before the final test fix: `npm test --workspace=hardhat -- --grep "PremintingERC1155|MultiERC1155AssuranceContract|AssuranceContract - Property"` got to 102 passing / 2 failing due to missing price setup in the new reimbursement tests. I fixed that setup and then re-ran only the focused reimbursement + Preminting check above. Re-run the broader grep if you continue.

Known failing state / why full suite fails:

- `npm test --workspace=hardhat` currently fails (51 failures in my run) mostly because legacy `ERC1155SecondaryMarket` and `DelegatableNotes.purchaseFromSecondaryMarket` tests still expect receipts to be transferable/listable/fillable. Example failure source: `NonTransferableReceipt()` from secondary-market fulfillment or listing. This is expected directionally under the redesign, but the old code/tests need to be retired or explicitly scoped away from LazyGiving receipts.
- Delegatable primary-market refund tests also failed because their setup needs bridge authorization for notes/assurance contracts, similar to fixes already made in assurance tests. Decide whether to update those setups or redesign delegated receipt handling before blindly patching.
- `ProspectiveContentFunding.test.js` failed because `ProspectiveContentTokens` inherits `PremintingERC1155` and also has its own non-transferability override. Its primary-market setup now likely needs bridge authorization too, or `ProspectiveContentTokens._update` should account for the inherited bridge policy.

Recommended next steps for a fresh LLM:

1. Read `specs/product/legal/retroactive-funding-redesign.md#resolved-decisions-jul-2026` and the TODO item before coding.
2. Re-run `npm test --workspace=hardhat -- --grep "Retroactive reimbursement|PremintingERC1155"` to confirm the checkpoint.
3. Decide how to retire secondary-market flow cleanly:
   - likely remove/stop exporting UI/SDK/indexer paths for LazyGiving secondary market;
   - update/delete `DelegatableNotes.purchaseFromSecondaryMarket` tests/code if it is no longer part of the retroactive-funding flow;
   - decide whether `ERC1155SecondaryMarket` contract remains as unrelated legacy/test-only code or is removed from deployment/factories/manifests.
4. Fix remaining non-secondary setup failures caused by bridge authorization (`DelegatableNotes.refund`, `ProspectiveContentFunding`, maybe security tests) in a way that preserves non-transferability rather than opening a transfer loophole.
5. Add more reimbursement edge tests: partial donation rounding, multiple donations over time, withdrawal then later donation, donation rejection after cap reached, failed-project refund reducing `totalEarlyContributions`.
6. Regenerate/sync ABIs only after contract API/deployment decisions settle.
7. Run full Hardhat tests, then relevant repo build/typecheck.

Caveat: This is securities-sensitive Ask-tier work. Do not frame implementation as legally final; it still needs Adam/lawyer review before mainnet.

## 2026-07-14 — Securities redesign contract test status corrected

Re-checked the contract-side securities redesign status after the previous checkpoint. Contrary to the stale TODO/continuity wording, the full Hardhat suite now passes on the current tree:

- `npm test --workspace=hardhat` ✅ (493 passing)

Updated `TODO.md` to stop claiming the Hardhat suite currently fails on legacy secondary-market/delegatable purchase tests. The remaining contract-side follow-through is now framed as the product/API cleanup decision: whether to remove secondary-market deployment/indexing/SDK surfaces from LazyGiving or leave `ERC1155SecondaryMarket` as unrelated legacy code, then regenerate/sync ABIs and run broader repo checks.
