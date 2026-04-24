# Service Bundling

## Problem

The AI service ecosystem currently ships one Docker image (and one Render service line item) per logical service: two attesters, two finders, three nudgers, plus the platform API. Most of these are low-throughput — polling loops or occasional reactive HTTP calls with LLM round-trips — so each one idles a Node runtime and a container slot for work that could comfortably share a process. The question is whether we can collapse several **logical** services into one **physical** service without losing the option to split them back out when one actually needs to scale.

## Approach

Write each service as a **library** exporting a `run(config)` function. A thin **worker-host** binary reads a config listing which logical services to run in-process and starts them all under a supervisor that can restart individual workers without taking the host down. Locally and on cheap hosting tiers, one host runs many workers; when a specific worker needs isolation or scale, deploy another host with just that one. The refactor is mostly mechanical if services are already self-contained around their core libraries (`attester-core`, `finder-core`, `nudger-core`), which they are.

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
- **Independent deploys go away** within a bundle, unless the "split it out" escape hatch stays working. That's why the library shape matters more than the bundling itself: the bundling is a deployment choice, not an architectural one.

## Non-goals

- Bundling the core libraries (`attester-core`, `finder-core`, `nudger-core`). They're already shared as libraries; that's the right shape.
- Bundling `platform-api-service` with anything.
- Merging signer keys. Each on-chain identity (attester, nudger) stays distinct.
