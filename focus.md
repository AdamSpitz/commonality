# Current focus

High-level work we are actually concentrating on right now. Not a to-do list — those live in [TODO.md](./TODO.md), [commonality/TODO.md](./commonality/TODO.md), and the [testnet working plan](./workflow/testnet-working-plan.md). At most three items. Keep this file current.

- **One-way Conceptspace dependencies, with Tally free of funding.** Conceptspace is the horizontal layer; Civility and CSM stay verticals. Stay in this repo — do not split git history. Shared non-financial components are composed by both apps: Tally adds nothing financial, Commonality adds funding in its own pages (no optional slots on Tally). Enforce the import direction. Plan: [conceptspace repo-split analysis](./specs/tech/conceptspace-repo-split-analysis.md).
- **Medium-scale realistic testnet simulation.** Build a reproducible, observable campaign with about 100 synthetic users acting across a useful corpus of real seed statements, validate it locally, then run it on testnet through gated 10/25/100-user stages. See the [working plan](./fake-data-generation/TESTNET-SIMULATION-PLAN.md).
- **Marketing at research altitude.** Get the demo room tellable in 90 seconds, run friend walkthroughs on testnet, fix the repeated confusions, then cause-flavored share artifacts — not umbrella ads. Hub and plan: [specs/product/marketing/](./specs/product/marketing/README.md). Do not use mass fake activity as the friend demo.

The last closed item was [third-party project proposals and alignment](./specs/product/third-party-project-proposals-and-alignment.md).
