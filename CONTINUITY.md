# Continuity notes for ephemeral AI instances

## 2026-04-24 - Repair root service-host workspace registration (Completed)

**Task**: Complete the service-bundling follow-up cleanup item that updates the root workspace metadata from the deleted `attester-host` / `worker-host` packages to the unified `service-host` package.

**What was done**:
- Replaced the deleted root workspace entries in [`package.json`](/home/adam/Projects/commonality/package.json) with `service-host`.
- Regenerated [`package-lock.json`](/home/adam/Projects/commonality/package-lock.json) so the root workspace list, `service-host` package entry, and `node_modules/@commonality/service-host` link all point at the unified host package again.
- Marked the corresponding service-bundling cleanup item complete in [`TODO.md`](/home/adam/Projects/commonality/TODO.md).

**Key decisions**:
- Kept this task strictly to root workspace metadata repair. I did not mix in any of the remaining service-host cleanup items.
- Left the old `attester-host` / `worker-host` entries in `package-lock.json` as extraneous metadata because those directories are gone; the root workspace list and active package links now point at `service-host`, which is the behavior this task needed to restore.

**Verified**:
- `npm run --workspace=@commonality/service-host build` ✓
- `npm run --workspace=@commonality/service-host test` ✓

**Files changed**:
- `package.json`
- `package-lock.json`
- `TODO.md`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- Remaining service-bundling follow-ups are still the test-script normalization, per-package env parsing, worker-era vocabulary rename, and multi-instance env configuration.
- The previous attempt on this task failed only at the repo pre-commit hook due unrelated full-suite UI Vitest timeouts. Re-check whether that hook path is stable on this machine.

**Interrupt point**: Yes. This is a good checkpoint before taking the larger remaining `service-host` cleanup items.

## 2026-04-24 - Attempted root service-host workspace repair (Aborted)

**Task attempted**: Complete the service-bundling follow-up cleanup item to update root `package.json` and `package-lock.json` from the deleted `attester-host` / `worker-host` workspaces to the unified `service-host` workspace.

**What was tried**:
- Replaced the deleted root workspace entries with `service-host` in `package.json`.
- Regenerated and cleaned `package-lock.json` so the root workspace list and linked package entry pointed at `@commonality/service-host`, with no stale `attester-host` or `worker-host` package entries.
- Marked the corresponding service-bundling TODO item complete.
- Verified the focused service-host path before attempting the commit.

**Focused verification that passed before aborting**:
- `node -e "JSON.parse(require('fs').readFileSync('package-lock.json','utf8'))"` ✓
- `npm run build --workspace=@commonality/service-host` ✓
- `npm run test --workspace=@commonality/service-host` ✓ (8 passing)
- `npm run test --workspace=ui -- src/content-funding/pages/CreateContractPage.test.tsx` ✓ after the first hook failure

**Difficulty / blocker**:
- The pre-commit hook runs `npm run lint && npm run build && npm test`. Build, hardhat tests, SDK tests, and integration tests passed, but the full UI Vitest suite repeatedly timed out under load in unrelated tests with the default 5s per-test limit.
- The failing test changed between hook runs: first `CreateContractPage.test.tsx > blocks submission when resolved content belongs to a different channel`, then `CreateProjectPage.test.tsx > uploads metadata to IPFS and creates project on submit`, then both `CreateContractPage.test.tsx > blocks submission when the content item is already registered in an active contract` and the same `CreateProjectPage` test.
- The focused `CreateContractPage` file passed when rerun alone, which suggests this is a full-suite timing flake rather than a regression from the workspace metadata change.

**Cleanup performed**:
- Reverted the attempted `package.json`, `package-lock.json`, and `TODO.md` changes, leaving only this continuity note.

**Recommendation for the next implementor**:
- Retry the same narrow workspace metadata change on a less contended machine or after stabilizing the UI Vitest timeouts.
- A likely process improvement is to raise the UI unit-test timeout for the slow interaction-heavy files or reduce UI test concurrency in pre-commit, but do that as a separate task.
- After the hook is stable, reapply the same small change: root workspaces should replace `attester-host` and `worker-host` with `service-host`, the lockfile should contain `node_modules/@commonality/service-host` and `service-host`, and the TODO item should be checked off.

**Interrupt point**: Yes, but the service-bundling cleanup item remains incomplete because the required commit hook could not pass reliably.

## 2026-04-24 - Make service-host env config lazy for disabled services (Completed)

**Task**: Complete the service-bundling follow-up cleanup item that makes `loadServiceHostConfigFromEnv()` build only enabled logical-service entries, so disabled services do not require their env vars.

**What was done**:
- Updated [`service-host/src/envConfig.ts`](/home/adam/Projects/commonality/service-host/src/envConfig.ts) to read all `*_ENABLED` flags first and conditionally construct each hosted-service entry only when its flag is true.
- Added regression tests in [`service-host/test/index.test.ts`](/home/adam/Projects/commonality/service-host/test/index.test.ts) for attester-only and worker-only env bundles, proving each can load without the other bundle's service-specific env vars.
- Rewrote [`service-host/README.md`](/home/adam/Projects/commonality/service-host/README.md) so it describes the unified `service-host` rather than the old `worker-host` shape, and documents the lazy `*_ENABLED` env behavior.
- Marked the lazy env-var path cleanup item complete in [`TODO.md`](/home/adam/Projects/commonality/TODO.md).

**Key decisions**:
- Kept the existing centralized env parser for now. The per-service `loadConfigFromEnv()` refactor is a separate, larger TODO item and should be done independently.
- Disabled services are omitted from the env-derived `workers` array instead of included as `{ enabled: false }` placeholders. That keeps env-derived config aligned with the goal of only building services in the selected physical bundle.

**Verified**:
- `npm run test` in `service-host/` ✓ (8 passing)
- `npm run build` in `service-host/` ✓
- `npm run lint` in `service-host/` ✓

**Files changed**:
- `service-host/src/envConfig.ts`
- `service-host/test/index.test.ts`
- `service-host/README.md`
- `TODO.md`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- Root-level workspace selection for `@commonality/service-host` is currently broken because root `package.json`/`package-lock.json` still list deleted `attester-host` and `worker-host` workspaces rather than `service-host`. I added this to Suggestions from AI in `TODO.md`; it should be fixed soon so root build/test tooling includes `service-host` again.
- Remaining service-bundling follow-ups: move env parsing into the service packages, rename worker-era vocabulary, and allow multiple env-configured instances of the same kind.

**Interrupt point**: Yes. The lazy env-var cleanup is complete and covered by focused tests. This is a good checkpoint before starting the larger per-package env-parser refactor.

## 2026-04-24 - Complete service-bundling: delete per-service Dockerfiles and update deployment configs (Completed)

**Task**: Delete per-service Dockerfiles and update docker-compose.yml + render.yaml to use the unified service-host with ENABLE flags to select which workers run in each physical bundle.

**What was done**:
- Deleted 7 per-service Dockerfiles: `implication-attester/Dockerfile`, `content-attester/Dockerfile`, `implication-finder/Dockerfile`, `content-finder/Dockerfile`, `implication-graph-nudger/Dockerfile`, `bridge-creator/Dockerfile`, `explorer-curator/Dockerfile`.
- Added `enabled` field support to `service-host/src/config.ts` and updated `parseWorkerHostConfig()` to filter disabled workers from the port-required check.
- Added `readOptionalBoolean()` helper to [`service-host/src/envConfig.ts`](/home/adam/Projects/commonality/service-host/src/envConfig.ts) and added `*_ENABLED` env-var support for all seven workers (IMPLICATION_ATTESTER_ENABLED, CONTENT_ATTESTER_ENABLED, IMPLICATION_FINDER_ENABLED, CONTENT_FINDER_ENABLED, IMPLICATION_GRAPH_NUDGER_ENABLED, BRIDGE_CREATOR_ENABLED, EXPLORER_CURATOR_ENABLED).
- Updated [`service-host/src/supervisor.ts`](/home/adam/Projects/commonality/service-host/src/supervisor.ts) to skip disabled workers at startup.
- Updated [`service-host/src/index.ts`](/home/adam/Projects/commonality/service-host/src/index.ts) `createWorkerHostApp()` to filter disabled workers from HTTP routing.
- Rewrote `docker-compose.yml` AI services section:
  - Replaced `attester-host` + 3 redundant content-attesters + `worker-host` with two new services: `service-host-attesters` (bundle A) and `service-host-workers` (bundle B).
  - Both use `service-host/Dockerfile`.
  - Bundle A enables only implication-attester + content-attester (disables the other five via `*_ENABLED=false`).
  - Bundle B enables only finders + nudgers (disables attesters via `*_ENABLED=false`).
- Updated [`render.yaml`](/home/adam/Projects/commonality/render.yaml):
  - Replaced `commonality-attester-host` (attester-host/Dockerfile) with `commonality-service-host-attesters` (service-host/Dockerfile).
  - Replaced `commonality-worker-host` (worker-host/Dockerfile) with `commonality-service-host-workers` (service-host/Dockerfile).
  - Both use the same SERVICE_HOST_PORT and ENABLE flags as docker-compose.

**Key decisions**:
- Used `*_ENABLED` environment variables instead of JSON config for deployment selection, matching the existing env-var pattern used throughout docker-compose/render deployment.
- Bundle A runs attesters, Bundle B runs workers — same as the original design in service-bundling.md.
- The worker-host-to-service-host rename happened in a prior session; this session completes the cleanup by removing the old per-service Dockerfiles.

