# Bridge Finder: A Focused Implication Discovery Approach

*(not a finished spec — just sketching ideas)*

## The Question

The current implication-finder is deliberately simple: it watches for new statements, finds popular ones, and pairs them in both directions. No domain awareness, no polarity detection, no sense of whether a pair represents "common ground" vs just any implication.

Is that enough? Maybe. But there's a case for a **focused** finder that specifically hunts for hidden-majority patterns.

## The Hidden-Majority Angle

The [hidden-majority](../tech/subsystems/conceptspace/content-patterns/hidden-majority.md) spec describes several patterns where moderate statements on both sides imply a shared conclusion:

- **Compromise in the middle**: "I'd accept 14 weeks" + "I'd accept 16 weeks" → "12-18 weeks is fine"
- **Same values, different beliefs**: "If X is true, then Y" from both sides
- **Different problems, same solution**: Both sides arrive at the same policy for different reasons

These aren't just any implications — they're the ones that make the system *useful* for coalition-building. A finder that prioritizes finding these could be valuable even if it submits fewer pairs.

## What It Would Look Like

A **bridge-finder** (name TBD) that runs alongside the general one, with different heuristics:

### Candidate Selection

Instead of "new + popular", it would look for:

1. **Cross-side moderate pairs** — statements from opposing polarities (left/right) that both contain moderate/conditional language ("I'm okay with...", "as long as...", "obviously...")

2. **Transitive bridges** — If A→B and C→B are both attested, and A & C are from different sides, flag A↔C as a potential bridge

3. **Same-domain, same-values** — Statements in the same domain that express similar values but different beliefs

### Priority Scoring

Pairs would get a "bridge score" that the attester could use to prioritize evaluation:

```typescript
function bridgeScore(a: Statement, b: Statement): number {
  let score = 0;
  
  // Core heuristic: cross-side moderate statements
  if (a.polarity !== b.polarity && 
      a.polarity !== 'center' && 
      b.polarity !== 'center') {
    score += 50;
  }
  
  // Moderate/conditional language
  if (a.hasConditionalClauses || a.isModerate) score += 20;
  if (b.hasConditionalClauses || b.isModerate) score += 20;
  
  return score;
}
```

### Statement Metadata

This requires statements to carry metadata beyond just content — things like:
- `domain` (already planned)
- `polarity` — left/right/center/unknown (who wrote it or how they self-identify)
- `isModerate` — boolean (does the statement contain "moderate" language?)
- `hasConditionalClauses` — string[] ("as long as...", "if...")

Where does this metadata come from? Options:
- AI-tagged by the attester when it evaluates
- Added by the statement writer
- Inferred from statement content at finder-time

## Why Not Just One Finder?

The spec already mentions finders can be sharded:
> "finders will probably be stateful, but they're more 'open' and can be 'sharded'; we (or anyone else) can just start finders focused on particular areas"

A focused bridge-finder could:
- Run less frequently (fewer pairs = less compute)
- Have stricter submission criteria (higher signal, lower noise)
- Be tuned independently for the hidden-majority use case

The general finder still catches all the "ordinary" implications.

## Open Questions

1. **Is this premature?** The system doesn't even have the basic finder running yet. Maybe build that first and see what patterns emerge before adding specialized finders.

2. **Where does polarity come from?** We don't currently track who believes what by polarity. Would we need a separate "user polarity" dimension on beliefs?

3. **Is it necessary?** Maybe a single finder that weights cross-side moderate pairs higher is simpler than two separate finders. The priority scoring idea above could just be added to the existing finder.

4. **What about the attester?** If the finder submits priority-ranked pairs, does the attester need to know about priority? Or does it just evaluate everything it receives equally?

## Next Steps

- Maybe prototype this as a "mode" flag on the existing finder rather than a separate service
- Wait until we have real statement data to see what patterns actually look like
- Discuss: is this worth building, or is the "dumb" finder + attester enough to surface hidden majorities anyway?

---

See also:
- [Implication Discovery](../tech/subsystems/conceptspace/implication-discovery.md) — current finder spec
- [Hidden Majority](../tech/subsystems/conceptspace/content-patterns/hidden-majority.md) — the patterns we're trying to find
- [Bridge Creator](./bridge-creator.md) — actively tries to find common ground
