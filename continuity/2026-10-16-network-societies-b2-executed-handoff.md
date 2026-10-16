# Handoff: DeepSeek model for opencode-go, then the leftover campaign gaps

Next session: figure out which DeepSeek model `opencode-go` should use. `deepseek-v4-flash` is a poor default for implication checks. Try whether 4.1 flash returns JSON. Do not treat that model hunt as a reason to rewrite the batch-2 statements again.

## Read first

- [`fake-data-generation/campaigns/network-societies-v1-b2.md`](../fake-data-generation/campaigns/network-societies-v1-b2.md) — what batch 2 published.
- [`fake-data-generation/campaigns/network-societies-v1-b2-implication-evaluations.json`](../fake-data-generation/campaigns/network-societies-v1-b2-implication-evaluations.json) — 68 live pairs. Model `deepseek/deepseek-v3.2`. Prompt fingerprint `2f61d4d61235214eceee97e9a364da48b8a6833f509089941cb758728302e891`.
- [`fake-data-generation/campaigns/network-societies-v1-b2-decisions.json`](../fake-data-generation/campaigns/network-societies-v1-b2-decisions.json) — allowed arrows and the five first-wording refusals.
- [`verifier/llm-routing.json`](../verifier/llm-routing.json) — subscription pin. Every task kind is `xai/grok-4.6`. Allowed providers are `xai` and `opencode-go`. Never OpenRouter for verifier leaves.
- [`services/attester-core/src/llm-models.ts`](../services/attester-core/src/llm-models.ts) and [`services/attester-core/src/openrouter.ts`](../services/attester-core/src/openrouter.ts) — production OpenRouter default is `deepseek/deepseek-v4-flash-0731`, and `requestJsonCompletionWithUsage` caps `max_tokens` at 500.
- Branch `campaign`. Do not commit on `dev` or `master`.

## What is already true

Batch 2 was executed locally into `output/campaigns/network-societies-v1-b2/` (gitignored). 446/446 mined and reconciled. The first pass failed 14 actions with insufficient ETH (`setBeliefsInBatch` and large publishes). Those wallets were topped up with `hardhat_setBalance` and the run resumed. Do not overwrite the pilot or `medium-realistic-v2` outputs.

Twelve new modified-to-commonality arrows are planned with evidence `live-attester-modified-to-commonality`. Abortion and schools stay `accepted-bridge-role-pair`. The six clusters are not accepted seed. Employment modifieds and the Canada commonality were rewritten once so designed-no pairs refuse. Details are in the campaign note, not repeated here.

`deepseek/deepseek-v4-flash-0731` returned an empty message body on the longer pairs. That is the same stall recorded for the abortion live check in [`statement-generation-exercises/02-compromise-abortion.json`](../fake-data-generation/statement-generation-exercises/02-compromise-abortion.json). v3.2 returned JSON. Heuristic `implies: true` was not used.

The Grey County assimilation commonality board loaded at `http://commonality.localhost:8088/#/cause/0xEe6a18208ca061e2Eddd4A6fA7E4E4d4927eF352/network-societies-v1-b2-grey-assimilation-bridge`. The statement page shows "Arriving through other statements." Direct and indirect counts were 0 on that load.

## What to do

1. Decide the `opencode-go` DeepSeek model. `verifier/llm-routing.json` does not name one yet. An older note in [`verifier/verifier-checks-need-founder-level-understanding.md`](../verifier/verifier-checks-need-founder-level-understanding.md) pointed `clear-communication` at `deepseek-v4-pro`. Adam's guess: 4.1 flash may work better than v4-flash. Check the model ids `pi` / opencode-go actually accept, then run one short JSON implication pair and one longer modified-to-commonality pair. Record empty body versus a real decision. If v4-flash only fails because reasoning tokens eat the 500-token cap, say so. Do not switch production `PRODUCTION_OPENROUTER_MODEL` unless a model both returns JSON and matches the v3.2 designed-yes/no pattern on a few known pairs.
2. The campaign gas estimate underfunded 14 wallets on this run. Look at `computeCampaignFundingNeeds` versus the gas viem actually requests (`setBeliefsInBatch` at 280000, publishes around 4e6). A resume should not need a manual `hardhat_setBalance`.
3. Persona `set-belief` choices in the decisions file are still not applied. Eli can still be planned as believing the abortion commonality.
4. Delegated spending and a recurring monthly pledge are still not campaign actions.
5. The remaining brainstorm families (low-carb, unwoke as an umbrella, Democracy 2.0, Islamic reform, permitting, home-school beyond the pilot) are still unauthored. Do not force triples onto overlaps that already share a concrete want.

## Suggested skills

- `thorough-tester` — one short and one long implication pair per candidate model, plus the gas-estimate shortfall.
- `browser-driving` — only if a later execute changes a board. This session already opened the assimilation commonality.
