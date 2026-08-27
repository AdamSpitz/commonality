# Handoff — statement generation (2026-08-27)

Next session: curriculum **exercise 2** (one left/right compromise-in-the-middle triple). Nested-place rollup is **settled** as board inclusion, not implication. Do not polish Christian/secular as the implication demo. Do not load `statement-generation-exercises/` via `loadSeedCollections`.

## Suggested skills

- None required. Read repo docs, not a coding-agent skill. If the next session is a design-doc loop for bridges, `/design`. If implementing a PR plan, `/execute-plan`.

## Read first

1. [`fake-data-generation/statement-generation.md`](../fake-data-generation/statement-generation.md) — process, curriculum, geographic parents, gold-set rules.
2. [`specs/product/statements-are-peculiar-for-good-reasons.md`](../specs/product/statements-are-peculiar-for-good-reasons.md) — why wording is finicky.
3. [`fake-data-generation/seed-content/simple-causes.json`](../fake-data-generation/seed-content/simple-causes.json) — live copy of accepted simple-cause texts.
4. [`cause-assist/src/statementGuidance.ts`](../cause-assist/src/statementGuidance.ts) — same rules for `/atomize` / `/sharpen-plank`.
5. [`fake-data-generation/christian-secular-tiny-seed.md`](../fake-data-generation/christian-secular-tiny-seed.md) — that pairing is a **weak** first implication exercise; do not train generation on it.

## What happened

Goal: a reliable way for an LLM to generate viable seed statements (and cause-assist suggestions), not more hand-wordsmithing.

Wrote the process doc. Ran exercise 1 (simple causes, **no triples**) through live cause-assist, then Adam iterated in-JSON notes. Failures that became generation rules:

| Reject | Rule |
|---|---|
| “X is a public good” / “legitimate way to keep X available” | Want the outcome, do not classify it. |
| “I want maintainers paid” / unpaid nights | Paying is the system. Align projects with the work-product. |
| Category-only OSS | Earmark grain is a **ladder** (OSS → Linux → Linux desktop). |
| Food only by mechanism | Food also tightens by **place** (CSA in Grey County, Ontario). |
| Closed `any` combinator over counties | Nested-place rollup is board inclusion (relevant areas + `within`), not child → parent implication. |

Adam (2026-08-27): those exercise-1 statements **feel viable** to sign and to attest project alignment against. The list is **not** claimed complete for every variation type.

Later same day: copied into [`seed-content/simple-causes.json`](../fake-data-generation/seed-content/simple-causes.json). Same evening: product spec settled nested-place as board inclusion. Ontario farmers-market plank restored `more` (no longer a workaround parent). Garden seed publishes Grey County relevant areas; local-food roster publishes `within: Ontario, Canada`. Tiny seed still aligns the garden to the explorer slogan CID. `loadSeedCollections` does not read `statement-generation-exercises/`. Nested-place pairs are designed-no: `npm run gen:seed:simple-causes-implications`.

Docker cause-assist may still serve the **old** prompt until that service is rebuilt; source guidance is updated.

## Next work

1. ~~Copy accepted planks into `seed-content/`~~ **done.**
2. ~~Geographic rollup Ask~~ **settled** as board inclusion. Seed wording and cause-assist guidance updated. Leftover: live attester prompt still teaches narrower→broader geography; un-teach + refresh implication corpus separately.
3. Curriculum **exercise 2**: draft is [`statement-generation-exercises/02-compromise-abortion.json`](../fake-data-generation/statement-generation-exercises/02-compromise-abortion.json) (canonical patterns-page texts). **Not** in seed-content. Run attester + `/critique-triple`. Likely containment gap: modified-right vs 12–16 weeks. If wording changes, change hidden-majority-patterns.md too.
4. **Exercise 3**: gate cause-assist suggestions on the same checks.

Human role remains: pick topics/patterns, veto. Do not silently load exercises into the live corpus. Do not mint geo `any`s. Do not teach Grey → Ontario as implication.
