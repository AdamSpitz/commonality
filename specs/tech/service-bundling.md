# Service Bundling

## Problem

The AI service ecosystem is intentionally split into logical services — attesters, finders, nudgers/explorers, and platform/context services — for the reasons summarized in [product/ai-assistance.md](../product/ai-assistance.md#why-not-consolidate-the-logical-services). It currently ships one Docker image (and one Render service line item) per logical service: attesters, finders, nudgers/explorers, beat agents, plus the platform API. Most of these are low-throughput — polling loops or occasional reactive HTTP calls with LLM round-trips — so each one idles a Node runtime and a container slot for work that could comfortably share a process. The question is whether we can collapse several **logical** services into one **physical** service without losing the option to split them back out when one actually needs to scale.

## Approach

Write each service as a **library** exporting a `run(config)` function. A thin **service-host** binary reads a config listing which logical services to run in-process and starts them all under a supervisor that can restart individual workers without taking the host down. Locally and on cheap hosting tiers, one host runs many workers; when a specific worker needs isolation or scale, deploy another host with just that one. The refactor is mostly mechanical if services are already self-contained around their core libraries (`attester-core`, `finder-core`, `nudger-core`), which they are.

## Proposed split

### Bundle A — Attester host (HTTP, paid, reactive)

- `implication-attester`
- `content-attester`

Both are Express services with x402 payments, LLM calls, and on-chain writes. They already share `attester-core`. Mount them as two route prefixes on one Express app. Each keeps its own `ATTESTER_PRIVATE_KEY` — different EOAs, no nonce contention.

### Bundle B — Background worker host (polling + periodic publication)

- `implication-finder`
- `content-finder`
- `implication-graph-nudger`
- `bridge-creator`
- `explorer-curator`
- `beat-agent` worker mode, when deployed as contextual ingestion/finder rather than paid HTTP evaluation

All are timer-driven loops that wake up, do work, and optionally publish. Each nudger owns its own `NUDGER_PRIVATE_KEY` — nudger identities are distinct on-chain actors, so do **not** merge keys. `explorer-curator`'s `POST /suggest` endpoint means the host needs Express too; fine.

Optional further split (B2): isolate the three nudgers from the two finders later, if operational clarity around "who published this nudge" becomes more valuable than the bundling savings.

### Keep separate

- `platform-api-service` — user-facing latency path, called synchronously by the UI for channel/content resolution. Different scaling profile, different failure blast-radius, and external API (Twitter/YouTube) rate-limit characteristics that shouldn't contend with AI worker bursts.
- `indexer` (Ponder), `ipfs`, `hardhat-node` — infrastructure, not our code.

## Why this split rather than one big bundle

1. **Money path vs. best-effort path.** Attesters take payment; a nudger OOMing its process shouldn't 502 a paid `/evaluate-implications` request.
2. **Reactive vs. scheduled.** Attesters need snappy response times; workers don't. A worker's LLM CPU spike shouldn't add tail latency to paid attester calls.
3. **Uniform shape within each bundle.** Bundle A is "Express + LLM + tx." Bundle B is "timer + LLM + tx." One supervisor pattern per bundle, not a zoo.

## Tradeoffs

- **Lost isolation.** An unhandled rejection or memory leak in one worker takes its bundle-mates down. Mitigate with a supervisor that restarts individual workers and strict per-worker error ownership.
- **Shared resource limits.** CPU, memory, LLM rate limits, and RPC quotas are now contended within a bundle. The real gotcha is RPC rate limits on cheap tiers when multiple workers publish simultaneously — worth monitoring, not worth pre-optimizing.
- **Independent deploys go away** within a bundle. Splitting a logical service back out to its own process should be a config change, not a code change — see [Unification work](#unification-work). The library shape is load-bearing; the bundling is a deployment choice.

## Non-goals

- Bundling the core libraries (`attester-core`, `finder-core`, `nudger-core`). They're already shared as libraries; that's the right shape.
- Bundling `platform-api-service` with anything.
- Merging signer keys. Each on-chain identity (attester, nudger) stays distinct.

## Unification work

The initial bundling shipped as two hosts: `attester-host` (hardcoded to exactly two attesters) and `worker-host` (generic registry with supervisor). That asymmetry is the remaining cleanup. The target is **one** generic `service-host` that both bundles run as different configurations of, so that moving a logical service between physical processes — or splitting one back out into its own container — is a config edit only.

### Logical-service contract

Every logical service (`implication-attester`, `content-attester`, `beat-agent`, `implication-finder`, `content-finder`, `implication-graph-nudger`, `bridge-creator`, `explorer-curator`) exports:

- `run(config)` — starts the service's work (timers, polling loops, subscriptions). Must not open an HTTP listener. Returns `{ stop(), finished? }`.
- `createApp(config)` — if and only if the service serves HTTP. Returns an Express router, not a listening server. The host mounts it under a `routePrefix`.

Consequences:

- No `port` field in any service's config type. The host owns the listener.
- No `startServer` flag on the nudger `run()` functions. `run` is the non-HTTP path, `createApp` is the HTTP path, never both in one call.
- A service that is purely a timer-driven worker (both finders) exports only `run`. A service that is both (the three nudgers expose a `POST /suggest`) exports both.

### Host contract

`service-host` takes a list of entries shaped like:

```
{ name, kind, config, routePrefix?, enabled?, restartDelayMs? }
```

Behavior:

- For every entry, call the registered `run(config)` factory and supervise it (restart on exit/throw, like `worker-host` does today).
- For every entry with a `routePrefix`, also mount `createApp(config)` on a shared Express app. Start the listener iff at least one entry has a `routePrefix`.
- Each entry keeps its own signer key in `config` — keys are never merged across entries, even within the same host.

This is a superset of what `worker-host` already does; the generalization is adding `implication-attester` and `content-attester` as registered kinds and retiring `attester-host`.

### Config source of truth

Each service package owns the parsing of its own env-var shape (e.g. `implication-attester` exports a `loadConfigFromEnv(env)` alongside `run`/`createApp`). The host's env-var loader becomes a thin composition — pick which kinds to include in this physical bundle, delegate to each package for the details. The alternative is continuing to maintain a giant central env-loader that knows every service's config shape; that's what exists now and it's where most of the accidental complexity lives.

### Escape hatch for future splits

Not needed as per-service Dockerfiles. If one logical service needs its own container later, point a new `service-host` deployment at a config containing just that one entry. Same image, different config. The per-service Dockerfiles currently in the repo should be deleted — they're a second deployment path that no-one exercises in CI and they'll rot.

## Current status

The unification has shipped: one `service-host` image can run the attester and background-worker bundles, and deployment is env-var configured. The follow-up cleanup originally tracked here is complete:

- Env parsing is delegated to each service package's `loadConfigFromEnv`; the host composes the enabled services instead of hardcoding every field of every service config.
- Env loading is lazy. The host reads `*_ENABLED` flags first and only requires env vars for enabled services.
- The canonical config/service types use service-host vocabulary rather than the old worker-host names.
- Env mode can run multiple instances of one service kind with `SERVICE_HOST_INSTANCES` and per-instance prefixes, while JSON config remains available for explicit bundle definitions.

Operationally, moving a logical service between physical processes — or splitting it back out into its own container — should be a config change: run the same service-host image with a different JSON config or env instance list.
