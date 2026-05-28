# Bridge Finder: Priority Scoring for the Implication Finder

*(architecture note — not a standalone service)*

## The Distinction That Matters

There are two different "bridge" problems, and they belong to different tiers of the architecture:

1. **Active synthesis** — creating new statements that bridge opposing positions. This is the [bridge-creator nudger](./bridge-creator.md)'s job. It synthesizes modified statements and commonality statements, then nudges users toward them. This is specced and stubbed.

2. **Priority discovery** — finding existing statement pairs where a hidden-majority pattern is *already latent* in what users have written. This is an implication finder problem: instead of treating all candidate pairs equally, score them by how likely they are to represent cross-side common ground.

This doc is about the second problem. The first problem is solved. Don't confuse them.

## Why Priority Scoring Belongs in the Implication Finder

The implication finder already:
- Has visibility into the full set of statements
- Selects pairs and submits them to the attester for evaluation
- Can be tuned independently of the attester

Adding bridge-priority scoring to the finder means the same service that finds "ordinary" implications can *also* prioritize the pairs most likely to surface hidden-majority patterns. There's no need for a separate bridge-finder service.

The earlier open question "Is it necessary to have a separate service?" is resolved: **no**. Implement it as a scoring mode or heuristic within the existing implication finder.

## What Bridge Priority Scoring Would Look Like

The core idea: when the finder selects pairs, give a higher submission priority to cross-side pairs where both statements contain moderate or conditional language — because those are the ones that fit the [hidden-majority patterns](/docs/end-user/csm/hidden-majority-patterns.md).

Candidate signals (for a future implementation pass):
- **Cross-polarity** — statements from opposing sides (left vs. right, not both center) that might converge
- **Moderate/conditional language** — "I'd accept...", "as long as...", "I'd rather..."
- **Transitive bridges** — if A→B and C→B are both attested and A & C are from different sides, A↔C is a high-value pair to evaluate

The attester doesn't need to know about priority scores; it evaluates whatever pairs it receives. Priority scoring just changes which pairs the finder submits first when volume is high.

## What's Missing Before This Can Be Built

The main blocker is that statements don't currently carry polarity metadata:
- `polarity` — left/right/center/unknown
- `isModerate` — boolean
- `hasConditionalClauses`

Where this comes from is still an open question. Options: AI-tagged at finder-time (most flexible), inferred from statement content, or added by statement writers. Finder-time AI tagging is probably the right first pass — it keeps the statement schema simple and doesn't add writer burden.

The same-domain restriction discussed in the [implication discovery spec](../tech/subsystems/conceptspace/implication-discovery.md) should land first; bridge priority scoring is a follow-on enhancement once the basic finder is tuned.

## Status

Not yet implemented. Not blocking. The right time to implement is after the basic implication finder is running in production and we have real statement data to see what patterns emerge. Bridge priority scoring is an optimization, not a prerequisite.

---

See also:
- [Implication Discovery](../tech/subsystems/conceptspace/implication-discovery.md) — current finder spec
- [Hidden-majority patterns](/docs/end-user/csm/hidden-majority-patterns.md) — the patterns we're trying to surface
- [Bridge Creator](./bridge-creator.md) — handles active synthesis (the other bridge problem)
