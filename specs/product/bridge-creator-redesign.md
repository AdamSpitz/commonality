# Bridge-creator / CSM mediator redesign

The current `bridge-creator` was designed before beat agents existed and before the [Lean on AI](./lean-on-ai.md) principle was as load-bearing as it is now. As a result it does several things in ways that don't fit the rest of the system:

- It polls `getAllStatements({ limit: 20 })` and tries to do its own discovery / pair-finding.
- Its anchor / "commonality" statements come from a comma-separated env var (`BRIDGE_CREATOR_COMMONALITY_STATEMENTS`), which is frozen at deploy time and not inspectable.
- Its prompts encode generic "left vs right" with no real CSM-specific strategy, no faction knowledge, and no awareness of which framings are live in the current discourse.
- Popularity / "what does each side actually believe right now" is invisible to it.

[beat-agents.md](../tech/subsystems/content-funding/noninflammatory-content/beat-agents.md) already says explicitly that bridge-creator shouldn't duplicate beat-following machinery. This doc is the plan for taking that seam seriously.

This is a substantial chunk of work, so it lives here rather than as a bullet on `TODO.md`.


## Design stance: lean on AI

Per [lean-on-ai.md](./lean-on-ai.md), we deliberately avoid inventing a typed "bridge opportunity" object, a pairwise compatibility schema, or any other structured handoff between the beat agent and the bridge-creator.

The beat agent publishes plain-English summaries: what's being argued about, who's saying what, which Tally statements are popular on each side, who currently counts as moderate-left vs. moderate-right. The bridge-creator's LLM reads those summaries alongside its current anchor set and decides whether and how to adjust its preferred common-ground / moderate-left / moderate-right statements.

The judgment — "aha, there's discussion of immigration; I could enhance my common-ground statement to include this idea and adjust the moderate-left and moderate-right variants to be compatible with it" — lives entirely in that one LLM call. Not in a schema, not in a typed observation, not in cached pairwise compatibility records.

Conventional code orchestrates and persists. The fuzzy judgments are LLM calls reading natural language.


## Target architecture

Three cooperating services, each doing one job well.

### 1. Civility beat agent (per territory)

What we already have a spec for. For US politics this is something like a `us-political-twitter` beat agent with `civility_attestation` (and likely `content_discovery`) purposes. It already needs detailed social-media-personality memory — who's a known dog-whistler, which phrase is ironic this week, which accounts are brigading — because evaluating whether a *single* short post is inflammatory genuinely depends on that.

For the redesign, we additionally enable the `beat_context_provider` purpose so it publishes summaries of "what's being argued about right now in this beat" via `GET /context`.

### 2. CSM beat agent (per territory)

A **new** beat agent, narrower memory, single purpose: `beat_context_provider`.

Its sources are:

- **The Tally indexer** — statements, support counts, signers. This is the home turf: where the actual on-chain opinions live and where bridges will eventually have to land.
- **One or more trusted Civility beat agents in the same territory**, consumed via their `GET /context` endpoint. See "Cross-agent consumption" below.

Its memory is shaped around (all as free-text observations the next LLM can read, not as typed structures):

