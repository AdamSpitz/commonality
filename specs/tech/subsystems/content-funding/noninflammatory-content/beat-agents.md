# Beat Agents

A stateful counterpart to the stateless [content attester](../content-attesters.md). A beat agent is an AI service that *follows the conversation* in a particular slice of discourse — a "beat" — the way a human columnist, community moderator, or highly engaged reader would. It exposes an attestation API on top of that standing context and, optionally, runs in finder mode to surface good posts from its beat.

This spec explains why beat agents are needed, how they relate to the existing AI-service ecosystem, which services they overlap with, and what needs to be implemented before the first deployment. The concrete mechanics — payment, attester identity, IPFS reasoning, on-chain positive attestations — should reuse the patterns from [content-attesters.md](../content-attesters.md) except where noted.


## Summary

Beat agents make sense because short-form social content often cannot be evaluated from the post text alone. A tweet can be sincere, sarcastic, a callback, an in-group reference, a dunk, or a dog whistle depending on recent discourse. A stateless per-call evaluator can fetch the parent tweet and thread, but it cannot reconstruct "what everyone in this corner of Twitter has been arguing about this week."

Beat agents are therefore necessary for **short-form social content where ambient context is load-bearing**. They are **not** a replacement for the stateless `content-attester`:

- **Stateless content attester:** best for long-form or self-contained content — articles, Substack posts, YouTube transcripts, pasted text, or social posts where local context is enough.
- **Beat agent:** best for short-form social content where evaluation depends on the running discourse in a community or topic area.

From the rest of Commonality's perspective, a positive beat-agent attestation and a positive stateless content-attester attestation are interchangeable: both publish to `AlignmentAttestations` using the same content-ID scheme. Users choose which attester identities they trust.


## Motivation

The existing content attester is stateless: content goes in, decision comes out. That works well when the content contains enough context to evaluate it. It does not work well for many social-media posts.

Naive fixes do not solve the problem:

- **Do not ask the user to submit context.** It adds friction, and the submitted framing becomes part of the object being evaluated. A motivated submitter can game the framing.
- **Do not refuse all short posts.** That cedes much of the social-media space, where the noninflammatory-content use case is especially important.
- **Do not expect a stateless attester to reconstruct everything per call.** Parent posts, quotes, threads, and recent author posts are fetchable. Running jokes, factional meanings, account reputations, and what a phrase has come to mean this week are not.

The right shape is an agent that has actually been following the beat and can evaluate a post the way an engaged human reader could. When a post is outside the agent's beat, or when even the agent lacks enough context, it should abstain rather than guess.


## Two context layers

Separate two different things that are often bundled under "context":

### Local context

Local context is mechanically retrievable around a specific content item:

- parent post
- thread
- quoted post
- immediate replies
- author's recent posts
- linked article/video transcript where available

This layer belongs in shared platform/content-resolution infrastructure. The stateless content attester can use it too; beat agents are not justified merely by local context.

### Ambient context

Ambient context is the running discourse in a slice of the platform:

- who is arguing what this week
- what in-group references currently mean
- whether a phrase is being used sincerely, ironically, or as a dog whistle
- which accounts are known participants in a debate
- what recent events a short post is implicitly responding to

This cannot be reconstructed reliably per request. A beat agent maintains ambient context by continuously ingesting its beat, summarizing observations over time, and retrieving relevant observations during evaluation.

Most content should be evaluable from the content plus local context. Ambient context should matter only when it is genuinely load-bearing. If it is load-bearing and the agent does not have enough of it, the agent abstains.


## Two modes

A beat-agent deployment may enable either or both modes.

### Attester mode (pull)

The agent exposes an API shaped like the stateless content attester's API: callers submit a content reference and target statement, pay for evaluation, and receive a structured decision.

The difference is that the decision space is three-valued:

```json
{
  "decision": "positive | negative | abstain",
  "confidence": "high | medium | low",
  "reasoning": "...",
  "abstainReason": "outside_beat | insufficient_local_context | insufficient_ambient_context | unsupported_platform | other"
}
```

Only positive decisions that meet the configured confidence threshold publish on-chain attestations. Negative decisions and abstentions do not publish positive alignment attestations, but they are still paid evaluations: the agent did the work.

