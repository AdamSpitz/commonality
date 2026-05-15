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
- academic philosophy Bluesky
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
      "supportingExamples": ["content-id-1", "content-id-2"]
    }
  ]
}
```

The point is not to publish the entire memory store. The point is to make the load-bearing contextual assumptions inspectable.


## Reconciliation with other specs

Some older docs describe noninflammatory-content attestations as "fairly objective" and evaluable by looking at the content itself. That remains true for long-form or self-contained content, but it is not true for many short-form social posts.

The reconciled model is:

- **Long-form/self-contained content:** simple centralized attester model is fine.
- **Short-form/social content with local context only:** stateless content attester can work if platform local-context fetching is good enough.
- **Short-form/social content with load-bearing ambient context:** beat agent or abstention required.

Any docs that imply all noninflammatory content can be judged from the item alone should be updated to this distinction.


## Implementation plan / to-do list

High-level implementation sequence:

1. **Define the service boundary.** ✅ Initial package/schemas added in `beat-agent/`.
   - Add a `beat-agent` logical service spec/package.
   - Decide exact API compatibility with `content-attester`.
   - Add three-valued decision semantics: positive, negative, abstain.

2. **Extend/shared content evaluation schemas.** ✅ Initial schemas/log decision added in `beat-agent/`.
   - Add explicit abstention fields.
   - Define explanation IPFS schema with local/ambient context citations.
   - Decide whether negative/abstain results are merely API responses or also stored in an operator-visible log for coverage-gap analytics. **Decision: store all paid evaluations in an operator-visible log; negative/abstain results are useful demand and coverage-gap signals even though they do not publish positive attestations.**

3. **Build platform local-context primitives.**
   - In `platform-api-service` or a shared adapter library, support canonical resolution plus parent/thread/quote/reply/author-recent lookup.
   - Start with the platform needed for the first deployment, probably Twitter/X if API access is practical, otherwise Bluesky or another easier source.

4. **Build minimal beat ingestion.**
   - Configure a beat as a set of accounts, queries, lists, RSS feeds, or platform firehose filters.
   - Persist ingested items and timestamps.
   - Respect platform rate limits and credentials.

5. **Build context memory v1.**
   - Extract timestamped observations from ingested items.
   - Store observations in a simple persistent store.
   - Retrieve relevant observations for a submitted content item.
   - Add coarse compaction/decay; do not over-engineer the first version.

6. **Implement attester mode.**
   - Reuse `attester-core` for HTTP/payment/LLM/IPFS where possible.
   - Publish positive attestations to `AlignmentAttestations` with the same content-ID scheme as `content-attester`.
   - Charge for abstentions.

7. **Implement finder mode.**
   - Scan the beat for promising posts.
   - Submit candidates to the beat agent's own attester endpoint or another configured attester.
   - Track processed items and avoid repeated submissions.
   - Later: connect finder rewards/scout economics if not already available for content funding.

8. **Integrate with `service-host`.**
   - Register `beat-agent` as a hosted service kind.
   - Support multiple configured beat-agent instances, each with its own signer key and beat definition.

9. **Integrate with UI/settings.**
   - Let users trust beat-agent attester identities like other content attesters.
   - Show beat identity and context-citation reasoning on attestation details.
   - Surface abstentions/lack-of-coverage as operator-facing demand signals.

10. **Clarify overlapping docs.**
    - Update `content-finder` docs so future feed-watching adapters do not duplicate beat-agent responsibilities.
    - Update Subjectiv/trust-model language that overstates how context-free noninflammatory evaluation is.
    - Update `content-attester` docs to mention when stateless evaluation should abstain or delegate to a beat agent.


## Smallest viable first deployment

The ideal first beat is the one where the noninflammatory-content use case has the most concrete demand and where platform access is feasible.

Product-wise, "US political Twitter/X" is the obvious first beat. Engineering-wise, API access may make another source easier. A practical first deployment could be:

- a curated list of accounts in one political discourse area
- one noninflammatory prompt/profile
- attester mode first
- simple ingestion and timestamped summaries
- no public finder rewards initially
- manual/operator UI for inspecting abstentions and context citations

Once attester mode works, enable finder mode for the same beat.
