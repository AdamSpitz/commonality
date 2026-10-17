# Handoff: evaluate the six draft bridges, then execute batch 2

Next session: run the real implication-attester prompt on the six draft clusters, keep failed pairs unpublished, and only then execute `network-societies-v1-b2` locally. Do not treat bridge-shaped boards as attested implications.

## Read first

- [`fake-data-generation/campaigns/network-societies-v1-b2.md`](../fake-data-generation/campaigns/network-societies-v1-b2.md) — what the batch publishes and what it must not.
- [`fake-data-generation/statement-generation-exercises/06-network-society-alliances.json`](../fake-data-generation/statement-generation-exercises/06-network-society-alliances.json) — draft wording. Not accepted seed.
- [`fake-data-generation/statement-generation.md`](../fake-data-generation/statement-generation.md) and [`specs/product/statements-are-peculiar-for-good-reasons.md`](../specs/product/statements-are-peculiar-for-good-reasons.md) — attester plus routing. A bless is not enough.
- [`fake-data-generation/PLAN.md`](../fake-data-generation/PLAN.md) section F.
- [`fake-data-generation/brainstorming/network-societies-campaign-plan.md`](../fake-data-generation/brainstorming/network-societies-campaign-plan.md) — quality gate for new edges.
- Branch `campaign`. This handoff's commit is the one that adds the six clusters. Do not commit on `dev` or `master`.

## What is already true

The four-family pilot was executed and reconciled locally (207/207). Details and board URLs: [`fake-data-generation/campaigns/network-societies-v1-pilot.md`](../fake-data-generation/campaigns/network-societies-v1-pilot.md). Do not overwrite `output/campaigns/network-societies-v1-pilot/` or `output/campaigns/medium-realistic-v2/`.

Batch 2 is planned in source, not executed. Manifest: 60 users, 100 statements, 52 projects, 15 causes. Causes `abortion` and `schools` reuse accepted seed wording. Six new causes are bridge-shaped from the exercise file: `grey-assimilation`, `ranked-approval-poll`, `checkout-trial-bridge`, `minors-medicine`, `opinion-employment`, `canada-us-ties`. The older plain boards (crypto planks, civic-life planks, the voting trial, gender-conduct, Michigan authority) stay.

`attest-implication` is capped at 4. Those four are the accepted abortion and schools modified-to-commonality pairs. The planner labels every such action `accepted-bridge-role-pair`. That label is false for the six new clusters, which is why their arrows are omitted. `campaignPlanner.test.ts` asserts the new cause ids have commonality boards and no implication actions.

Persona `set-belief` choices are still not applied. Delegated spending and a recurring monthly pledge are still not campaign actions. The Canada–US commonality is the weakest draft ("I'd be okay with saying that…").

A wiped local chain needs `node scripts/fund-local-service-wallets.mjs` before cause pages list projects. See the pilot note.

## What to do

1. Evaluate each new cluster with the real implication-attester system prompt (`cause-assist/src/implicationCheck.ts` / `IMPLICATION_EVALUATOR_SYSTEM_PROMPT`). Designed yes: each modified → commonality. Designed no: each natural → commonality, reverse arrows, and the assimilation cluster against the accepted immigration statements. Record hashes, prompt fingerprint, model, decision, and rationale. Heuristic `implies: true` is not evidence. If credentials are missing, stop and say so.
2. Run the routing check from the statements spec. Rewrite the wrong role if a designed-yes fails or a designed-no passes. The Canada–US commonality is the first candidate to rewrite.
3. Only after an affirmative model decision, raise the batch-2 `attest-implication` target so those pairs are planned, and store evidence that is not the accepted-role stamp. Leave refused pairs in the decisions file.
4. Regenerate the plan into a fresh output directory. Run `npx tsx --test test/campaignPlanner.test.ts` from `fake-data-generation/`.
5. Execute locally only after the plan matches the evidence. Walk the new bridge boards in the browser. Do not call the batch complete while a required journey is missing. The remaining brainstorm families (low-carb, unwoke as an umbrella, Democracy 2.0, Islamic reform, permitting, home-school beyond the pilot) are still unauthored. Do not force triples onto overlaps that already share a concrete want.

## Suggested skills

- `thorough-tester` — designed-negative pairs and the attest-implication cap.
- `browser-driving` — after a local execute, open one new bridge (commonality plus one modified board) and confirm the new clusters have no implication chip until step 3.