### Finder mode (push)

The agent watches its beat and proactively notices posts worth evaluating. When it finds a promising candidate, it calls its own attester endpoint or another trusted beat/content attester.

If the attestation is positive and the content later gets funded, the finder should receive the same kind of scout/finder reward used elsewhere in the system. The economics make finder mode self-filtering: a finder that submits borderline or off-beat content pays for abstentions and negative evaluations.


## Relationship to existing services

### `content-attester`

Beat agents are a stateful sibling/subtype of content attesters, not a replacement.

They should share as much machinery as possible with `content-attester`, but the ingestion loop, context memory, abstention semantics, and context citations make them a distinct logical service type.

Recommended implementation shape: **new `beat-agent` service using `attester-core`**, publishing the same on-chain attestation type as `content-attester`.

### `attester-core`

Beat agents should reuse or extend `attester-core` for:

- Express app setup and shared endpoints
- x402-style payment quotes and validation
- OpenRouter / LLM JSON completion wrapper
- IPFS read/write helpers
- rate limiting
- error classification
- on-chain transaction helpers where applicable

Beat agents add:

- long-running ingestion loop
- platform feed adapters
- persistent context store
- context retrieval/summarization
- explicit abstain outcome
- ambient-context citations in published reasoning

### `content-finder`

Beat agents partially supersede future feed-watching extensions to `content-finder`.

Current division of responsibility should be:

- **`content-finder`:** generic explicit-submission queue processor. It reads user/operator submissions, resolves URLs, and submits candidates to a content attester. This remains useful.
- **Beat-agent finder mode:** contextual social-feed discovery. If a finder needs ambient discourse context to decide what to submit, it belongs inside or next to a beat agent.

Do not build a separate "Twitter channel-watch content finder" and a separate "Twitter beat agent" unless there is a deliberate reason to split them. For short-form social content, the beat agent is naturally both watcher and evaluator.

### `finder-core`

Beat agents may reuse `finder-core` utilities where they fit — polling loops, JSON state files, batched POST helpers — but beat ingestion likely needs richer state than the current generic finder model.

### `platform-api-service`

Beat agents depend heavily on platform primitives. The platform API or a shared platform-adapter library should provide:

- canonical URL/content ID resolution
- local context fetching: parent, thread, quote, replies
- author/channel recent-content lookup
- platform-specific auth and rate-limit handling
- possibly platform feed/search adapters for ingestion

The beat-agent spec assumes this layer exists, but it is not fully represented in the current `content-attester` docs. This is an implementation prerequisite.

### `service-host`

Beat agents should be hostable as logical services in `service-host`.

They fit the existing model: long-running worker plus optional HTTP route. A configured instance might look like `us-political-twitter-beat-agent`, with its own signer key, prompt/profile, beat definition, platform credentials, and context-store path.

### Bridge creator, explorers, and CSM mediator

Beat agents do not replace bridge creator, explorers, or the CSM mediator. They supply vetted content that those services can surface.

A useful mental model:

- **Bridge creator:** figures out what ideas/statements might bridge groups.
- **Noninflammatory content creators:** write concrete posts that communicate those ideas.
- **Beat agents/content attesters:** evaluate whether those posts are actually noninflammatory for the target audience.
- **Explorers/mediators/UI:** decide which vetted posts to show to which users.


## Payment model

The stateless attester's pay-per-call cost-plus model does not perfectly fit beat agents because much of the cost is standing ingestion, not per-call LLM evaluation.

Options:

1. **Per-call with amortized surcharge.** Each call pays more than direct token/gas cost, with the surplus amortizing ingestion. This is the simplest first deployment.
2. **Subscription / pool-funded.** Donors who care about a beat fund the agent's ongoing operation; per-call evaluations are free or cheap. This matches Commonality's public-good economics but adds moving parts.
3. **Finder-fronted only.** No public attester API; finders pay all evaluation and ingestion costs from expected rewards. Economically clean but too restrictive.

Default recommendation: **start with (1)**. Preserve the option to add (2) later for beats that have public-good demand but low call volume. Avoid (3) as the only mode because public "please evaluate this post" calls have independent value.