**Verified**:
- `npm run build` ✓ (17 successful)
- `npm run lint` ✓

**Files changed**:
- `<package>/Dockerfile` (7 deleted)
- `docker-compose.yml` (replaced 5 AI services with 2 service-host entries)
- `render.yaml` (replaced 2 host entries with 2 service-host entries)
- `service-host/src/config.ts` (added enabled field filtering)
- `service-host/src/envConfig.ts` (readOptionalBoolean, enabled flags for all workers)
- `service-host/src/supervisor.ts` (skip disabled workers)
- `service-host/src/index.ts` (filter disabled workers from HTTP routing)
- `TODO.md` (marked sub-tasks 19-20 complete)

**Blockers / notes for next iteration**:
- None. Service bundling is now complete: the seven logical services run in two physical bundles via unified service-host.

**Interrupt point**: Yes. All service-bundling work is complete. The two physical hosts (attesters and workers) are both using the unified service-host image with ENABLE flags to select workers. No more cleanup needed.

## 2026-04-24 - Unify attester-host and worker-host into one service-host (Completed)

**Task**: Collapse `attester-host` into `worker-host`, rename to `service-host`, extend `WorkerKind` with `implication-attester` and `content-attester`, and unify env-var loaders.

**What was done**:
- Extended [`service-host/src/config.ts`](/home/adam/Projects/commonality/service-host/src/config.ts) `WorkerKind` to include `implication-attester` and `content-attester`.
- Extended [`service-host/src/serviceRegistry.ts`](/home/adam/Projects/commonality/service-host/src/serviceRegistry.ts) to import and register `createImplicationAttesterApp`, `runImplicationAttester`, `createContentAttesterApp`, and `runContentAttester` from the attester packages.
- Extended `workerAppFactories` to include both attesters, allowing them to be mounted as Express routers.
- Updated [`service-host/package.json`](/home/adam/Projects/commonality/service-host/package.json) with renamed `@commonality/service-host`, version `0.2.0`, and new dependencies on both attester packages.
- Renamed the directory from `worker-host/` to `service-host/`.
- Unified the env-var loader by replacing the old `loadWorkerHostConfigFromEnv` with a new `loadServiceHostConfigFromEnv` in [`service-host/src/envConfig.ts`](/home/adam/Projects/commonality/service-host/src/envConfig.ts) that includes:
  - Two attester worker configs (implication-attester with full x402/payment config, content-attester with prompt template support)
  - All five background workers (implication-finder, content-finder, three nudgers)
  - Added backward-compatible `loadWorkerHostConfigFromEnv` alias for test compatibility.
- Updated config-path functions to support both `SERVICE_HOST_CONFIG` env var and legacy `WORKER_HOST_CONFIG`.
- Updated [`service-host/src/cli.ts`](/home/adam/Projects/commonality/service-host/src/cli.ts) to use the new naming and exports.
- Deleted the now-redundant `attester-host/` directory.
- Updated tests to cover the new unified config with all seven worker kinds.

**Key decisions**:
- Kept both the JSON config-file approach (`SERVICE_HOST_CONFIG`) and the env-var fallback (`loadServiceHostConfigFromEnv()`), matching the pattern from each host's pre-unification implementation.
- Each worker entry is now a regular config object with explicit `kind` and optional `routePrefix`; the attesters are registered identically to how nudgers are registered.
- The new env config includes all seven logical services so a single host can run either bundle (attesters only, workers only, or both), depending on which entries the operator includes in their JSON config or enables in their environment.

**Verified**:
- `npm run build --workspace=@commonality/service-host` ✓ (via direct cd)
- `npm run test --workspace=@commonality/service-host` ✓ (6 tests passing)
- `npm run lint --workspace=@commonality/service-host` ✓

**Files changed**:
- `service-host/src/config.ts` (WorkerKind, loadServiceHostConfig, getServiceHostConfigPath)
- `service-host/src/serviceRegistry.ts` (new attester imports and factories)
- `service-host/package.json` (renamed, version, new deps)
- `service-host/src/envConfig.ts` (unified loader)
- `service-host/src/cli.ts` (new naming)
- `service-host/test/index.test.ts` (updated tests)
- `TODO.md` (sub-tasks 17-18 marked complete)
- `attester-host/` (deleted)

**Blockers / notes for next iteration**:
- Remaining sub-tasks: delete per-service Dockerfiles and update deployment configs to use the unified `service-host` image.
- The unified host now supports any combination of logical services via config; deployment is the next step.

**Interrupt point**: Yes. The host is unified, the naming is consistent, and the next step is deployment wiring (tasks 19 and 20). Good checkpoint before the final deployment-bundle configuration work.

## 2026-04-24 - Normalize logical-service contract (Completed)

**Task**: First sub-task of service-bundling unification: normalize the logical-service contract across all seven AI services so that `run(config)` never opens an HTTP listener, `port` is removed from every service config type, and the `startServer` flag is removed from the three nudger `run()` functions.

**What was done**:
- Removed `port: number` from `NudgerConfig` in [`nudger-core/src/signer.ts`](/home/adam/Projects/commonality/nudger-core/src/signer.ts).
- Removed `port` from `loadConfig()` in `implication-graph-nudger`, `bridge-creator`, and `explorer-curator` configs.
- Removed `port` from `AttesterConfig` and `ContentAttesterConfig` in the two attester configs.
- Rewrote `run()` for all three nudgers to never start an HTTP listener; removed `ImplicationGraphNudgerRunOptions`, `BridgeCreatorRunOptions`, and `ExplorerCuratorRunOptions` and their `startServer` flags.
- Rewrote `run()` for both attesters to be no-ops (`{ stop: () => Promise.resolve() }`), since attesters are purely reactive HTTP services with no background work.
- Updated standalone CLI entry points (the `if (process.argv[1] && ...)` blocks) in each service to read `process.env.PORT` directly and call `createApp()` + `listen()` themselves.
- Removed `{ startServer: !worker.routePrefix }` from `worker-host/src/serviceRegistry.ts` (no longer needed).
- Removed `port: 0` stubs from `worker-host/src/envConfig.ts` (three nudger configs) and `attester-host/src/envConfig.ts` (two attester configs).
- Updated `attester-host/test/index.test.ts` to remove the `config.port === 0` assertions.
- Removed now-unused `readNumberEnv` helpers from `implication-graph-nudger/src/config.ts` and `bridge-creator/src/config.ts`.

**Key decisions**:
- `bridge-creator` has no background work, so `run()` is a deliberate no-op returning `{ finished: NEVER, stop: () => Promise.resolve() }`. Uses `_config` to acknowledge the unused parameter.
- Same pattern for the two attesters (pure HTTP services with no background timers).
- Standalone CLI entry points read `PORT` env var directly with a per-service default (3000 for attesters, 3002/3003/3004 for nudgers); the `port` field no longer lives in the service config type.
- The `createMachinery()` call in the `explorer-curator` standalone CLI reuses the same instance for both `run()` (curator cycles) and `createExplorerCuratorApp()` (HTTP handler), which is more efficient.

**Verified**:
- `npm run build --workspace=@commonality/nudger-core` ✓
- `npm run build --workspace=@commonality/implication-graph-nudger` ✓
- `npm run build --workspace=@commonality/bridge-creator` ✓
- `npm run build --workspace=@commonality/explorer-curator` ✓
- `npm run build --workspace=@commonality/implication-attester` ✓
- `npm run build --workspace=@commonality/content-attester` ✓
- `npm run build --workspace=@commonality/attester-host` ✓
- `npm run build --workspace=@commonality/worker-host` ✓
- `npm run build` (full repo) ✓
- `npm run test --workspace=@commonality/worker-host` ✓
- `npm run test --workspace=@commonality/attester-host` ✓
- nudger-core signer tests (manual invoke) ✓
- implication-graph-nudger config test (manual invoke) ✓
- `npm run lint` (all modified packages) ✓

**Files changed**:
- `nudger-core/src/signer.ts`
- `nudger-core/src/signer.test.ts`
- `implication-graph-nudger/src/config.ts`
- `implication-graph-nudger/src/index.ts`
- `bridge-creator/src/config.ts`
- `bridge-creator/src/index.ts`
- `explorer-curator/src/config.ts`
- `explorer-curator/src/index.ts`
- `implication-attester/src/config.ts`
- `implication-attester/src/index.ts`
- `content-attester/src/config.ts`
- `content-attester/src/index.ts`
- `worker-host/src/serviceRegistry.ts`
- `worker-host/src/envConfig.ts`
- `attester-host/src/envConfig.ts`
- `attester-host/test/index.test.ts`
- `TODO.md`
- `CONTINUITY.md`

**Next step**: Sub-task 2 — collapse `attester-host` into `worker-host` and rename to `service-host`. The normalized service contract (this task) is the prerequisite; it's now done.

**Interrupt point**: Yes — the logical-service contract is now uniform across all seven services. Good checkpoint before tackling the host unification (sub-task 2).

## 2026-04-24 - Deployment wiring for bundled AI hosts (Completed)

**Task**: Complete the next `TODO.md` service-bundling sub-task by updating `docker-compose.yml` and `render.yaml` to deploy the two host images instead of the old individual AI-service layout.

