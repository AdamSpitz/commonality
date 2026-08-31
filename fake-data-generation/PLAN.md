# Fake data and seed data — living plan

Tell a fresh LLM: **read this file, then do the next unchecked item under [Next](#next).** Do not invent a second seed pipeline. Details of *how* to write statements live in [`statement-generation.md`](./statement-generation.md). Tiny CauseStarter story: [`christian-secular-tiny-seed.md`](./christian-secular-tiny-seed.md). Commands: [`README.md`](./README.md).

This file is the **index** of current state and remaining work. Update it when work lands.

## Four different jobs (do not mix)

| Job | What it is | What it is not | How you get it |
|---|---|---|---|
| **A. Tiny local world** | A *small* set of **fake** users, projects, signs, alignments, content rounds, and a few statements with the **right shape**, so UI/tests have something to look at | Not a catalog for real users. Not a load test | `./scripts/data.sh --seed` (default **tiny** / `npm run gen:tiny`). Verifier `stack.fresh-seeded` |
| **B. Demo / Alignment fixtures** | Same idea as A, plus formal seed-content statements and **replayed** explorer/nudge/finder outputs | Not live workers. Not mass generation | `./scripts/data.sh --seed=demo` (`gen:seed:local`) |
| **C. Real seed statements** | Curated **Conceptspace** texts for early users: signable planks, later bridges. Statements can be real; **do not** invent fake users or projects for this job | Not random `universe.json`. Not stress traffic | Author into `statement-generation-exercises/`, human-accept into `seed-content/*.json`. Process: [`statement-generation.md`](./statement-generation.md) |
| **D. Mass fake user activity** | Random users + random actions (beliefs, buys, delegations) to **stress** contracts/indexer | Not realistic UI narrative. Not the statement catalog | `./scripts/data.sh --seed=small\|medium` or `npm run gen:large` (100 users / 10 rounds). **1000+ users is not built** |

Job C is statements only. Jobs A/B/D create on-chain activity. Tiny (A) **does not** publish the random 12-statement universe slice.

## Current state (2026-08-31)

### A — Tiny world

**Usable for CauseStarter UI.** Hand-authored personas (~10 projects), Christianity + secular-conservatism boards (naturals only), mediator #8 cluster, local-food garden, content-funding rounds, Hardhat #0–#9 bookmarks.

- Live attester: 6 designed-yes / 6 designed-no on the Christian×secular triples.
- **Weak implication demo:** camps already share the civic conclusion; commonality is just the policy. Keep as “two nearby camps.” Do **not** polish that pairing into a fake middle-ground. Do **not** train generation on it.
- Nudges exist on #8; subscriber dashboards of #0 do not show them (suggester strip follows #0).
- Optional leftover: align `bridge-creator` example anchors with these texts.
- **Second cluster (2026-08-31):** accepted abortion compromise is also published by tiny (`data/tiny-clusters/compromise-abortion.json`). Left parent `#3` `abortion-left`, right parent `#6` `abortion-right`, mediator `#8`. Christianity/secular boards unchanged.
- **Generic cluster driver (2026-08-31):** tiny bridge clusters are JSON in `data/tiny-clusters/` plus `seedTinyCluster.ts`. Do not add `compromiseAbortion.ts`-style modules for new topics.

### B — Demo

Implemented. `data/seed-worker-outputs.json` replayed on `seed=demo`. **Never fully walked in the UI** after the Riverside garden storyline. Local public-goods use cases A5/E2 still thin. See root `TODO.md`.

### C — Real statements

Curriculum in [`statement-generation.md`](./statement-generation.md):

| Step | Status |
|---|---|
| 1. Simple public-goods causes | Gold + live `seed-content/simple-causes.json`. List not complete. Nested-place rollup is **board inclusion**, not implication |
| 2. In-camp variants | `npm run gen:proliferation` exists (attester/finder test, not a user catalog) |
| 3. Real-gap bridges | **Three** accepted triples: abortion (`seed-content/compromise-abortion.json`, 2026-08-30), immigration (`seed-content/compromise-immigration.json`, 2026-08-31), and crime (`seed-content/crime-repeat-offenders.json`, 2026-08-31). Abortion also has a tiny-seed cluster. |
| 4. Non-political public-goods bridges | Not started |
| Gate cause-assist on the same checks | Exercise 3 **not started** |
| Bulk hundreds of unique planks | Wait until step 1’s loop is trusted without wordsmithing. Do **not** mass-generate triples until more than one real-gap cluster survives attester + routing + read-aloud |

Checked-in `data/seed-implication-evaluations.original-variants.json` is **stale** vs the nested-place prompt (root TODO).

### D — Stress activity

`gen:small` / `medium` / `large` work. README still lists 1000+ users, visualization, and deep indexer validation as future.

## Next

Do these in order unless Adam names a different one. Each item is a session-sized chunk.

1. **[x] Feature a real-gap cluster in tiny (or add a second cluster).** Added the accepted **abortion compromise** cluster beside Christianity/secular boards (option a). Generic driver: `seedTinyCluster.ts` + `data/tiny-clusters/*.json`.
2. **[ ] More left/right bridges — remaining: LGBT.** One topic per exercise file. Reuse [hidden-majority-patterns](/docs/end-user/common-sense-majority/hidden-majority-patterns.md); do not fork a second wording of a pattern that already has a canonical example. Loop: naturals as speech → modifieds → commonality last → live attester yes/no → routing → `/critique-triple`. Leave drafts in `statement-generation-exercises/` until Adam accepts into `seed-content/`. **Immigration accepted 2026-08-31** (`seed-content/compromise-immigration.json`). **Crime accepted 2026-08-31** (`seed-content/crime-repeat-offenders.json`, repeat-offender concentration fact-conditional — not the rehab sketch, not policing “no major controversy”). Next: **LGBT** (unbundling / schools-as-fact-conditional — do not copy the Christian×secular LGBT unbundle as if it were a left/right gap).
3. **[ ] Gate cause-assist** (`/atomize`, `/sharpen-plank`, `/critique-triple`) so failed checks are not shown. Same pipeline as seed. Statement-generation exercise 3.
4. **[ ] Demo-seed live UI pass** (`--seed=demo`) and thicken local public-goods if A5/E2 still invisible. Root TODO already has this.
5. **[ ] Refresh implication-evaluation corpus** after a model that returns JSON. Root TODO.
6. **[ ] Volume of simple-cause uniques** (hundreds) only after (1)–(2) prove the loop. Then conceptspace seed, **no** fake users/projects.
7. **[ ] Stress scale** (`gen:large` today is 100 users). 1000+ users, graphs, indexer deep-compare: not started.

## Pointers

- Kinds of data also summarized in [`README.md`](./README.md), [seed-content rationale](/specs/tech/subsystems/conceptspace/seed-content/README.md), [local development](/workflow/local-development.md).
- One-shot engineering leftovers stay in root [`TODO.md`](/TODO.md) (demo UI pass, implication-regression refresh, funding-portal seed tests).
- Do not file a second Christianity, a second abortion wording, or random `universe.json` statements into tiny.