Abstentions should cost the same as positive/negative decisions. Otherwise callers can externalize the cost of exploring beat boundaries, and operators are punished for being honest.


## Beat granularity and coverage

A "beat" is chosen by the operator of a beat-agent instance. Examples:

- US immigration discourse on Twitter/X
- EA Forum AI-safety threads
- r/neoliberal
- a curated list of political YouTube channels

Operators should organically carve out beats where they believe there is enough demand to sustain ingestion and evaluation.

The main failure mode is **coverage gaps**. If no agent covers a post's beat, requests abstain and no funding flows. Mitigations:

- surface posts that abstained for lack of beat coverage in the funding UI
- let potential operators see latent demand for uncovered beats
- subsidize new beat agents for their first N months
- run a broad shallow generalist agent for the long tail, with a high abstention rate

None of these need to be in v1, but the data model should not hide abstentions: lack-of-coverage is useful market information.


## Context memory and decay

Beat agents should not keep an ever-growing raw transcript in prompt context. They need a memory system that resembles how humans remember social discourse: recent material is high-resolution; older material decays into lower-resolution summaries.

Recommended approach:

- store raw ingested items durably for audit/debug where legally and practically possible
- maintain timestamped observations extracted from recent discourse
- periodically compact older observations into coarser summaries
- retrieve only relevant recent observations and summaries during evaluation
- attach timestamps and source/support references to observations

A rough decay model:

- last few days: relatively detailed summaries and examples
- last few weeks: topic/account-level summaries
- older: coarse reputation/context bits, unless still repeatedly reinforced

This should be treated as an implementation area, not a settled algorithm. The key product constraint is that stale ambient context must not silently dominate current evaluation.


## Adversarial considerations

A beat agent's standing context is built from attacker-controllable posts. This is a larger threat surface than stateless attestation.

Main threats:

- **Prompt injection through ingested content.** Treat all ingested content as data, never instructions. Keep strict prompt boundaries.
- **Coordinated context poisoning.** Attackers flood the beat to make a phrase/account look sincere, ironic, toxic, etc. Defenses include source-diversity weighting, slow context updates, anomaly detection, and transparent reasoning.
- **Beat-shifting attacks.** Attackers manipulate one beat to affect evaluations in another. This is partly a trust/configuration problem: downstream users choose which agents to trust for which beats.
- **Stale-context errors.** A phrase or dispute changes meaning, but the agent's older summary persists. Use timestamped observations, decay, and citations.

The central mitigation is auditability. Beat agents should publish enough reasoning that downstream users can see when a decision depended on contested ambient context.


## Published reasoning and citations

Existing attesters already publish reasoning to IPFS. Beat agents should publish richer explanation documents that distinguish local and ambient context.

Suggested explanation shape:

```json
{
  "attesterType": "beat-agent",
  "beatId": "us-political-twitter",
  "decision": "positive",
  "confidence": "high",
  "reasoning": "...",
  "localContextUsed": [
    {
      "type": "parent_post | thread | quote | reply | author_recent_post",
      "contentCanonicalId": "...",
      "summary": "..."
    }
  ],
  "ambientContextUsed": [
    {
      "observation": "This phrase has recently been used in this beat to refer to ...",
      "observedAt": "2026-05-01T00:00:00Z/2026-05-15T00:00:00Z",
      "confidence": "medium",
      "supportingExamples": ["content-id-1", "content-id-2"],
      "sourceAuthorCount": 4,
      "timeSpanHours": 36,
      "diversityScore": 0.82
    }
  ]
}
```

The point is not to publish the entire memory store. The point is to make the load-bearing contextual assumptions inspectable. `sourceAuthorCount`, `timeSpanHours`, and `diversityScore` expose aggregate support strength without publishing the raw source-author list.


## Reconciliation with other specs

Some older docs describe noninflammatory-content attestations as "fairly objective" and evaluable by looking at the content itself. That remains true for long-form or self-contained content, but it is not true for many short-form social posts.

The reconciled model is:

- **Long-form/self-contained content:** simple centralized attester model is fine.
- **Short-form/social content with local context only:** stateless content attester can work if platform local-context fetching is good enough.
- **Short-form/social content with load-bearing ambient context:** beat agent or abstention required.