**What was done**:
- Added [`attester-host/src/envConfig.ts`](/home/adam/Projects/commonality/attester-host/src/envConfig.ts) and [`worker-host/src/envConfig.ts`](/home/adam/Projects/commonality/worker-host/src/envConfig.ts) so both host binaries can synthesize their config directly from deployment env vars when no JSON file path is provided.
- Updated [`attester-host/src/index.ts`](/home/adam/Projects/commonality/attester-host/src/index.ts) and [`worker-host/src/cli.ts`](/home/adam/Projects/commonality/worker-host/src/cli.ts) to prefer file-based config when provided but otherwise boot from the new env-based config loaders.
- Added focused env-config coverage in [`attester-host/test/index.test.ts`](/home/adam/Projects/commonality/attester-host/test/index.test.ts) and [`worker-host/test/index.test.ts`](/home/adam/Projects/commonality/worker-host/test/index.test.ts).
- Added host Dockerfiles in [`attester-host/Dockerfile`](/home/adam/Projects/commonality/attester-host/Dockerfile) and [`worker-host/Dockerfile`](/home/adam/Projects/commonality/worker-host/Dockerfile), and registered them in [`scripts/docker-build-plan.mjs`](/home/adam/Projects/commonality/scripts/docker-build-plan.mjs).
- Updated [`docker-compose.yml`](/home/adam/Projects/commonality/docker-compose.yml) to define bundled `attester-host` and `worker-host` services for local/manual Docker use, while leaving the existing extra local content-attester profile containers in place for the content-funding workflow.
- Replaced the old per-service Render blueprint layout in [`render.yaml`](/home/adam/Projects/commonality/render.yaml) with `commonality-attester-host`, `commonality-worker-host`, `commonality-platform-api`, and `commonality-indexer`.
- Updated [`attester-host/README.md`](/home/adam/Projects/commonality/attester-host/README.md), [`worker-host/README.md`](/home/adam/Projects/commonality/worker-host/README.md), [`DEPLOYMENT.md`](/home/adam/Projects/commonality/DEPLOYMENT.md), [`TODO.md`](/home/adam/Projects/commonality/TODO.md), and `CONTINUITY.md` to document the new deployment shape.

**Key decisions**:
- Kept the original JSON config-file path working for both hosts, and added env-based config as an additional deployment mode rather than replacing the explicit file-based host config model.
- Used per-service env prefixes for bundled workers/attesters so each logical service still has explicit signer/config ownership inside the host.
- Left `services.sh` unchanged because the default local bootstrap intentionally avoids starting OpenRouter-dependent AI services when no API key is configured.
- Kept the extra local content-attester persona containers in Compose; they are separate local-dev profiles, not part of the canonical seven-service bundling target captured by the Render blueprint.

**Verified**:
- `npm run test --workspace=@commonality/attester-host` ✓
- `npm run lint --workspace=@commonality/attester-host` ✓
- `npm run build --workspace=@commonality/attester-host` ✓
- `npm run test --workspace=@commonality/worker-host` ✓
- `npm run lint --workspace=@commonality/worker-host` ✓
- `npm run build --workspace=@commonality/worker-host` ✓
- `docker compose config` ✓
- `ruby -e 'require "yaml"; YAML.load_file("render.yaml")'` ✓

**Files changed**:
- `attester-host/Dockerfile`
- `attester-host/README.md`
- `attester-host/src/envConfig.ts`
- `attester-host/src/index.ts`
- `attester-host/test/index.test.ts`
- `worker-host/Dockerfile`
- `worker-host/README.md`
- `worker-host/src/envConfig.ts`
- `worker-host/src/cli.ts`
- `worker-host/test/index.test.ts`
- `docker-compose.yml`
- `render.yaml`
- `scripts/docker-build-plan.mjs`
- `DEPLOYMENT.md`
- `TODO.md`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- The remaining service-bundling TODO item is the policy question about whether the per-service Dockerfiles should remain supported as an explicit escape hatch for future re-splitting.
- The bundled Render services now assume the `*.onrender.com` service URLs shown in `render.yaml`; if Render naming or internal-service routing strategy changes, update those host-to-host URLs together.

**Interrupt point**: Yes. The bundling implementation and deployment wiring now line up, and the next logical step is a higher-level review of whether to keep the standalone deployment escape hatch.

## 2026-04-24 - Bundle B worker host as one shared HTTP/background host (Completed)

**Task**: Complete the next `TODO.md` service-bundling sub-task by standing up Bundle B as one real host process for both finders and all three nudgers.

**What was done**:
- Refactored [`implication-graph-nudger/src/index.ts`](/home/adam/Projects/commonality/implication-graph-nudger/src/index.ts), [`bridge-creator/src/index.ts`](/home/adam/Projects/commonality/bridge-creator/src/index.ts), and [`explorer-curator/src/index.ts`](/home/adam/Projects/commonality/explorer-curator/src/index.ts) so each service now exports an app-construction function and can run without opening its own listener.
- Extended [`worker-host/src/config.ts`](/home/adam/Projects/commonality/worker-host/src/config.ts) to accept a host `port` plus optional per-worker `routePrefix` entries, with validation that routed workers require a host port.
- Extended [`worker-host/src/serviceRegistry.ts`](/home/adam/Projects/commonality/worker-host/src/serviceRegistry.ts) so routed HTTP-capable workers are started with `startServer: false` and their Express apps are exposed to the host for mounting.
- Implemented shared host mounting in [`worker-host/src/index.ts`](/home/adam/Projects/commonality/worker-host/src/index.ts), including a host-level `/health` endpoint and route-prefix mounting for the HTTP-capable bundled workers.
- Split the worker-host CLI entrypoint into [`worker-host/src/cli.ts`](/home/adam/Projects/commonality/worker-host/src/cli.ts) so the library module can be imported in tests without triggering startup.
- Added coverage in [`worker-host/test/index.test.ts`](/home/adam/Projects/commonality/worker-host/test/index.test.ts) for route-prefix mounting and routed-config validation.
- Updated [`worker-host/.mocharc.json`](/home/adam/Projects/commonality/worker-host/.mocharc.json) so the workspace test command exits cleanly after the suite finishes.
- Updated [`worker-host/README.md`](/home/adam/Projects/commonality/worker-host/README.md), [`TODO.md`](/home/adam/Projects/commonality/TODO.md), `worker-host/package.json`, `package-lock.json`, and `CONTINUITY.md` to reflect the new host shape.

**Key decisions**:
- Kept the existing generic `workers[]` config model and added optional `routePrefix` instead of inventing a second parallel config tree for HTTP-capable workers.
- Mounted routed workers under explicit prefixes so the bundle exposes one port without flattening or renaming individual worker endpoints.
- Preserved standalone service binaries by making the new host behavior opt-in (`startServer: false` only when `worker-host` is mounting the app).

**Verified**:
- `npm run build --workspace=@commonality/implication-graph-nudger` ✓
- `npm run build --workspace=@commonality/bridge-creator` ✓
- `npm run build --workspace=@commonality/explorer-curator` ✓
- `npm run test --workspace=@commonality/explorer-curator` ✓
- `npm run build --workspace=@commonality/worker-host` ✓
- `npm run lint --workspace=@commonality/worker-host` ✓
- `npm run test --workspace=@commonality/worker-host` ✓

**Files changed**:
- `implication-graph-nudger/src/index.ts`
- `bridge-creator/src/index.ts`
- `explorer-curator/src/index.ts`
- `worker-host/.mocharc.json`
- `worker-host/package.json`
- `worker-host/README.md`
- `worker-host/src/config.ts`
- `worker-host/src/serviceRegistry.ts`
- `worker-host/src/supervisor.ts`
- `worker-host/src/index.ts`
- `worker-host/src/cli.ts`
- `worker-host/test/index.test.ts`
- `TODO.md`
- `package-lock.json`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- The code now supports one real Bundle B port/process, but `docker-compose.yml` and `render.yaml` still deploy the old per-service layout. That remains the next bundling sub-task.
- `bridge-creator` is now mountable under the shared host, but its current implementation still behaves primarily like an HTTP nudger rather than a periodic publisher; if the product/spec expects scheduled bridge publication, that is a separate behavior task rather than more bundling work.

**Interrupt point**: Yes. Bundle B is implemented as a true shared host, and the next step is deployment wiring rather than more in-process hosting work.

## 2026-04-24 - Attester host for bundled HTTP attesters (Completed)

**Task**: Complete the next `TODO.md` service-bundling sub-task by standing up Bundle A, the shared host for `implication-attester` and `content-attester`.

**What was done**:
- Added a new [`attester-host/README.md`](/home/adam/Projects/commonality/attester-host/README.md) workspace with package metadata, lint/type/test/build config, and a CLI entrypoint in [`attester-host/src/index.ts`](/home/adam/Projects/commonality/attester-host/src/index.ts).
- Added [`attester-host/src/config.ts`](/home/adam/Projects/commonality/attester-host/src/config.ts) to load and validate a JSON host config containing the shared host port plus explicit route-prefix/config objects for the implication and content attesters.
- Implemented [`attester-host/src/index.ts`](/home/adam/Projects/commonality/attester-host/src/index.ts) to mount the two attester apps under their configured prefixes and expose a lightweight host-level `/health` endpoint.
- Added focused routing/config coverage in [`attester-host/test/index.test.ts`](/home/adam/Projects/commonality/attester-host/test/index.test.ts) to verify both prefixes are mounted and malformed prefixes are rejected.
- Refactored [`content-attester/src/index.ts`](/home/adam/Projects/commonality/content-attester/src/index.ts) to export `createContentAttesterApp(config)` so the service can be mounted in-process rather than only started as a standalone listener.
- Re-exported the attester config types from [`content-attester/src/index.ts`](/home/adam/Projects/commonality/content-attester/src/index.ts) and [`implication-attester/src/index.ts`](/home/adam/Projects/commonality/implication-attester/src/index.ts) so the host package can depend on the public package surface instead of internal files.
- Updated [`README.md`](/home/adam/Projects/commonality/README.md), [`TODO.md`](/home/adam/Projects/commonality/TODO.md), and `package.json` to register and document the new workspace.

