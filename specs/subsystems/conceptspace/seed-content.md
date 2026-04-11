# Seed content

To help ramp up [content](../../content.md) faster, before launch, we should create a curated set of seed statements covering areas we expect early users to care about.

## Purposes of seeding

1. **Early users sign the same statements** rather than each getting a unique LLM-generated one, which means the implication graph starts forming immediately and signer counts are nonzero. (Not strictly necessary because the whole point of this system is that we have implications to smooth over the difference between multiple statements of the same concept... but still, it'd be nice to just get started with some unity.)
2. **The explorer AI has something to work with.** Even without a rich implication graph, it can show the user a set of seed statements in their area of interest and say "which of these resonate with you?"

We probably don't need hundreds (although that's not out of the question) — a few dozen well-chosen ones should be enough to make the explorer feel populated rather than empty.

Note: the fake-data-generation system already has 90 statements across 6 domains (politics, crypto, religion, music, climate, technology) in `universe.json`. Those are simulation data — short, generic, and meant to test the system's mechanics. The seed content below is different: it's curated for real early users, focused on areas where fundable projects plausibly exist, and written to demonstrate the system's coalition-building power.

## Useful patterns in seed content

See [content patterns](./content-patterns.md).



The seed set should include:
- High-level interest areas ("I am interested in politics", "I am interested in crypto", etc.). These are useful as statements in their own right — any specific political position implies "I am interested in politics", so these naturally serve as top-level entry points.
- A layer of more specific positions within each area.
   - Including positions that are somewhat-but-not-completely aligned with each other.
- Some cross-cutting statements that might form natural coalitions.

---

## Relationship to fake-data-generation

The fake-data system (`universe.json`) uses a different set of statements optimized for testing system mechanics (spectrum positions, randomized signing, etc.). The seed content here is meant for the real system. When we get to populating the real system pre-launch:

1. Convert each seed statement above into a displayable document (markdown-restricted format, appropriate extras).
2. Upload to IPFS.
3. Have a "seed signer" account sign each one (so signer counts are at least 1).
4. Run the implication attester on all pairs from the "pre-generated implication links" section above.
5. The explorer AI can then use these as its starting points for onboarding new users.

The fake-data system can also be updated to use these statements (or a superset of them) for more realistic simulations.

---

## Top-level interest areas

These serve as entry points for the explorer. Any specific position within a domain implies its parent interest statement.

- I care about education
- I care about local community resilience
- I care about free speech and open information
- I care about public health
- I care about science and research funding
- I care about environmental stewardship
- I care about government accountability and transparency
- I care about digital rights and internet freedom
- I care about housing and homelessness
- I care about infrastructure

---

## Hidden-majority issues

These are the showcase. Each one demonstrates the system's ability to find consensus that the partisan structure hides.

### Abortion

- **Pole A:** Abortion should be available at any stage of pregnancy, no restrictions.
- **Pole B:** Abortion should not be permitted under any circumstances.
- **Moderate-from-A:** I'd prefer abortion to be broadly available, but at the very least it should be available in the first trimester — late-term restrictions are a reasonable compromise.
- **Moderate-from-B:** I'd prefer no abortion at all, but at the very least we shouldn't be performing late-term abortions — early-term availability is a tolerable compromise.
- **Commonality:** Abortion should be available up to some reasonable point in pregnancy (such as the first trimester), with restrictions after that.

