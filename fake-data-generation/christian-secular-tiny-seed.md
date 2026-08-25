# Christianity × secular conservatism — tiny seed (working plan)

Status: **in progress.** Update this file as work lands so a later session can resume without the chat.

Canonical wording constraints: [statements are peculiar for good reasons](/specs/product/statements-are-peculiar-for-good-reasons.md). Mediator strategy already in repo: [`services/bridge-creator/config/christian-secular-conservative.example.json`](/services/bridge-creator/config/christian-secular-conservative.example.json) (family-formation / kids-and-tech / religious-liberty / moral-grounding). This seed **replaces** the thin CauseStarter Christianity planks, it does not add a second Christianity.

## Goal

Tiny local seed (`./scripts/data.sh --seed`, i.e. `gen:tiny`) should show two CauseStarter boards and a mediator cluster whose statements actually have the peculiar shape, and whose designed implication arrows the **live** implication attester blesses.

## Decisions (locked)

- **Topics.** Four naturals per camp. Shared: abortion, markets, LGBT unbundling. Unique: Scripture-in-every-language (Christian); colorblind merit / individual equal protection (secular).
- **Patterns.** Abortion = compromise in the middle (within the right, not left/right). Markets = different reasons, same conclusion. LGBT = coalition unbundling (reaffirm kindness / adult liberty; break on rushing minors). Uniques have **no** triple.
- **Cause boards** hold **natural** planks only (4 + 4). **Modified + commonality** are mediator-authored, not swapped onto the camp boards.
- **Mediator account:** keep **Hardhat #8** (`FUNDED_HARDHAT_DEV_KEYS[8]`), already `CHRISTIAN_MEDIATOR_*` in `seedChristianityCause.ts`. Do not jump to #19 unless we also move CSM (#7) and fund a high band. Humans stay in #0–#6; #9 remains secular-conservatism founder; #0 remains Christianity / local-food owner.
- **Implication direction.** Board for S shows projects aligned with S2 where **S2 implies S**. So a project attested to **modified-Christian** appears on **commonality** (if MC→CG). A secular user who signed **modified-secular** sees it if the UI unions boards of statements they support *including implied CG*. They will not see it on the MS board itself (MC does not imply MS). Include at least one project aligned **only** with a unique plank (negative: other camp must not see it). Include some alignments to **naturals** (should not cross the bridge if natural↛CG).
- **Attester expectations.** Stop only if a **designed yes** is refused.
  - Yes: each modified → its CG (containment / subset).
  - No (not a bug): natural → CG, pole → anything, MC → MS, unique → CG, CG → modified.
- **~10 projects**, not 17. Shared alignments. One unique-only.
- **Personas** as hand-authored JSON driving signs / creates / attests — do not grow random `universe.json` soup for this. Later make that the easy path for more clusters.
- **This becomes tiny.** Drop random 12-statement universe slice from tiny once this cluster + personas exist. Until then, statements live in seed-content JSON and can be blessed without a full reseed.

## Statement source of truth

[`seed-content/christian-secular-bridge.json`](./seed-content/christian-secular-bridge.json)

Each shared group has: `natural-christian`, `natural-secular`, `modified-christian`, `modified-secular`, `commonality`. Unique groups have a single natural.

Modified texts **copy the commonality sentences** so the attester’s subset rule can fire. The attester **rejects** “concession as implication” when S2’s compromise is not already in S1 (`evaluator.ts`).

## Work log

- [x] This plan file.
- [x] Author seed JSON (8 naturals + 3 triples).
- [x] Live attester (2026-08-25, `deepseek/deepseek-v3.2`): all 6 designed **yes** pairs blessed (high / subset); all 6 designed **no** pairs refused. Script: `npm run gen:seed:christian-secular-implications`.
- [x] Point `CHRISTIANITY_PLANKS` / `SECULAR_CONSERVATIVE_PLANKS` at the naturals; publish modified+CG as mediator (#8) statements. **Nudge batches parent→modified still TODO.**
- [x] Persona JSON (`data/christian-secular-personas.json`) + driver in `seedChristianityCause.ts`: persona-based signs, 10 projects, mixed natural vs modified alignments, unique-only scripture + colorblind negatives.
- [ ] Make `gen:tiny` load this instead of 12 random universe statements (Christianity seed already runs on every seed size; random universe statements still published).
- [x] `seedMetadata.test.ts` plank counts 4/4 and 10 projects. Common Table retargeted to `scripture/natural-christian`.
- [ ] Optional: align bridge-creator example anchors with these texts later; do not fork a second abortion triple in hidden-majority-patterns.

## Still open (resume here)

1. **Nudge batches.** Publish parent→modified nudges from Hardhat #8 so the mediator card is not a dead link. Naturals are the parents; modifieds are the suggestions.
2. **`gen:tiny` still publishes 12 random `universe.json` statements.** Christianity/secular cluster already runs on every seed size; tiny should stop dumping the unrelated generated slice once this cluster is the tiny story.
3. **Live wipe-and-reseed + CauseStarter click-through.** Not done this session. After (1)–(2), `./scripts/data.sh --wipe` + `--seed=tiny` and check both cause boards, modified alignments crossing via CG, and unique-only projects *not* crossing.
4. **On-chain implication attestations.** We only ran the LLM evaluator (`evaluateChristianSecularBridge.ts`). Seeding still needs the blessed modified→CG arrows actually published on chain (replay stored decisions, same pattern as `seed-implication-evaluations.*`).

## Resume hints

- Implication evaluator: `@commonality/implication-attester` `evaluateImplicationWithLLM`, needs `OPENROUTER_API_KEY`. Re-run: `npm run gen:seed:christian-secular-implications`.
- Existing Christianity seed: `seedChristianityCause.ts`, `npm run gen:seed:christianity`.
- Plank counts in tests: 4 Christian naturals, 4 secular naturals, 10 persona projects (`test/seedMetadata.test.ts`).
- Content contract: `generateChristianContentScenario` aligned to `scripture/natural-christian`.
