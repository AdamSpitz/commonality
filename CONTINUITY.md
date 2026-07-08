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