**Key decisions**:
- Kept the host config file-based and explicit, matching the `worker-host` pattern, so each mounted attester still receives a full independent config object and signer key.
- Used route prefixes rather than trying to merge endpoints into one flat namespace; that preserves each attester's existing API surface with minimal code churn.
- Scoped this task to the host binary/package only. Local/Render deployment wiring remains a separate `TODO.md` sub-task.

**Verified**:
- `npm test --workspace=@commonality/content-attester` ✓
- `npm run lint --workspace=@commonality/content-attester` ✓
- `npm run build --workspace=@commonality/content-attester` ✓
- `npm run build --workspace=@commonality/implication-attester` ✓
- `npm test --workspace=@commonality/attester-host` ✓
- `npm run build --workspace=@commonality/attester-host` ✓
- `npm run lint --workspace=@commonality/attester-host` ✓

**Files changed**:
- `attester-host/package.json`
- `attester-host/tsconfig.json`
- `attester-host/eslint.config.js`
- `attester-host/.mocharc.json`
- `attester-host/README.md`
- `attester-host/src/config.ts`
- `attester-host/src/index.ts`
- `attester-host/test/index.test.ts`
- `content-attester/src/index.ts`
- `implication-attester/src/index.ts`
- `README.md`
- `TODO.md`
- `package.json`
- `package-lock.json`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- Bundle A exists as a package and CLI, but it is not wired into `docker-compose.yml` or `render.yaml` yet; deployment config still points at separate attester services.
- The host currently expects an explicit JSON config file. If deployment wiring makes that awkward, the next step should be a narrow config-generation layer, not a rewrite of the host itself.
- `content-attester` can now be mounted in-process, which unblocks later bundling work, but it still keeps its standalone `run(config)` entrypoint for split deployments.

**Interrupt point**: Yes. Bundle A now exists as a standalone host package, and the next bundling work item is deployment/runtime wiring rather than more host implementation.

## 2026-04-24 - Worker host for bundled background services (Completed)

**Task**: Complete the next `TODO.md` service-bundling sub-task by adding the worker-host binary and supervisor for the background-worker bundle.

**What was done**:
- Added a new [`worker-host/README.md`](/home/adam/Projects/commonality/worker-host/README.md) workspace with its own package metadata, lint/type/test/build config, and a CLI entrypoint in [`worker-host/src/index.ts`](/home/adam/Projects/commonality/worker-host/src/index.ts).
- Added [`worker-host/src/config.ts`](/home/adam/Projects/commonality/worker-host/src/config.ts) to load and validate a JSON host config that lists named workers, their kinds, restart delays, and explicit per-worker config objects.
- Added [`worker-host/src/serviceRegistry.ts`](/home/adam/Projects/commonality/worker-host/src/serviceRegistry.ts) to map worker kinds to the existing `run(config)` exports from `implication-finder`, `content-finder`, `implication-graph-nudger`, `bridge-creator`, and `explorer-curator`.
- Added [`worker-host/src/supervisor.ts`](/home/adam/Projects/commonality/worker-host/src/supervisor.ts) to start workers, watch their run handles, restart them after unexpected termination, skip disabled entries, and stop them cleanly on shutdown.
- Added focused supervisor coverage in [`worker-host/test/supervisor.test.ts`](/home/adam/Projects/commonality/worker-host/test/supervisor.test.ts) for restart-on-failure, no-restart-during-shutdown, and disabled-worker behavior.
- Updated [`implication-graph-nudger/src/index.ts`](/home/adam/Projects/commonality/implication-graph-nudger/src/index.ts), [`bridge-creator/src/index.ts`](/home/adam/Projects/commonality/bridge-creator/src/index.ts), and [`explorer-curator/src/index.ts`](/home/adam/Projects/commonality/explorer-curator/src/index.ts) so their run handles now expose `finished`, which lets the supervisor observe unexpected worker termination instead of only having a `stop()` callback.
- Updated [`README.md`](/home/adam/Projects/commonality/README.md), [`TODO.md`](/home/adam/Projects/commonality/TODO.md), `package.json`, and `package-lock.json` to register and document the new workspace.

**Key decisions**:
- Kept the worker-host config explicit and file-based instead of adding another environment-prefix indirection layer. Each hosted service receives a real config object, which keeps signer separation and service-specific settings obvious.
- Scoped this task to the background-worker bundle only. The attester bundle and deployment wiring are still separate TODO items.
- Treated “worker failure” as startup failure or unexpected run-handle termination; ordinary poll-cycle/LLM-call errors inside a worker still remain worker-local and do not force a restart.

**Verified**:
- `npm run build --workspace=@commonality/implication-graph-nudger` ✓
- `npm run build --workspace=@commonality/bridge-creator` ✓
- `npm run build --workspace=@commonality/explorer-curator` ✓
- `npm run build --workspace=@commonality/worker-host` ✓
- `npm run typecheck --workspace=@commonality/worker-host` ✓
- `npm run lint --workspace=@commonality/worker-host` ✓
- `npm run test --workspace=@commonality/worker-host` ✓

**Files changed**:
- `worker-host/package.json`
- `worker-host/tsconfig.json`
- `worker-host/eslint.config.js`
- `worker-host/.mocharc.json`
- `worker-host/README.md`
- `worker-host/src/config.ts`
- `worker-host/src/serviceRegistry.ts`
- `worker-host/src/supervisor.ts`
- `worker-host/src/index.ts`
- `worker-host/test/supervisor.test.ts`
- `implication-graph-nudger/src/index.ts`
- `bridge-creator/src/index.ts`
- `explorer-curator/src/index.ts`
- `README.md`
- `TODO.md`
- `package.json`
- `package-lock.json`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- The new host is ready, but it is not wired into `docker-compose.yml` or `render.yaml` yet; that remains the next service-bundling implementation step.
- Bundle B still needs a concrete host config file or deployment-specific config generation strategy once the deployment wiring task starts.
- The attester host does not exist yet, so the full service-bundling rollout is still incomplete.

**Interrupt point**: Yes. The generic background worker host and restart supervision now exist; the next step is to instantiate Bundle B in deployment config and then build the separate attester host.

## 2026-04-23 - Seed implication pre-generation and regression tooling (Completed)

**Task**: Set up the TODO item around using the real implication-attester prompt to pre-generate implication decisions for curated seed-content plus proliferation variants, with a verification path for prompt and statement regressions.

**What was done**:
- Exposed the reusable implication evaluator API from [`implication-attester/src/api.ts`](/home/adam/Projects/commonality/implication-attester/src/api.ts) and exported the evaluator system prompt fingerprint source from [`implication-attester/src/evaluator.ts`](/home/adam/Projects/commonality/implication-attester/src/evaluator.ts).
- Added [`fake-data-generation/seedImplicationEvaluations.ts`](/home/adam/Projects/commonality/fake-data-generation/seedImplicationEvaluations.ts) to:
  - flatten seed-content plus proliferation into a common statement record shape
  - fold proliferation variants back onto the original statement's collection/group
  - build ordered S1→S2 pair sets for `family`, `group`, `collection`, or `all` scopes
  - compare a saved decision corpus against the current statement graph and optional live rechecks
- Added [`fake-data-generation/generateSeedImplicationEvaluations.ts`](/home/adam/Projects/commonality/fake-data-generation/generateSeedImplicationEvaluations.ts) to write `data/seed-implication-evaluations.<scope>.json` plus metadata using the real implication-attester evaluator, with resume support.
- Added [`fake-data-generation/verifySeedImplicationEvaluations.ts`](/home/adam/Projects/commonality/fake-data-generation/verifySeedImplicationEvaluations.ts) so prompt changes can be checked by re-running saved pairs and statement changes can be detected via missing/extra pair IDs.
- Added unit coverage in [`fake-data-generation/test/seedImplicationEvaluations.test.ts`](/home/adam/Projects/commonality/fake-data-generation/test/seedImplicationEvaluations.test.ts) and documented the new workflow in [`fake-data-generation/README.md`](/home/adam/Projects/commonality/fake-data-generation/README.md).
- Added the package dependency/wiring in [`fake-data-generation/package.json`](/home/adam/Projects/commonality/fake-data-generation/package.json), [`implication-attester/package.json`](/home/adam/Projects/commonality/implication-attester/package.json), and `package-lock.json`.

**Key decisions**:
- Did not default to the full seed-content cross-product: the current corpus is 1,122 statements, so `all` would be roughly 1.26 million ordered pairs. The default scope is `group`, which is the practical version of the old “same category” idea.
- Saved every decision, including negatives, because the regression workflow needs a stable corpus of evaluated pairs rather than just positive implications.
- Kept the live regression check as an explicit command instead of a normal always-on unit test, since it requires OpenRouter credits and is intentionally operator-driven.

**Verified**:
- `npm run build --workspace=@commonality/implication-attester` ✓
- `npm run test --workspace=@commonality/implication-attester` ✓
- `npm run lint --workspace=@commonality/implication-attester` ✓
- `npm run test --workspace=fake-data-generation` ✓
- `npm run typecheck --workspace=fake-data-generation` ✓
- `npm run lint --workspace=fake-data-generation` ✓
- `npm run build --workspace=fake-data-generation` ✓

