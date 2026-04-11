# Meta-statements and geographic hierarchy

This file contains cross-cutting meta-statements (about the system itself) and geographic interest statements enabling geographic × topical intersections.

## Meta-statements

These are about the system itself or political epistemology — the statements most directly aligned with Commonality's thesis:

- **Public goods are chronically underfunded because the incentive structure is broken, not because people don't care.** (The intellectual case for Commonality.)

- **People should be able to fund the things they care about without needing permission from the government or a large institution.** (The core Commonality thesis.)

- **It should be possible to contribute to public goods without trusting a bureaucracy or a charity to spend your money wisely.** (Anti-institutional-overhead.)

- **Transparency and accountability in how money is spent is more important than who controls the money.** (Pro-transparency, left-right agnostic.)

- **Local problems are best solved by local people with local knowledge.** (Subsidiarity — popular on both left and right.)

- **The ability to fund things collectively without a central coordinator is a technology worth building.** (The meta-statement about Commonality itself.)

- **Neither the left nor the right has a monopoly on good ideas about how to organize society.** (Anti-tribalism. This one should accumulate a lot of signatures if the hidden-majority thesis is right.)

### Cross-domain implication links

- "Local communities should fund their own priorities" → "People should be able to fund things without needing permission"
- "Local communities should fund their own priorities" → "Local problems are best solved by local people"
- "Every dollar of public spending should be auditable" → "Transparency and accountability in spending is more important than who controls the money"
- "Censorship-resistant publishing infrastructure" → "Decentralization of power is generally better than centralization"
- "Open-source software deserves sustained funding" → "Open-source public infrastructure benefits everyone"
- "Open-access publishing" → "Scientific research funded by the public should be freely accessible"
- The political tribalism commonality statement → "Neither the left nor the right has a monopoly on good ideas"

---

## Geographic hierarchy

Geographic interest statements at multiple levels of granularity. These form a natural hierarchy (town → county → province → country) with implication links.

### Canadian provinces

- I care about improving Canada
- I care about improving Ontario
- I care about improving Quebec
- I care about improving British Columbia
- I care about improving Alberta
- I care about improving Nova Scotia

### US states

- I care about improving the United States
- I care about improving California
- I care about improving Texas
- I care about improving New York
- I care about improving Florida

### Example conjunctions

These demonstrate the geographic × topical intersection pattern:

- "I'm interested in crypto in Ontario" (implies both "I care about crypto" and "I care about improving Ontario")
- "I'm interested in open-source civic tools for Ontario municipalities"
- "I'm interested in local community resilience in Ontario"

The geographic hierarchy enables these implications:
- "I care about improving Ontario" → "I care about improving Canada"
- "I care about improving California" → "I care about improving the United States"

And conjunction statements like "I'm interested in crypto in Ontario" imply:
- → "I care about crypto" (topical parent)
- → "I care about improving Ontario" (geographic parent)

---

## On implementing geographic × topical

The specs already support this model — conjunction statements like "crypto in Ontario" are just ordinary statements with implication links to their parents. No special data model is needed.

**Where "it just works":**
- Conjunction statements are plain English (e.g. "I'm interested in furthering crypto adoption in Grey County, Ontario")
- The attester can trivially evaluate these implications
- The explorer AI can compose conjunction statements as plain English
- The funding portal shows projects aligned to implying statements, so a project aligned to a conjunction appears in both parent portals

**Operational considerations:**
- Implications are explicitly non-transitive, so geographic rollups don't automatically propagate through chains. If "crypto in Grey County" implies "Grey County" and "Grey County" implies "Ontario," that doesn't automatically make the project show up in the Ontario portal — you need direct attestations.
- The finder/attester should aggressively propose direct rollup edges for useful ancestors.
- Consider adding a UI affordance like "view/create intersection with…" from topic and location statement pages.

The seed content should include the geographic hierarchy and a few example conjunctions to demonstrate the pattern. Users and the explorer AI will create more conjunctions naturally.