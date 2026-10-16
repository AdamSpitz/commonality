# Network societies batch 2

Campaign id: `network-societies-v1-b2`. Synthetic users and deliverables. This is not evidence of adoption.

Keeps the four pilot families (Owen Sound checkout, Grey County civic life, Christian teaching, home learning). Adds three families:

- Abortion settlement, using the accepted `compromise-abortion` wording unchanged, plus a separate Michigan authority board.
- Schools and pushing, using the accepted `lgbt-schools` wording unchanged, plus a separate Grey County conduct board. The schools statements do not settle drugs, surgery, or classroom names.
- An Owen Sound non-binding voting trial.

The other eight families in the brainstorming plan are not in this manifest.

## What the plan publishes

A plan written on 2026-10-16 has 60 users, 100 statements, 52 projects. Seed: `commonality-network-societies-v1-b2-2026-10-16`. Regenerate the plan before quoting a write count. The old 356-write figure was for 70 statements and 40 projects.

The abortion cause and the schools cause are bridge-shaped. Each main board lists only the accepted commonality sentence. The natural and modified sentences are on the side boards. The Michigan authority board and the Grey County conduct board are ordinary boards, so their own sentences stay visible there.

Six more causes are also bridge-shaped, from `statement-generation-exercises/06-network-society-alliances.json`: Grey County assimilation sessions, the Owen Sound dual-count poll, the Owen Sound checkout trial, minors' medicine and courtesy, ordinary opinions and employment, and ordinary Canada–US ties.

Sixteen implication actions are planned. Four are the accepted abortion and schools pairs, labeled `accepted-bridge-role-pair`. Twelve are the new modified-to-commonality pairs, labeled `live-attester-modified-to-commonality`. The live record is `network-societies-v1-b2-implication-evaluations.json` (deepseek/deepseek-v3.2, prompt fingerprint `2f61d4d61235214eceee97e9a364da48b8a6833f509089941cb758728302e891`). Every designed-yes blessed and every designed-no refused after one rewrite. Employment modifieds now name a camp priority the commonality does not contain (on-the-clock campaigning; churches and private clubs). The Canada commonality no longer says "I'd be okay with saying that," and each modified keeps a priority the commonality omits. Naturals, reverse arrows, cross-modified arrows, and the assimilation cluster against the accepted immigration statements stay unpublished. Those refusals are in the decisions file. The six clusters are still not accepted seed.

`moderator-checklist` is one statement. It is on the Michigan authority board and the Owen Sound voting board. One project, "Moderator checklist card", references it.

Persona decisions in that file are still not applied to `set-belief`. Eli's refusal of the settlement is authoring intent. The planner can still have him believe the commonality sentence.

Delegated spending and a recurring monthly pledge are still not campaign actions.

## Reproduce the plan

From `fake-data-generation/`:

```bash
npm run gen:campaign:plan -- campaigns/network-societies-v1-b2.json output/campaigns/network-societies-v1-b2
```

Do not write this plan over `network-societies-v1-pilot` or `medium-realistic-v2`. Pilot statement texts in `network-societies-v1-b2-statements.json` are a copy so the loader can see them. The accepted bridge sentences are referenced from `seed-content/`, not copied.

## Local execution

A plan written after the attester pass has 446 writes. On 2026-10-16 the local chain mined 446/446 and reconciliation matched 446/446. The first pass left 14 actions failed for insufficient ETH; those wallets were topped up and the run resumed. Output is `output/campaigns/network-societies-v1-b2/`. Pilot and medium-realistic-v2 outputs were not overwritten.

The Grey County assimilation commonality board is `http://commonality.localhost:8088/#/cause/0xEe6a18208ca061e2Eddd4A6fA7E4E4d4927eF352/network-societies-v1-b2-grey-assimilation-bridge`. Its statement page shows "Arriving through other statements." Direct and indirect counts were 0 on that load because the visible sentence had no signers yet.

Persona `set-belief` choices are still not applied. Delegated spending and a recurring monthly pledge are still not campaign actions. The six clusters are not accepted seed.
