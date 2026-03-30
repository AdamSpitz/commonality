# Noninflammatory Content — Use Case

Funding political content that communicates perspectives without antagonizing people who disagree. E.g., "this post was written from a left-wing perspective, but it's written in such a way as to not piss off right-wingers."

This is the inaugural use case for the [content-funding subsystem](README.md) and the one that best demonstrates Commonality's core thesis of organic coalition-building.

For the general content-funding mechanics (contracts, registry, tokens, channel claiming), see the other files in this directory. This document covers what's specific to the noninflammatory use case: motivation, conceptspace seeding, attester criteria, and the showcase demo.


## Why this is a natural fit for Commonality

**It's a textbook market failure.** Inflammatory content generates engagement and ad revenue; thoughtful, noninflammatory content gets fewer clicks. Creators who *want* to communicate respectfully face financial pressure against it. That's exactly the kind of public-good-with-positive-externalities that Commonality is designed for.

**It showcases organic coalition-building.** This is almost the canonical demonstration of the system's core idea of [organic coalitions](../../motivation/why-its-better/organic-coalitions.md). Noninflammatory political content is a genuine public good that *both sides* benefit from:
  - The left benefits: their ideas reach more people, persuade instead of repel.
  - The right benefits: their media diet is less hostile, they can engage with opposing ideas without feeling attacked.
  - Everyone benefits: reduced polarization is a public good.

This means the implication system would naturally connect supporters from both sides — without either side coordinating or even being aware of the other.

**It's an infinite, repeatable pattern.** Unlike a one-time infrastructure project, there's an endless supply of noninflammatory content to produce. This makes it a *category* of funded activity, not a single project — exactly the kind of thing that can become a commonly-used pattern.


## Conceptspace seeding

Create a cluster of statements, expressed in terms each side would naturally use (not a single "centrist" framing):
  - "Political perspectives can and should be communicated in ways that don't alienate those who disagree"
  - "Left-wing perspectives can be presented in ways that conservatives can engage with non-defensively"
  - "Right-wing perspectives can be presented in ways that progressives can engage with non-defensively"
  - "I want political content I consume to not be designed to make me angry"
  - "Progressive ideas should be communicated in ways that persuade rather than antagonize"

The implication attester links all of these up to broader statements like "reducing political polarization through content." Donors who care about the general cause can fund both sides' content without needing to personally endorse either perspective. A project funded from any of these portals is visible to all.


## Attester criteria for "noninflammatory"

**Key framing: this is about persuasion effectiveness, not politeness.** The evaluator should assess whether content is *effective at communicating its perspective to people who disagree*, not whether it's "nice." Specific criteria:
  - Does it steelman the opposing view (or at least not strawman it)?
  - Does it avoid ad hominem, mockery, and contempt?
  - Is the substantive point preserved and clearly stated?
  - Would a reasonable person holding the opposing view feel that they could engage with this without being attacked?
  - Does the framing invite consideration rather than defensive reaction?

The evaluator takes as input: the content (URL, pasted text, or IPFS CID), the declared perspective ("this is from a left-wing perspective"), and the target audience ("evaluate whether this would be inflammatory to right-wingers"). Returns a boolean attestation with confidence score and explanation (stored on IPFS).

### "Noninflammatory" is itself contested

Some people find *any* presentation of an opposing viewpoint inflammatory. The standards are defined in attester criteria, not encoded in smart contracts. Different attesters having different standards is fine and expected.


## A potential AI skill

There's a natural new AI skill here (see [../../ai-assistance.md](../../ai-assistance.md)):

**Noninflammatory Content Assistant**
  - *Generation mode*: "Write a post on [topic] from [perspective], designed to be engaging to in-group while not alienating out-group" — framed around persuasion effectiveness, not politeness. Explicit criteria: steelmanning, no ad-hominem, honest framing, etc.
  - *Evaluation mode*: Score existing content on inflammatory dimensions, suggest rewrites.
  - *Attester mode*: As an AI quality attester, publish quality attestations for submitted content.


## The showcase moment

The demo that makes people get it: a left-wing post gets attested as noninflammatory by an AI evaluator, and funded by donors from both sides who found it through different statements in the implication graph. Neither side had to coordinate with the other. They just individually said what they valued, and the system connected them.

This is the [Millbrook water walkthrough](../../motivation/walkthrough.md) but for something much bigger and more visible — and it directly demonstrates the "discovering commonality" thesis that the whole system is named for.


## Practical path

1. **Seed the conceptspace** with statements spanning the political spectrum around noninflammatory discourse.
2. **Build the content-funding subsystem** — the content registry, factory modifications, and channel claiming (see other files in this directory).
3. **Build the AI content evaluator** — fork the implication attester architecture, swap the prompt (see attester criteria above).
4. **Start with retroactive funding** of existing noninflammatory content. This validates whether people actually want to fund this.
5. **Build a specialized showcase funding portal** for noninflammatory content.
6. **Build the notification service** (see [indexer.md](indexer.md)) to reach creators whose content has been registered.
