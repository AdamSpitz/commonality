# Network societies batch 2

Campaign id: `network-societies-v1-b2`. Synthetic users and deliverables. This is not evidence of adoption.

Keeps the four pilot families (Owen Sound checkout, Grey County civic life, Christian teaching, home learning). Adds three families:

- Abortion settlement, using the accepted `compromise-abortion` wording unchanged, plus a separate Michigan authority board.
- Schools and pushing, using the accepted `lgbt-schools` wording unchanged, plus a separate Grey County conduct board. The schools statements do not settle drugs, surgery, or classroom names.
- An Owen Sound non-binding voting trial.

The other families in the brainstorming plan are not in this manifest, except an AI-pause board. That board is plain: every sentence stays visible. Five milder modified sentences contain one shared pause-treaty sentence and each keeps a reason the shared sentence leaves out. Naturals do not name the treaty. Hal wants a full stop and rejects the pause. Vic rejects the pause because other labs will not stop. No AI-pause implication is in the allowance list. Those pairs are unevaluated.

## What the plan publishes

A plan written on 2026-10-16 has 67 users, 117 statements, 57 projects. The earlier mined run was 60 users, 100 statements, and 52 projects. Seed: `commonality-network-societies-v1-b2-2026-10-16`. Regenerate the plan before quoting a write count. The old 356-write figure was for 70 statements and 40 projects.

The abortion cause and the schools cause are bridge-shaped. Each main board lists only the accepted commonality sentence. The natural and modified sentences are on the side boards. The Michigan authority board and the Grey County conduct board are ordinary boards, so their own sentences stay visible there.

Six more causes are also bridge-shaped, from `statement-generation-exercises/06-network-society-alliances.json`: Grey County assimilation sessions, the Owen Sound dual-count poll, the Owen Sound checkout trial, minors' medicine and courtesy, ordinary opinions and employment, and ordinary Canada–US ties.

Sixteen implication actions are planned. Four are the accepted abortion and schools pairs, labeled `accepted-bridge-role-pair`. Twelve are the new modified-to-commonality pairs, labeled `live-attester-modified-to-commonality`. The live record is `network-societies-v1-b2-implication-evaluations.json` (deepseek/deepseek-v3.2, prompt fingerprint `2f61d4d61235214eceee97e9a364da48b8a6833f509089941cb758728302e891`). Every designed-yes blessed and every designed-no refused after one rewrite. Employment modifieds now name a camp priority the commonality does not contain (on-the-clock campaigning; churches and private clubs). The Canada commonality no longer says "I'd be okay with saying that," and each modified keeps a priority the commonality omits. Naturals, reverse arrows, cross-modified arrows, and the assimilation cluster against the accepted immigration statements stay unpublished. Those refusals are in the decisions file. The six clusters are still not accepted seed.

`moderator-checklist` is one statement. It is on the Michigan authority board and the Owen Sound voting board. One project, "Moderator checklist card", references it.

The manifest points `beliefDecisions` at that file. Each `signs` entry is one `believe` write and each `rejects` entry is one `disbelieve` write. Those pairs are not drawn again, so Eli never believes the abortion commonality. Unsigned statements stay unpinned.

Delegated spending and a recurring monthly pledge stay out. Pat already delegates a note to Ned, and the adapter can revoke a delegation. No action spends a delegated note or repeats a pledge, and no persona in this manifest is written as doing either.

## Reproduce the plan

From `fake-data-generation/`:

```bash
npm run gen:campaign:plan -- campaigns/network-societies-v1-b2.json output/campaigns/network-societies-v1-b2
```

Do not write this plan over `network-societies-v1-pilot` or `medium-realistic-v2`. Pilot statement texts in `network-societies-v1-b2-statements.json` are a copy so the loader can see them. The accepted bridge sentences are referenced from `seed-content/`, not copied.

## Local execution

A plan written after the attester pass has 446 writes. On 2026-10-16 the local chain mined 446/446 and reconciliation matched 446/446. The first pass left 14 actions failed for insufficient ETH; those wallets were topped up and the run resumed. Output is `output/campaigns/network-societies-v1-b2/`. Pilot and medium-realistic-v2 outputs were not overwritten.

The shortfall was the funder, not the chain. `computeCampaignFundingNeeds` priced a belief write at 90_000 gas and a publish at 180_000. The executor asks viem for `40_000 + 80_000 * n` on `setBeliefsInBatch` (280_000 for three) and leaves `publishDataBatch` to viem, which estimated about 4_000_000 on the large publishes. Funding now uses those figures, with 500_000 extra gas per publish after the first in a batch. A later local run should not need a manual `hardhat_setBalance`.

OpenCode Go DeepSeek ids (`deepseek-v4-flash`, `deepseek-v4.1-flash`, `deepseek-v4-pro`) return HTTP 400 on this workspace until privacy is set to Global. `opencode-go/qwen3.8-flash` returned parseable JSON and matched the v3.2 decision on the short dual-count natural-to-commonality refusal and the long Grey County modified-left-to-commonality bless. Verifier `clear-communication` leaves use that model. Other verifier leaves stay on `xai/grok-4.7`. Production `PRODUCTION_OPENROUTER_MODEL` stays `deepseek/deepseek-v4-flash-0731`.

The Grey County assimilation commonality board is `http://commonality.localhost:8088/#/cause/0xEe6a18208ca061e2Eddd4A6fA7E4E4d4927eF352/network-societies-v1-b2-grey-assimilation-bridge`. Its statement page shows "Arriving through other statements." Direct and indirect counts were 0 on that load because the visible sentence had no signers yet.

A plan built after the belief pins is not the plan that mined. `output/campaigns/network-societies-v1-b2/` keeps that executed run. Rewriting it would mark the wallets unprovisioned. The next chain run needs a new output directory. Delegated spending and a monthly pledge stay out. The six clusters are not accepted seed. The remaining brainstorm families stay unauthored where they already share a concrete want with a published board.