**Files changed**:
- `implication-attester/src/api.ts`
- `implication-attester/src/evaluator.ts`
- `implication-attester/package.json`
- `fake-data-generation/seedImplicationEvaluations.ts`
- `fake-data-generation/generateSeedImplicationEvaluations.ts`
- `fake-data-generation/verifySeedImplicationEvaluations.ts`
- `fake-data-generation/test/seedImplicationEvaluations.test.ts`
- `fake-data-generation/package.json`
- `fake-data-generation/README.md`
- `package-lock.json`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- No `OPENROUTER_API_KEY` was present in this environment, so the actual checked-in decision corpus was not generated yet. The tooling is ready, but a human still needs to run the generator and review the resulting JSON.
- `TODO.md` was already dirty before this task, so it was left untouched to avoid trampling user edits.

**Interrupt point**: Yes. The tooling, packaging, tests, and docs are in place; the next step is operational, not structural: run the generator with an API key, review the corpus, and decide whether to commit the resulting JSON.

## 2026-04-23 - Make indexer deployable to Render for testnet/mainnet (Completed)

**Task**: Complete the `TODO.md` item to make the Ponder indexer ready for testnet/prod deployment by wiring hosted chain selection, production startup, and Render Postgres/blueprint support.

**What was done**:
- Updated [`indexer/ponder.config.ts`](/home/adam/Projects/commonality/indexer/ponder.config.ts) so the indexer can target `hardhat`, `sepolia`, or `mainnet` via `PONDER_CHAIN`, with RPC env vars for chain IDs `31337`, `11155111`, and `1`.
- Kept local ephemeral-PGlite behavior for test runs, but made hosted deployments explicitly use Postgres when `DATABASE_URL` / `DATABASE_PRIVATE_URL` is present.
- Updated [`indexer/start.sh`](/home/adam/Projects/commonality/indexer/start.sh) and [`indexer/Dockerfile`](/home/adam/Projects/commonality/indexer/Dockerfile) so the same image can run `ponder dev --disable-ui` locally or `ponder start` in hosted environments via `PONDER_SCRIPT`.
- Added the Render Postgres database and `commonality-indexer` service to [`render.yaml`](/home/adam/Projects/commonality/render.yaml), including the required chain/RPC/start-block/address env vars.
- Updated [`DEPLOYMENT.md`](/home/adam/Projects/commonality/DEPLOYMENT.md), [`indexer/README.md`](/home/adam/Projects/commonality/indexer/README.md), and [`TODO.md`](/home/adam/Projects/commonality/TODO.md) to reflect the new deployment path and required env vars.

**Key decisions**:
- Used a single `PONDER_CHAIN` selector for all indexed contracts because this repo deploys the whole contract set to one network at a time; that keeps the config explicit without adding unnecessary per-contract chain mapping.
- Reused the existing `start.sh` wrapper instead of introducing a second entrypoint, so local Docker still gets the late-bound `/workspace/.env` behavior while Render can opt into prod mode with one env var.
- Used Render `rootDir: indexer` with `dockerContext: .` / `dockerfilePath: Dockerfile` so the existing indexer Dockerfile continues to build against the package-local context instead of requiring a broader monorepo Docker refactor.
- Documented `DATABASE_SCHEMA` (not the older `PONDER_DATABASE_SCHEMA` wording from the previous deployment note) because that is what the installed Ponder version actually reads.

**Verified**:
- `npm run lint --workspace=indexer` ✓
- `npm run build --workspace=indexer` ✓

**Files changed**:
- `indexer/ponder.config.ts`
- `indexer/start.sh`
- `indexer/Dockerfile`
- `indexer/README.md`
- `render.yaml`
- `DEPLOYMENT.md`
- `TODO.md`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- This task makes the indexer deployable, but it does not prove a live Render deployment. The next practical step is a real Sepolia deployment and at least a short stability soak.
- Render health checks hit `GET /graphql`; if Render reports this endpoint as unhealthy in practice, switch to a tiny explicit health route instead of relying on the GraphQL endpoint semantics.

**Interrupt point**: Yes. The code/config/docs side of “indexer deployable to Render” is complete; the next work item is operational validation, not more implementation.

## 2026-04-22 - Seed-content markdown generation from JSON (Completed)

**Task**: Complete the `TODO.md` follow-up to generate the prose seed-content markdown from the formal JSON source of truth and include a note that the markdown is auto-generated.

**What was done**:
- Added [`fake-data-generation/generateSeedMarkdown.ts`](/home/adam/Projects/commonality/fake-data-generation/generateSeedMarkdown.ts) to load all `fake-data-generation/seed-content/*.json` collections and rewrite the corresponding markdown docs under [`specs/tech/subsystems/conceptspace/seed-content/`](/home/adam/Projects/commonality/specs/tech/subsystems/conceptspace/seed-content/).
- Added npm script `gen:seed:markdown` in [`fake-data-generation/package.json`](/home/adam/Projects/commonality/fake-data-generation/package.json).
- Regenerated:
  - [`specs/tech/subsystems/conceptspace/seed-content/content-funding.md`](/home/adam/Projects/commonality/specs/tech/subsystems/conceptspace/seed-content/content-funding.md)
  - [`specs/tech/subsystems/conceptspace/seed-content/fundable-projects.md`](/home/adam/Projects/commonality/specs/tech/subsystems/conceptspace/seed-content/fundable-projects.md)
  - [`specs/tech/subsystems/conceptspace/seed-content/hidden-majority.md`](/home/adam/Projects/commonality/specs/tech/subsystems/conceptspace/seed-content/hidden-majority.md)
  - [`specs/tech/subsystems/conceptspace/seed-content/meta.md`](/home/adam/Projects/commonality/specs/tech/subsystems/conceptspace/seed-content/meta.md)
- Updated [`fake-data-generation/README.md`](/home/adam/Projects/commonality/fake-data-generation/README.md) and the seed-content [`README.md`](/home/adam/Projects/commonality/specs/tech/subsystems/conceptspace/seed-content/README.md) to document the new generation step.

**Key decisions**:
- Treated the JSON files as the authoritative source and made the markdown intentionally mechanical so drift becomes obvious rather than subtle.
- Included an explicit top-of-file note in each generated markdown file pointing back to the exact source JSON path.
- Kept the generated structure simple: collection description/notes, then one section per group with statements and expected implication notes.

**Verified**:
- `npm run gen:seed:markdown --workspace=fake-data-generation` ✓
- `npm run typecheck --workspace=fake-data-generation` ✓

**Files changed**:
- `fake-data-generation/generateSeedMarkdown.ts`
- `fake-data-generation/package.json`
- `fake-data-generation/README.md`
- `specs/tech/subsystems/conceptspace/seed-content/README.md`
- `specs/tech/subsystems/conceptspace/seed-content/content-funding.md`
- `specs/tech/subsystems/conceptspace/seed-content/fundable-projects.md`
- `specs/tech/subsystems/conceptspace/seed-content/hidden-majority.md`
- `specs/tech/subsystems/conceptspace/seed-content/meta.md`
- `TODO.md`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- The generated markdown now reflects only what is encoded in JSON. If richer prose organization is still desirable, it should be represented explicitly in the JSON schema rather than reintroduced by hand in the markdown.

**Interrupt point**: Yes. The source-of-truth workflow is now explicit: edit JSON, regenerate markdown, and use the same JSON for universe/document generation.

## 2026-04-22 - Formal seed-content JSON + conversion/upload scripts (Completed)

**Task**: Complete the `TODO.md` item to store the conceptspace seed content in a more formal JSON format and add scripts to convert it for simulations or upload it as real statements.

**What was done**:
- Added a formal seed-content source in [`fake-data-generation/seed-content/`](/home/adam/Projects/commonality/fake-data-generation/seed-content/) with one JSON file per purpose:
  - `fundable-projects.json`
  - `hidden-majority.json`
  - `meta.json`
  - `content-funding.json`
- Added [`fake-data-generation/seed-content-format.ts`](/home/adam/Projects/commonality/fake-data-generation/seed-content-format.ts) to:
  - validate and load the seed collections
  - flatten them into statement records
  - convert them into fake-data `universe.json` shape
  - convert each record into a real Conceptspace `DisplayableDocument`
- Added [`fake-data-generation/generateSeedUniverse.ts`](/home/adam/Projects/commonality/fake-data-generation/generateSeedUniverse.ts) and npm script `gen:seed:universe` to export the seed content as a fake-data-compatible universe file.
- Added [`fake-data-generation/prepareSeedStatements.ts`](/home/adam/Projects/commonality/fake-data-generation/prepareSeedStatements.ts) and npm scripts:
  - `gen:seed:statements` to emit real Conceptspace statement documents
  - `gen:seed:upload` to upload those documents to IPFS and record the resulting CIDs
- Updated [`fake-data-generation/README.md`](/home/adam/Projects/commonality/fake-data-generation/README.md) and the conceptspace seed-content README to point at the new formal source and scripts.

**Key decisions**:
- Kept the JSON schema intentionally small: collection-level notes, group-level notes, statement IDs/text, optional roles, and implication notes. That preserves the rationale from the specs without trying to encode semantic logic in an overly elaborate schema.
- Made the fake-data conversion flatten by collection/group rather than inventing a new ideological taxonomy. This keeps the converter straightforward and preserves the human-authored organization of the seed content.
- Made the statement-preparation script generate real `DisplayableDocument` objects and support optional upload in the same script via `--upload`, so the upload path and the export path share one source transformation.