Any docs that imply all noninflammatory content can be judged from the item alone should be updated to this distinction.


## Implementation status

The current implementation is best understood as **competent v1 scaffolding**, not a deploy-ready beat agent. The core service boundary and many first-pass primitives exist, but the runtime still needs to be wired into an actual long-running agent that follows a beat over time.

### What is implemented

- A new `beat-agent/` package with TypeScript schemas for three-valued decisions (`positive`, `negative`, `abstain`) and beat-agent explanation/log documents.
- Attester-mode HTTP service using `attester-core` conventions: `/evaluate-content`, `/quote`, `/health`, `/status/:statementCid/:contentCanonicalId`, payment validation, rate limiting, IPFS explanation upload, and positive-only publishing to `AlignmentAttestations`.
- JSONL operator logs for all paid evaluations, including negative decisions and abstentions.
- JSONL-based idempotency for previously published positive evaluations when an evaluation log is configured.
- Minimal beat ingestion primitives with JSON state, source cursors, deduplication, rate-limit/credential/adapter skips, and a concrete Twitter/X adapter for account, query, and list sources.
- Minimal context-memory primitives: observation extraction with per-item failure isolation, JSON persistence, keyword/recency retrieval, source-diversity/time-span weighting, and coarse compaction.
- Optional LLM-backed observation extractor helper, plus default text-based extraction.
- Prompt-boundary hardening for LLM prompts: attacker-controlled content is wrapped as untrusted data, delimiter smuggling is stripped, and per-item truncation is applied.
- Richer ambient-context citation metadata in explanations: source author count, time span, and diversity score.
- Minimal finder-mode helper that scans ingested items, submits selected candidates to an attester endpoint, and records submitted/not-promising/failed outcomes with retry counts.
- Coverage-gap mining helpers for the JSONL evaluation log.
- `service-host` registration and env loading for hosted beat-agent HTTP apps and worker processes.
- A supervised worker loop that schedules ingestion, observation extraction, memory compaction, and optional finder-mode passes.
- UI/settings support for trusted beat-agent identities and content-coverage indicators.
- Unit/integration tests for the main package; current `beat-agent` typecheck and test suite pass.

### What is not yet implemented / not yet good enough

- URL/content resolution is now hardened when `BEAT_AGENT_PLATFORM_API_URL` is configured: `contentUrl` requests resolve through `platform-api-service` local context, use the resolved target text, and reject canonical-ID mismatches. Structured `contentCid` documents are also checked when they declare `canonicalId` or `contentCanonicalId`. Caller-supplied raw `contentText` still cannot be independently verified and should be trusted only in operator/debug flows.
- Ingestion has basic per-source fetch-failure isolation (`fetch_failed` skipped-source summaries), but broader runtime resilience/observability still depends on the real long-running worker.
- Memory quality is still primitive: default observations are mostly raw text, retrieval is keyword-based, and compaction is not real semantic summarization/decay. Extraction failures are isolated per item, but there is not yet production-grade retry/backoff for failed extraction work.
- Finder mode is infrastructure only. The default selector submits any non-empty ingested text, which is not a useful product judgment and can waste paid evaluations.
- Idempotency now checks the on-chain `AlignmentAttestations.hasAttestation` tuple before evaluating, with JSONL log lookup retained as a local optimization. It is still not fully safe for multi-instance/concurrent duplicate submissions because there is no transactional reservation or no-op-on-duplicate publish path.
- UI auditability is incomplete. Trusted-source chips and coverage badges exist, and the beat-agent status API now reports existing-attestation metadata when available, but users cannot yet inspect beat-agent explanation documents and context citations in detail.
- Adversarial hardening is only a first layer. The implementation still lacks anomaly detection, reputation weighting, contested-observation detection, stronger stale-context handling, and trust-policy surfacing.


## Smallest viable first deployment

The ideal first beat is the one where the noninflammatory-content use case has concrete demand and where platform access is feasible. Product-wise, "US political Twitter/X" is the obvious candidate; engineering-wise, API access may make a narrower curated-source beat easier.

A practical first deployment should be deliberately narrow:

