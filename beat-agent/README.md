# Beat Agent AI Service

Beat agents are stateful content attesters for short-form social content whose meaning depends on ambient discourse context. They are a sibling of `content-attester`, not a replacement: from the rest of Commonality's perspective, a positive beat-agent attestation is the same `AlignmentAttestations` output as a positive stateless content-attester attestation.

This package currently defines the service boundary, shared TypeScript schemas, a minimal beat-ingestion state loop, local context-memory primitives, and the attester-mode HTTP service for the first implementation steps in [`beat-agents.md`](../specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md). Finder mode and service-host integration are still future steps.

## Service boundary

The public evaluation API should stay compatible with `content-attester` where possible:

- `POST /evaluate-content` accepts the same content identifiers and one content source (`contentText`, `contentUrl`, or `contentCid`).
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
- skip sources when their `minPollIntervalMs` has not elapsed, when required credentials are missing, or when no adapter is configured.

This intentionally does not implement Twitter/X, Bluesky, RSS, or other concrete fetchers yet. Platform-specific adapters should live next to the deployment/service code that owns credentials and rate-limit behavior.

## Context memory v1

The exported context-memory helpers provide a deliberately simple persistent memory layer:

- `extractObservationsFromItems` turns ingested items into timestamped observations, using either the default text-based extractor or a deployment-provided extractor that can call an LLM.
- `retrieveRelevantObservations` ranks stored observations by keyword overlap and coarse recency, excluding the submitted content item when requested.
- `compactBeatMemory` replaces old fine-grained item observations with one coarse summary observation so stale raw context does not grow without bound.

Memory is stored as JSON for now. This is enough to wire up attester-mode prompts and tests, but deployments should treat ingested content as untrusted data and keep stronger summarization/poisoning defenses on the roadmap.

## Attester mode HTTP service

The exported attester-mode helpers provide the pull-evaluation flow and an `attester-core` Express wrapper:

- `evaluateBeatContentWithLLM` builds a beat-agent prompt with content, local-context citations, and retrieved ambient-context citations, then normalizes the LLM's three-valued result.
- `processBeatAgentEvaluation` validates the content-attester-compatible request shape, resolves content via injected deployment code, builds context via injected local/memory code, evaluates, uploads explanation documents for publishable positive decisions, publishes `AlignmentAttestations`, and appends an operator-visible log entry for every paid evaluation.
- `createBeatAgentServiceApp` exposes `/evaluate-content`, `/quote`, `/health`, and `/status/:statementCid/:contentCanonicalId`, with x402-style payment validation and optional `x-finder-key` bypass for trusted finders.
- `createBeatAgentApp` wires config loading, IPFS upload/download, optional `platform-api-service` local-context lookup, optional JSON memory retrieval, optional JSONL evaluation logs, OpenRouter evaluation, and `AlignmentAttestations` publishing.
- `publishBeatAgentAttestation` uses the same content-canonical-ID subject scheme as `content-attester`.

Run locally with `npm run dev --workspace=@commonality/beat-agent` after setting the required `BEAT_AGENT_*`, OpenRouter, IPFS, and contract environment variables.

Core runtime configuration:

- `BEAT_AGENT_BEAT_ID`, `BEAT_AGENT_NAME`, `BEAT_AGENT_PRIVATE_KEY`, `BEAT_AGENT_PAYMENT_ADDRESS`
- `BEAT_AGENT_ETHEREUM_RPC_URL` (or `ETHEREUM_RPC_URL`), `ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS`, `ALIGNMENT_TOPIC_STATEMENT_CID`
- `OPENROUTER_API_KEY`, optional `BEAT_AGENT_OPENROUTER_MODEL` / `OPENROUTER_MODEL`, and either `BEAT_AGENT_PROMPT_TEMPLATE` or `BEAT_AGENT_PROMPT_TEMPLATE_FILE`
- Optional `BEAT_AGENT_PLATFORM_API_URL` for `/context/local` lookups when requests include `contentUrl`
- Optional `BEAT_AGENT_MEMORY_FILE` for ambient-context retrieval and `BEAT_AGENT_EVALUATION_LOG_FILE` for JSONL paid-evaluation logs

## Explanation documents and logs

Beat-agent reasoning documents should distinguish local context from ambient context. The exported `BeatAgentExplanationDocument` type captures the v1 IPFS shape: beat identity, decision, confidence, local-context citations, ambient-context citations, and timestamp.

V1 keeps an operator-visible evaluation log for **all** paid evaluations, including `negative` and `abstain` results. Those results do not publish positive on-chain attestations, but they are important demand/coverage signals: repeated `outside_beat` or `insufficient_ambient_context` abstentions show where new beats or better ingestion are needed. The exported `BeatAgentEvaluationLogEntry` schema mirrors the explanation document and adds processing metadata, transaction hash, and explanation CID fields. Set `BEAT_AGENT_EVALUATION_LOG_FILE` to append these entries as JSONL in the runnable service.
