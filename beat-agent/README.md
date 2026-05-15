# Beat Agent AI Service

Beat agents are stateful content attesters for short-form social content whose meaning depends on ambient discourse context. They are a sibling of `content-attester`, not a replacement: from the rest of Commonality's perspective, a positive beat-agent attestation is the same `AlignmentAttestations` output as a positive stateless content-attester attestation.

This package currently defines the service boundary, shared TypeScript schemas, and a minimal beat-ingestion state loop for the first implementation steps in [`beat-agents.md`](../specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md). Context memory, HTTP app, and service-host integration are still future steps.

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

## Explanation documents and logs

Beat-agent reasoning documents should distinguish local context from ambient context. The exported `BeatAgentExplanationDocument` type captures the v1 IPFS shape: beat identity, decision, confidence, local-context citations, ambient-context citations, and timestamp.

V1 should keep an operator-visible evaluation log for **all** paid evaluations, including `negative` and `abstain` results. Those results do not publish positive on-chain attestations, but they are important demand/coverage signals: repeated `outside_beat` or `insufficient_ambient_context` abstentions show where new beats or better ingestion are needed. The exported `BeatAgentEvaluationLogEntry` schema mirrors the explanation document and adds processing metadata, transaction hash, and explanation CID fields.