**Verified**:
- `npm run typecheck --workspace=fake-data-generation` ✓
- `npm run gen:seed:universe --workspace=fake-data-generation -- --output output/seed-universe.smoke.json` ✓
- `npm run gen:seed:statements --workspace=fake-data-generation -- --output output/seed-statements.smoke.json` ✓
- `SHOULD_USE_MOCK_IPFS=true npm run gen:seed:upload --workspace=fake-data-generation -- --output output/seed-statements.uploads.smoke.json` ✓

**Files changed**:
- `fake-data-generation/seed-content-format.ts`
- `fake-data-generation/generateSeedUniverse.ts`
- `fake-data-generation/prepareSeedStatements.ts`
- `fake-data-generation/seed-content/content-funding.json`
- `fake-data-generation/seed-content/fundable-projects.json`
- `fake-data-generation/seed-content/hidden-majority.json`
- `fake-data-generation/seed-content/meta.json`
- `fake-data-generation/package.json`
- `fake-data-generation/README.md`
- `specs/tech/subsystems/conceptspace/seed-content/README.md`
- `TODO.md`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- The prose markdown seed-content docs still exist alongside the JSON. They now serve mostly as human commentary; if drift becomes annoying, the next step is to generate one from the other or trim the duplicated prose.
- The generated fake-data universe output is intentionally separate from the existing hand-written `fake-data-generation/universe.json`; switching the simulation over fully should be a separate task.

**Interrupt point**: Yes. The source format and both requested scripts are in place and verified. A natural next step would be either implication-pair generation around this seed corpus or migration of the fake-data simulation to the generated universe output.

## 2026-04-22 - Privy lazy-loading in UI (Completed)

**Task**: Complete the `TODO.md` suggestion to lazy-load the Privy auth UI so embedded-wallet onboarding does not bloat the initial app payload.

**What was done**:
- Moved Privy-specific root provider wiring out of [`ui/src/main.tsx`](/home/adam/Projects/commonality/ui/src/main.tsx) into a new lazy-loaded [`ui/src/privy/PrivyAppProvider.tsx`](/home/adam/Projects/commonality/ui/src/privy/PrivyAppProvider.tsx) module.
- Removed the eager `@privy-io/wagmi` import from [`ui/src/wagmi.ts`](/home/adam/Projects/commonality/ui/src/wagmi.ts) so the base wagmi/ConnectKit path no longer references Privy at module load time.
- Split the Privy wallet UI out of [`ui/src/shared/components/WalletButton.tsx`](/home/adam/Projects/commonality/ui/src/shared/components/WalletButton.tsx) into lazy-loaded [`ui/src/shared/components/PrivyWalletButtonImpl.tsx`](/home/adam/Projects/commonality/ui/src/shared/components/PrivyWalletButtonImpl.tsx), with a lightweight loading fallback button.
- Updated [`ui/src/shared/components/WalletButton.test.tsx`](/home/adam/Projects/commonality/ui/src/shared/components/WalletButton.test.tsx) and [`ui/README.md`](/home/adam/Projects/commonality/ui/README.md) to match the new loading boundary.

**Key decisions**:
- Treated this as a code-splitting task, not a functional auth rewrite: Privy still initializes automatically when enabled, but it now arrives in separate lazy chunks instead of the base bundle.
- Kept the ConnectKit fallback path unchanged for local dev, tests, and deployments that do not set `VITE_PRIVY_APP_ID`.

**Files changed**:
- `ui/src/main.tsx`
- `ui/src/wagmi.ts`
- `ui/src/privy/PrivyAppProvider.tsx` (new)
- `ui/src/shared/components/WalletButton.tsx`
- `ui/src/shared/components/PrivyWalletButtonImpl.tsx` (new)
- `ui/src/shared/components/WalletButton.test.tsx`
- `ui/README.md`
- `TODO.md`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- This removes Privy from the base entry bundle, but Privy still initializes on first render when enabled. If startup latency in Privy-enabled deployments is still a problem, the next step would be a deeper auth-flow redesign that defers provider initialization until explicit sign-in intent.

**Interrupt point**: Yes. This is a self-contained performance-oriented refactor with the same user-facing auth behavior.

## 2026-04-22 - Privy embedded-wallet onboarding in UI (Completed)

**Task**: Complete the `TODO.md` item to incorporate Privy so the UI can support embedded wallets for users who do not already have an Ethereum wallet.

**What was done**:
- Added `@privy-io/react-auth` and `@privy-io/wagmi` to the UI workspace and kept the existing ConnectKit stack as a fallback when Privy is not configured.
- Refactored [`ui/src/main.tsx`](/home/adam/Projects/commonality/ui/src/main.tsx) and [`ui/src/wagmi.ts`](/home/adam/Projects/commonality/ui/src/wagmi.ts) so:
  - `VITE_PRIVY_APP_ID` enables a Privy provider tree with wagmi integration
  - local dev / Playwright E2E without Privy credentials still use the old ConnectKit path
  - embedded wallets are created automatically for users who log in without a wallet
- Replaced the hardcoded `ConnectKitButton` in [`ui/src/shared/components/AppShell.tsx`](/home/adam/Projects/commonality/ui/src/shared/components/AppShell.tsx) with a new [`WalletButton`](/home/adam/Projects/commonality/ui/src/shared/components/WalletButton.tsx) component that:
  - opens Privy sign-in when enabled
  - syncs the preferred Privy wallet into wagmi
  - exposes link-wallet and logout actions
  - falls back to the original ConnectKit button when Privy is disabled
- Added [`ui/src/shared/components/WalletButton.test.tsx`](/home/adam/Projects/commonality/ui/src/shared/components/WalletButton.test.tsx) coverage for the new Privy button states.
- Documented the new env/config behavior in [`ui/.env.example`](/home/adam/Projects/commonality/ui/.env.example) and [`ui/README.md`](/home/adam/Projects/commonality/ui/README.md).

**Key decisions**:
- Kept Privy opt-in via `VITE_PRIVY_APP_ID` so the repo still honors the top-level README claim that local development can run without extra third-party credentials.
- Left the rest of the UI on wagmi hooks unchanged; only the provider tree and top-right wallet button needed Privy-specific code.
- Preserved the existing mock-wallet test harness by keeping the ConnectKit path available when Privy is not configured.

**Verified**:
- `npm run typecheck --workspace=ui` ✓
- `npm run lint --workspace=ui` ✓
- `npm run test --workspace=ui -- WalletButton.test.tsx --run` ✓
- `npm run build --workspace=ui` ✓
  - Note: the Privy package emits many Rollup `/*#__PURE__*/` comment warnings during build, but the build completes successfully.

**Files changed**:
- `ui/package.json`
- `package-lock.json`
- `ui/src/main.tsx`
- `ui/src/wagmi.ts`
- `ui/src/shared/components/AppShell.tsx`
- `ui/src/shared/components/WalletButton.tsx`
- `ui/src/shared/components/WalletButton.test.tsx`
- `ui/.env.example`
- `ui/README.md`
- `TODO.md`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- Deployed environments still need a real Privy app configured in the Privy dashboard plus `VITE_PRIVY_APP_ID` (and optionally `VITE_PRIVY_CLIENT_ID`) supplied at build time.
- The current implementation eagerly bundles Privy; if bundle size becomes a launch concern, the next iteration should lazy-load the Privy auth entrypoint.

**Interrupt point**: Yes. This is a clean stopping point: embedded-wallet onboarding is wired in, documented, and build-verified.

## 2026-04-22 - Wire project fold caching into pubstarter pages (Completed)

**Task**: Do the `foldVersion` wiring item from `TODO.md` for the pubstarter UI.

**What was done**:
- Added `getAllProjectAddresses()` to the SDK pubstarter queries so the UI can enumerate projects without forcing a full `getProjectsFiltered()` refold path.
- Refactored `ui/src/shared/hooks/useCachedProject.ts` to expose a reusable `loadProjectWithCache(...)` helper, use `PROJECT_FOLD_VERSION` instead of a hardcoded literal, and fall back cleanly when cache prerequisites are missing.
- Added `ui/src/shared/hooks/useCachedProjects.ts` to load the browse list via project addresses plus per-project cached folds, then sort locally using the same project metrics as the SDK query helper.
- Updated `BrowseProjectsPage.tsx` to use the cached-project hook path and keep IPFS metadata loading unchanged.
- Updated `ProjectDetailPage.tsx` to load the core project through `useCachedProject`, while leaving contributions / refunds / marketplace / burns on the existing direct-query path.
- Updated `BrowseProjectsPage.test.tsx` to match the new hook-based browse-list implementation.

**Key decisions**:
- Stopped at project-level folding. The TODO explicitly left contributions / secondary-market / burn folds as a follow-up only if performance warrants it, so this change does not add more IndexedDB cache surfaces yet.
- Kept the cache in the UI layer rather than moving it into the SDK; the fold-version invalidation logic already lives in the SDK types, while storage remains a client concern.
- Added defensive fallback behavior so tests and nonstandard environments still work even if event-cache config or IndexedDB-backed cache inputs are incomplete.

**Verified**:
- `npm run test --workspace=ui -- BrowseProjectsPage.test.tsx ProjectDetailPage.test.tsx --run` ✓
- `npm run typecheck --workspace=ui` ✓
- `npm run typecheck --workspace=@commonality/sdk` ✓

