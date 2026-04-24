# TODO

## Main list

- We've just generated some implications for the proliferation of statements in the fake-data-generation stuff. Now a human should look at all the decisions and verify that they're sensible. Although actually no, there's almost 2000 of them. So instead just spot-check a few. Then set up a regression test so that (a) when we change the prompt, we can quickly check that the new prompt makes the same decisions, and (b) when we change the statements, we can quickly ask the human to verify only the new stuff.
- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.
- [Service bundling](specs/tech/service-bundling.md) — collapse the AI services into a couple of host processes. Sub-tasks:
    - [x] Bundling prerequisite: remove process-global nudger signer state and export `run(config)` from `implication-graph-nudger`, `bridge-creator`, and `explorer-curator`, so multiple nudgers can coexist in one host process without sharing a `NUDGER_PRIVATE_KEY`.
    - [x] Refactor each AI service to export a `run(config)` function so it can be hosted in-process, not only as a standalone binary.
    - [x] Build a worker-host binary with a supervisor that restarts individual workers on failure.
    - [x] Stand up Bundle A (attester host): mount `implication-attester` and `content-attester` as route prefixes on one Express app; each keeps its own `ATTESTER_PRIVATE_KEY`.
    - [x] Stand up Bundle B (background worker host): run both finders + all three nudgers in one host; each nudger keeps its own `NUDGER_PRIVATE_KEY`.
    - Keep `platform-api-service` unbundled (user-facing latency path).
    - [x] Update `docker-compose.yml` and `render.yaml` to deploy the two host images instead of the seven individual services.
    - [x] Unify the two hosts into one generic `service-host` so that reorganizing which logical services run in which physical process is a config change, not a code change. See [service-bundling.md](specs/tech/service-bundling.md#unification-work) for the target shape. Sub-tasks:
      - [x] Normalize the logical-service contract across all seven services: each package exports `run(config)` (no HTTP side effects, no listener) and, if it serves HTTP, `createApp(config)` returning an Express router. Remove the `port` field from each service's config type and the `startServer` flag from the nudger libraries (`implication-graph-nudger`, `bridge-creator`, `explorer-curator`).
      - [x] Collapse `attester-host` into `worker-host` and rename the package to `service-host`. Extend `WorkerKind` with `implication-attester` and `content-attester`. Delete the `attester-host/` directory. The hardcoded `implicationAttester`/`contentAttester` fields in `attester-host/src/config.ts` should become regular registry entries with `routePrefix`.
      - [x] Collapse the two env-var loaders (`attester-host/src/envConfig.ts`, `worker-host/src/envConfig.ts`) into one. Consider moving each service's env-var parsing into the service's own package so the host doesn't know the shape of every service's config.
      - [x] Delete the per-service Dockerfiles (`implication-attester/Dockerfile`, `content-attester/Dockerfile`, `implication-finder/Dockerfile`, `content-finder/Dockerfile`, `implication-graph-nudger/Dockerfile`, `bridge-creator/Dockerfile`, `explorer-curator/Dockerfile`) and the now-redundant `content-attester-neutral` / `content-attester-left-eval-right` / `content-attester-right-eval-left` entries in `docker-compose.yml`. Splitting a service back out in the future = a new config file pointed at the `service-host` image, not a new Dockerfile.
      - [x] Update `docker-compose.yml` and `render.yaml` to use the unified `service-host` image with two different config inputs (one per physical bundle).
    - Follow-up cleanup (the unification work left these rough edges — see [service-bundling.md](specs/tech/service-bundling.md#remaining-cleanup)):
      - [ ] Normalize AI-service package `npm test` scripts so they actually execute the repo’s TypeScript test files without ad hoc `mocha --import=tsx ...` commands during verification.
      - [x] Update root `package.json`/`package-lock.json` workspaces from the deleted `attester-host`/`worker-host` directories to `service-host`, so root-level `npm run --workspace=@commonality/service-host ...` works again.
      - [ ] Push env-var parsing into each service package. Today `service-host/src/envConfig.ts` is a ~540-line monolith that knows every field of every service's config; that's the "accidental complexity" the spec warned about. Each of the seven service packages should export `loadConfigFromEnv(env, prefix?)` alongside its existing `run`/`createApp`. The host's env loader becomes a thin dispatcher that picks which kinds to include in this bundle and delegates per-kind parsing to the owning package. Acceptance: adding an 8th service requires zero edits in `service-host/`.
      - [x] Make the env-var path lazy so disabled services don't require their env vars. Today `loadServiceHostConfigFromEnv` eagerly builds all seven worker entries and calls `requireEnv` for each, so the attester bundle must tolerate worker-only vars and vice versa. Only build (and only `requireEnv`) entries whose `*_ENABLED` flag is true. Acceptance: a bundle running only `implication-attester` and `content-attester` starts cleanly with none of the finder/nudger env vars set.
      - [x] Rename the worker-era vocabulary to match the `service-host` package name. `WorkerHostConfig` → `ServiceHostConfig`, `HostedWorkerConfig` → `HostedServiceConfig`, `workerKinds` → `serviceKinds`, `workerFactories` → `serviceFactories`, `WorkerKind` → `ServiceKind`, env var `WORKER_HOST_CONFIG` → `SERVICE_HOST_CONFIG` (the alias already exists; remove the old name). Delete the `loadServiceHostConfig`/`loadWorkerHostConfigFromEnv` compatibility aliases once callers are migrated.
      - [ ] Let the env-var path run multiple instances of the same kind in one host. Today names like `'implication-attester'` are hardcoded strings in `envConfig.ts`, so running e.g. `content-attester-neutral` + `content-attester-left-eval-right` in one host requires the JSON-config path. Drive instance discovery off env (e.g. `SERVICE_HOST_INSTANCES=content-attester-neutral,content-attester-left-eval-right` with per-instance prefixes `CONTENT_ATTESTER_NEUTRAL_*`), so env mode is a full substitute for the JSON config mode. Acceptance: the two previously-deleted `content-attester-*` compose entries could be resurrected as one `service-host` container with two instances, using env vars only.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Get DNS names and ENS names.

- Do another smart-contract audit pass.
- (Not a task for AI.) Try out the UI manually.
- (Not a task for AI.) Do a big code review myself. I don't trust it.

- Keep working on [memes](specs/product/memes.md).
- Work on the [elevator pitch](docs/common-sense-majority/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

- Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
- Point an AI at the UI and tell it "go use this."

- Using `cofounder` skill: Are we ready to launch?

## Out of scope for the MVP, but worth remembering

- [Bridges](specs/tech/bridges.md) to tradfi.

## Suggestions from AI

- Add a lightweight CI/developer smoke check for `render.yaml` plus the indexer’s hosted env shape, so future changes do not silently break the Render blueprint while local Docker still works.
