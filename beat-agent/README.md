# Beat Agent AI Service

Beat agents are stateful content attesters for short-form social content whose meaning depends on ambient discourse context. They are a sibling of `content-attester`, not a replacement: from the rest of Commonality's perspective, a positive beat-agent attestation is the same `AlignmentAttestations` output as a positive stateless content-attester attestation.

**Status: v1 scaffolding.** This package provides the service boundary, TypeScript schemas, a minimal beat-ingestion state loop, local context-memory primitives, the attester-mode HTTP service (with chain-backed idempotency plus JSONL log lookup as a local optimization), the first finder-mode loop (with retry tracking), a supervised worker loop, `service-host` registration, UI/settings integration (trusted beat-agent identities, coverage-gap indicators, tooltip-level explanations, and chip-click audit details), and operator-facing coverage-gap mining from the JSONL evaluation log.

**Before deploy, the service needs:** follow-on adversarial hardening beyond the first defensive layer (ingested content is attacker-controllable; v1 now has prompt-boundary hygiene, source-diversity/time-span retrieval weighting, richer citation metadata, thin-context UI warnings, and URL/CID canonical-ID validation where possible, but still lacks anomaly detection, reputation weighting, contested-observation detection, and configurable UI trust-policy enforcement). The package ships a concrete Twitter/X ingestion adapter for account, query, and list sources; other platform adapters remain future work.

Detailed implementation plan and review in [`beat-agents.md`](../specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md).

## Service boundary

The public evaluation API should stay compatible with `content-attester` where possible:

- `POST /evaluate-content` accepts the same content identifiers and one content source (`contentText`, `contentUrl`, or `contentCid`). When `BEAT_AGENT_PLATFORM_API_URL` is configured, URL submissions are resolved through `platform-api-service` and rejected if the resolved canonical ID differs from the submitted `contentCanonicalId`; structured CID documents are likewise checked when they declare `canonicalId` or `contentCanonicalId`.
- `GET /quote`, `GET /health`, and status routes should reuse `attester-core` once the HTTP surface is implemented.
- Positive decisions publish to `AlignmentAttestations` using the same content-canonical-ID subject scheme as `content-attester`.

Beat agents extend the result shape from boolean decisions to three-valued decisions:

```json
{
  "decision": "positive | negative | abstain",
  "confidence": "high | medium | low",
  "reasoning": "...",
  "abstainReason": "outside_beat | insufficient_local_context | insufficient_ambient_context | unsupported_platform | other"
}
```

Only `positive` decisions at or above the configured confidence threshold should publish on-chain attestations. Negative decisions and abstentions are paid evaluations but do not publish positive attestations.

## Minimal beat ingestion

The exported `runBeatIngestionOnce` helper gives beat-agent deployments a first ingestion primitive:

- configure a beat as `account`, `query`, `list`, or `rss` sources;
- plug in platform-specific source adapters for the enabled source types;
- persist ingested items, per-source cursors, and fetch timestamps in a JSON state file;
- skip sources when their `minPollIntervalMs` has not elapsed, when required credentials are missing, when no adapter is configured, or when one source fetch fails;
- continue polling later sources after a per-source fetch failure, and report `fetch_failed` with error metadata in the run summary.

The package ships `createTwitterBeatSourceAdapters` for Twitter/X account, query, and list sources. It uses X API v2, requires a bearer token, maps tweets into canonical Commonality content IDs (`twitter:uid:<authorId>:<tweetId>`), and stores the newest seen tweet ID as the source cursor so later polls use `since_id`. Bluesky/RSS/other adapters remain future work.

Example:

```ts
import { createTwitterBeatSourceAdapters, runBeatIngestionOnce } from '@commonality/beat-agent';

await runBeatIngestionOnce({
  definition: {
    beatId: 'us-political-twitter',
    sources: [
      { id: 'account:alice', type: 'account', locator: '@alice', platform: 'twitter', credentialEnvVar: 'X_API_BEARER_TOKEN' },
      { id: 'query:common-ground', type: 'query', locator: '"common ground" lang:en', platform: 'twitter', credentialEnvVar: 'X_API_BEARER_TOKEN' },
      { id: 'list:civic', type: 'list', locator: '1234567890', platform: 'twitter', credentialEnvVar: 'X_API_BEARER_TOKEN' },
    ],
  },
  stateFilePath: './data/beat-ingestion.json',
  adapters: createTwitterBeatSourceAdapters({ bearerToken: process.env.X_API_BEARER_TOKEN ?? '' }),
});
```

