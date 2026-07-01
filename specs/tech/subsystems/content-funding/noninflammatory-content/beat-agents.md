# Beat Agents

A beat agent is a stateful AI service that *follows the conversation* in a particular slice of discourse — a "beat" — the way a human columnist, community moderator, or highly engaged reader would. The term is intentionally abstract: a beat agent is not inherently "a content attester" or "a bridge finder." It is a purpose-guided discourse-following agent that maintains memory for one or more declared purposes and exposes APIs suited to those purposes.

This spec explains why beat agents are needed, how they relate to the existing AI-service ecosystem, which services they overlap with, and what needs to be implemented before the first deployment. One important capability is stateful content attestation, whose concrete mechanics — payment, attester identity, IPFS reasoning, on-chain positive attestations — should reuse the patterns from [content-attesters.md](../content-attesters.md) except where noted. But content attestation is only one possible capability on top of beat memory.

## Summary

Beat agents make sense because many useful AI tasks over social discourse cannot be performed from a single post in isolation. A tweet can be sincere, sarcastic, a callback, an in-group reference, a dunk, or a dog whistle depending on recent discourse. A stateless per-call evaluator can fetch the parent tweet and thread, but it cannot reconstruct "what everyone in this corner of Twitter has been arguing about this week."

A beat agent is therefore fundamentally:

```text
BeatAgent
  follows: BeatDefinition
  maintains: BeatMemory
  guided by: Purpose[]
  exposes: CapabilityAPI[]
```

The current implementation started with the content-attestation use case, but the concept should be broader:

- **Civility content attestation:** keep enough discourse context to tell whether a post is noninflammatory / aligned with a civility criterion.
- **Content discovery:** notice promising posts from the beat and submit them for evaluation.
- **CSM bridge support:** notice live tensions, recurring misunderstandings, moderate-compatible claims, and opportunities for nudging toward common ground.
- **Context provider:** expose or publish beat observations that other services, especially the CSM `bridge-creator`, can use when synthesizing bridge statements.

A single beat-agent deployment may combine multiple compatible purposes. Following a beat is expensive; if "keep enough context to judge civility" and "notice common-ground opportunities" require watching mostly the same discourse, it can be cheaper and better to run one multi-purpose agent than two separate ingestion/memory systems. Purposes can interfere, and that is acceptable: an over-broad or internally conflicted beat agent may become expensive, noisy, or ineffective. Operators can experiment with purpose combinations and split agents when separation works better.

For content attestation specifically, beat agents are **not** a replacement for the stateless `content-attester`:

- **Stateless content attester:** best for long-form or self-contained content — articles, Substack posts, YouTube transcripts, pasted text, or social posts where local context is enough.
- **Beat agent with a content-attestation purpose:** best for short-form social content where evaluation depends on the running discourse in a community or topic area.

From the rest of Commonality's content-attestation machinery, a positive beat-agent attestation and a positive stateless content-attester attestation are interchangeable: both publish to `AlignmentAttestations` using the same content-ID scheme. Users choose which attester identities they trust.

## The refactoring: split the substrate from its consumers

This section explains the "one new primitive, several ordinary consumers" idea behind the package layout. The core split is **done**; a few consumer-side moves remain. Use the at-a-glance table to see done vs. left; the subsections below give the rationale (still worth reading before touching the boundary).

### Refactoring status at a glance

| Piece | State |
|---|---|
| **1. Extract `beat-memory` substrate from `beat-agent`.** Separate workspace/package, own ingestion loop + memory + `GET /context`; `service-host` runs it as its own logical service; config moved to `BEAT_MEMORY_*`; no compat re-exports. | ✅ **Done** |
| **2. Beat-aware attester as a thin `attester-core` consumer** that reads `beat-memory` for ambient context and adds the three-valued `abstain` outcome. | ✅ **Done** (kept deliberately separate from `content-attester`) |
| **3. Bridge/context consumers read `beat-memory`'s context API** instead of growing their own beat memory. | 🟡 **Mostly wired** — `bridge-creator` already fetches a generic `/context` endpoint from trusted context sources; no bespoke bridge memory exists. |
| **4. Decide whether to merge the beat-aware attester into `content-attester`.** | ⬜ **Deferred** — intentionally postponed until the package boundary is proven. |
| **5. Fold the beat finder into `finder-core`/`content-finder`.** | 🟡 **Started** — beat finder state persistence now uses `finder-core`; candidate scoring/submission logic still lives in `beat-agent/finder.ts`. |
| **6. `beat-memory` package README.** | ✅ **Done** — substrate responsibilities, config, worker/API usage, adapters, and feedback loops are documented in `beat-memory/README.md`. |

