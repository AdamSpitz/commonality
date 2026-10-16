# Handoff: AI-pause board, then the rest of the network-societies campaign

Next session: finish the AI-pause cause, then keep authoring the families that are still missing. Do not publish an implication the attester has not blessed. Do not write a new plan over `fake-data-generation/output/campaigns/network-societies-v1-b2/`.

## Read first

- [`fake-data-generation/campaigns/network-societies-v1-b2.md`](../fake-data-generation/campaigns/network-societies-v1-b2.md) — what batch 2 publishes, and the rule that the mined directory is the pre-pin plan.
- [`fake-data-generation/campaigns/network-societies-v1-b2-statements.json`](../fake-data-generation/campaigns/network-societies-v1-b2-statements.json) group `ai-pause`, and the matching people in [`network-societies-v1-b2-decisions.json`](../fake-data-generation/campaigns/network-societies-v1-b2-decisions.json).
- [`fake-data-generation/brainstorming/network-societies-campaign-plan.md`](../fake-data-generation/brainstorming/network-societies-campaign-plan.md) — which families are still not manifests, and the attester quality gate.
- [`specs/product/statements-are-peculiar-for-good-reasons.md`](../specs/product/statements-are-peculiar-for-good-reasons.md) — containment versus nudge. The AI-pause modifieds were written to that rule. They have not been checked by the model.
- Branch `campaign`, not pushed. This slice is `75705202` ("Add an AI-pause board with milder wordings and dissenters."). Parent is `dd3578dc`.

## What is already true

The cause is one plain board, `ai-pause`, so every sentence stays on it. It is not bridge-shaped: the five bridge roles are not all present, and nothing was added to `implicationAllowances`. The planner therefore publishes no AI-pause arrow.

The shared sentence is a treaty that pauses new research aimed at making AI systems more capable, for the length of that pause, while work on catastrophic harm continues, and that does not switch off current tools. Five modified statements contain that sentence and keep a reason the short sentence omits: small chance, jobs, industry warnings, not-a-Luddite, children. Naturals do not name the treaty. `pole-stop` (Hal) and `pole-accelerate` (Vic) reject the pause. Noor and Tess are nudge targets: they signed a natural and left the treaty unsigned.

Seven spotlight users are `user-061` through `user-067` (Priya, Dean, Noor, Sam, Tess, Hal, Vic), persona `ai-pause-voice`. Five projects are in `network-societies-v1-b2-projects.json` under `ai-pause`. Scale is 16 causes, 117 statements, 67 users, 57 projects. Alignment attestations were raised from 40 to 57 so the new projects can be funded. `npx tsx --test test/campaignPlanner.test.ts` passed before the commit. The commit hook's fast suite passed.

The mined run in `output/campaigns/network-societies-v1-b2/` is still the older 60-user, 100-statement, 52-project plan. Rewriting that directory would mark its wallets unprovisioned.

## What to do

1. Run the real implication attester on the AI-pause candidate pairs listed under `unevaluatedAndUnpublished` in the decisions file. Same bar as the six draft bridges: store text hashes, prompt fingerprint, model, and decision in an evaluations file; publish only affirmative modified-to-commonality blesses, as `live-attester-modified-to-commonality`. Designed negatives (naturals, poles, and commonality back to a modified) must stay unpublished. If a designed-yes fails or a designed-no passes, rewrite the prose, up to three tries, and keep the failures in the authoring record. The planner only emits an arrow for `modified-left` and `modified-right`. The other three modifieds can be blessed and still need a planner change before they become arrows. Do not pretend a bless of those three is already on the board.
2. After any allowance change, regenerate the plan into a new output directory. Leave `output/campaigns/network-societies-v1-b2/` alone. A local execute is optional and needs the existing runner, a fresh directory, and the alignment-trust bootstrap funded if the chain was wiped.
3. Then author the next family batch. Still not manifests: low-carb, cancel-proof support, unwoke, Democracy 2.0, Islamic reform, less regulation, and US-friendly Canadians beyond the five-statement Canada–US draft. Home learning and Grey County civic life stop at the pilot planks. Do not force a new triple onto an overlap that already shares a concrete want. The campaign plan's "Next task" paragraph still says eight families and should be corrected when the next batch lands.
4. Delegated spending and a recurring monthly pledge stay out. Do not start a bulk random run.

## Suggested skills

- `thorough-tester` — after an attester pass, check that Hal and Vic are not supporters of the pause through an arrow, and that Noor and Tess stay unsigned on the treaty.
- `browser-driving` — only after a fresh local execute. Open the AI-pause board and confirm the milder sentences are visible next to the shared sentence.
