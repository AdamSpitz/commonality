# Handoff: AI-pause board, then the rest of the network-societies campaign

Next session: author the families that are still missing. The AI-pause attester pass is done. Do not publish an implication the attester has not blessed. Do not write a new plan over `fake-data-generation/output/campaigns/network-societies-v1-b2/` or over `output/campaigns/network-societies-v1-b2-ai-pause/` if that directory is later executed.

## Read first

- [`fake-data-generation/campaigns/network-societies-v1-b2.md`](../fake-data-generation/campaigns/network-societies-v1-b2.md) — what batch 2 publishes, and the rule that the mined directory is the pre-pin plan.
- [`fake-data-generation/campaigns/network-societies-v1-b2-statements.json`](../fake-data-generation/campaigns/network-societies-v1-b2-statements.json) group `ai-pause`, and the matching people in [`network-societies-v1-b2-decisions.json`](../fake-data-generation/campaigns/network-societies-v1-b2-decisions.json).
- [`fake-data-generation/brainstorming/network-societies-campaign-plan.md`](../fake-data-generation/brainstorming/network-societies-campaign-plan.md) — which families are still not manifests, and the attester quality gate.
- [`specs/product/statements-are-peculiar-for-good-reasons.md`](../specs/product/statements-are-peculiar-for-good-reasons.md) — containment versus nudge. The AI-pause modifieds were written to that rule. They have not been checked by the model.
- Branch `campaign`, not pushed. This slice is `75705202` ("Add an AI-pause board with milder wordings and dissenters."). Parent is `dd3578dc`.

## What is already true

The cause is one plain board, `ai-pause`, so every sentence stays on it. It is not bridge-shaped: the five bridge roles are not all present. Five live-attester arrows are now in `implicationAllowances`. The planner allows a plain-board modified when the evidence label is `live-attester-modified-to-commonality`.

The shared sentence is a treaty that pauses new research aimed at making AI systems more capable, for the length of that pause, while work on catastrophic harm continues, and that does not switch off current tools. Five modified statements contain that sentence and keep a reason the short sentence omits: small chance, jobs, industry warnings, not-a-Luddite, children. Naturals do not name the treaty. `pole-stop` (Hal) and `pole-accelerate` (Vic) reject the pause. Noor and Tess are nudge targets: they signed a natural and left the treaty unsigned.

Seven spotlight users are `user-061` through `user-067` (Priya, Dean, Noor, Sam, Tess, Hal, Vic), persona `ai-pause-voice`. Five projects are in `network-societies-v1-b2-projects.json` under `ai-pause`. Scale is 16 causes, 117 statements, 67 users, 57 projects. Alignment attestations were raised from 40 to 57 so the new projects can be funded. `npx tsx --test test/campaignPlanner.test.ts` passed before the commit. The commit hook's fast suite passed.

The mined run in `output/campaigns/network-societies-v1-b2/` is still the older 60-user, 100-statement, 52-project plan. Rewriting that directory would mark its wallets unprovisioned.

## What is done (2026-10-16, later session)

The eleven AI-pause pairs were sent to `evaluateImplicationWithLLM` on `deepseek/deepseek-v3.2`. All five designed-yes pairs blessed at high confidence, and all six designed-no pairs refused at high confidence, on the first wording. The rows are appended to `network-societies-v1-b2-implication-evaluations.json` (79 pairs, same prompt fingerprint). The five blesses are in `implicationAllowances`. The planner now accepts a live-attester modified whose statement id starts with `modified-` even when the board is plain, so the industry, not-a-Luddite, and children arrows are planned, not only `modified-left` and `modified-right`. `npx tsx --test test/campaignPlanner.test.ts` passed (15 tests). The fresh plan is `output/campaigns/network-societies-v1-b2-ai-pause/` (67 users, 117 statements, 57 projects, 491 writes). It was not executed. The mined directory was not rewritten.

## What to do

1. Author the next family batch. Still not manifests: low-carb, cancel-proof support, unwoke, Democracy 2.0, Islamic reform, and less regulation. US-friendly Canadians was expanded past the five-statement draft in a later session. Home learning and Grey County civic life stop at the pilot planks. Do not force a new triple onto an overlap that already shares a concrete want. The campaign plan's "Next task" paragraph lists those six families.
2. Delegated spending and a recurring monthly pledge stay out. Do not start a bulk random run. Do not execute the AI-pause plan unless you mean to, and do not overwrite either existing output directory.

## Suggested skills

- `thorough-tester` — after an attester pass, check that Hal and Vic are not supporters of the pause through an arrow, and that Noor and Tess stay unsigned on the treaty.
- `browser-driving` — only after a fresh local execute. Open the AI-pause board and confirm the milder sentences are visible next to the shared sentence.
