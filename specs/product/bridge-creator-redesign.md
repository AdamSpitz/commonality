# Bridge-creator / CSM mediator redesign

The current `bridge-creator` was designed before beat agents existed and before the [Lean on AI](./lean-on-ai.md) principle was as load-bearing as it is now. As a result it does several things in ways that don't fit the rest of the system:

- It polls `getAllStatements({ limit: 20 })` and tries to do its own discovery / pair-finding.
- Its anchor / "commonality" statements come from a comma-separated env var (`BRIDGE_CREATOR_COMMONALITY_STATEMENTS`), which is frozen at deploy time and not inspectable.
- Its prompts encode generic "left vs right" with no real CSM-specific strategy, no faction knowledge, and no awareness of which framings are live in the current discourse.
- Popularity / "what does each side actually believe right now" is invisible to it.

[beat-agents.md](../tech/subsystems/content-funding/noninflammatory-content/beat-agents.md) already says explicitly that bridge-creator shouldn't duplicate beat-following machinery — and the `bridge_opportunity_detection` and `beat_context_provider` purposes are defined for exactly this collaboration. This doc is the plan for taking that seam seriously.

This is a substantial chunk of work, so it lives here rather than as a bullet on `TODO.md`.


## Target architecture

Three cooperating services, each doing one job well:

### 1. Civility beat agent (per territory)

What we already have a spec for. For US politics this is something like a `us-political-twitter` beat agent with `civility_attestation` (and likely `content_discovery`) purposes. It already needs detailed social-media-personality memory — who's a known dog-whistler, which phrase is ironic this week, which accounts are brigading — because evaluating whether a *single* short post is inflammatory genuinely depends on that.

For the redesign, we additionally enable the `beat_context_provider` purpose so it publishes summaries of "what's being argued about right now in this beat" via `GET /context`.

### 2. CSM beat agent (per territory)

A **new** beat agent, narrower memory, different purposes:

- `bridge_opportunity_detection` — main purpose.
- `beat_context_provider` — so downstream services (bridge-creator, CSM explorer, anything else) can consume its summaries.

Its sources are:

- **The Tally indexer** — statements, support counts, signers. This is the home turf: it's where the actual on-chain opinions live and where bridges will eventually have to land.
- **One or more trusted Civility beat agents in the same territory**, consumed via their `GET /context` endpoint. This is the new piece. See "Cross-agent consumption" below.

Its memory is shaped around:

- A live faction map — what "moderate left" and "moderate right" actually look like *this month*, derived from real signers and observed discourse rather than baked into a prompt.
- Current tensions, recurring misunderstandings, phrase meanings.
- Popular-and-sane statements on each side (the [mediator doc](/docs/common-sense-majority/vision-and-strategy/mediator.md)'s key filter).
- Moderate-compatible pairs — places where a popular statement on one side doesn't actually conflict with a popular statement on the other, judged by LLM and cached as a purpose-tagged observation.
- Coverage gaps — topics that are clearly live in the Civility agent's summary but have no Tally statements yet.

### 3. Bridge-creator (thin synthesizer)

Stops doing discovery. Each run, it:

1. Queries trusted CSM beat agent(s) for `/bridge-opportunities` and relevant `/context`.
2. Loads its current strategy prompt and its current anchor set (see below).
3. Hands all of that to an LLM and asks for `{ modified-left, modified-right, common-ground, rationale }` triples.
4. Publishes the nudge batch (IPFS + `NudgePublications`) and submits the modified→common-ground pairs to the implication attester.

No `getAllStatements` polling. No hand-coded "is this left or right" classifier. No similarity scoring. The fuzzy judgments are LLM calls; conventional code only orchestrates.


## Cross-agent consumption (Civility → CSM)

The CSM agent and the Civility agent for the same territory are *related but distinct*. Reasons not to merge them:

- Different memory needs. The CSM agent doesn't need persona-level Twitter detail; the Civility agent does. Merging bloats one or thins the other.
- Different trust profiles. The Civility agent publishes per-post attestations on-chain and faces direct adversarial input; the CSM agent reading its *summary* inherits much less of that risk because the Civility agent has already done first-pass filtering and diversity weighting.
- Different update cadences and audit stories.

Reasons not to have them talk back-and-forth or share raw memory:

- Overengineering for v1.
- Defeats the point of the summary layer.
- Breaks the provenance story (the CSM agent's reasoning should cite a summary it consumed, not a raw observation it didn't ingest).

**One-way, summary-only consumption** is the right shape. Concretely:

- CSM beat-agent config lists the trusted Civility agent(s) as a source alongside the Tally indexer.
- Each ingestion tick, the CSM agent calls the Civility agent's `GET /context` (overall summary + relevant purpose snapshots).
- The returned observations are ingested as items tagged with provenance (`source: civility-agent:us-political-twitter`) and treated as one source among several for diversity-weighting purposes.
- They feed observation extraction and purpose-summary snapshots exactly like Tally-derived items, just with the source-trust note attached.

No new wire protocol — this is just another source adapter calling an endpoint that the beat-agent spec already defines.

A subtle gain worth flagging: Tally support counts tell you which *Tally* statements are popular; they don't tell you that immigration discourse is suddenly dominated by a new framing nobody's written a statement about yet. The Civility-agent summary surfaces those emerging tensions, so the CSM agent can react — e.g. by flagging "we don't have any Tally statements covering X" as a coverage gap, or by reflecting that into anchor-set updates.


## Live, LLM-managed anchor set

This addresses the dynamic-anchors concern in the old TODO. The "curated list of statements" stops being an env var and becomes evolving state, but stays fully inspectable.

- **Seed.** A small hard-coded initial anchor set lives in the bridge-creator repo, version-controlled.
- **Reflection.** A periodic reflection job — modeled on the beat-agent `source_management` purpose — looks at: current anchors, CSM-beat-agent purpose summaries, which past bridges got signed vs. ignored, observed coverage gaps. It proposes anchor updates (add / remove / reword targets) with rationale.
- **Storage.** Anchor history is persisted, versioned, timestamped. Each anchor record cites the observations that justified it.
- **Auditability.** `GET /anchors` returns the current anchor list with timestamps and rationale. `.well-known/nudger.json` exposes the same data (plus name, description, current strategy prompt, trusted beat agents being consumed) — addressing the "richer Settings add-nudger flow" gap.

This is the "open in the sense that at any time the mediator should be able to tell you the target statements it's currently using" model from the TODO note.


## CSM-specific knowledge: where it lives

Split into two inspectable layers:

- **Strategy prompt** — versioned in the repo, exposed via `.well-known/nudger.json`. Contains the substantive CSM-specific heuristics: "look for moderate-left and moderate-right statements that don't actually conflict," "prefer settle-it-once compromises," the worked abortion example from [bridge-creator.md](./bridge-creator.md), guidance on transparency vs. neutrality, etc.
- **Anchor set and faction map** — live, LLM-curated. The faction map lives in the CSM beat agent's memory (it's a beat observation about who/what is moderate-left vs. moderate-right *right now*); the anchor set lives in the bridge-creator. Both are exposed via APIs.