- one beat with a curated list of sources;
- one noninflammatory prompt/profile;
- attester mode before public finder mode;
- scheduled ingestion and LLM-backed observation extraction;
- operator-visible logs and coverage-gap reports;
- manual/operator review of early explanations and abstentions;
- no public finder rewards until the candidate selector is better than "non-empty post".


## Current to-do list

### P0 — required before any real deployment

1. **[x] Implement the real long-running worker.**
   - Replace the stub `beat-agent/src/index.ts run()` with a supervised loop.
   - Schedule ingestion for configured sources.
   - Run observation extraction for newly ingested items.
   - Periodically compact memory.
   - Optionally run finder mode.
   - Support graceful shutdown and clear runtime logging.

2. **[x] Wire LLM observation extraction into runtime config.**
   - Make `BEAT_AGENT_LLM_EXTRACTION_ENABLED=true` actually select `createLlmObservationExtractor` in the worker.
   - Keep a safe fallback for deployments that intentionally use text-only extraction.
   - Document expected cost/rate-limit implications.

3. **[x] Fix content resolution and canonical-ID validation where possible.**
   - `contentUrl` now uses `platform-api-service` local-context resolution when `BEAT_AGENT_PLATFORM_API_URL` is configured, returns the resolved target text, and rejects canonical-ID mismatches.
   - Structured `contentCid` documents are checked when they declare `canonicalId` or `contentCanonicalId`.
   - Raw `contentText` remains unverifiable by nature; deployers should prefer URL/CID submissions for public evaluation.

4. **[x] Make ingestion resilient per source.**
   - Catch `adapter.fetchSource` failures per source.
   - Add a `fetch_failed` skipped-source reason with useful error metadata.
   - Continue polling other sources when one source fails.
   - Add tests for partial ingestion failure.

5. **Partially done: replace local-log idempotency with durable idempotency.**
   - [x] Query chain state (`AlignmentAttestations.hasAttestation`) for prior positive attestations before evaluation.
   - [x] Keep JSONL lookup as a local optimization only.
   - [ ] Handle concurrent duplicate requests safely across multi-instance deployments (transactional reservation/store or a publish path that does not emit duplicate events).

### P1 — needed before trusting decisions at scale

6. **Improve memory quality.**
   - Make LLM-backed extraction the normal path for real deployments.
   - Add semantic summarization/decay instead of keyword-frequency compaction.
   - Track stale observations and prevent old summaries from silently dominating current context.

7. **Build a real finder candidate selector.**
   - Replace the default "any non-empty text" selector for production deployments.
   - Score whether an item is plausibly aligned, noninflammatory, on-beat, and worth paying to evaluate.
   - Record why candidates were selected or rejected.

8. **Partially done: expose explanation/citation details in UI and status APIs.**
   - [x] Return existing-attestation metadata, including explanation CIDs when available from the local log, from the beat-agent status API.
   - [ ] Retrieve and display explanation documents in the UI.
   - [ ] Show local context, ambient observations, diversity score, source-author count, and time span.
   - [ ] Make thinly sourced ambient context visibly different from well-supported context.

9. **Continue adversarial hardening.**
   - Ingestion-time anomaly detection for sudden low-diversity volume spikes.
   - Account/source reputation weighting, not just raw source-author counts.
   - Contested-observation detection for conflicting meanings of the same phrase.
   - Explicit cross-beat isolation if memory ever becomes shared.
   - UI/trust-policy controls such as ignoring positive decisions whose load-bearing ambient context has low diversity.

10. **Add deployment-level observability.**
    - Metrics for ingestion success/failure, extraction cost, abstention rates, publication rate, duplicate requests, and finder spend.
    - Operator dashboards or reports built on the evaluation log and coverage-gap summaries.

### P2 — product/depth improvements

11. **Expand platform adapters only after the first beat works.**
    - Add Bluesky/RSS/Reddit/etc. adapters as demanded by actual beats.
    - Keep local-context fetching and canonical ID semantics consistent across platforms.

12. **Improve coverage-gap market signals.**
    - Surface repeated `outside_beat` / `insufficient_ambient_context` abstentions to operators or funders.
    - Help potential operators see latent demand for uncovered beats.

13. **Revisit payment economics after observing real usage.**
    - Start with per-call amortized surcharge.
    - Consider subscription/pool funding for beats with public-good demand but low call volume.