**Implication links:** Moderate-from-A → Commonality. Moderate-from-B → Commonality. (The poles do NOT imply the commonality — they're genuinely different positions.)

**Why this matters:** Polling consistently shows that ~60-70% of Americans hold some version of the commonality position, but the political system treats this as a binary left/right issue. If the commonality statement accumulates a huge signer count from people who came from both sides, that's a powerful demonstration.

### Political tribalism

- **Pole A:** I'm left-wing.
- **Pole B:** I'm right-wing.
- **Moderate-from-A:** I lean left, but I don't think the right is full of fascists — most of them are normal people who disagree with me about policy.
- **Moderate-from-B:** I lean right, but I don't think the left is full of communists — most of them are normal people who disagree with me about policy.
- **Commonality:** I'm fed up with the way each side demonizes the other. Most people on both sides are decent; the extremists are loud but few.

**Implication links:** Moderate-from-A → Commonality. Moderate-from-B → Commonality. Also: Moderate-from-A → Pole A. Moderate-from-B → Pole B. (You can lean left AND think the tribalism is toxic.)

**Why this matters:** This is almost meta — it's a statement about the political system itself. A large signer count here would be a powerful signal that the polarization narrative is driven by a vocal minority on each side.

### Immigration

- **Pole A:** Borders should be essentially open; freedom of movement is a human right.
- **Pole B:** Immigration should be drastically reduced or stopped entirely.
- **Moderate-from-A:** I'm generally pro-immigration, but I recognize that a functional immigration system requires some border enforcement and a legal process. The current system is broken and needs fixing.
- **Moderate-from-B:** I want immigration controlled and legal, but I'm not anti-immigrant — people who come here legally and contribute should be welcomed. The current system is broken and needs fixing.
- **Commonality:** The immigration system is badly broken and needs to be fixed so that legal immigration works and illegal immigration is reduced. People who are here legally should be treated well.

**Implication links:** Moderate-from-A → Commonality. Moderate-from-B → Commonality.

### Gun policy

- **Pole A:** Civilian gun ownership should be heavily restricted or banned.
- **Pole B:** Any gun regulation is an infringement on fundamental rights; no restrictions.
- **Moderate-from-A:** I'd prefer fewer guns overall, but I can live with responsible gun ownership — the priority should be keeping guns away from people who are dangerous.
- **Moderate-from-B:** I'm a strong Second Amendment supporter, but I have no problem with keeping guns out of the hands of the genuinely dangerous — that's not what the Second Amendment is about.
- **Commonality:** Responsible people should be able to own guns; genuinely dangerous people shouldn't. The debate should be about where to draw that line, not about whether the line should exist.

**Implication links:** Moderate-from-A → Commonality. Moderate-from-B → Commonality.

### Healthcare

- **Pole A:** Full single-payer government healthcare, abolish private insurance.
- **Pole B:** Healthcare should be fully private and market-driven.
- **Moderate-from-A:** I'd prefer universal coverage, but what I really care about is that nobody goes bankrupt from getting sick. I'm open to different ways of achieving that.
- **Moderate-from-B:** I prefer market-based solutions, but the current system where a hospital visit can financially ruin a family is indefensible. Something has to change.
- **Commonality:** Nobody should go bankrupt because they got sick. Whatever system we build, that's the minimum bar.

**Implication links:** Moderate-from-A → Commonality. Moderate-from-B → Commonality.

### Climate and energy

- **Pole A:** Fossil fuels must be banned within the next decade or we face civilizational collapse.
- **Pole B:** Climate change is exaggerated or fake; fossil fuels are fine.
- **Moderate-from-A:** Climate change is real and serious, but the transition needs to be practical — destroying the economy helps nobody, including the environment.
- **Moderate-from-B:** I'm skeptical of the alarmism, but clean energy technology is obviously good — cheaper, cleaner, more energy independence. I'm for it on practical grounds even if I'm not convinced about the catastrophe narrative.
- **Commonality:** Clean energy technology is worth investing in on practical grounds — it's getting cheaper, it reduces dependence on foreign energy, and it's cleaner. You don't have to agree about climate catastrophe to agree about that.

**Implication links:** Moderate-from-A → Commonality. Moderate-from-B → Commonality.

### Policing

- **Pole A:** Defund the police; the institution is fundamentally broken and needs to be replaced.
- **Pole B:** Back the blue unconditionally; police are heroes and criticism of police is dangerous.
- **Moderate-from-A:** I think police reform is urgently needed — accountability, oversight, de-escalation training — but I'm not saying abolish the police. Communities need law enforcement.
- **Moderate-from-B:** I support the police, but bad cops who abuse their power should be held accountable. Covering for bad cops hurts good cops and erodes trust.
- **Commonality:** Police should be held accountable when they abuse their power. This isn't anti-police — it's pro-good-policing.

**Implication links:** Moderate-from-A → Commonality. Moderate-from-B → Commonality.

### Education policy

- **Pole A:** Public schools should be the only option; school choice is a scheme to defund public education.
- **Pole B:** Abolish the Department of Education; parents should have total control with no government involvement.
- **Moderate-from-A:** I support public schools, but I also think parents who are unhappy with their local school should have alternatives. Monopolies aren't great, even public ones.
- **Moderate-from-B:** I want parents to have choice, but I also want every kid to have access to a decent school even if their parents aren't paying attention. Some baseline standard matters.
- **Commonality:** Every kid deserves access to a good education, and parents should have meaningful options when their local school isn't working. Both things can be true.

**Implication links:** Moderate-from-A → Commonality. Moderate-from-B → Commonality.

---

## Cross-cutting meta-statements

These are about the system itself or about political epistemology. They're the statements most directly aligned with Commonality's thesis.

- **Public goods are chronically underfunded because the incentive structure is broken, not because people don't care.** (The intellectual case for Commonality.)

- **People should be able to fund the things they care about without needing permission from the government or a large institution.** (The core Commonality thesis.)

- **It should be possible to contribute to public goods without trusting a bureaucracy or a charity to spend your money wisely.** (Anti-institutional-overhead.)

- **Transparency and accountability in how money is spent is more important than who controls the money.** (Pro-transparency, left-right agnostic.)

- **Local problems are best solved by local people with local knowledge.** (Subsidiarity — popular on both left and right.)

- **The ability to fund things collectively without a central coordinator is a technology worth building.** (The meta-statement about Commonality itself.)

- **Neither the left nor the right has a monopoly on good ideas about how to organize society.** (Anti-tribalism. This one should accumulate a lot of signatures if the hidden-majority thesis is right.)

---

## Orthogonal dimensions: geography × topic

Many real-world projects sit at the intersection of two (or more) independent axes of interest. The most obvious pair is **geographic** and **topical**:

- "I'm interested in furthering crypto adoption" (topical)
- "I'm interested in improving Grey County, Ontario" (geographic)
- "I'm interested in furthering crypto adoption in Grey County, Ontario" (conjunction)

A project like "lobby for acceptance of crypto payments in Grey County" is interesting primarily to people near the intersection — crypto supporters in Grey County. But it's *somewhat* interesting along each axis independently: a crypto advocate in Ontario in general might support it, and a Grey County booster who isn't anti-crypto might support it too.

This means we need:

1. **Geographic interest statements** at multiple levels of granularity: "I'm interested in improving [my town / my county / my province / my country]". These form a natural hierarchy (town → county → province → country) with implication links.

2. **Topical interest statements** (which we already have as the top-level interest areas above).

3. **Conjunction statements** at the intersection: "I'm interested in [topic] in [location]." These imply both parent statements, so a project aligned with the conjunction shows up in both the geographic and topical funding portals.

This is important for delegatable notes too — a note marked "I want to further crypto in Grey County" should be visible in both the "crypto" portal and the "Grey County" portal.


My question: Do we need to *do* anything (implement any new features or whatever) in order to make this all work smoothly (i.e. allow people to declare their interest in the intersection of ThisCause and ThisLocation or whatever, and have the funding portal correctly show them stuff from that intersection), or will it just work out of the box?

AI's response:

   My read is: mostly “yes, it works with the current model,” but not fully “out of the box” in the UX/graph-maintenance sense.
   The good news is that the specs already answer the core modeling question. The intended design is: conjunctions like “crypto in Grey County” are just ordinary statements, with implication links to their parents, and no special structured schema is needed (specs/subsystems/conceptspace/seed-content.md:169, specs/subsystems/conceptspace/statements.md:56). The funding portal is already statement-centric, and it already includes projects aligned to implying statements, so if a project is aligned to the explicit conjunction statement, it should appear in both parent portals (specs/subsystems/fundingportals/README.md:3, specs/subsystems/fundingportals/ui.md:12). Same for note intent: it targets a single statement, and that single statement can just be the conjunction (specs/subsystems/fundingportals/delegation.md:39).
   Where I would not call it “free” is in three places. First, implications are explicitly non-transitive, so geographic rollups do not happen automatically through chains (specs/subsystems/ conceptspace/indexer.md:17). If “crypto in Grey County” implies “Grey County,” and “Grey County” implies “Ontario,” that does not by itself make the project show up in the Ontario portal; you need a direct attestation for the higher-level rollup too. Second, the current portal model is /portal/:statementCid, not “show me the intersection of two existing statements,” so ad hoc intersection browsing is not a built-in UX; it works if the conjunction statement exists, not if the user expects the app to synthesize an intersection view on demand. Third, this will feel flaky unless the finder/attester aggressively creates the obvious conjunction-to-parent and location-to-ancestor links.
   So my recommendation would be: don’t add a new data model, but do add some operational/product support. Seed the geographic hierarchy and a few example conjunctions, make sure the finder proposes direct rollup edges for useful ancestors, and probably add a lightweight UI affordance like “view/create intersection with…” from topic and location statement pages. If you do that, the existing architecture is enough. If you don’t, the model is still correct, but the experience will be too brittle to feel like it “just works.”





### Implications for seed content

The seed content should include some geographic statements at a few levels of granularity (we can't pre-seed every town, but we can seed some provinces/states and maybe a few specific communities as examples). The conjunction statements don't need to be pre-seeded — they'll form naturally as users and the explorer AI create them. But the geographic hierarchy itself is worth seeding.

We should also seed a few example conjunctions to demonstrate the pattern, e.g.:
- "I'm interested in improving Ontario" (geographic)
- "I'm interested in open-source infrastructure" (topical, already in meta-statements)
- "I'm interested in open-source civic tools for Ontario municipalities" (conjunction → implies both parents)

Conjunction statements are just regular statements written in plain English (e.g. "I'm interested in furthering crypto adoption in Grey County, Ontario") with implication links to both parent statements. No special data model or structured content is needed — the attester can trivially evaluate these implications, and the explorer AI can compose conjunction statements as plain English.

---

## Pre-generated implication links

**Within hidden-majority issues:**
- Each Moderate-from-A and Moderate-from-B → their issue's Commonality statement
- Each Moderate-from-A → its Pole A (leaning left still implies being left-leaning)
- Each Moderate-from-B → its Pole B (same for right)

**Within cause areas (specific → general):**
- Each cause-area statement → its top-level "I care about X" interest area

**Cross-domain:**
- "Local communities should fund their own priorities" → "People should be able to fund things without needing permission"
- "Local communities should fund their own priorities" → "Local problems are best solved by local people"
- "Every dollar of public spending should be auditable" → "Transparency and accountability in spending is more important than who controls the money"
- "Censorship-resistant publishing infrastructure" → "Decentralization of power is generally better than centralization"
- "Open-source software deserves sustained funding" → "Open-source public infrastructure benefits everyone"
- "Open-access publishing" → "Scientific research funded by the public should be freely accessible"
- The political tribalism commonality statement → "Neither the left nor the right has a monopoly on good ideas"
