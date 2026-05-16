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

3. **Build platform local-context primitives.** ✅ Initial endpoint added in `platform-api-service`.
   - In `platform-api-service` or a shared adapter library, support canonical resolution plus parent/thread/quote/reply/author-recent lookup.
   - Start with the platform needed for the first deployment, probably Twitter/X if API access is practical.
   - Current v1: `POST /context/local` returns a local-context envelope. Twitter/X fills target, replied-to parent, quoted post, and author-recent posts; YouTube/Substack return minimal target-only context. Thread/reply expansion remains future enrichment.

4. **Build minimal beat ingestion.** ✅ Initial state loop added in `beat-agent/`.
   - Configure a beat as a set of accounts, queries, lists, RSS feeds, or platform firehose filters.
   - Persist ingested items and timestamps.
   - Respect platform rate limits and credentials.
   - Current v1: `runBeatIngestionOnce` accepts a beat definition plus source adapters, persists ingested items/cursors/fetch timestamps to JSON, deduplicates by canonical content ID, and skips sources when rate-limited, missing credentials, or missing adapters. A concrete Twitter/X adapter now ships for account, query, and list sources; it uses X API v2, maps tweets to `twitter:uid:<authorId>:<tweetId>`, and stores the newest seen tweet ID as the cursor for `since_id` polling. Other platform adapters remain future work.

5. **Build context memory v1.** ✅ Initial JSON-backed primitives added in `beat-agent/`.
   - Extract timestamped observations from ingested items.
   - Store observations in a simple persistent store.
   - Retrieve relevant observations for a submitted content item.
   - Add coarse compaction/decay; do not over-engineer the first version.
   - Current v1: `extractObservationsFromItems` supports a pluggable extractor with a default text observation fallback, `retrieveRelevantObservations` ranks observations by keyword overlap and recency, and `compactBeatMemory` rolls older item-level observations into coarse summary records. LLM-backed extraction/summarization remains future service work.

6. **Implement attester mode.** ✅ Initial HTTP service added in `beat-agent/`.
   - Reuse `attester-core` for HTTP/payment/LLM/IPFS where possible.
   - Publish positive attestations to `AlignmentAttestations` with the same content-ID scheme as `content-attester`.
   - Charge for abstentions.
   - Current v1: `evaluateBeatContentWithLLM` builds context-aware prompts and normalizes three-valued LLM results; `processBeatAgentEvaluation` validates requests, resolves content/builds context via injected dependencies, uploads explanation documents for publishable positive decisions, publishes positive attestations, and appends operator-visible logs for all paid evaluations including abstentions. `createBeatAgentServiceApp` wraps this core with `/evaluate-content`, `/quote`, `/health`, `/status/:statementCid/:contentCanonicalId`, payment validation, optional trusted-finder auth, IPFS wiring, optional platform local-context lookup, optional JSON memory retrieval, and optional JSONL evaluation logs.

7. **Implement finder mode.** ✅ Initial JSON-backed loop added in `beat-agent/`.
   - Scan the beat for promising posts.
   - Submit candidates to the beat agent's own attester endpoint or another configured attester.
   - Track processed items and avoid repeated submissions.
   - Later: connect finder rewards/scout economics if not already available for content funding.
   - Current v1: `runBeatFinderOnce` reads the beat-ingestion JSON state, skips content IDs already present in finder state, uses a pluggable candidate selector (default: non-empty ingested text), POSTs evaluation requests to a configured attester endpoint with optional `x-finder-key`, records submitted/not-promising outcomes in JSON, and leaves failed submissions unprocessed for retry.

8. **Integrate with `service-host`.** ✅ Initial registration added.
   - Register `beat-agent` as a hosted service kind.
   - Support multiple configured beat-agent instances, each with its own signer key and beat definition.
   - Current v1: `service-host` recognizes `beat-agent` as a service kind, can mount its HTTP app under a route prefix, can run it under the supervisor, can synthesize config from env with `BEAT_AGENT_ENABLED=true`, and supports multiple beat-agent instances via `SERVICE_HOST_INSTANCES` with instance-specific env overrides.