Everything past piece 3 is optional consolidation, not a blocker. The rest of the remaining work (pilot rehearsal, retrieval quality, poisoning mitigation, finder judgment) is quality/depth hardening, tracked in [Current to-do list](#current-to-do-list), not refactoring.

The original `beat-agent` package had grown into one workspace/process that maintained beat memory, served an attester HTTP API, ran a finder loop, and exposed a context API — "one piece or four wearing a trench coat." The refactor split the genuinely new substrate from the ordinary consumers that happen to use it: `beat-memory` now owns following/context memory, and `beat-agent` is the beat-aware content-attestation/finder consumer.

Backward compatibility was not a constraint. We have no external users yet, so downstream code was fixed in-place rather than preserving old package exports or old config spellings — and the same applies to the consumer-side moves still outstanding.

### The core insight: one new primitive, several ordinary consumers

Re-read the original justification for a multi-role agent (see the Summary above and the Purpose model below): *following a beat is expensive, so several uses should share one ingestion/memory system rather than standing up a parallel one each.* Look carefully at **what** is expensive-and-shared: the **ingestion loop and ambient-context memory store** — the thing this spec already names `BeatMemory`. That is the one genuinely-new primitive in the system.

The attester, the finder, and bridge/context callers are ordinary *consumers* that read that memory. Each already corresponds to concepts elsewhere in the platform (`attester-core`, `finder-core`, bridge/context consumption). They were fused into one package because they were built together, not because the design needed them fused.

So the split was: **extract `beat-memory` as its own follower/context substrate, and let attesters, finders, and bridge/context services be thin consumers of it.**

Crucially, this preserves the original rationale: all consumers still point at the *same* beat-memory instance, so ingestion is still done once. We are not duplicating the expensive part. We only refuse to bundle the substrate with its consumers.

### Two kinds of sharing — keep one, remove the other

The word "shared" has been doing double duty. Pull the two meanings apart:

- **Multi-consumer sharing** — attester + finder + bridge/context callers all reading one memory. This is the part that was split out. These consumers do not own the follower's ingestion loop or memory lifecycle.
- **Multi-purpose memory sharing** — one beat following and remembering for several overlapping memory purposes at once. This stays inside `beat-memory`. Purposes shape ingestion, extraction, memory decay, retrieval, per-purpose snapshots, and source-management. This is the good, load-bearing complexity — the reason the substrate exists.

In short: remove the false complexity of consumers pretending to be part of the organism, and keep the real complexity of a purpose-aware standing memory.

### Purpose/capability terminology after the split

Do not use one `purposes` list for both memory-shaping goals and consumer attachments. That was the main conceptual muddle in the first implementation.

Use two layers:

| Layer | Meaning | Examples |
|---|---|---|
| **Memory purpose** | What the follower should notice, summarize, preserve, retrieve, and manage sources for. These purposes shape `beat-memory`. | `civility_context`, `bridge_opportunity_context`, `general_beat_context`, `source_management` |
| **Consumer capability** | What another service does with the memory. These do **not** own ingestion/memory. | `content_attestation`, `content_discovery`, `context_api`, `bridge_context_handoff` |

A consumer can still affect the memory indirectly by declaring what memory purpose it needs. For example, a beat-aware content attester is a `content_attestation` capability that requires `civility_context`; the fact that it is an attester is a consumer attachment, but the need to remember inflammatory framings, factional sensitivities, dog whistles, and phrase meanings is a real memory purpose. Likewise, bridge synthesis is not a memory purpose, but `bridge_opportunity_context` is.

This distinction should be reflected in new code and config. Avoid preserving the old names (`civility_attestation`, `content_discovery`, `bridge_opportunity_detection`, `beat_context_provider`) merely for compatibility.

### Why this was mostly a packaging move, not a rewrite

The code already showed the seam, which is why the first split was low-risk:

- The memory/ingestion side (`memory.ts`, `ingestion.ts`, `extractor.ts`, source adapters, source-management machinery) imported almost nothing from the attester side. Its one stray cross-edge — a pure text helper used by `tallyIndexerAdapter.ts` — moved into the substrate.
- The attester reads memory through a narrow, read-only seam: load/query memory, then include retrieved ambient context in evaluation.
- The finder reads the ingestion stream/state and POSTs to an attester endpoint; it does not need attester internals.

That near-zero cross-import graph was the evidence the conceptual joint is real.

### Target shape (and where each piece stands)

1. ✅ **`beat-memory` — the substrate.** Owns `BeatDefinition`, memory-purpose config, ingestion loop, source adapters, observation store, extraction/compaction, purpose snapshots, `source_management`, memory health, and its own read API (`GET /context`, library-level `retrieveRelevantObservations`). It runs the one expensive standing worker. Conceptually this is the fourth AI-service verb — a **follower/context substrate** — alongside attesters (judge), finders (discover what to judge), and nudgers (suggest new things).
2. ✅ **Beat-aware attester.** A thin service on `attester-core`, structurally close to `content-attester`, whose distinctive behavior is: fetch ambient context from `beat-memory`, include cited context in the prompt/explanation, and allow a three-valued `abstain` outcome. It was kept **separate** from `content-attester`; abstention semantics, ambient citations, and memory-health behavior are enough extra surface area to keep it separate until the package boundary is proven. ⬜ Revisiting a merge into `content-attester` is a deliberately deferred later decision, not a next step.
3. 🟡 **Beat finder.** Still lives mostly in `beat-agent` (`finder.ts`) as finder/metrics-only logic that reads beat-memory ingestion state and POSTs candidates to an attester. The first consumer-side consolidation step is done: its JSON state persistence now uses `finder-core`. It is **not yet** folded into `finder-core` / `content-finder` as "a finder whose candidate feed is a beat-memory ingestion stream." Do the remaining moves only when they fall out naturally, or alongside the finder-quality work in the to-do list.
4. 🟡 **Bridge/context consumers.** Consume `beat-memory`'s context API rather than duplicating social ingestion or synthesizing their own hidden beat memory. `bridge-creator` already fetches a generic `/context` endpoint from configured trusted context sources, so the substrate/consumer boundary holds; remaining work here is pointing a real deployment's bridge creator at a real beat-memory instance, not new plumbing.

`service-host` registers `beat-memory` and the beat-aware attester as separate logical services. A typical deployment is one `beat-memory` worker/API plus zero or more consumers pointed at it.

### The first step that was taken

The first split extracted **just** `beat-memory` as its own package and made the beat-aware attester depend on it, without touching `content-attester`. Downstream imports/config/tests were updated directly, with no compatibility re-exports left in `beat-agent` to hide the split. That alone collapsed the size/trench-coat smell. The remaining consumer-side moves (pieces 3–5 above) follow the same discipline: fix call sites in-place, no compat shims.

## Purpose model

The beat-memory substrate should declare the memory purposes that shape what it follows, what it remembers, and how it summarizes context. Consumer services should separately declare capabilities that shape which APIs they expose. Purposes are not merely metadata; they guide ingestion, extraction, memory decay, retrieval, and output filtering.

Examples:

| Memory purpose | What it remembers | Example consumer capabilities |
|---|---|---|
| `civility_context` | inflammatory framings, factional sensitivities, phrase meanings, local context needed to judge whether content will alienate a target audience | `content_attestation` |
| `source_management` | source health, coverage gaps, creator/platform skew, and ingestion quality signals | operator source-management reports |
| `bridge_opportunity_context` | live tensions, recurring misunderstandings, moderate-compatible claims, statements that different factions might both sign with small wording changes | `bridge_context_handoff` |
| `general_beat_context` | summarized observations, citations, topic/faction maps, current discourse state | `context_api`, IPFS-published context snapshots |

A deployment can combine memory purposes when they are operationally compatible. It is fine if some combinations turn out to be bad: the result may simply be noisy, expensive, or ineffective memory, and operators can split the beat/purpose into multiple followers. The important requirement is that purposes and consumer capabilities be explicit and inspectable so users and downstream services know what kind of memory and judgment they are relying on.

Private/internal memory may include ugly or inflammatory discourse. Public outputs should be filtered by the capability's purpose: remembering an inflammatory meme because it explains a factional reference is different from recommending that meme to users.

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

## Capabilities and APIs

A beat-agent deployment may enable one or more capabilities. The current implementation has focused on attester mode and finder mode, but the model should allow additional purpose-specific APIs without redefining what a beat agent is.

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

Beat agents do not replace bridge creator, explorers, or the CSM mediator. They maintain discourse context that those services may consume.

The CSM `bridge-creator` especially should not duplicate beat-following machinery if a relevant beat agent already exists. Bridge creation needs to know what people on the beat are actually arguing about, which phrases are live, where factions misunderstand each other, and which moderate-compatible claims are already present in the discourse. That is beat-agent context. The bridge creator's job is then to synthesize candidate bridge/common-ground statements from that context and from Conceptspace statements.

A useful mental model:

- **Beat agent:** follows a beat, maintains purpose-guided memory, and exposes capabilities over that memory.
- **Bridge creator:** consumes statements plus beat context/opportunities to synthesize bridge statements.
- **Noninflammatory content creators:** write concrete posts that communicate those ideas.
- **Beat agents/content attesters:** evaluate whether those posts are actually noninflammatory for the target audience, when the beat agent has a content-attestation purpose.
- **Explorers/mediators/UI:** decide which statements, opportunities, or vetted posts to show to which users.

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

The current implementation is best understood as **v1 scaffolding with the package split now done**, not a deploy-ready autonomous public beat agent. The code has working substrate/consumer boundaries and many first-pass primitives, but it still needs a realistic pilot rehearsal and quality hardening before operators should trust decisions at scale.

### What is implemented now

**Package/service split**

- `beat-memory/` is now a separate workspace and root package. It owns the follower/context substrate: `BeatDefinition`, memory-purpose config, ingestion, source adapters, observation extraction, JSON memory, compaction, purpose snapshots, source-management observations/reports, and a small context API.
- `beat-agent/` no longer contains local substrate implementations or compatibility re-exports for memory/ingestion/source-adapter helpers. It imports substrate types/helpers from `@commonality/beat-memory` where it needs read-only context.
- `service-host` can now run `beat-memory` as a separate logical service from `beat-agent`.
- Deployment/testnet/render env defaults moved ingestion, memory, purposes, beat definitions, worker extraction, and source-management config to `BEAT_MEMORY_*` names.
- Legacy beat-agent memory config fallbacks/fields have been removed: no `BEAT_AGENT_PURPOSES`, no `BEAT_AGENT_BEAT_DEFINITION_*`, no beat-agent memory-compaction knobs, and no beat-agent LLM-extraction flag.

**Beat-memory substrate**

- Minimal beat ingestion primitives with JSON state, source cursors, deduplication, rate-limit/credential/adapter skips, and concrete Twitter/X and Tally/indexer adapters.
- Context-memory primitives: observation extraction with per-item failure isolation, JSON persistence, BM25-style text-native retrieval over observation text/keywords/tags, source-diversity/time-span weighting, and coarse compaction.
- Optional LLM-backed observation extractor helper, plus default text-based extraction.
- Prompt-boundary hardening for LLM prompts: attacker-controlled content is wrapped as untrusted data, delimiter smuggling is stripped, and per-item truncation is applied.
- Purpose summary snapshots and advisory `source_management` reports are generated by the beat-memory worker, with deterministic fallbacks and LLM-backed generators when `BEAT_MEMORY_LLM_EXTRACTION_ENABLED=true`.
- Beat-memory exposes `GET /context?topic=...` for cited ambient observations.

**Beat-aware attester/finder consumer**

- `beat-agent/` provides TypeScript schemas for three-valued decisions (`positive`, `negative`, `abstain`) and beat-agent explanation/log documents.
- Attester-mode HTTP service uses `attester-core` conventions: `/evaluate-content`, `/quote`, `/health`, `/status/:statementCid/:contentCanonicalId`, payment validation, rate limiting, IPFS explanation upload, and positive-only publishing to `AlignmentAttestations`.
- Attester evaluation can read beat-memory's JSON memory file for ambient context and includes richer ambient-context citation metadata in explanations: source author count, time span, and diversity score.
- JSONL operator logs cover all paid evaluations, including negative decisions and abstentions. JSONL lookup remains a local idempotency fast path for previously published positives.
- Finder mode is now finder/metrics-only: it reads beat-memory-produced ingestion state, scans ingested items, submits selected candidates to an attester endpoint, and records submitted/not-promising/failed outcomes with retry counts. It no longer ingests sources or mutates memory.
- Coverage-gap mining helpers exist for the JSONL evaluation log.
- UI/settings support exists for trusted beat-agent identities and content-coverage indicators.
- Focused typechecks/tests for `beat-memory`, `beat-agent`, and `service-host` pass, and the full pre-commit hook passed for the split commit.

### What is not yet implemented / not yet good enough

- URL/content resolution is now hardened when `BEAT_AGENT_PLATFORM_API_URL` is configured: `contentUrl` requests resolve through `platform-api-service` local context, use the resolved target text, and reject canonical-ID mismatches. Structured `contentCid` documents are also checked when they declare `canonicalId` or `contentCanonicalId`. Caller-supplied raw `contentText` still cannot be independently verified and should be trusted only in operator/debug flows.
- Ingestion has basic per-source fetch-failure isolation (`fetch_failed` skipped-source summaries), but broader runtime resilience/observability still depends on the real long-running worker.
- Memory quality is improving: LLM-backed observation extraction is wired when `BEAT_MEMORY_LLM_EXTRACTION_ENABLED=true`, memory compaction produces a semantic discourse narrative via LLM (same flag), stale-observation tracking is in place (`lastActiveAt` field on observations, updated via keyword-overlap reinforcement, used in recency scoring), and retrieval now uses a local BM25-style lexical scorer plus plain-text tags/exact phrase/handle/hashtag boosts. Retrieval still lacks LLM reranking and has not yet been evaluated against real pilot misses.
- Finder mode is infrastructure only. The default selector now applies quality scoring (length, URL density, all-caps) and optional beat-keyword filtering (`beatKeywords` / `BEAT_AGENT_BEAT_KEYWORDS`), but there is no semantic/LLM-based topic confirmation — that remains a possible P2 enhancement.
- Idempotency is now two-layered: (1) in-process deduplication via a `Map` of in-flight evaluation Promises keyed by `contentCanonicalId:statementCid` — concurrent requests within one process share one evaluation and the second gets `alreadyAttested: true`; (2) cross-instance safety via a pre-publish chain check (`checkExistingBeforePublish`) that re-queries `AlignmentAttestations.hasAttestation` right before submitting a transaction, so if another instance already published, the transaction is skipped. JSONL log lookup is retained as a local fast-path optimization.
- UI auditability is still incomplete but improving. Trusted-source chips and coverage badges exist, the beat-agent status API reports existing-attestation metadata when available, and content-funding attestation chips can now load an explanation document from a trusted beat agent's configured service URL. The UI shows compact tooltip reasoning plus a chip-click audit dialog with full reasoning, metadata, local context, and ambient citation details. Thinly sourced ambient context is visibly warned/labeled, though user-configurable trust-policy enforcement is still future work.
- Adversarial hardening has grown: `detectIngestionAnomalies` catches low-diversity volume spikes and single-run floods; `detectContestedObservations` surfaces observations about the same keywords from non-overlapping author communities. Remaining gaps: account/source reputation weighting (requires external reputation data), configurable UI trust-policy enforcement (diversity data is in explanation documents; the user-facing filter is not yet built).

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

## Implementation direction: purpose-guided beat memory plus consumers

The codebase now reflects the first architectural split: `beat-memory` is the purpose-guided follower/context substrate, while `beat-agent` is a content-attestation/finder consumer. The next implementation work should harden that split in a realistic pilot rather than re-merging responsibilities.

Recommended next steps:

1. ~~**Add explicit purpose configuration.**~~ ✅ Done in the first purpose-guided implementation pass. Beat-memory config and beat definitions now declare purposes such as `civility_context` and `bridge_opportunity_context`; beat-agent declares consumer capabilities such as `content_attestation`.
2. ~~**Thread purposes into memory extraction.**~~ ✅ Done at the scaffolding level. Worker extraction and the LLM observation extractor receive active purposes.
3. ~~**Separate memory from outputs.**~~ ✅ Done at the first-pass level. Observations can be purpose-tagged and retrieval can filter by requested purpose/capability.
4. ~~**Expose a minimal context/bridge API.**~~ ✅ Done in `beat-memory` as `GET /context?topic=...`, returning cited ambient observations rather than final bridge statements.
5. **Keep bridge synthesis in `bridge-creator`.** Do not move bridge-statement generation into beat agents unless there is a later deliberate product decision. Beat agents should provide discourse context/opportunities; bridge creator should synthesize statements.
6. ~~**Update service metadata.**~~ ✅ Done as `GET /metadata`, exposing beat ID, purposes, and available capabilities.

Non-goals for the next pass:

- Do not invent a large general plugin framework before one more concrete purpose is implemented.
- Do not duplicate full social-media ingestion inside `bridge-creator`.
- Do not remove the existing content-attestation API; it remains the first concrete capability.

## Current to-do list

The recent implementation is competent v1 scaffolding: good enough to pilot behind an operator, not yet good enough to trust as an autonomous public beat agent. Split remaining work into **testnet blockers**, **pilot requirements**, and **later product/depth improvements**.

### P0 — do now before deploying to testnet

These are small correctness/documentation issues that should be fixed before anyone treats a testnet deployment as representative.

1. ~~**Fix concurrent-dedupe response semantics.**~~
   - ✅ Done. In-flight request sharing now returns `deduplicated: true` and preserves `alreadyAttested` as true only for an actual previously published positive attestation.

2. ~~**Fix existing-attestation metadata returned from JSONL lookup.**~~
   - ✅ Done. `findExistingAttestationFromJsonl` now returns the real subject ID derived from `getSubjectIdForContentCanonicalId`.

3. ~~**Update beat-agent docs to match the code.**~~
   - ✅ Done for the immediate stale README issues: UI trust-policy warnings and the scored/keyword finder selector are now described accurately.
   - ✅ Done for the extracted substrate package: `beat-memory/README.md` now documents the package boundary, `BEAT_MEMORY_*` config, worker/API usage, current adapters, and development feedback loops.
   - Keep this spec, package READMEs, and any operator docs in sync so future implementers do not work from stale status notes.

4. ~~**Add canonical-ID based local-context lookup, not only URL-based lookup.**~~
   - ✅ Done. `platform-api-service` `/context/local` accepts either `url` or `canonicalId`, and beat-agent content/context builders now fetch local context by canonical ID for non-URL submissions while retaining URL canonical-ID validation.

5. ~~Beat-agent dynamic source management.~~ Moved to P1 as an LLM-reflective source-management design. The old phrasing made this sound like a hand-built source-ranking algorithm and was too broad for a pre-testnet correctness item. The remaining P0 should be validating the current scaffold in a realistic rehearsal.

6. **Run and record one realistic end-to-end testnet rehearsal.**
   - Use a narrow curated beat, scheduled ingestion, LLM-backed extraction, attester mode, and no public finder rewards.
   - Manually inspect several explanation documents, including positives, negatives, and abstentions. Confirm that retrieved ambient context is relevant, citations are understandable, and abstentions happen when context is insufficient.

### P1 — required before trusting decisions at scale, but not necessarily before first testnet pilot

1. ~~**Add purpose-level summary snapshots.**~~
   - ✅ Done at the scaffolding level. Worker ticks now refresh timestamped, purpose-tagged `purposeSummarySnapshots` in the beat memory file for each active purpose, above detailed observations.
   - Current storage policy: keep a bounded rolling history per beat/purpose (currently five snapshots per purpose by default), not indefinite archival. Snapshots are separate from observations and are not part of ordinary observation compaction.
   - Snapshots include live topics, phrase-meaning/faction/uncertainty excerpts when detectable, recurring gaps, useful context, source/coverage notes, source observation IDs, and recent worker metrics.
   - The current generator is deterministic/heuristic over recent purpose-filtered observations plus metrics. This is useful scaffolding, but it is not the intended mature design.

2. ~~**Replace heuristic purpose snapshots with LLM-authored purpose summary refresh.**~~
   - ✅ Done at the wiring/scaffolding level. `generatePurposeSummarySnapshots` now accepts a pluggable `BeatPurposeSummarySnapshotGenerator`, passes recent purpose-filtered detailed observations, relevant compacted evidence summaries, the previous snapshot for the same beat/purpose, and recent metrics, and keeps snapshots separate from ordinary evidence compaction.
   - `createLlmPurposeSummarySnapshotGenerator` uses OpenRouter to produce structured purpose snapshots (summary, live topics, factions, phrase meanings, uncertainties, recurring gaps, useful context, source/coverage notes). When `BEAT_MEMORY_LLM_EXTRACTION_ENABLED=true`, the worker uses the LLM generator; otherwise the deterministic heuristic generator remains as a cheap fallback.
   - Bounded rolling snapshot history remains in place. Current/latest snapshots are intended as operator/prompt-context, while detailed and compacted observations remain the citeable evidence-memory layer.

3. ~~**Add an LLM-reflective source-management meta-purpose.**~~
   - ✅ Done at the first scaffolding level. `source_management` is now a valid non-user-facing beat-agent purpose.
   - `generateSourceManagementObservations` turns purpose summaries, source-coverage notes, coverage-gap notes, and finder/evaluation outcome notes into natural-language `source_management` observations about source-list health (under-coverage, skew, noisy sources, narrow assignments, repeated outside-beat demand, etc.).
   - This deliberately produces advisory evidence rather than a clever hand-coded source-ranking algorithm. The next P1 item should run a periodic LLM reflection over these observations plus beat definitions/metrics and produce manager reports/proposed source-list updates.

4. ~~**Add periodic source-management reflection and manager reporting.**~~
   - ✅ Done at the advisory/reporting level. Worker ticks that include the `source_management` purpose now turn source-management observations into persisted `sourceManagementReports` in the memory file.
   - With `BEAT_MEMORY_LLM_EXTRACTION_ENABLED=true`, the report is generated by an LLM prompt over the beat definition, declared purposes, current effective source list, purpose snapshots, source-management observations, and recent metrics. Without LLM extraction, a deterministic heuristic report keeps the supervision channel available in tests/cheap runs.
   - Reports contain structured proposed source-list updates (`add`, `remove`, `downweight`, `upweight`, `split_beat`, `narrow_query`, `broaden_query`, `ask_manager`) with evidence, confidence, and expected effect, plus explicit health flags for overloaded/underloaded/under-covered/over-broad/factionally skewed/API-blocked/boundary-uncertain assignments.
   - Current implementation is deliberately advisory-only: conventional code validates source/update shapes, persists the effective source list and report history, and does not auto-apply changes. A later deployment can add a bounded operator-approved managed overlay and source-change history.

5. **Improve memory quality beyond keyword retrieval with text-native hybrid retrieval.**
   - ✅ First text-native baseline is now in place: evaluator context includes the latest relevant purpose summary snapshot as beat-level orientation; observations can carry plain-text tags/entities/phrases; and `retrieveRelevantObservations` uses a local BM25-style lexical scorer over observations, compacted summaries, keywords, purposes, and tags, blended with existing recency and source-diversity/time-span weighting plus exact phrase/hashtag/account-handle/tag boosts.
   - Remaining work before this is trustworthy at scale: evaluate retrieval against real examples from the first beat, tune miss/false-positive behavior, consider stemming/paraphrase expansion if pilot misses justify it, and optionally add a bounded LLM reranking step that retrieves a larger candidate set cheaply and asks the current generation LLM to choose the genuinely relevant observation IDs and explain why. This keeps stored memory model-agnostic while using the LLM as a stateless query-time judge.
   - BM25 is not a large subsystem. For the current JSON-backed memory store, implement it as a local in-memory scorer rather than introducing Elasticsearch/OpenSearch/etc. A first pass can use simple tokenization, stopword removal, and document-frequency weighting; stemming and phrase-specific handling can follow if pilot examples show misses.
   - Treat purpose summaries as orientation, not as the only evidence layer. Summary-only context is too lossy for attestation decisions that need citeable support. The evaluator should still receive specific retrieved observations/compacted evidence for load-bearing ambient claims.
   - A later `summary + on-demand lookup tool` remains plausible: include the summary up front and give the evaluator LLM a bounded `lookupObservations(topic)` tool to pull specifics when the summary is insufficient. `/evaluate-content` is already a multi-second operation dominated by IPFS upload and on-chain attestation, so a small number of extra LLM round-trips may be acceptable; cap iterations to keep per-request cost predictable. Prefer the simpler retrieve-and-rerank pipeline first.
   - **LLM-portability consideration.** Vector embeddings commit the system to a specific *embedding model* (separate from the generation LLM, but still a second model dependency). Stored vectors are not comparable across models, so switching embedders requires re-embedding the entire memory store. Approaches that keep stored memory as plain text remain portable across any LLM and avoid that lock-in. Portable alternatives worth considering:
     - *Hierarchical natural-language summaries* — a "fairly detailed table of contents" that any LLM can read.
     - *Better lexical retrieval* — BM25/stemming/phrase matching over observations, compacted summaries, purpose snapshots, and tags. Still pure code, still text-only.
     - *LLM-as-retriever/reranker* — at query time, have whichever generation LLM is in use pick relevant observation IDs from a candidate list or summary index. Stateless; works with any LLM that can read text and emit JSON.
     - *LLM-assigned tags at write time* — when an observation is extracted, also assign named tags beyond the existing `purposes`. Retrieval becomes tag lookup plus lexical scoring. Tags are plain strings; the LLM is used as a stateless transformer, not a vector source.
     - *Structured entity/relation extraction* — store plain-text triples (entity, relation, entity) at write time; query by entity name. LLM-agnostic storage that any LLM can populate or query.
     - *Write-time paraphrase expansion* — have the LLM generate several paraphrases/synonyms per observation at write time; retrieval is keyword match against the expanded set. Captures some semantic variation without embeddings.
   - Evaluate the hybrid retrieval against real examples from the first beat before deciding whether embeddings are worth their operational cost. Embeddings may still be useful later, but they should be justified by observed failures of the text-native baseline, not treated as the default next step.

6. **Add LLM-authored source assessment and retrieval guidance.**
   - Existing diversity/time-span metadata helps expose thin context, but it does not distinguish reliable beat participants from obvious spam, brigading, or low-quality sources.
   - Avoid making this a manual numeric `source -> weight` configuration system. That is too operator-heavy and risks becoming a brittle heuristic approximation of social judgment. Per [Lean on AI](/specs/product/lean-on-ai.md), LLMs should make the fuzzy judgment calls, although conventional code should do the more mechanistic tasks (e.g. gather, filter, and cache evidence).
   - Proposed shape: periodically run an LLM source-assessment pass over the beat definition, declared purposes, recent ingested items grouped by source/author, extracted observations, anomaly/contested-observation reports, coverage gaps, evaluation outcomes, and any manager notes. Persist the result as (concise) plain-language source assessments, not scalar reputation scores.
   - Retrieval should use conventional code only to attach relevant source assessments to candidate observations and to enforce rare hard operator overrides such as “quarantine this source” or “outside this beat.” The evaluator/reranker LLM should decide how much the assessment matters in context: e.g. If the source assessment says “this account is useful for finding out the right-wing perspective on a topic, but can't be counted on to address the opposing arguments,” take that into account when evaluating the actual content you're looking at.
   - This should integrate with the existing `source_management` purpose: manager reports can propose source-list changes and source-assessment review targets, while source assessments provide query-time guidance to evaluators and context APIs.
   - The first implementation should be advisory and auditable: include source assessments in evaluation context and published/internal reasoning where they are load-bearing, but do not silently auto-delete sources or hard-code broad reputation claims.

7. **Strengthen poisoning defenses from “detect” to “mitigate.”
   - `detectIngestionAnomalies` and `detectContestedObservations` are useful, but they mostly surface risk after the fact.
   - Add quarantine/downweighting behavior for suspicious bursts, low-diversity observations, and contested observations unless an operator explicitly accepts them.

8. **Improve finder mode before enabling public finder rewards.**
   - The scored/keyword selector is infrastructure, not real product judgment about promising noninflammatory content.
   - Add semantic topic confirmation and/or an LLM pre-screen for candidate quality. Keep public finder rewards disabled until false-positive and spend behavior look sane in a pilot.

9. **Make reconsideration policy explicit.**
   - Finder state currently records `not_promising`, `submitted`, and failed retry outcomes durably. Decide when old `not_promising`, negative, or abstained items should be reconsidered after memory improves or beat definitions change.

10. **Improve duplicate/evaluation demand logging.**

- Existing positive attestations short-circuit evaluation, which is good, but demand from repeated requests may be invisible in coverage-gap mining if not logged distinctly.
- Record paid duplicate/status outcomes in a way that preserves demand signals without pretending a fresh evaluation happened.

### P2 — later product/depth improvements

1. **Operator dashboard over JSONL metrics/logs.**
   - Time-series metrics are persisted, but operators still need a dashboard or report view for ingestion health, extraction failures, abstention reasons, stale memory, suspicious context, and finder spend.

2. **Expand platform adapters only after the first beat works.**
   - Add Bluesky/RSS/Reddit/etc. adapters as demanded by actual beats. Do not broaden platform scope before validating one narrow beat.

3. **Improve coverage-gap market signals.**
   - Surface repeated `outside_beat` / `insufficient_ambient_context` abstentions to operators or funders.
   - Help potential operators see latent demand for uncovered beats.

4. **Revisit payment economics after observing real usage.**
   - Start with per-call amortized surcharge.
   - Consider subscription/pool funding for beats with public-good demand but low call volume.

5. **Public usability hardening.**
   - Add better onboarding/operator docs, deployment templates, example beat definitions, and a recommended manual review workflow for new beats.