## Context memory v1

The exported context-memory helpers provide a deliberately simple persistent memory layer:

- `extractObservationsFromItems` turns ingested items into timestamped observations, using either the default text-based extractor or a deployment-provided extractor that can call an LLM. Per-item extraction failures are isolated and reported in the summary so later items can still update memory.
- `createLlmObservationExtractor` builds an extractor that calls OpenRouter per ingested item to extract structured discourse observations — phrase usage patterns, running arguments, in-group references, and factional meanings. Enable with `BEAT_AGENT_LLM_EXTRACTION_ENABLED=true`. Without this, ambient context is inert (raw-text observations only).
- `retrieveRelevantObservations` ranks stored observations by keyword overlap, coarse recency, and a source-diversity/time-span multiplier so thinly sourced bursty observations are still usable but down-weighted.
- `compactBeatMemory` replaces old fine-grained item observations with one coarse summary observation so stale raw context does not grow without bound.

Memory is stored as JSON for now. Stored observations track supporting author IDs/counts for retrieval weighting, but published citations expose only aggregate counts and diversity scores. Deployments should treat ingested content as untrusted data and keep stronger summarization/poisoning defenses on the roadmap.

## Finder mode

The exported `runBeatFinderOnce` helper gives beat-agent deployments a first push-discovery primitive:

- load already-ingested beat items from the JSON ingestion state;
- skip content canonical IDs already recorded in finder state;
- use a pluggable candidate selector to decide which posts are promising enough to submit;
- submit candidate evaluation requests to the beat agent's own `/evaluate-content` endpoint or another trusted attester endpoint;
- pass an optional `x-finder-key` for deployments that allow trusted finders to bypass public payment checks;
- persist submitted/not-promising decisions in a JSON finder state file so subsequent runs avoid repeats.

The default selector is deliberately conservative infrastructure rather than product judgment: it submits non-empty ingested item text. Real deployments should provide a selector that encodes the beat/operator's idea of promising noninflammatory content and accepts that negative/abstain evaluations cost money.

## Worker mode

The exported `run(config)` starts the long-running worker used by `service-host`; `runBeatAgentWorkerOnce(config)` runs a single tick for tests and operator scripts. A worker tick:

1. polls configured beat sources into the ingestion state file;
2. extracts observations from the ingested items into the memory file when configured;
3. compacts old memory observations;
4. optionally runs finder mode.

Worker configuration:

- `BEAT_AGENT_BEAT_DEFINITION_JSON` or `BEAT_AGENT_BEAT_DEFINITION_FILE` — JSON `{ "beatId": "...", "sources": [...] }` using the source shape documented above
- `BEAT_AGENT_INGESTION_STATE_FILE` — JSON file for source cursors and ingested items
- `BEAT_AGENT_WORKER_POLL_INTERVAL_MS` — delay between supervised worker ticks (default 60000)
- `BEAT_AGENT_MEMORY_FILE` — enables observation extraction and compaction
- `BEAT_AGENT_LLM_EXTRACTION_ENABLED=true` — uses OpenRouter-backed extraction instead of the text fallback; this can materially increase token spend and rate-limit pressure because extraction runs per ingested item
- `BEAT_AGENT_MEMORY_COMPACTION_OLDER_THAN_MS` and `BEAT_AGENT_MEMORY_COMPACTION_MIN_OBSERVATIONS` — coarse compaction controls
- `BEAT_AGENT_FINDER_ENABLED=true`, `BEAT_AGENT_FINDER_STATE_FILE`, and `BEAT_AGENT_FINDER_ATTESTER_URL` — enables the finder pass after ingestion/memory updates

If no beat definition or ingestion state file is configured, the worker logs a skip and does no work; this keeps HTTP-only deployments possible.

## Attester mode HTTP service

The exported attester-mode helpers provide the pull-evaluation flow and an `attester-core` Express wrapper:

