# Task autonomy tiers: Ask / Tell / Trust

Every actionable item in this project — whether a one-shot task in
[`../TODO.md`](../TODO.md) or a standing concern wired into the
[verifier](../verifier/README.md) — carries an **autonomy tier** saying how much
latitude an LLM has to act on it without Adam.

The three tiers, ordered by increasing autonomy ("**Ask** before, **Tell**
after, **Trust** entirely"):

| Tier | Name | What an LLM should do |
|------|------|-----------------------|
| **A** | **Ask** | Do **not** act. Surface it in [`inbox.md`](/inbox.md) for Adam to rule on. |
| **B** | **Tell** | Do it, then drop a short "did this" note in [`inbox.md`](/inbox.md) so Adam can review after the fact. |
| **C** | **Trust** | Just do it. No need to surface it anywhere. |

The default for anything whose tier is unstated is **Ask** — when in doubt, ask.
Adam is the only one who promotes a *kind* of item up the autonomy ladder
(A → B → C); LLMs do not promote their own work into a more autonomous tier.

## How the tier shows up

- **One-shot tasks** (`TODO.md`): tag the item with its tier, e.g.
  `- (Tell) Rename "portal" to "cause board" across docs.` An item with no tag
  is treated as **Ask**.
- **Standing concerns** (verifier checks): the tier is expressed as how the
  check is wired, which is the same A/B/C idea in the verifier's own vocabulary:
  - **Ask** = a **gating** check (a red/uncertain result blocks `root`; Adam
    must look). E.g. `review.docs-coherence`.
  - **Tell** = a **non-gating** check: either an advisory child (listed in a
    supervisor's `advisoryCheckIds`, surfaced but never gates) or an observer
    that nothing rolls up. E.g. the advisory `meta.report-currency` under `root`.
  - **Trust** = a check that simply passes quietly, or no check at all.

  Promoting trust in a standing concern is therefore a one-line wiring change
  (gating → advisory → silent), and it's reversible.

Note: "incorporate concern X into the verifier checks" is itself a **one-shot
task** that lives in `TODO.md` with its own tier. There is no separate backlog
for standing concerns — adding one is just a task.

## Kinds of one-shot tasks Adam has pre-approved for higher tiers

This is the trust ledger. It starts empty; Adam adds entries himself as he comes
to trust the LLMployees with particular categories of work. Until a kind of task
appears here, treat it as **Ask**.

### Tier B — Tell (an LLM may do it, then report it in `inbox.md`)

_(none yet)_

### Tier C — Trust (an LLM may do it silently)

_(none yet)_
