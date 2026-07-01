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