- `evaluateBeatContentWithLLM` builds a beat-agent prompt with content, local-context citations, and retrieved ambient-context citations wrapped in `<UNTRUSTED_DATA>` blocks, then normalizes the LLM's three-valued result.
- `processBeatAgentEvaluation` validates the content-attester-compatible request shape, checks for an existing attestation (idempotency via `findExistingAttestation`), resolves content via injected deployment code, builds context via injected local/memory code, evaluates, uploads explanation documents for publishable positive decisions, publishes `AlignmentAttestations`, and appends an operator-visible log entry for every paid evaluation.
- `createBeatAgentServiceApp` exposes `/evaluate-content`, `/quote`, `/health`, and `/status/:statementCid/:contentCanonicalId`, with x402-style payment validation and optional `x-finder-key` bypass for trusted finders. The status route returns existing-attestation metadata when the configured idempotency lookup finds a prior positive attestation, plus payment details for a fresh evaluation when none exists.
- `createBeatAgentApp` wires config loading, IPFS upload/download, optional `platform-api-service` local-context lookup, optional JSON memory retrieval, optional JSONL evaluation logs, OpenRouter evaluation, `AlignmentAttestations` publishing, and idempotency via the on-chain `hasAttestation` read. When `BEAT_AGENT_EVALUATION_LOG_FILE` is configured, JSONL lookup runs first as a cheap local optimization.
- `publishBeatAgentAttestation` uses the same content-canonical-ID subject scheme as `content-attester`.

Run locally with `npm run dev --workspace=@commonality/beat-agent` after setting the required `BEAT_AGENT_*`, OpenRouter, IPFS, and contract environment variables.

Core runtime configuration:

- `BEAT_AGENT_BEAT_ID`, `BEAT_AGENT_NAME`, `BEAT_AGENT_PRIVATE_KEY`, `BEAT_AGENT_PAYMENT_ADDRESS`
- `BEAT_AGENT_ETHEREUM_RPC_URL` (or `ETHEREUM_RPC_URL`), `ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS`, `ALIGNMENT_TOPIC_STATEMENT_CID`
- `OPENROUTER_API_KEY`, optional `BEAT_AGENT_OPENROUTER_MODEL` / `OPENROUTER_MODEL`, and either `BEAT_AGENT_PROMPT_TEMPLATE` or `BEAT_AGENT_PROMPT_TEMPLATE_FILE`
- Optional `BEAT_AGENT_PLATFORM_API_URL` for `/context/local` lookups when requests include `contentUrl`
- Optional `BEAT_AGENT_MEMORY_FILE` for ambient-context retrieval and worker-managed observation memory; optional `BEAT_AGENT_EVALUATION_LOG_FILE` for JSONL paid-evaluation logs
- Optional adversarial-hardening knobs: `BEAT_AGENT_MIN_AUTHORS_FOR_FULL_WEIGHT` (default 3), `BEAT_AGENT_MIN_HOURS_FOR_FULL_WEIGHT` (default 6), `BEAT_AGENT_DIVERSITY_NEUTRAL_FLOOR` (default 0.25), `BEAT_AGENT_MAX_UNTRUSTED_CHARS` (default 4000)

## Explanation documents and logs

Beat-agent reasoning documents should distinguish local context from ambient context. The exported `BeatAgentExplanationDocument` type captures the v1 IPFS shape: beat identity, decision, confidence, local-context citations, ambient-context citations, and timestamp.

V1 keeps an operator-visible evaluation log for **all** paid evaluations, including `negative` and `abstain` results. Those results do not publish positive on-chain attestations, but they are important demand/coverage signals: repeated `outside_beat` or `insufficient_ambient_context` abstentions show where new beats or better ingestion are needed. The exported `BeatAgentEvaluationLogEntry` schema mirrors the explanation document and adds processing metadata, transaction hash, and explanation CID fields. Set `BEAT_AGENT_EVALUATION_LOG_FILE` to append these entries as JSONL in the runnable service.

## Coverage-gap mining

The exported `mineCoverageGaps` and `mineCoverageGapsFromFile` helpers let operators analyze the JSONL evaluation log for demand signals:

- `mineCoverageGapsFromFile(filePath)` reads and parses a JSONL log file.
- `mineCoverageGaps({ logLines })` operates on plain string arrays (for testing or programmatic use).

Both return a `CoverageGapSummary` aggregating:

- overall decision counts (`positive`/`negative`/`abstain`) and the abstention rate;
- abstentions broken down by reason (`outside_beat`, `insufficient_local_context`, `insufficient_ambient_context`, `unsupported_platform`, `other`) with up to `limitExamples` example content IDs;
- per-platform breakdowns (platform extracted from canonical ID prefix), each with the same reason-level detail and an abstention rate;
- content canonical IDs that were repeatedly abstained on (configured via `minRepeatCount`, default 2), sorted by repeat count descending.

This turns the raw JSONL log into operator-facing signals: which platforms have the highest abstention rates, which reasons dominate, and which specific content items keep getting requests that the agent cannot handle. Operators can use this to decide where new beats or better ingestion are worth the investment.
