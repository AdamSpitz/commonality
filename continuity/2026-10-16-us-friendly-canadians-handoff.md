# Handoff: finish the US-friendly Canadian family

Done in the session that read this note. `canada-us-ties` now has the five original sentences, five work planks, a boycott, and a narrower-ties sentence. Greta rejects the shared sentence. Neil rejects it too. The attester refused both designed-negative directions that were checked. No new arrow was published. The fresh plan is `fake-data-generation/output/campaigns/network-societies-v1-b2-canada-us/`. It was not executed. The mined directory and the AI-pause plan directory were not rewritten. Six families stay unauthored: low-carb, cancel-proof support, unwoke, Democracy 2.0, Islamic reform, and less regulation.

Original brief, for the record: expand `canada-us-ties` from the five-statement draft into a real family. Do not start the other six missing families. Do not publish an implication the attester has not blessed. Do not write over `fake-data-generation/output/campaigns/network-societies-v1-b2/` or `output/campaigns/network-societies-v1-b2-ai-pause/`.

## Read first

- [`fake-data-generation/brainstorming/network-societies-campaign-plan.md`](../fake-data-generation/brainstorming/network-societies-campaign-plan.md) — family minimum, and the US-friendly Canadians row. The "Next task" paragraph still lists seven unauthored families. This session finishes one of them.
- [`fake-data-generation/campaigns/network-societies-v1-b2.md`](../fake-data-generation/campaigns/network-societies-v1-b2.md) — what batch 2 already publishes.
- Group `canada-us-ties` in [`network-societies-v1-b2-statements.json`](../fake-data-generation/campaigns/network-societies-v1-b2-statements.json), the two projects in [`network-societies-v1-b2-projects.json`](../fake-data-generation/campaigns/network-societies-v1-b2-projects.json), and the cause in [`network-societies-v1-b2.json`](../fake-data-generation/campaigns/network-societies-v1-b2.json).
- [`specs/product/statements-are-peculiar-for-good-reasons.md`](../specs/product/statements-are-peculiar-for-good-reasons.md) — containment versus nudge.
- Branch `campaign`, not pushed. Tip is `c72c768f` ("Allow the five AI-pause modifieds the attester blessed."). Parent is `702c8ce0`.

## What is already true

`canada-us-ties` is a bridge-shaped cause with five statements: natural-left, natural-right, modified-left, modified-right, commonality. The shared sentence is that ordinary Canadians should keep buying from US businesses and visiting family in the US, and that this is not a statement about the current US administration. Both modified-to-commonality arrows are already allowed as `live-attester-modified-to-commonality`. Designed negatives stayed unpublished. See [`network-societies-v1-b2-implication-evaluations.json`](../fake-data-generation/campaigns/network-societies-v1-b2-implication-evaluations.json) and the decisions file. Do not re-run those pairs unless the text changes.

The group's notes still say "Draft bridge. Unevaluated." That note is stale. Fix it when you touch the group.

The cause has two projects: "Ordinary-ties one-pager" and "Not-an-endorsement card". The family minimum is at least five projects (three base deliverables, two organizing). The campaign plan's base work is a shared cross-border cultural archive, a public guide to maintaining civic and business ties, and a joint community event with reusable materials. Organizing work is a maintained exchange directory and local host succession. Constituency to show: conservatives, apolitical families, businesspeople, anti-Trump internationalists, and people who favor a boycott or narrower ties.

Doug (`user-006`) is a member of the cause. He is not pinned to a Canada–US belief in the decisions file. The next free spotlight id after the AI-pause users is `user-068`. Current scale is 16 causes, 117 statements, 67 users, 57 projects, 21 implication actions, 57 alignment attestations, 90 set-belief writes. Those counts are exact targets in the manifest and in `fake-data-generation/test/campaignPlanner.test.ts`. Raising the catalog means raising the targets.

The overlap already has a concrete want (ordinary purchases and family visits). Do not add a second compromise triple on that same want. New sentences should be separate signable planks: the archive, the guide, the event, the directory, the host handoff, and at least two incompatible positions (a boycott, and narrower ties than purchases-and-visits). A boycott sentence must not imply the commonality. If a new modified is meant to imply an existing sentence, run `evaluateImplicationWithLLM` on `deepseek/deepseek-v3.2` (v4-flash returned empty content on longer pairs), store hashes, the prompt fingerprint, the model, and the decision, and add an allowance only for an affirmative modified-to-commonality bless. Use the same evidence label. Keep failures in the decisions file. Limit rewrites to three.

`npx tsx --test test/campaignPlanner.test.ts` passed before `c72c768f`. The commit hook's fast suite passed. The fresh unexecuted plan is `output/campaigns/network-societies-v1-b2-ai-pause/` (491 writes). After this expansion, regenerate into another new directory.

## What to do

1. Add the missing planks, dissent, at least three more projects, and a few spotlight people whose signs and rejects match those sentences. Unsigned is not a rejection. Name one person who wants a boycott and one who wants narrower ties.
2. Keep the existing five sentences and their two arrows unless a rewrite is forced by the attester. Do not copy them into `seed-content/`. This cluster is still not accepted seed.
3. Bump the manifest counts and the planner test. Run `npx tsx --test test/campaignPlanner.test.ts`.
4. Regenerate the plan into a new output directory. Leave the mined directory and the AI-pause plan directory alone. Do not execute unless asked.
5. Update the campaign note and the campaign plan's "Next task" so US-friendly Canadians beyond the draft is no longer listed as missing. Six families stay unauthored: low-carb, cancel-proof support, unwoke, Democracy 2.0, Islamic reform, and less regulation.
6. Delegated spending and a recurring monthly pledge stay out. Do not start a bulk random run.

## Suggested skills

- `thorough-tester` — after planning, check that a boycott signer is not a supporter of the ordinary-ties sentence through an arrow, and that the existing modified-to-commonality arrows still point only at the unchanged commonality.
- `browser-driving` — only after a fresh local execute. Open the Canada–US board and confirm the new planks sit beside the shared sentence.
