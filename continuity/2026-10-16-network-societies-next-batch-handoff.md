# Handoff: next network-societies batch

Next session: author the first expansion batch of three or four families. Do not publish implication edges that have not been accepted by the attester. Do not wipe the local chain.

## Read first

- [`fake-data-generation/brainstorming/network-societies-campaign-plan.md`](../fake-data-generation/brainstorming/network-societies-campaign-plan.md) — sequence step 4, the fifteen-family table, and the statement quality gate.
- [`fake-data-generation/campaigns/network-societies-v1-pilot.md`](../fake-data-generation/campaigns/network-societies-v1-pilot.md) — what the four-family pilot can and cannot show.
- [`fake-data-generation/PLAN.md`](../fake-data-generation/PLAN.md) section F.
- Branch `campaign`, not pushed. Latest commit `99fd0301` ("Fund the local alignment-trust bootstrap wallet."). Earlier on the same branch: `976eef50`, `c7648c02`.

## What is already true

The four-family pilot (Owen Sound checkout, Grey County civic life, Christian teaching, home learning) planned 40 users, 40 statements, 20 projects, and 207 writes. Execution and reconciliation were 207/207. Artifacts stay gitignored under `fake-data-generation/output/campaigns/network-societies-v1-pilot/`.

Cause pages list a project only after the alignment-trust bootstrap has trusted the attester. A wiped chain leaves the generated bootstrap key with no ETH, the worker crash-loops, and every board says there are no aligned projects. `scripts/fund-local-service-wallets.mjs` now includes `ALIGNMENT_TRUST_BOOTSTRAP_PRIVATE_KEY`. On this chain that wallet was topped up, the worker admitted 8 attesters, and the class-host directory (`project-015`) shows under Fundable Projects on Christian teaching, civic life, and home learning. Project URL and board URLs are in the pilot note.

The statement row label "Projects" means the count is zero. A real count reads "1 project".

Implication candidates in the decisions file are still unpublished. Persona `set-belief` choices are still not wired. Delegated spending and a real monthly pledge are still not campaign actions.

## What to do

Add the next three or four families from the brainstorming table. Start with the accepted abortion bridge as a spotlight story, and prefer families that can reuse accepted statements where the wording already means the thing being said. Keep the four pilot families. One shared project on several boards is one contract and several alignments, which this pilot already proved.

Do not plan over `output/campaigns/medium-realistic-v2/` or `output/campaigns/network-societies-v1-pilot/`. If the local stack is still up, leave it. A new execute needs a fresh output directory. If you wipe, run `node scripts/fund-local-service-wallets.mjs` before expecting cause pages to list projects.

## Suggested skills

- `thorough-tester` — when the new batch gets a plan, check the shared-project case and a board that only includes the statement through `alsoOnCauseIds`.
- `browser-driving` — after a local execute, open the new boards and one pilot board that already lists the directory.
