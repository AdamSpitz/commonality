# Bridge creator

This file describes the mechanism. For the vision behind it — why the CSM bridge creator is best understood as a *mediator*, why it's deliberately opinionated rather than neutral, and what incentive structure it creates for users — see [the CSM mediator doc](/docs/common-sense-majority/vision-and-strategy/mediator.md).

## What it does

The bridge-creator is a **nudger** — an off-chain service identified by its Ethereum address that publishes nudge batches to IPFS with CIDs recorded on-chain. See the [nudger spec](../tech/subsystems/nudger/README.md) for the nudger architecture.

Each synthesis tick it:

1. Pulls a plain-English context summary from a trusted CSM beat agent (`GET /context`).
2. Loads its current strategy prompt and live anchor set.
3. Makes a single LLM call: given the anchors and what's happening right now, what `{ modified-left, modified-right, common-ground, rationale }` triples are worth publishing this tick?
4. Publishes the nudge batch to IPFS and records the CID on-chain via `NudgePublications`.
5. Optionally submits the modified→common-ground pairs to the implication attester (the modified statements *do* imply the common-ground statement).

The bridge-creator never contacts users directly. It is a public broadcaster; each user's client is a pull-based consumer that filters nudges client-side.

## What it does *not* do

- Poll `getAllStatements` or do its own pair-finding / discovery. That work lives in the CSM beat agent.
- Hard-code left/right classifiers or similarity scoring.
- Maintain typed "bridge opportunity" records between services.

## The three-service chain

```
Civility beat agent (per territory)
    ↓  GET /context  (social-media discourse summary)
CSM beat agent (per territory)
    ↓  GET /context  (faction map, popular-and-sane statements, coverage gaps)
Bridge-creator (synthesizer)
    ↓  nudge batches → IPFS + NudgePublications
```

## Anchor set

The bridge-creator maintains a live anchor set: a curated list of `{ common-ground, moderate-left, moderate-right }` triples organized by topic cluster. Anchors are stored as JSON, versioned, and exposed via `GET /anchors`. A periodic reflection job proposes additions and updates; an operator approves via CLI before they go active.

The initial seed anchors come from the `hidden-majority` topics in `fake-data-generation/data/statements.json`.

## The worked abortion example

To make the kind of judgment the bridge-creator makes concrete:

- Moderate left writes "I want abortion to be available so that women aren't forced into going through with a pregnancy they don't want."
- Moderate right writes "Late-term abortion is horrific."

The bridge-creator has a common-ground anchor in its set: "I'd be okay with it if abortion were allowed during the first 12-16 weeks, and forbidden after that. I'd rather get this settled than keep fighting over it forever." It notices the above statements don't actually conflict with that anchor, so it synthesizes:

- Modified-left: "I want abortion to be available so that women aren't forced into going through with a pregnancy they don't want. I'd prefer abortion to be available throughout the whole pregnancy, but I don't mind forbidding abortions after maybe the first trimester or so — that would give women enough time to make a decision. I'd rather get this settled than keep fighting over it forever."
- Modified-right: "Late-term abortion is horrific. I'd still rather not see abortions early in the pregnancy, but I don't feel as strongly about it. I'd rather get this settled than keep fighting over it forever."
- Common ground: the anchor itself.

The implication attester can legitimately link modified → common-ground (those really do imply each other). The nudge system suggests to users that they might be willing to sign the modified version. The noninflammatory-content system lets people on one side point to the modified version for the other side with an attestation that it won't be inflammatory.

## Levels of inter-statement links

- **Implication attestations:** Incontrovertible. Restating the same idea differently, or logically required implications. AI gives people freedom to say what they want in their own words; it must not misrepresent them.
- **Nudges:** The system isn't putting words in the user's mouth, but thinks they might also believe this other statement.
- **Social-media persuasion backed by noninflammatory-content attestations:** Longer than a statement; makes the case for the nudge. Uses AI trusted by the recipient (prompt openly visible, user-configurable) to attest the post won't be inflammatory.


## Implementation status

The bridge-creator package itself is complete. The remaining work is in the beat-agent layer and one small bridge-creator wiring gap.

### Done

- Legacy discovery code gutted (`getAllStatements` polling, env-var anchors, left/right classifier, similarity scoring, old prompts and tests).
- New synthesizer loop: fetch `GET /context` from trusted CSM beat agents, check `readiness`, load strategy prompt + active anchors, LLM call producing `{ modified-left, modified-right, common-ground, rationale }` triples, publication-level dedup, statement publication, nudge-batch publication, optional implication submission.
- Anchor store: JSON storage, curated seed anchors from `hidden-majority` topics, `GET /anchors` endpoint.
- Anchor reflection: periodic LLM job that proposes `status: proposed` anchor additions/edits based on CSM context and previous publication text; operator CLI (`npm run anchors --workspace=@commonality/bridge-creator -- ...`) to list/approve/retire/delete.
- Long-running `run(...)` loop with configurable tick interval and anchor-reflection interval.
- `.well-known/nudger.json` endpoint wired up and reflected in the nudger spec.
- CSM strategy prompt at `bridge-creator/prompts/csm-strategy.md`, served at `GET /strategy-prompt`.
- Tests for all of the above.

### Remaining

**1. CSM beat-agent stand-up** ← do this next

Configure a `us-political-csm` beat-agent instance with purpose `beat_context_provider`. Initial sources: Tally indexer only (no civility agent yet). Verify ingestion, observation extraction, and purpose snapshots work against real Tally activity. This is beat-agent work, independent of the bridge-creator.

**2. Civility-agent context source adapter** ← do after step 1

Add a source-adapter type to the beat-agent that calls a sibling beat agent's `GET /context` and converts the response into ingestible items tagged with provenance (`source: civility-agent:<name>`). Wire it into the CSM beat-agent config alongside the Tally indexer. Beat-agent work, independent of the bridge-creator.

**3. Feed anchor reflection real signing/ignore outcomes** ← can do any time

The anchor reflection LLM currently sees CSM context + previous publication text. It should also see signing/ignore outcome summaries so reflection can learn from what's resonating. The wiring gap is in `src/anchorReflection.ts`: `previousPublicationSummary` is passed in but outcome data is not yet provided.

**4. End-to-end rehearsal** ← do after steps 1–2

Run the full chain: Civility agent → CSM agent → bridge-creator emitting nudges. Manually inspect a handful of bridges and anchor-reflection outputs. Integration check, not a code task.

### Deliberately deferred

- Multiple Civility agents per CSM agent (architecture supports it; no merge logic needed yet).
- Operator web UI for anchor review (CLI is sufficient for now).
- Autonomy for anchor reflection (advisory-only until proposals are reliably boring).
- Per-call billing or auth between CSM agent and bridge-creator (single operator, one budget).
- Typed `/bridge-opportunities` endpoint (the whole point is to avoid this).
