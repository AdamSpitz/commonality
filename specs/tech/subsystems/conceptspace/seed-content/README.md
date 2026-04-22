# Seed content

This document covers our thinking about *why* we need seed content, *what kind* to create, and *how* to do it.

See this directory for concrete examples.

---

## Why seed content matters

### Purpose 1: Early unity

Early users signing the same statements means the implication graph starts forming immediately with nonzero signer counts. While the system is designed to handle unique statements gracefully (implications smooth over differences), starting with some shared statements helps the system feel populated rather than empty.

### Purpose 2: Explorer functionality

The explorer AI needs something to work with during onboarding. Without a rich implication graph, it can still show users a set of seed statements in their area and ask "which of these resonate with you?"

### Scope

We probably don't need hundreds of statements (although that's not out of the question). A few dozen well-chosen ones should be enough to make the explorer feel populated.

---

## What to include

See [content patterns](../content-patterns/README.md) for the kinds of content we expect and hope to see. The seed set should include:

### Top-level fundable-project interest areas

Entry points for the [fundable-project explorer](specs/tech/subsystems/conceptspace/explorer.md) (see [fundable projects seed content](./fundable-projects.md)).

It may also help to have high-level statements like "I care about education" that serve as parents to more specific positions. (Though I'm less certain of that ever since we realized that the explorer doesn't really work as an open-ended omnipurpose thing; it needs to have a specific aim. So I'd suggest creating these high-level statements if it helps the explorer in routing people down through the space of fundable projects, but don't bother making them just because.)

### Hidden-majority issues

The showcase statements demonstrating the system's ability to find consensus (see [hidden-majority.md](./hidden-majority.md)). Each includes pole positions, moderate positions, and a commonality statement.

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
4. **Run the implication attester** on pre-generated implication link pairs (see [hidden-majority.md](./hidden-majority.md) for the specific links)
5. The explorer AI can then use these as starting points for onboarding

The fake-data system in `universe.json` uses a different set of statements optimized for testing mechanics. The seed content here is for the real system — they can be updated to use these statements for more realistic simulations.

---

## Relationship to fake-data-generation

The fake-data system uses statements optimized for testing system mechanics (spectrum positions, randomized signing, etc.). It's simulation data — short and generic.

The seed content here is different: curated for real early users, focused on areas where fundable projects plausibly exist, and written to demonstrate the system's coalition-building power.

After the real system launches, the fake-data system can be updated to use these statements (or a superset) for more realistic simulations.