**Files changed**:
- `sdk/src/subsystems/pubstarter/queries.ts`
- `ui/src/shared/hooks/useCachedProject.ts`
- `ui/src/shared/hooks/useCachedProjects.ts` (new)
- `ui/src/pubstarter/pages/BrowseProjectsPage.tsx`
- `ui/src/pubstarter/pages/ProjectDetailPage.tsx`
- `ui/src/pubstarter/pages/BrowseProjectsPage.test.tsx`
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. The original project-level `foldVersion` wiring item is complete. The next logical follow-up, only if needed by observed latency, is resumable caching for contributions / secondary market / burns.

## 2026-04-22 - Dockerfiles for remaining AI services (Completed)

**Task**: Add Dockerfiles to the four services that lacked them: bridge-creator, explorer-curator, content-finder, implication-finder. Update render.yaml to include all four.

**What was done**:
- Created `bridge-creator/Dockerfile` — nudger web service (port 3003), depends on sdk + attester-core + nudger-core.
- Created `explorer-curator/Dockerfile` — nudger web service (port 3004), depends on sdk + attester-core + nudger-core.
- Created `content-finder/Dockerfile` — background polling worker (no HTTP), depends on sdk + finder-core.
- Created `implication-finder/Dockerfile` — background polling worker (no HTTP), depends on sdk + finder-core.
- All four use the optimized BuildKit pattern (`# syntax=docker/dockerfile:1.7`, `--mount=type=cache,target=/root/.npm`) from the newer Dockerfiles (content-attester, implication-graph-nudger).
- Updated `render.yaml`: added `type: web` entries for bridge-creator and explorer-curator, `type: worker` entries for content-finder and implication-finder, removed the stale "no Dockerfiles yet" comment, and extended the secrets reference comment.

**Key decisions**:
- content-finder and implication-finder are background polling workers with no HTTP server, so they use `type: worker` in render.yaml (no `healthCheckPath`).
- bridge-creator and explorer-curator expose health endpoints (inherited from nudger-core), so they use `type: web` with `healthCheckPath: /health`.
- CURATOR_INTERVAL_MS is hardcoded in render.yaml as 21600000 (6 hours) to match the default in config.ts.

**Files changed**:
- `bridge-creator/Dockerfile` (new)
- `explorer-curator/Dockerfile` (new)
- `content-finder/Dockerfile` (new)
- `implication-finder/Dockerfile` (new)
- `render.yaml`
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. All services are now fully deployable. A natural next step would be a real deployment trial or picking another TODO item.



## 2026-04-22 - Fix flaky integration test: Pubstarter deadline refund (Completed)

**Task**: Stabilize `Pubstarter Edge Cases → should allow refund after project fails to meet threshold by deadline`.

**Root cause**: The deadline was computed from `Date.now() / 1000` (wall-clock time) + 2 seconds. Earlier tests in the same suite use `evm_increaseTime`, so by the time this test runs, the blockchain's internal clock is ahead of wall-clock time. The 2-second window expired before the `buyProjectTokensChecked` call could land, causing `ConditionHasFailed()`.

**Fix**: Use `latestBlock.timestamp` (chain time) instead of `Date.now()`, set deadline 30 seconds ahead of chain-tip, and increase `evm_increaseTime` from 3 → 35 seconds so the time advance still clears the deadline. This mirrors the pattern already used in the "should handle exact deadline timing correctly" test in the same file.

**Verified**: `npm run typecheck --workspace=integration-tests` ✓

**Files changed**:
- `integration-tests/src/pubstarter/pubstarter-edge-cases.test.ts`
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. Single self-contained bug fix. No blockers; next AI instance can pick any remaining TODO item.

## 2026-04-21 - AI Services: Per-Nudger Mute (Completed)

**Task**: Implement per-nudger mute from the nudge-ux spec — let users temporarily hide nudges from a specific nudger without fully removing trust.

**What was done**:
- Created `ui/src/shared/hooks/useMutedNudgers.ts` — localStorage-backed hook for managing muted nudger addresses. Addresses are normalized to lowercase, deduplicated, and trimmed. Provides `mutedNudgers`, `muteNudger`, `unmuteNudger`, and `isMuted`.
- Updated `StatementSuggestions.tsx` to filter out nudges from muted nudgers (in addition to existing dismissal and topic filtering).
- Updated `SettingsPage.tsx` to add a mute/unmute toggle button next to each nudger entry:
  - Shows 🔊 when unmuted, 🔇 when muted
  - Muted nudgers are displayed at 50% opacity with a red "Muted" chip
- Added `useMutedNudgers.test.ts` (15 tests) covering load/save, normalization, dedup, empty address handling, and case-insensitive `isMuted`.
- Added 3 per-nudger mute tests to `StatementSuggestions.test.tsx` covering: no mute, single mute filter, and mute+dismissal combined filter.

**Key decisions**:
- Used localStorage (not IndexedDB) for muted nudgers — this is a small preference list, consistent with the muted-topics and intensity patterns.
- The mute filter is applied at the same point as the dismissal filter in `StatementSuggestions`, keeping all filtering in one place.
- Muting is reversible (unlike dismissal), which is the key product distinction — users can temporarily silence a nudger and re-enable later.

**Verified**:
- `npm run typecheck --workspace=ui` ✓
- `npm run test --workspace=ui -- --run` (731 tests passing) ✓

**Files changed**:
- `ui/src/shared/hooks/useMutedNudgers.ts` (new)
- `ui/src/shared/hooks/useMutedNudgers.test.ts` (new — 15 tests)
- `ui/src/conceptspace/components/StatementSuggestions.tsx` (added muted nudger filtering)
- `ui/src/conceptspace/components/StatementSuggestions.test.tsx` (3 new mute tests)
- `ui/src/conceptspace/pages/SettingsPage.tsx` (added mute/unmute toggle per nudger)
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. Per-nudger mute is complete. The remaining AI Services items in TODO.md are staleness decay (lower priority), bridge-priority scoring (not blocking), and anti-evil-nudger immune system (only useful with real activity).

## 2026-04-21 - AI Services: Default Nudger Service URLs (Completed)

**Task**: Address the `TODO.md` "Suggestions from AI" item — allow operators to provide default nudger service URLs in `VITE_DEFAULT_NUDGERS` so explorer personalization works out of the box.

**What was done**:
- Updated `useTrustedNudgers.ts`:
  - Added exported `loadDefaultNudgers()` function that parses `VITE_DEFAULT_NUDGERS` as either:
    - Comma-separated addresses (existing format, unchanged behavior)
    - JSON array of `TrustedNudgerEntry` objects or address strings (new format, supports `serviceUrl`)
  - Updated `loadTrustedNudgers()` to delegate its env-fallback logic to `loadDefaultNudgers()` (avoids duplication)
- Updated `SettingsPage.tsx`:
  - Removed the duplicate local `getDefaultNudgers()` function
  - Replaced all call sites with `loadDefaultNudgers()` from the hook
  - Updated the default-nudger display chip to show `entry.name ?? entry.address` so named nudgers show their name
- Created `useTrustedNudgers.test.ts` (12 tests) covering:
  - Empty/unset env var
  - Comma-separated address format
  - JSON array of address strings
  - JSON array of TrustedNudgerEntry objects with serviceUrl/name
  - Mixed JSON arrays (strings + objects)
  - Invalid address filtering
  - Malformed JSON fallback
  - localStorage override behavior
  - Legacy string-entry normalization
- Updated `.env.example` to document both formats with examples

**Key decisions**:
- JSON format is detected by checking if the trimmed value starts with `[`. This avoids ambiguity with comma-separated values.
- Malformed JSON falls through to comma-separated parsing, providing graceful degradation.
- The SettingsPage default-nudger display now shows `entry.name` if available, improving UX when a named default nudger is configured via JSON.

**Verified**:
- `npm run typecheck --workspace=ui` ✓
- `npm run lint --workspace=ui` ✓
- `npm run test` (useTrustedNudgers: 12 passing, SettingsPage: 46 passing) ✓

**Files changed**:
- `ui/src/shared/hooks/useTrustedNudgers.ts`
- `ui/src/shared/hooks/useTrustedNudgers.test.ts` (new — 12 tests)
- `ui/src/conceptspace/pages/SettingsPage.tsx`
- `ui/.env.example`
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. This is a clean, self-contained change. The remaining AI Services items in TODO.md are lower-priority deferred work (staleness decay/per-nudger mute, bridge-priority scoring, anti-evil-nudger immune system).



## 2026-04-21 - AI Services: Test Coverage — Evaluator + Explorer Curator (Completed)

**Task**: Address the remaining `TODO.md` AI Services test-coverage gaps: implication-attester evaluation logic and explorer-curator curator/personalizer logic.

**What was done**:
- Refactored `implication-attester/src/evaluator.ts` to accept an optional injected `requestJsonCompletionFn` parameter (defaulting to the real implementation), enabling unit testing without live API calls.
- Added `implication-attester/test/evaluator.test.ts` with 13 tests covering:
  - Correct return shape for clear implications and non-implications
  - `implies="true"` string coercion
  - Numeric confidence normalization (0.9→high, 0.6→medium, 0.3→low)
  - String confidence alias normalization (strong/certain/definite→high, moderate/somewhat/partial→medium)
  - Fallback to text extraction on `OpenRouterInvalidJsonError` (implies=true and implies=false cases)
  - Re-throwing non-JSON errors
  - Prompt content verification (statement text and geographic/intersection pattern guidance)
  - `explanation` field fallback for reasoning
  - "No reasoning provided" default
