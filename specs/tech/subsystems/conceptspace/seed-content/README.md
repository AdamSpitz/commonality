# Seed content

This document covers our thinking about *why* we need seed content, *what kind* to create, and *how* to do it.

**This is job C: real Conceptspace statements** (findable causes for early users). It is not the tiny fake UI world, not demo worker fixtures, and not mass random user activity. Those other jobs, current state, and the next LLM step: [`fake-data-generation/PLAN.md`](/fake-data-generation/PLAN.md).

Wording is not free-form slogans: see [why statements are peculiar](/specs/product/statements-are-peculiar-for-good-reasons.md). How to generate more of them without hand-wordsmithing: [statement-generation.md](/fake-data-generation/statement-generation.md). Curated JSON that does not pass the implication attester (modified → commonality) is not done. Default `./scripts/data.sh --seed` (**tiny**) publishes the Christianity × secular-conservatism CauseStarter cluster plus local-food, not a random `universe.json` slice.

See this directory for concrete examples.

The formal machine-readable source now lives in [`fake-data-generation/seed-content/`](/fake-data-generation/seed-content/). Use the scripts documented in [`fake-data-generation/README.md`](/fake-data-generation/README.md) to:

- generate the human-readable markdown in this directory from that JSON source
- convert that source into the fake-data `universe.json` shape
- convert it into real Conceptspace statement documents
- upload those documents to IPFS

---

## Why seed content matters

### Purpose 1: Early unity

Early users signing the same statements means the implication graph starts forming immediately with nonzero signer counts. While the system is designed to handle unique statements gracefully (implications smooth over differences), starting with some shared statements helps the system feel populated rather than empty.

### Purpose 2: Aligning Explorer functionality

The Fundable Project Explorer on Aligning `/explore` needs something to work with before there is a rich live graph of projects, alignments, and delegatable notes. With seed content, it can still show users a map of cause statements and ask "which of these resonate with you?" Tally intentionally does not have a generic `/explore` page yet.

### Scope

We probably don't need hundreds of statements (although that's not out of the question). A few dozen well-chosen ones should be enough to make the explorer feel populated.

---

## What to include

See [content patterns](../content-patterns/README.md) for the kinds of content we expect and hope to see. The seed set should include:

### Simple public-goods planks (no bridging)

Signable independent wants for OSS and local food, including place grain (Grey County, Ontario-wide, unscoped). Nested-place rollup is board inclusion (project relevant areas + optional `within`), not implication. See [simple-causes.md](./simple-causes.md). Tiny seed still uses the explorer slogan for the garden project, now with a Grey County relevant area and an Ontario-scoped local-food roster.

### Top-level fundable-project interest areas

Entry points for the [fundable-project explorer](../explorer.md) (see [fundable projects seed content](./fundable-projects.md)).

It may also help to have high-level statements like "I care about education" that serve as parents to more specific positions. (Though I'm less certain of that ever since we realized that the explorer doesn't really work as an open-ended omnipurpose thing; it needs to have a specific aim. So I'd suggest creating these high-level statements if it helps the explorer in routing people down through the space of fundable projects, but don't bother making them just because.)

### Hidden-majority issues

The showcase statements demonstrating the system's ability to find consensus (see [hidden-majority.md](./hidden-majority.md)). Each includes pole positions, moderate positions, and a commonality statement.

The accepted [abortion](./compromise-abortion.md) and [immigration](./compromise-immigration.md) compromise-in-the-middle triples demonstrate the newer natural → modified nudge and modified → commonality implication shape.

### Cross-cutting meta-statements

Statements about the system itself or political epistemology — the meta-statements most directly aligned with Commonality's thesis (see [meta.md](./meta.md)).

### Geographic hierarchy

Statements at multiple geographic levels, enabling geographic × topical intersections (see [meta.md](./meta.md)).

---

## How to seed

When populating the system pre-launch:

1. **Convert** each seed statement into a displayable document (markdown-restricted format, appropriate extras)
2. **Upload** to IPFS
3. **Have a seed signer account** sign each one (so signer counts are at least 1)
4. **Run the implication attester** on pre-generated implication link pairs (see [hidden-majority.md](./hidden-majority.md) for the specific links). Designed-yes pairs must bless; designed-no must refuse. A bless is not enough.
5. **Routing check** (implication vs nudge): for each designed implication, a reasonable signer of S1 should find a *suggestion* to also sign S2 annoying ("I already said that"). If they would not, S1 does not contain S2 yet — rewrite S1, do not ship it as a nudge. For designed *nudge* pairs (e.g. natural → modified), the opposite: S2 must be a real extra so a separate signature is fair. Unreasonable annoyance does not mint an arrow. Loop: generate → attester yes/no → routing check. Details: [why statements are peculiar](/specs/product/statements-are-peculiar-for-good-reasons.md).
6. The Aligning/Fundable Project Explorer AI can then use these as starting points for cause exploration

The fake-data system in `universe.json` uses a different set of statements optimized for testing mechanics. The formal seed-content JSON can now be converted into the same shape, so the simulations can gradually move toward these more realistic statements without hand-copying them.

---

## Relationship to fake-data-generation

Do not collapse these:

| Kind | Purpose |
|---|---|
| Tiny / demo **on-chain seed** (`data.sh --seed`) | Fake users, projects, signs, a few statements so local UI and tests have shape |
| **This catalog** (`seed-content/*.json`) | Real (or real-shaped) statements for discovery; no requirement to invent users or projects |
| **Simulation** (`gen:medium` / `gen:large`) | Random actions for stress; statement text can be generic |

The simulation historically used short generic `universe.json` templates. Formal seed-content JSON can be converted into that shape (`gen:seed:universe`) so mechanics tests can reuse realistic texts without mixing the jobs. Tiny still does **not** publish a random universe slice.

Living plan: [`fake-data-generation/PLAN.md`](/fake-data-generation/PLAN.md).
