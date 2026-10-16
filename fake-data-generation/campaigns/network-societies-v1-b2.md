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

Six more causes are also bridge-shaped, from `statement-generation-exercises/06-network-society-alliances.json`: Grey County assimilation sessions, the Owen Sound dual-count poll, the Owen Sound checkout trial, minors' medicine and courtesy, ordinary opinions and employment, and ordinary Canada–US ties. Their side boards exist. No implication action is planned for them. The planner still stamps `accepted-bridge-role-pair` on every modified-to-commonality action it does emit, and that stamp is only honest for the accepted abortion and schools pairs. Keep the attest-implication count at 4 until a real attester blesses a new pair.

Four implication actions are planned. They are the accepted modified-left and modified-right arrows onto each of those two commonalities. This session did not call the attester. Candidates that were not evaluated are listed in `network-societies-v1-b2-decisions.json`.

`moderator-checklist` is one statement. It is on the Michigan authority board and the Owen Sound voting board. One project, "Moderator checklist card", references it.

Persona decisions in that file are still not applied to `set-belief`. Eli's refusal of the settlement is authoring intent. The planner can still have him believe the commonality sentence.

Delegated spending and a recurring monthly pledge are still not campaign actions.

## Reproduce the plan

From `fake-data-generation/`:

```bash
npm run gen:campaign:plan -- campaigns/network-societies-v1-b2.json output/campaigns/network-societies-v1-b2
```

Do not write this plan over `network-societies-v1-pilot` or `medium-realistic-v2`. Pilot statement texts in `network-societies-v1-b2-statements.json` are a copy so the loader can see them. The accepted bridge sentences are referenced from `seed-content/`, not copied.

## Not executed

This batch has a plan only. It has not been mined, and the boards have no local URLs yet. Executing it needs a fresh output directory. If the chain is wiped first, fund the alignment-trust bootstrap wallet before expecting cause pages to list projects.