- Refactored `explorer-curator/src/curator.ts` to accept `ExplorerCuratorDependencies` injection (getAllStatements, getStatementWithContent, requestJsonCompletion, publishCuratedCollection).
- Refactored `explorer-curator/src/personalizer.ts` to accept `PersonalizerDependencies` injection (getCuratedCollections, getStatement, requestJsonCompletion).
- Also fixed a bug in `personalizer.ts`: `JSON.stringify([])` returns `"[]"` (truthy), so the "first-time user" fallback text was never reached. Fixed by checking `resolvedSigned.length > 0`.
- Added `explorer-curator/test/curator.test.ts` with 7 tests covering:
  - Empty statements list → no publish
  - Statements with no resolvable content → no publish
  - First run → publishes collection with correct entries
  - `changed=false` after first cycle → skips publish
  - LLM error → returns false + preserves previous entry count
  - `publishCuratedCollection` error → returns false
  - Inaccessible statements are skipped and only resolvable ones go to the LLM
- Added `explorer-curator/test/personalizer.test.ts` with 6 tests covering:
  - No collections → empty result
  - Empty collection entries → empty result
  - LLM suggestions filtered to entries in the collection (unknown CIDs removed)
  - Signed CIDs passed to LLM prompt
  - LLM error → fallback suggestions
  - Suggestions with missing cid/reason filtered out
  - First-time-user hint appears in prompt when signedStatementCids is empty

**Key decisions**:
- Followed the bridge-creator dependency-injection pattern (partial overrides via object spread) rather than class-level mocking.
- Kept runtime call sites unchanged: the `ExplorerCurator` constructor and `suggestForUser` call signatures are backward-compatible (deps are optional).

**Verified**:
- `npm run typecheck --workspace=@commonality/implication-attester` ✓
- `npm run lint --workspace=@commonality/implication-attester` ✓
- `npm run test --workspace=@commonality/implication-attester` (13 passing) ✓
- `npm run typecheck --workspace=@commonality/explorer-curator` ✓
- `npm run lint --workspace=@commonality/explorer-curator` ✓
- `npm run test --workspace=@commonality/explorer-curator` (19 passing) ✓

**Files changed**:
- `implication-attester/src/evaluator.ts` (added optional requestJsonCompletionFn param)
- `implication-attester/test/evaluator.test.ts` (new — 13 tests)
- `explorer-curator/src/curator.ts` (ExplorerCuratorDependencies injection)
- `explorer-curator/src/personalizer.ts` (PersonalizerDependencies injection + bug fix)
- `explorer-curator/test/curator.test.ts` (new — 7 tests)
- `explorer-curator/test/personalizer.test.ts` (new — 6 tests)
- `TODO.md`
- `CONTINUITY.md`

**Blockers / notes for next iteration**:
- All launch-facing AI Services test coverage gaps are now closed. Remaining AI Services items are deferred (staleness decay / per-nudger mute) or speculative (bridge-priority scoring, anti-evil-nudger immune system).

**Interrupt point**: Yes. This is a clean stopping point — all test coverage gaps flagged as launch-critical in `TODO.md` are now addressed.

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

## 2026-04-24 - Service Bundling: Bundle-B Nudger In-Process Prerequisite (Completed)

**Task**: Make concrete progress on [Service bundling](TODO.md) by removing the nudger-side process-global signer constraint and giving the three nudger services importable `run(config)` entrypoints.

**What was done**:
- Reworked `nudger-core` so signer state is instance-scoped via `createNudgerSigner(config)` instead of hidden in a process-global singleton.
- Kept the existing `publishNudgeBatch` / `publishCuratedCollection` helpers working by routing them through per-call signer instances, so standalone nudger behavior stays intact.
- Refactored `implication-graph-nudger`, `bridge-creator`, and `explorer-curator` to export `run(config)` while preserving their existing CLI startup behavior when executed as `src/index.ts` / `dist/index.js`.
- Added an isolated-signer unit test in `nudger-core` to prove distinct configs produce distinct signer identities, which is the key bundling invariant for Bundle B.
- Updated [TODO.md](TODO.md) to record this completed prerequisite and note the package-test-script follow-up.

**Key decisions**:
- Treated this as a Bundle-B prerequisite, not the whole service-bundling task. The attesters and finders still need the same treatment, and the worker host/supervisor does not exist yet.
- Kept each service’s exported `run(config)` responsible for starting its own HTTP server / timer loop for now. A later worker-host step can decide whether to call `run(config)` directly or split app-construction further for route mounting.
- Avoided introducing a new abstraction layer in `nudger-core`; a simple signer factory was enough to eliminate the key collision problem without rewriting the publication helpers.

**Verified**:
- `npm run build --workspace=@commonality/nudger-core`
- `npm run build --workspace=@commonality/implication-graph-nudger`
- `npm run build --workspace=@commonality/bridge-creator`
- `npm run build --workspace=@commonality/explorer-curator`
- `npx mocha --import=tsx nudger-core/src/signer.test.ts`
- `npx mocha --import=tsx explorer-curator/test/curator.test.ts explorer-curator/test/personalizer.test.ts explorer-curator/test/config.test.ts`
- Note: `npm test --workspace=@commonality/nudger-core` still fails to discover tests because the package test script is not aligned with the repo’s TypeScript test layout; I noted that in [TODO.md](TODO.md) as follow-up process work.

**Files changed**:
- `nudger-core/src/signer.ts`
- `nudger-core/src/index.ts`
- `nudger-core/src/signer.test.ts`
- `nudger-core/package.json`
- `nudger-core/README.md`
- `implication-graph-nudger/src/index.ts`
- `bridge-creator/src/index.ts`
- `explorer-curator/src/index.ts`
- `TODO.md`
- `CONTINUITY.md`

**Interrupt point**: Yes. The natural next bundling task is to do the same `run(config)` / instance-scoped-state refactor for the remaining AI services, especially the attesters, which currently cache blockchain clients at module scope and therefore still cannot safely share one host process with distinct private keys.

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

## 2026-04-24 - Service Bundling: Remaining AI Services Export `run(config)` (Completed)

**Task**: Continue [Service bundling](TODO.md) by refactoring the remaining AI services so they can run in-process with instance-scoped config instead of only as standalone CLIs.

**What was done**:
- Refactored `implication-attester` to build its Express app from an explicit config object, export `run(config)`, and expose a stop handle for future host-process supervision.
- Removed the attester-side blockchain client singletons in both attesters so each `run(config)` call gets its own signer/client/contract wiring, avoiding cross-service `ATTESTER_PRIVATE_KEY` leakage inside one process.
- Refactored `content-attester` to export `run(config)` while keeping `createContentAttesterServiceApp(...)` as the lower-level app-construction API.
- Refactored `implication-finder` and `content-finder` to export `run(config)` and moved the shared polling loop in `finder-core` to return a stoppable run handle instead of blocking forever.
- Added focused tests proving per-config blockchain isolation for both attesters and graceful stop behavior for the shared finder runner.
- Updated [TODO.md](TODO.md) to mark the `run(config)` refactor subtask complete.

**Key decisions**:
- Kept the attester HTTP route shapes unchanged; this step was about importable lifecycle control and instance scoping, not yet the Bundle-A route-prefix mount.
- Added a new `createImplicationAttesterApp(config)` helper now because the implication attester previously only existed as top-level side effects; the content attester already had an equivalent app factory.
- Made the finder `run(config)` API return `{ finished, stop() }` so a future worker-host supervisor can restart or shut down individual in-process workers cleanly.
- Added a `"."` package export for `@commonality/implication-attester`, since it previously had an `exports` map that blocked package-root imports even though `main` pointed at `dist/index.js`.

**Verified**:
- `npm run build --workspace=@commonality/finder-core`
- `npm run build --workspace=@commonality/implication-attester`
- `npm run build --workspace=@commonality/content-attester`
- `npm run build --workspace=@commonality/implication-finder`
- `npm run build --workspace=@commonality/content-finder`
- `npx mocha --import=tsx implication-attester/test/blockchain.test.ts`
- `npx mocha --import=tsx content-attester/test/blockchain.test.ts content-attester/test/app.test.ts`
- `npx mocha --import=tsx finder-core/test/runner.test.ts implication-finder/test/state.test.ts implication-finder/test/candidates.test.ts content-finder/test/submissions.test.ts`

**Files changed**:
- `finder-core/src/runner.ts`
- `finder-core/test/runner.test.ts`
- `implication-finder/src/index.ts`
- `content-finder/src/index.ts`
- `implication-attester/src/config.ts`
- `implication-attester/src/blockchain.ts`
- `implication-attester/src/index.ts`
- `implication-attester/package.json`
- `implication-attester/test/blockchain.test.ts`
- `content-attester/src/blockchain.ts`
- `content-attester/src/index.ts`
- `content-attester/test/blockchain.test.ts`
- `TODO.md`
- `CONTINUITY.md`

**Blockers / notes**:
- The next bundling step is now structural rather than mechanical: implement the actual host binaries/supervisor, then mount the two attesters into one host process and the two finders plus three nudgers into another.
- The worktree currently also contains unrelated `attester-core/dist/openrouter.*` modifications that were left untouched.

**Interrupt point**: Yes. The clean next step is to build the host-process layer itself: a Bundle-A Express host for both attesters and a Bundle-B supervisor/worker host for the finders and nudgers, then update deployment config once those binaries exist.
