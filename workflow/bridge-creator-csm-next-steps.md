# Bridge-creator / CSM mediator next steps

Focused checklist for the work that remains after the bridge-creator package rewrite. Source of truth for product intent: [`specs/product/bridge-creator.md`](../specs/product/bridge-creator.md). Bridge-creator itself is mostly complete; the remaining work is beat-agent setup, outcome feedback, and rehearsal.

## Current state

- `bridge-creator/` has the scheduled synthesizer loop, trusted CSM `/context` sources, anchor store, strategy prompt, publication dedup, optional implication submission, anchor reflection, and operator anchor CLI.
- Anchor reflection can optionally read a signing/ignore outcome summary from `BRIDGE_CREATOR_ANCHOR_REFLECTION_OUTCOME_SUMMARY_PATH`.
- Beat-agent has v1 worker/context-provider scaffolding and supports `beat_context_provider` purpose, but a CSM instance has not been stood up and rehearsed.

## Checklist

### 1. Stand up `us-political-csm` beat-agent context provider

Goal: a CSM beat-agent instance exposes useful `GET /context` summaries for the bridge-creator.

- [ ] Decide where deployment/runtime config should live for named beat-agent instances.
  - Candidate: a checked-in example config under `beat-agent/config/` plus local env docs.
  - Do not bury this only in a private shell session; future agents/operators need a discoverable path.
- [ ] Define a `us-political-csm` beat definition with purposes including `beat_context_provider`.
  - Initial source should be Tally/indexer-derived activity only; do not add civility-agent context yet.
  - Keep the source list small and inspectable for the first rehearsal.
- [ ] Verify the beat-agent worker can ingest the chosen Tally/indexer activity into its JSON ingestion state.
- [ ] Verify observation extraction updates the memory file.
  - Test deterministic fallback if LLM extraction is disabled.
  - Test LLM extraction if `BEAT_AGENT_LLM_EXTRACTION_ENABLED=true` is intended for rehearsal.
- [ ] Verify purpose summary snapshots are generated for `beat_context_provider`.
- [ ] Verify `GET /context?purpose=beat_context_provider` returns a signed, fresh, non-empty context response suitable for bridge-creator trust validation.
- [ ] Document the local run command/env needed to start this instance.
- [ ] Add focused tests for any new Tally/indexer source adapter or config-loading code.

### 2. Wire bridge-creator to the CSM beat-agent

Goal: bridge-creator can consume the `us-political-csm` context source without special one-off steps.

- [ ] Configure `BRIDGE_CREATOR_CSM_CONTEXT_SOURCES` with the CSM beat-agent service URL and expected signer address.
- [ ] Run `GET /.well-known/nudger.json` and confirm bridge-creator reports `status: ready` when the CSM context is fresh.
- [ ] Run one bridge-creator tick in a local/test environment and inspect:
  - [ ] synthesized triples,
  - [ ] published generated statement documents,
  - [ ] nudge batch shape,
  - [ ] publication dedup state,
  - [ ] optional implication submissions if `IMPLICATIONS_CONTRACT_ADDRESS` is configured.
- [ ] Record any manual run notes in `CONTINUITY.md` or a rehearsal notes file.

### 3. Add civility-agent context source adapter to beat-agent

Goal: the CSM beat-agent can ingest a sibling civility beat-agent’s `GET /context` output as provenance-tagged input.

- [ ] Design a source type for sibling beat-agent context, e.g. `type: "beat_context"` or similar.
- [ ] Implement adapter that calls the sibling service’s `GET /context` endpoint.
- [ ] Validate expected signer/address or otherwise document the trust boundary.
- [ ] Convert context response into ingestible beat items/observations tagged with provenance such as `source: civility-agent:<name>`.
- [ ] Add tests for:
  - [ ] successful context ingestion,
  - [ ] stale/unready context handling,
  - [ ] signer mismatch / trust failure,
  - [ ] provenance tagging.
- [ ] Update `beat-agent/README.md` with config shape and operational notes.
- [ ] Wire this adapter into the CSM beat-agent config alongside the initial Tally/indexer source.

### 4. Generate signing/ignore outcome summaries for anchor reflection

Goal: anchor reflection learns from bridge outcomes, not just context and previous publication text.

- [ ] Decide what counts as outcome data for v1.
  - Likely: signatures on bridge-created modified/common-ground statements, user dismissals/ignores if the client records them, and maybe downstream implication/signing counts.
- [ ] Decide where the raw signal comes from.
  - Tally/indexer data may cover signatures.
  - Explicit ignores may require UI/client instrumentation if not already present.
- [ ] Implement an operator-readable summary generator that writes text/Markdown to the path configured by `BRIDGE_CREATOR_ANCHOR_REFLECTION_OUTCOME_SUMMARY_PATH`.
- [ ] Keep v1 simple: summarize counts and notable examples; do not make anchor reflection autonomous.
- [ ] Add tests for summary generation over representative fixture data.
- [ ] Document how to run the summary generator before/alongside bridge-creator anchor reflection.

### 5. End-to-end rehearsal

Goal: verify the chain works and produces sane mediation artifacts.

- [ ] Run the full chain locally or on testnet-like infrastructure:
  - [ ] Civility beat-agent,
  - [ ] CSM beat-agent,
  - [ ] bridge-creator.
- [ ] Inspect several CSM `/context` outputs for factual usefulness and source coverage.
- [ ] Inspect several synthesized bridge triples for:
  - [ ] each side would plausibly sign its modified statement,
  - [ ] modified statements genuinely imply the common-ground statement,
  - [ ] common-ground statement is not inflammatory or fake-neutral sludge,
  - [ ] bridge is relevant to live context rather than just seed anchors.
- [ ] Inspect anchor-reflection proposals; they should be boring, advisory, and easy to approve/reject.
- [ ] Record rehearsal findings in a dedicated review/rehearsal note, probably under `workflow/reviews/`.
- [ ] Update this checklist with follow-up bugs/tasks discovered during rehearsal.

## Deferred / explicitly not now

- Multiple civility context sources with sophisticated merge logic.
- Web UI for anchor review; CLI is enough for v1.
- Autonomous anchor activation.
- Auth/billing between CSM beat-agent and bridge-creator.
- Moving bridge synthesis into beat-agent; bridge synthesis remains in `bridge-creator`.