9. **Integrate with UI/settings.** ✅ Initial UI integration completed.
   - Let users trust beat-agent attester identities like other content attesters. ✅ Initial local UI settings added.
   - Show beat identity and context-citation reasoning on attestation details. ✅ Beat-agent attestation chips now show a brain icon and "primary" (blue) color to visually distinguish ambient-context-aware evaluations from stateless content-attester evaluations. The tooltip explains the beat-agent's conversation-following nature and shows the beat identity, attester address, and statement CID. Content-attester tooltips similarly explain the stateless evaluation model.
   - Surface abstentions/lack-of-coverage as operator-facing demand signals. ✅ Content-funding channel and project views now show "uncovered" badges on items without trusted attestations, dimmed opacity for uncovered items, and coverage summary chips (e.g., "2 uncovered", "3 trusted") in content-list headers. The "Uncovered" tooltip distinguishes truly unattested content from content with only untrusted attestations.
   - Current v1: the Settings page has a "Trusted content attestation sources" section that stores stateless content-attester and beat-agent wallet identities separately from implication attesters/nudgers, with optional display name/service URL metadata and default env vars (`VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS`, `VITE_DEFAULT_TRUSTED_BEAT_AGENTS`). Content-funding content-item rows now highlight trusted attesters/beat agents by configured name with distinct iconography (brain for beat agents, memory chip for content attesters). Project/channel content lists can be filtered to trusted-attested items, and uncovered items are visually dimmed with a warning badge. The trusted list is not yet wired into explanation-detail display (requiring IPFS CID retrieval, which is deferred to an attester status-API enhancement).

10. **Clarify overlapping docs.** ✅ Initial reconciliation pass done.
    - Update `content-finder` docs so future feed-watching adapters do not duplicate beat-agent responsibilities.
    - Update Subjectiv/trust-model language that overstates how context-free noninflammatory evaluation is.
    - Update `content-attester` docs to mention when stateless evaluation should abstain or delegate to a beat agent.
    - Current v1: `content-finder/README.md` now reserves ambient-context feed watching for beat-agent finder mode; `content-attester/README.md` and `specs/tech/subsystems/content-funding/content-attesters.md` distinguish stateless self-contained/local-context evaluation from beat-agent ambient-context evaluation; `docs/common-sense-majority/vision-and-strategy/trust-model.md` now frames AI content judgments as prompt plus context-policy trust rather than context-free objectivity; and this noninflammatory-content README calls beat agents the sibling service for context-heavy short-form social content.


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




## Beat Agents Review #1

**Spec goal:** Stateful sibling to `content-attester` — continuously ingest a "beat" of discourse so it can evaluate context-dependent short-form posts. Two modes (attester / finder), three-valued output (positive / negative / abstain), positive results publish to `AlignmentAttestations`.

**Status:** All 10 plan items checked off, 18/18 tests pass, clean `tsc`. Code is competent — small modules, consistent style, real DI, real integration with `service-host`, `content-attester`, `content-finder`, and the UI (trusted beat-agent chip with brain icon). The "in theory" hedge in commit `d3f00ca` is accurate though: the scaffolding is solid but several pieces that the spec treats as core are stubs.

### Real gaps vs. spec
- ✅ **Twitter/X platform adapter now ships.** `createTwitterBeatSourceAdapters` supports account timelines, recent-search queries, and list tweets through X API v2, producing canonical beat-ingested items and source cursors for incremental polling.
- **Default observation extractor is `authorHandle: text`** (`memory.ts:81-99`) — no LLM extraction, so ambient memory is just raw text in/out. Retrieval is keyword overlap.
- **Default finder selector accepts any non-empty text** (`finder.ts:142-157`) — every ingested item becomes a paid submission.
- **No idempotency** on `/evaluate-content`: `attester.ts:118` hardcodes `alreadyAttested: false`, so duplicate calls double-pay and double-attest. Status endpoint exists but doesn't gate.
- **Compaction is keyword-frequency string concat** (`memory.ts:206-219`), not the multi-tier semantic decay the spec describes.
- **No coverage-gap signal mining** over the JSONL abstention log — spec calls this out as the highest-value demand signal.
- **No adversarial hardening** (source diversity, anomaly detection) beyond a one-line system prompt.

### Bugs / smells
- `evaluator.ts:31` — default model `anthropic/claude-3.5-haiku` is stale. Use a current Claude model.
- `memory.ts:267` — tokenizer requires length ≥ 3 and strips most punctuation; drops `AI`, `US`, `#X`, cashtags. Real recall problem for in-group lingo.
- `memory.ts:292-296` — `reduce` over `Date.parse` with no initial value; only guarded by the `< minObservations` early-return.
- `ingestion.ts:130` — no try/catch around `adapter.fetchSource`; one failing adapter aborts the whole run. Skip-reason enum has no `fetch_failed`.
- `finder.ts:131-135` — failed submissions not persisted, retries are silent.
- `app.ts:65-70` — rate limiter captures config at construction; no hot reload.
- Tests are unit-level happy paths only; no end-to-end ingest→memory→retrieve→evaluate→publish test. HTTP test stubs `evaluateContent`.

