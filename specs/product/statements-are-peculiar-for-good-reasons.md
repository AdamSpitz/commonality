# Why are statements so peculiar?

(AI: feel free to flesh this out, but please don't rewrite my words too much.)

The core reason we have to write statements in this peculiar way is that we're facing a tension between several goals/constraints:
  - We want the implication system to reduce the need for coordination. (Requiring people to agree on how to word a statement is basically a non-starter. Major pain in the ass, people won't do it. Coordination is hard. Anything that reduces the need for coordination is good.)
  - We want to create "bridges", at various scales: between people who mostly agree but disagree on minor details; between different movements that are obviously quite different but would be natural allies in some ways (e.g. Christians and secular conservatives); between different movements who are mostly enemies but maybe some common ground can be found (e.g. right and left).
  - BUT people hate having words put in their mouth.

So:
  - We have this implication system, where an AI "implication attester" says "if you believe S1, you almost certainly believe S2 also". It's meant to be extremely conservative; it should reject anything ambiguous. The system does try to display a clean distinction between "M people signed this directly" and "N people signed other statements that imply this one", but still, we're putting words in people's mouths; we should only do that when the statements imply each other so clearly that nobody is likely to object. We're doing this for the sake of reducing the need to coordinate on exact wordings, and also for the sake of allowing [organic coalitions](/docs/end-user/commonality/vision-and-strategy/why-its-better/organic-coalitions.md) where people who have signed significantly-different statements can still be shown to be allied in some way. (You might wonder: "if two statements are similar but worded differently, are they *really* similar enough that we can be sure people won't object to the asserted implication?" First, we do allow people to explicitly say "nope, I *don't* believe that" if they really must. And second, we don't need to be *so* strict that we end up with nothing but formal logical implication; there's an in-between space where people will say "maybe that's not exactly how I would have phrased it, but yes, that's what I believe.")
  - We have the [nudger/suggester](/docs/end-user/tally/suggestions-and-nudges.md) system, where we *don't* put words in people's mouths, but we do offer than a way to opt in to suggestions: "Since you signed S1, maybe you'd be willing to sign S2?"
  - And we have various [patterns](/docs/end-user/common-sense-majority/hidden-majority-patterns.md) that should be helpful in writing statements that play nicely with the implication attester and with the suggester system.

So, yeah, statements are:
  - plain natural language
  - meant to be something that normal people will be willing to both sign ("I support this") and attest to a project's alignment ("project P is aligned with this goal")
  - but they still need to be written in this finicky way (and so we have an AI service to help with writing them, or to write them and then suggest them)

---

## What this file is for

This is the **index** for “why statement wording is weird.” The other files go into depth on one mechanism or one audience. If you are writing seed data, a cause, or a bridge cluster, start here so you do not accidentally write a slogan, a party platform, or a mushy middle that nobody will sign *and* the attester will refuse.

A statement that “sounds like politics” is usually the wrong shape. The useful shapes are verbose on purpose: they name a primary concern, they often concede the other side’s concern, they often defer details, and they are written so that **S1 really does contain S2**.

## The tension, as a picture

```
people write in their own words  →  graph is fragmented
we invent a canonical wording    →  coordination hell; words in mouths
implication arrows (conservative)→  roll up *without* forcing a wording
nudges (opt-in)                  →  invite a better wording without signing it for them
modified statements (mediator)   →  smallest change that is still signable *and* implies common ground
```

Implication is for **already-true entailment**. Nudges are for **“you might also sign this.”** The mediator’s **modified** texts are the load-bearing layer that makes both honest. If you skip the modified layer and ask the attester to treat two natural camp slogans as implying a compromise, you are asking it to synthesize a belief the signer never wrote. That is the failure mode.

The bilateral / conditional structure is why the attester’s job can be legitimate: the modified statement already contains both sides of the deal (with the signer’s priority); the commonality statement is the same contents without the priority. See [conditional support (design)](/docs/founder/csm/conditional-support-design.md).

## Roles a piece of text can play

These are *roles*, not types in the database. Every one is just a statement CID.

| Role | Who writes it | What it is for |
|---|---|---|
| **Pole** | Loud fringe (or a seed that *simulates* them) | Contrast. Usually does **not** imply commonality. |
| **Natural / normal-from-a-side** | Ordinary people, in their own words | Raw material. Often *does not* imply the commonality yet. |
| **Modified-left / modified-right** | Mediator (human or [bridge-creator](./bridge-creator.md)) | Still signable by that side; **does** imply commonality. |
| **Commonality / common ground / bridge plank** | Mediator | The overlap, stated so both modified texts contain it. |
| **Cause plank** | Founder | Concrete enough for implication *and* for “this project is aligned with this.” Vague “conservatism” is the anti-pattern. |
| **Combinator / view anchor** | System or founder, later | `all` / `any` over planks — not a substitute for writing good planks. |

The needle the mediator has to thread: **smallest modification that (1) the implication attester will bless as modified → commonality, and (2) a person on that side would still sign.** Fail either test and the cluster is decorative.

Worked abortion wording lives in [hidden-majority-patterns.md](/docs/end-user/common-sense-majority/hidden-majority-patterns.md) (same example is restated in [bridge-creator.md](./bridge-creator.md)). Do not invent a second canonical abortion triple; update those files if the wording changes.

## Two products that share the same atom

**CSM / mediator clusters** (statement triples, optionally lifted to [bridge causes](./bridge-causes.md)): poles, naturals, modifieds, common ground. UI is “here is a bridge between camps.”

**CauseStarter causes** ([shaping your cause’s statements](/docs/founder/shaping-your-cause-statements.md)): a roster of **planks**, views over those planks, optional combinators. UI is “here is this movement’s concrete claims.”

Same implication rules. Different composition. Seed data for CauseStarter that is only “I am interested in furthering the cause of X” will look empty of structure even if the hidden-majority JSON elsewhere in the repo is beautiful. Conversely, a blessed CSM triple that never becomes planks will not show up as a cause.

## What “finicky” actually looks like in the prose

Drawn from the patterns page and the conditional-support design notes — not a second catalog of issues:

- **Primary concern first**, then the concession. People sign their own emphasis; they will not sign a centrist mash that pretends they never had a side.
- **Containment, not vibe.** If commonality says “allowed until ~14 weeks, forbidden after, I’d rather settle than fight forever,” each modified statement must actually *say those things* (plus the side’s priority). “Moderates would probably agree” is not an implication.
- **Bilateral / conditional** when the gap is a real trade: “I’ll accept Y as long as you’re taking X seriously.”
- **Reservations on the tin:** “This isn’t my ideal, but…” so signing is not a claim that the text is your first choice.
- **Defer details** with a good-faith pledge, instead of enumerating edge cases that restart the war.
- **Reaffirm the rest of the bundle** when unbundling (e.g. LGB vs T): verbose on purpose so it does not feel like betrayal.
- **Conditionals for fact disputes:** “If X is true, then Y” — so the attester is not asked to bless a factual claim the signer does not hold.

Poles stay short and extreme on purpose. Naturals stay how people actually talk (often too thin to imply commonality). Only modifieds and commonality have to be “peculiar.”

## Map of the rest of the repo

Read these; do not copy them into this file.

**Why / product**

- [Hidden-majority patterns](/docs/end-user/common-sense-majority/hidden-majority-patterns.md) — catalog of gap types and statement *shapes*; working instructions for the mediator.
- [CSM mediator](/docs/end-user/common-sense-majority/mediator.md) — opinionated nudger; not a neutral authority.
- [Bridge creator](./bridge-creator.md) — statement-level engine and LLM runtime (anchors, featured set, propose-bridge).
- [Bridge causes](./bridge-causes.md) — same triple as ordinary causes (natural / modified / bridge).
- [Conditional support](/docs/end-user/common-sense-majority/conditional-support.md) and [design notes](/docs/founder/csm/conditional-support-design.md) — why the wording is bilateral.
- [Organic coalitions](/docs/end-user/commonality/vision-and-strategy/why-its-better/organic-coalitions.md) — why implication exists at all.
- [Statements and the implication graph](/docs/end-user/tally/statements-and-implication-graph.md) — user-facing implication story.
- [Suggestions and nudges](/docs/end-user/tally/suggestions-and-nudges.md) — opt-in, never auto-sign.
- [Shaping your cause’s statements](/docs/founder/shaping-your-cause-statements.md) — planks, views, anchors, implication *direction*.
- [Bridge-cluster wording help](/docs/founder/bridge-cluster-wording-help.md) — one-shot help so founders do not get mushy-middle LLM output.
- [Content patterns](/specs/tech/subsystems/conceptspace/content-patterns/README.md) — hypotheses about what shows up in the graph.

**How to bless text (do this to seed data)**

- Implication attester service: `services/implication-attester/` (conservative “S1 implies S2”).
- Bridge-creator / mediator: `services/bridge-creator/` and its [strategy prompt](/services/bridge-creator/prompts/csm-strategy.md) (the patterns are copied into the prompt).
- Seed implication pipeline: [fake-data-generation README](/fake-data-generation/README.md) (`gen:seed:implications`, checked-in `data/seed-implication-evaluations.*`).
- [Seed content rationale](/specs/tech/subsystems/conceptspace/seed-content/README.md) — *why* we seed; JSON source of truth is [`fake-data-generation/seed-content/`](/fake-data-generation/seed-content/).

**Known mismatch (as of the seed-data cleanup):** default `./scripts/data.sh --seed` is **tiny** (a handful of generated `universe.json` statements plus a couple of CauseStarter refs). It is **not** the hidden-majority corpus, and even that corpus’s “normal-left implies commonality” notes are aspirational — the texts were not written as modified statements that contain the commonality. Fix by hand-working a few clusters, running them through the attester (and mediator) until they bless as expected, and making *that* the tiny seed. Do not bulk-generate first.

## What not to write

- A single slogan meant to be both “what my side believes” and “the compromise.”
- Bloodless centrist mush nobody on either side would sign.
- Natural camp talk treated as if it already implied the deal.
- Asking the attester to connect “I care about X” and “I care about Y” into “I care about X and Y.”
- Putting words in mouths at misunderstanding-pattern scale without persuasion content (that’s [Civility / noninflammatory content](/docs/end-user/shared/use-case-walkthroughs/noninflammatory-content.md), not the attester).
