# Handoff — statement generation (2026-08-27)

Next session: promote exercise 1 into live seed **or** start curriculum exercise 2 (real-gap left/right triple). Do not polish Christian/secular as the implication demo.

## Suggested skills

- None required. Read repo docs, not a coding-agent skill. If the next session is a design-doc loop for bridges, `/design`. If implementing a PR plan, `/execute-plan`.

## Read first

1. [`fake-data-generation/statement-generation.md`](../fake-data-generation/statement-generation.md) — process, curriculum, geographic parents, gold-set rules.
2. [`specs/product/statements-are-peculiar-for-good-reasons.md`](../specs/product/statements-are-peculiar-for-good-reasons.md) — why wording is finicky.
3. [`fake-data-generation/statement-generation-exercises/01-simple-causes.json`](../fake-data-generation/statement-generation-exercises/01-simple-causes.json) — accepted-as-useful simple-cause texts.
4. [`cause-assist/src/statementGuidance.ts`](../cause-assist/src/statementGuidance.ts) — same rules for `/atomize` / `/sharpen-plank`.
5. [`fake-data-generation/christian-secular-tiny-seed.md`](../fake-data-generation/christian-secular-tiny-seed.md) — that pairing is a **weak** first implication exercise; do not train generation on it.

## What happened this session

Goal: a reliable way for an LLM to generate viable seed statements (and cause-assist suggestions), not more hand-wordsmithing.

Wrote the process doc. Ran exercise 1 (simple causes, **no triples**) through live cause-assist, then Adam iterated in-JSON notes. Failures that became generation rules:

| Reject | Rule |
|---|---|
| “X is a public good” / “legitimate way to keep X available” | Want the outcome, do not classify it. |
| “I want maintainers paid” / unpaid nights | Paying is the system. Align projects with the work-product. |
| Category-only OSS | Earmark grain is a **ladder** (OSS → Linux → Linux desktop). |
| Food only by mechanism | Food also tightens by **place** (CSA in Grey County, Ontario). |
| Closed `any` combinator over counties | Geographic rollup = child → parent implication; board of S is inbound arrows. Parent is a location **container** (“in Ontario”), not “throughout Ontario”. Non-transitive. |

Adam (2026-08-27): those exercise-1 statements now **feel viable** to sign and to attest project alignment against. The list is **not** claimed complete for every variation type.

Exercise JSON is **not** in `seed-content/`. `loadSeedCollections` must not read `statement-generation-exercises/`. Tiny seed still uses the old local-food explorer slogan.

Docker cause-assist may still serve the **old** prompt until that service is rebuilt; source guidance is updated.

## Next work (Ask Adam which)

1. Copy accepted planks into `seed-content/` (will change seed fingerprints / worker fixtures). Optionally an OSS CauseStarter roster and/or local-food plank expansion. **Ask** before tiny-seed CID churn.
2. Live `/check-implications` on the designed Grey → Ontario (and topical parent) pairs; rewrite parent if attester treats “in Ontario” as a universal.
3. Curriculum **exercise 2**: one left/right compromise-in-the-middle triple using canonical hidden-majority-patterns wording (do not fork a second abortion text).
4. **Exercise 3**: gate cause-assist suggestions on the same checks.

Human role remains: pick topics/patterns, veto. Do not silently load exercises into the live corpus.