- A live faction map — what "moderate left" and "moderate right" actually look like *this month*, derived from real signers and observed discourse rather than baked into a prompt.
- Current tensions, recurring misunderstandings, phrase meanings.
- Popular-and-sane statements on each side (the [mediator doc](/docs/common-sense-majority/vision-and-strategy/mediator.md)'s key filter), with rough popularity signals.
- Coverage gaps — topics that are clearly live in the Civility agent's summary but have no Tally statements yet.

Its output is a single `GET /context` response: a plain-language summary that a downstream LLM can read end-to-end. No `/bridge-opportunities` endpoint. No pre-computed pair records.

### 3. Bridge-creator (thin synthesizer)

Stops doing discovery. Each run, it:

1. Queries trusted CSM beat agent(s) for `GET /context`.
2. Loads its current strategy prompt and current anchor set (see below).
3. Hands all of that to an LLM and asks: "given these anchors and what's going on right now, which anchors (if any) should be adjusted, and what `{ modified-left, modified-right, common-ground, rationale }` triples should we publish this tick?"
4. Publishes the nudge batch (IPFS + `NudgePublications`) and submits the modified→common-ground pairs to the implication attester.

No `getAllStatements` polling. No hand-coded left/right classifier. No similarity scoring. No typed inter-service protocol beyond "fetch a summary."

### How nudges reach users

For context: the bridge-creator never contacts users directly. It publishes nudge batches to IPFS and records the CIDs on-chain via `NudgePublications`. Users opt into nudgers by address in their Settings (informed by `.well-known/nudger.json` — see Decisions). Each user's client reads the indexer for `NudgesPublished` events from subscribed nudgers, fetches the IPFS batches, and decides which nudges to actually show that individual user based on what they've already signed and what's relevant to them. The per-user filtering lives on the client side, not in the nudger. The nudger is a public broadcaster; clients are pull-based consumers.


## Cross-agent consumption (Civility → CSM)

The CSM agent and the Civility agent for the same territory are *related but distinct*. Reasons not to merge them:

- Different memory needs. The CSM agent doesn't need persona-level Twitter detail; the Civility agent does.
- Different trust profiles. The Civility agent publishes per-post attestations on-chain and faces direct adversarial input; the CSM agent reading its *summary* inherits less of that risk because the Civility agent has already done first-pass filtering.
- Different update cadences and audit stories.

Reasons not to have them talk back-and-forth or share raw memory:

- Overengineering for v1.
- Defeats the point of the summary layer.
- Breaks the provenance story.

**One-way, summary-only consumption** is the right shape:

- CSM beat-agent config lists the trusted Civility agent(s) as a source alongside the Tally indexer.
- Each ingestion tick, the CSM agent calls the Civility agent's `GET /context`.
- The returned text is ingested as items tagged with provenance (`source: civility-agent:us-political-twitter`).
- They feed observation extraction and purpose-summary snapshots exactly like Tally-derived items, just with the source-trust note attached.

No new wire protocol — this is just another source adapter calling an endpoint the beat-agent spec already defines.

A subtle gain worth flagging: Tally support counts tell you which *Tally* statements are popular; they don't tell you that immigration discourse is suddenly dominated by a new framing nobody's written a statement about yet. The Civility-agent summary surfaces those emerging tensions, so the CSM agent can reflect them into its summary and (eventually) the bridge-creator can react.


## Live, LLM-managed anchor set

The one place where we *do* want real, inspectable state is the bridge-creator's anchor set. This addresses the dynamic-anchors concern in the old TODO.

- **Seed.** A small hard-coded initial anchor set lives in the bridge-creator repo, version-controlled.
- **Reflection.** A periodic reflection job — modeled on the beat-agent `source_management` purpose — looks at: current anchors, CSM-beat-agent `/context` summaries, which past bridges got signed vs. ignored, observed coverage gaps. It proposes anchor updates (add / remove / reword) with rationale.
- **Storage.** Anchor history is persisted, versioned, timestamped. Each anchor record cites the observations that justified it.
- **Auditability.** `GET /anchors` returns the current anchor list with timestamps and rationale. `.well-known/nudger.json` (see Decisions) links to it alongside name, description, strategy prompt, and trusted beat agents.

This is the "open in the sense that at any time the mediator should be able to tell you the target statements it's currently using" model from the TODO note.


## CSM-specific knowledge: where it lives

Split into two layers:

- **Strategy prompt** — versioned in the repo, exposed via `.well-known/nudger.json`. Contains the substantive CSM heuristics: "look for moderate-left and moderate-right positions that don't actually conflict," "prefer settle-it-once compromises," the worked abortion example from [bridge-creator.md](./bridge-creator.md), guidance on transparency vs. neutrality, etc.
- **Anchor set + faction map** — live. The faction map lives in the CSM beat agent's memory as free-text observations; the anchor set lives in the bridge-creator as the structured state described above. Both are exposed via APIs.

The bridge-creator's synthesis-time LLM call fuses: strategy prompt (static-ish) + current anchors (live, structured) + faction map and ambient context (live, free text from beat agent).


## Implementation plan

The existing `bridge-creator/` package is not in production use and nothing downstream depends on its current behavior. The redesign deletes essentially all of its substance — discovery/pair-finding, `getAllStatements` polling, env-var anchors, the left/right classifier, similarity scoring, and all three current prompts. Rather than refactor incrementally through several intermediate states that carry dead concepts, we gut the package and rebuild inside the same shell.

What survives the rewrite:

- The service-host wiring (`service-host/src/envConfig.ts`, `serviceRegistry.ts`, `render.yaml`). The new module re-exports the same surface (`loadConfigFromEnv`, `runBridgeCreator`, `createBridgeCreatorApp`) so service-host doesn't notice.
- The nudge-batch publish flow (IPFS + `NudgePublications`) and implication-attester submission. Lift these out of the current `nudger.ts` into small focused modules before the gut, so they can be reused intact.

Work breaks into mostly independent chunks.

1. **CSM beat-agent stand-up.** Configure a `us-political-csm` beat-agent instance with purpose `beat_context_provider`. Sources: Tally indexer (initially only). Verify ingestion / observation extraction / purpose snapshots work over Tally activity. Independent of bridge-creator.

2. **Civility-agent context source adapter.** Add a source-adapter type that calls a sibling beat agent's `GET /context` and converts the response into ingestible items with provenance metadata. Wire it into the CSM beat-agent config. Independent of bridge-creator.

3. **Lift the keepers.** Extract the IPFS / `NudgePublications` publish flow and the implication-attester submission out of the current `nudger.ts` into their own modules. No behavior change; this is just so the gut in step 4 doesn't take them down with it.

4. **Gut bridge-creator.** Delete `src/nudger.ts`, `src/config.ts`, `prompts/*`, and `test/*`. Keep `package.json`, the exported-symbol shell in `src/index.ts`, and the modules extracted in step 3.

5. **Build the synthesizer.** New `runBridgeCreator` loop: check upstream `readiness`, pull `GET /context` from trusted CSM beat agents, load strategy prompt and current anchors, run a single LLM call producing `{ modified-left, modified-right, common-ground, rationale }` triples, hand off to the publish modules from step 3. Includes publication-level dedup per Decisions. Partial bridge-creator-side scaffolding now exists for parsing trusted CSM context sources from config, fetching/validating `/context` readiness, exposing current active anchors via `GET /anchors`, serving the default CSM strategy prompt at `GET /strategy-prompt`, normalizing synthesis LLM output in `src/synthesizer.ts`, tick-level orchestration in `src/runner.ts` for synthesis → publication-level dedup → statement publication → nudge-batch publication → optional implication submission, and a long-running `run(...)` loop that schedules ticks and configures the implication submitter when `IMPLICATIONS_CONTRACT_ADDRESS` is present. Remaining step-5 work: production rehearsal against real CSM beat-agent context.

6. **Live anchor management.** Persistent anchor storage using the record shape from Decisions. Curate the seed anchor set from `hidden-majority` topics. Reflection job writes `status: proposed`; operator approves via CLI. `GET /anchors` endpoint.

7. **`.well-known/nudger.json` endpoint.** Per the generic nudger discovery spec — name, description, signer address, strategy prompt URL, anchors URL, trusted sources, status.

8. **CSM-specific strategy prompt.** Initial CSM strategy prompt now exists at `bridge-creator/prompts/csm-strategy.md` and is served by `GET /strategy-prompt`; future work should wire it into the synthesizer LLM call and remove the legacy prompts during the step-4 gut.

9. **Tests.** Written against the new shape, not ported. Cover: synthesis-loop happy path, `warming` skip, dedup-hash skip, anchor reflection proposals, signature/staleness rejection on `/context`.

10. **End-to-end rehearsal.** Run the whole chain in a narrow rehearsal: Civility agent watching a small curated source list, CSM agent consuming Tally + Civility summary, bridge-creator emitting nudges. Manually inspect a handful of bridges and anchor-reflection outputs.

Items 1–2 are beat-agent work and can land independently. Items 3–9 are the bridge-creator side; step 3 must precede step 4, and step 5 depends on both. Item 10 is the integration check.


## Decisions

The following decisions pin down the parts of the architecture that needed resolving before coding starts.

### Anchor record shape

An anchor is a stored record of the form:

```
{
  id,
  cluster_id,        // groups a common-ground anchor with its moderate variants
  role,              // free text, e.g. "common-ground", "moderate-left",
                     // "moderate-right", "moderate-religious"
  text,              // the natural-language statement
  tally_cid,         // nullable; the on-chain statement CID, created on demand
                     // when bridge-creator needs to link to it
  topic_tag,         // free text, e.g. "immigration"
  rationale,         // why this anchor exists / why it was last updated
  status,            // active | retired | proposed
  created_at,
  last_reviewed_at
}
```

Notes:

- `role` is free text rather than an enum so the LLM can introduce new role types (e.g. "moderate-religious" vs. "moderate-secular" on some topic) without a schema change.
- `tally_cid` is nullable because there's no value in pre-creating a Tally statement until something actually needs to link to it. When the bridge-creator publishes a nudge that points to an anchor without a CID, it creates the statement on the fly and fills in the field.
- `status: proposed` covers anchors the reflection job has suggested but an operator hasn't yet approved (see next decision).

### Anchor reflection authority

Reflection is **advisory-only** in v1. The reflection job writes proposed anchor changes to storage with `status: proposed`; an operator reviews and either flips them to `active` (or `retired`) or deletes them. Review surface is a CLI command in v1; promote to a web UI if it gets used often. Direct storage edits are fine as an emergency override but not the normal path.

Rationale: anchors steer everything the bridge-creator does downstream, and we have no track record yet of how the reflection LLM behaves. Source-management work landed advisory-only for the same reason. Revisit autonomy after several months of "the proposals are boring and operator just clicks approve."

### Seed anchor set

The initial anchor set is **curated from existing seed content**, not drafted from scratch. `fake-data-generation/data/statements.json` already contains ~22 contested topics under the `hidden-majority` domain (abortion, immigration, gun-policy, climate-policy, etc.), each with a spread of statements from extreme to compromise. The seed work is:

1. Pick 4–6 of those topics for v1.
2. For each, identify which existing statement is the common-ground anchor, which is the moderate-left variant, and which is the moderate-right variant. The explicitly compromise-framed statements ("...I'd rather have a reasonable policy both sides can live with...") are the natural common-ground anchors.
3. Load them into the anchor store with a shared `cluster_id` per topic.

Extreme statements (e.g. "abortion should be available on demand at any stage") stay in seed data but are not anchors — they're the kind of position bridge-creator is trying to draw signers *away* from. Reflection can extend the topic list later.

### Trust config for Civility → CSM

CSM beat-agent config carries:

```
trusted_context_sources: [
  { service_url, expected_signer_address }
]
```

Beat agents that expose `beat_context_provider` sign their `GET /context` responses with their on-chain identity key. The CSM agent verifies each response's signature against `expected_signer_address` and rejects on mismatch. It also enforces a staleness cutoff (configurable, default 24h) — older responses are rejected to prevent a frozen Civility agent from quietly poisoning the well.

Signing `/context` responses is a small addition to the beat-agent spec, applied to all `beat_context_provider` agents, not just Civility.

No multi-agent disagreement handling in v1; the list will typically have length 1. The shape supports length > 1 trivially, we just don't write merge logic yet.

No automatic discovery — the operator types the URL and signer address into config.

### `.well-known/nudger.json`

A generic nudger discovery file at a predictable path on every nudger's web service, used by the Settings UI and any other consumer (users, audit tools, other agents) that wants to inspect a nudger by URL. Defined in its own short spec under `specs/tech/subsystems/nudgers/`, not bridge-creator-specific, because explorers and future nudger types should expose analogous info.

Fields:

```
{
  name,                  // human-readable
  description,           // short summary
  nudger_type,           // "bridge-creator" | "explorer" | ...
  signer_address,        // on-chain identity that signs publications
  strategy_prompt_url,   // pointer to current strategy prompt (long, versioned)
  anchors_url,           // pointer to GET /anchors (optional per type)
  trusted_sources: [
    { service_url, signer_address, role }
  ],
  status,                // warming | ready (mirrors upstream — see Cold start)
  contact                // optional
}
```

Strategy prompt and anchors are linked rather than inlined because both are long and change. No custom versioning scheme — rely on HTTP caching headers.

### Payment model for the CSM beat agent

**Pool-funded by whoever runs the bridge-creator.** The two services are a coupled deployment in v1 — same operator, one budget. No per-call billing between them, no metering, no per-call auth on `/context` (publicly readable).

Revisit only if a second consumer appears (e.g. a CSM explorer or external researcher) and we want the CSM beat agent to outlive any single bridge-creator. This defers — but doesn't worsen — the underlying question of who funds the bridge-creator itself, which is the same question the existing bridge-creator already has.

### Cold start

The CSM beat agent's `GET /context` response includes a `readiness: warming | ready` field. The agent flips itself to `ready` once it has at least one popular-statement cluster per side and a non-empty faction map. The threshold is judged by the periodic reflection LLM ("do we have enough to be useful yet?"), not a hard count.

Bridge-creator checks `readiness` before doing anything. If `warming`, it skips this tick, logs why, and waits. The same mechanism handles longer-term resilience: if upstream data goes stale or a dependent Civility agent goes down for a while, the CSM agent flips back to `warming` and bridge-creator stops emitting until things recover.

Bridge-creator's `.well-known/nudger.json` includes a `status` field that mirrors upstream readiness, so users who've installed the nudger see something rather than silence.

### Publication-level dedup

The nudger publishes to IPFS / `NudgePublications` and never sees individual users (see "How nudges reach users" above). Per-user dedup (don't re-show user U the same nudge) lives on the client side and is unchanged by this redesign.

The nudger's job is publication-level dedup: don't republish a nudge batch when nothing has meaningfully changed since last tick. Implementation:

- Hash `(anchor_cluster_version, upstream_context_summary_hash)` and skip publication if the hash matches last tick's.
- Also tell the synthesis LLM in the prompt: "here's what you published last tick; only emit changes." Cheaper and more accurate than relying on hash-skipping alone, because the LLM can override in either direction ("the framing shifted enough to be worth re-emitting even with the same hash" or "the inputs differ trivially, don't bother").
- Anchor-set changes always trigger re-emission for the affected cluster regardless of context hash. The anchor change is the signal.


## What this replaces in `TODO.md`

The "Bridge-creator / mediator follow-up" bullet on `TODO.md` should be replaced with a one-line pointer to this file.


## Deliberate non-goals

- No bidirectional agent-to-agent chat / negotiation in v1.
- No CSM beat agent reading the Civility agent's raw observation DB — summaries only.
- No multiple civility agents for diversity in v1 (architecturally free, but not worth bothering with yet).
- No moving bridge-statement *synthesis* into the beat agent; that stays in the bridge-creator per beat-agents.md.
- No typed `/bridge-opportunities` endpoint or "bridge opportunity" observation type. The beat agent publishes plain-English context; the bridge-creator's LLM does the judgment.
