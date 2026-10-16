# Handoff: leftover network-societies batch-2 campaign gaps

Next session: apply the persona `set-belief` choices, then decide whether delegated spending and a monthly pledge belong in this campaign. Do not rewrite the batch-2 statements. Do not force triples onto the skipped overlaps.

## Read first

- [`fake-data-generation/campaigns/network-societies-v1-b2.md`](../fake-data-generation/campaigns/network-societies-v1-b2.md) — what batch 2 published, the gas shortfall, and the model note.
- [`fake-data-generation/campaigns/network-societies-v1-b2-decisions.json`](../fake-data-generation/campaigns/network-societies-v1-b2-decisions.json) — allowed arrows and the persona refusals. Eli's refusal of the abortion settlement is authoring intent. The planner can still have him believe that commonality.
- [`verifier/llm-routing.json`](../verifier/llm-routing.json) — `clear-communication` is `opencode-go/qwen3.8-flash`. Every other task kind is `xai/grok-4.7`. Never OpenRouter for verifier leaves.
- Branch `campaign`. Do not commit on `dev` or `master`.

## What is already true

Batch 2 was executed locally. 446/446 mined and reconciled after a manual ETH top-up. Funding now prices a belief batch as `40_000 + 80_000 * n` gas (280_000 for three) and a publish as 4_000_000 plus 500_000 per extra document in the batch. That change is in `campaignBatching.ts`. A later local run should not need `hardhat_setBalance`. Do not overwrite the pilot or `medium-realistic-v2` outputs.

`opencode-go` DeepSeek ids return HTTP 400 until the OpenCode workspace privacy region is Global. `opencode-go/qwen3.8-flash` returned parseable JSON and matched the v3.2 yes/no on one short pair and one long modified-to-commonality pair. Production `PRODUCTION_OPENROUTER_MODEL` is still `deepseek/deepseek-v4-flash-0731`. The attester's 500-token cap was not retested.

The Grey County assimilation commonality board loaded with "Arriving through other statements." Direct and indirect counts were 0.

## What to do

1. Apply the persona `set-belief` choices in the decisions file. Eli must not be planned as believing the abortion commonality.
2. Delegated spending and a recurring monthly pledge are still not campaign actions. Add them only if they fit an existing persona in this manifest.
3. The remaining brainstorm families (low-carb, unwoke as an umbrella, Democracy 2.0, Islamic reform, permitting, home-school beyond the pilot) are still unauthored. The campaign note already skips several of these as overlaps. Do not force triples onto overlaps that already share a concrete want.

## Suggested skills

- `thorough-tester` — after belief choices change, check the planned actions against the decisions file before another chain run.
- `browser-driving` — only if a later execute changes a board.