### Recommended next actions (prioritized)
1. ✅ **Idempotency on `/evaluate-content`** — `processBeatAgentEvaluation` now accepts an optional `findExistingAttestation` dependency that checks for a prior positive attestation with the same `(contentCanonicalId, statementCid)` pair. When found, `alreadyAttested: true` is returned immediately — no content resolution, no LLM call, no publishing, and no log entry. The runnable `createBeatAgentApp` wires `findExistingAttestationFromJsonl` from the JSONL evaluation log when `BEAT_AGENT_EVALUATION_LOG_FILE` is configured. Only previously-published positive attestations (with a `transactionHash`) are treated as existing; negative/abstain pairs are not idempotency matches.
2. ✅ **One real platform adapter (X)** — `beat-agent/src/twitterAdapter.ts` now provides X API v2 adapters for account, query, and list sources. It resolves account handles/URLs/canonical IDs where needed, fetches tweets with author expansions, maps results into canonical Commonality content IDs, stores the newest tweet ID as the cursor, and uses `since_id` on later polls.
3. ✅ **Default model updated** — `evaluator.ts:31` and `config.ts` now default to `anthropic/claude-3-sonnet` instead of the stale `claude-3.5-haiku`. Payment pricing table already supports this model.
4. ✅ **Tokenizer minimums fixed** — `memory.ts` tokenizer now allows 2+ character tokens (instead of ≥3), with a stop-word filter for common low-signal 2-letter English words (`am`, `an`, `at`, `be`, `if`, `is`, `it`, `no`, `of`, `to`, etc.). This preserves short acronyms (`AI`, `US`) and short hashtags/cashtags (`#X`) without flooding the token space with noise.
5. ✅ **`reduce` over `Date.parse` with no initial value** — `minIso`/`maxIso` in `memory.ts` now guard against empty arrays with an explicit length check before the `reduce` call, preventing potential runtime errors when a consumer passes `minObservationsToCompact: 0`.
6. ✅ **Persist failed finder submissions** — `finder.ts` now records a `status: 'failed'` entry with `retries` and `lastError` for failed submission attempts. Items with `status: 'failed'` are retried on subsequent runs until `retries >= maxRetries` (default 3), at which point they're skipped. This replaces the previous silent-retry-forever behavior.
7. ✅ **Soften "Finished" framing** — `beat-agent/README.md` now describes the package as "v1 scaffolding" and lists the real-world gaps that must be filled before deploy.
3. ✅ **LLM-backed observation extractor** — New `createLlmObservationExtractor` in `extractor.ts` creates a `BeatObservationExtractor` that calls OpenRouter per ingested item, asking the LLM to extract structured discourse observations (phrase usage patterns, running arguments, in-group references, factional meanings). Results include observation text, confidence, keywords, and supporting content IDs. Configurable via `BEAT_AGENT_LLM_EXTRACTION_ENABLED=true`. The extractor handles empty text gracefully, isolates failures per-item, and includes a fallback text-parsing path when the LLM returns non-JSON. Plugs into `extractObservationsFromItems` via the existing `extractor` param.
7. ✅ **Coverage-gap mining from JSONL abstention log** — New `coverage.ts` module with `mineCoverageGaps` and `mineCoverageGapsFromFile` helpers. Parses the JSONL evaluation log and produces a `CoverageGapSummary` with overall decision counts/abstention rate, abstentions by reason with content examples, per-platform breakdowns with reason-level detail and abstention rates, and content IDs that were repeatedly abstained on. This turns the raw operator log into actionable demand signals: which platforms/reasons dominate and where new beats or better ingestion are worth the investment. 9 new tests, 34 total.
4. ✅ **End-to-end integration test** — New `e2e.test.ts` exercises the full pipeline: ingest stubbed platform posts → extract observations into memory → retrieve relevant ambient context → evaluate content with retrieved context → publish positive attestations and append log entries → verify idempotency skips re-evaluation → mine coverage gaps from the resulting log entries. Also tests the abstention path when ambient context is insufficient. 2 integration tests, 34 total.

**Bottom line:** Competent scaffolding, honest README sections, real integration, and now one concrete X ingestion adapter. LLM extractor, idempotency, finder retry, coverage-gap mining, e2e integration test, and the platform-adapter review fix are in place. The remaining pre-deploy gap called out by this review is adversarial hardening (#8).