The bridge-creator's LLM call at synthesis time fuses: strategy prompt (static-ish) + current anchors (live) + faction map and bridge opportunities and ambient context (live, from beat agent).


## Implementation plan (rough)

Substantial, but breaks into mostly independent chunks.

1. **CSM beat-agent stand-up.** Configure a `us-political-csm` beat-agent instance with purposes `bridge_opportunity_detection` + `beat_context_provider`. Sources: Tally indexer (initially only). Verify ingestion / observation extraction / purpose snapshots work over Tally activity.

2. **Civility-agent context source adapter.** Add a source-adapter type that calls a sibling beat agent's `GET /context` and converts the response into ingestible items with provenance metadata. Wire it into the CSM beat-agent config.

3. **Bridge-opportunity observation type.** Define the LLM-extracted observation that represents "popular statement A on side X and popular statement B on side Y look moderate-compatible." Ensure the CSM beat agent extracts these and exposes them via `GET /bridge-opportunities`.

4. **Refactor bridge-creator.** Strip discovery / pair-finding / `getAllStatements` polling. Replace with a synthesizer loop that pulls opportunities + context from trusted CSM beat agents and runs the LLM synthesis. Keep the nudge-batch publish flow and implication-attester submission unchanged.

5. **Live anchor management.** Move anchors out of env var into persistent storage. Implement the reflection job. Add `GET /anchors`.

6. **`.well-known/nudger.json` endpoint.** Expose name, description, strategy prompt, current anchors, trusted beat agents.

7. **CSM-specific strategy prompt.** Rewrite the bridge-creator prompts with real CSM strategy, worked examples, transparency framing.

8. **End-to-end rehearsal.** Run the whole chain in a narrow rehearsal: Civility agent watching a small curated source list, CSM agent consuming Tally + Civility summary, bridge-creator emitting nudges. Manually inspect a handful of bridges and anchor-reflection outputs.

Items 1–3 are beat-agent work and could be done independently of the bridge-creator refactor. Items 4–7 are the bridge-creator side. Item 8 is the integration check.


## What this replaces in `TODO.md`

The "Bridge-creator / mediator follow-up" bullet on `TODO.md` should be replaced with a one-line pointer to this file.


## Deliberate non-goals

- No bidirectional agent-to-agent chat / negotiation in v1.
- No CSM beat agent reading the Civility agent's raw observation DB — summaries only.
- No multiple civility agents for diversity in v1 (architecturally free, but not worth bothering with yet).
- No moving bridge-statement *synthesis* into the beat agent; that stays in the bridge-creator per beat-agents.md.
