# Bridge creator

This file describes the mechanism. For the vision behind it — why the CSM bridge creator is best understood as a *mediator*, why it's deliberately opinionated rather than neutral, and what incentive structure it creates for users — see [the CSM mediator doc](/docs/end-user/common-sense-majority/mediator.md).

## What it does

The bridge-creator is a **nudger** — an off-chain service identified by its Ethereum address that publishes nudge batches to IPFS with CIDs recorded on-chain. See the [nudger spec](../tech/subsystems/nudger/README.md) for the nudger architecture.

Each synthesis tick it:

1. Pulls a plain-English context summary from a trusted CSM beat agent (`GET /context`).
2. Loads its current strategy prompt and live anchor set.
3. Makes a single LLM call: given the anchors and what's happening right now, what `{ modified-left, modified-right, common-ground, rationale }` triples are worth publishing this tick?
4. Publishes the nudge batch to IPFS and records the CID on-chain via `NudgePublications`.
5. Optionally submits the modified→common-ground pairs to the implication attester (the modified statements *do* imply the common-ground statement).

The bridge-creator never contacts users directly. It is a public broadcaster; each user's client is a pull-based consumer that filters nudges client-side.

## Inbound proposals: `POST /propose-bridge`

The bridge-creator also exposes a public, paid API so external parties can *suggest* bridges. Because others have explicitly subscribed to a bridge-creator, this lets them propose additions/improvements that the bridge-creator will hear — without weakening its trust model.

- A proposal is a free-text `suggestion`, optionally accompanied by `left_statement`, `right_statement`, `common_ground`, `topic_tag`, and a self-identified `proposer`.
- The request is paid via the shared x402-style flow from `attester-core`. Since a proposal triggers no per-request on-chain transaction (the bridge-creator publishes on its own schedule), the fee covers only the marginal LLM cost of having the synthesizer consider the suggestion.
- Accepted proposals are persisted to a proposal store and returned a `202` with a `proposalId`. They are **queued, not acted on synchronously.**
- On a later synthesis tick the pending proposals are fed into the synthesizer prompt as *advisory* input. The bridge-creator AI may adopt a proposal verbatim, adapt it into a different bridge, or decline it entirely — exactly the same editorial judgment it applies to its own anchors and context. Proposals are marked consumed once the synthesizer has seen them, so they are considered once rather than reconsidered every tick.

This keeps the bridge-creator a single opinionated mediator (not a finder/attester split): the API is just an intake channel for suggestions, and the AI remains the sole decider of what gets published.

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

### Featured anchors (the public display set)

`active` is a **quality gate** ("this is a legitimate bridge"), not a display list. As the reflection job runs over time the active set only grows: it is append-only and never trimmed, nothing prevents multiple overlapping bridges per topic (e.g. several abortion clusters), and there is no ranking signal. So "show every active anchor" works only while the set is tiny and hand-curated; it degrades as the system accumulates activity.

A separate **`featured` flag** is the public **display gate** ("show this bridge to the public"). The [CSM bridges page](./csm-bridges-page.md) renders the featured set, not the whole active set.

- `featured` is conceptually a property of a whole **cluster** (a bridge), but is stored per-record on `BridgeAnchorRecord` to fit the flat anchor model. Operators feature/unfeature at the **cluster level** via CLI, so a triple can never be half-featured.
- Featuring is independent of `status`, but only meaningful when `active`: the display helper (`getFeaturedAnchors`) and `GET /anchors?featured=true` return records that are *both* `active` and `featured`. A retired-but-featured record is simply not served.
- Missing `featured` normalizes to `false` (backwards compatible). The seed clusters ship `featured: true` so the page works immediately.

Out of scope for now: ordering among featured clusters (no `display_rank`), and enforcing one featured cluster per topic — left to operator judgment, with a CLI warning when a featured cluster isn't a complete left/right/common-ground triple.

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
