# Noninflammatory Social-Media Content as a Use Case

This is a design note on using Commonality to fund "noninflammatory social-media content" — content that expresses a political perspective without antagonizing people who disagree. E.g., "this post was written from a left-wing perspective, but it's written in such a way as to not piss off right-wingers."

The goal: make this a *commonly used* funding pattern on the system, not a one-off experiment.


## Why this is a natural fit for Commonality

**It's a textbook market failure.** Inflammatory content generates engagement and ad revenue; thoughtful, noninflammatory content gets fewer clicks. Creators who *want* to communicate respectfully face financial pressure against it. That's exactly the kind of public-good-with-positive-externalities that Commonality is designed for.

**It showcases organic coalition-building.** This is almost the canonical demonstration of the system's core idea of [organic coalitions](motivation/why-its-better/organic-coalitions.md). Noninflammatory political content is a genuine public good that *both sides* benefit from:
  - The left benefits: their ideas reach more people, persuade instead of repel.
  - The right benefits: their media diet is less hostile, they can engage with opposing ideas without feeling attacked.
  - Everyone benefits: reduced polarization is a public good.

This means the implication system would naturally connect supporters from both sides — without either side coordinating or even being aware of the other.

**It's an infinite, repeatable pattern.** Unlike a one-time infrastructure project, there's an endless supply of inflammatory content to rewrite and noninflammatory content to produce. This makes it a *category* of funded activity, not a single project — exactly the kind of thing that can become a commonly-used pattern.


## How it maps onto existing mechanics

### Conceptspace

Create a cluster of statements, expressed in terms each side would naturally use (not a single "centrist" framing):
  - "Political perspectives can and should be communicated in ways that don't alienate those who disagree"
  - "Left-wing perspectives can be presented in ways that conservatives can engage with non-defensively"
  - "Right-wing perspectives can be presented in ways that progressives can engage with non-defensively"
  - "I want political content I consume to not be designed to make me angry"
  - "Progressive ideas should be communicated in ways that persuade rather than antagonize"

The implication attester links all of these up to broader statements like "reducing political polarization through content." Donors who care about the general cause can fund both sides' content without needing to personally endorse either perspective. A project funded from any of these portals is visible to all.

### Funding models

Several models, not mutually exclusive:

**Content creator patronage** (most straightforward): Fund specific creators who commit to noninflammatory communication. Assurance contracts: "if 200 people pledge $5/month, this creator's noninflammatory political commentary is funded." Delegation works here too: "I delegate $20/month toward noninflammatory political content" and a trusted delegate handles the rest.

**Rewriting bounties** (most novel and most repeatable): "Here's a viral inflammatory tweet/post. Bounty for the best rewrite that conveys the same substantive point without the inflammatory framing." Small, concrete, verifiable deliverables — perfect for assurance contracts. Could be human-written or AI-assisted. The output is a public good (anyone can share the rewrite). The volume and repeatability is what makes this a "commonly used" pattern.

**AI tools/services**: Fund development of an AI service that helps authors self-edit before posting, or that takes inflammatory content and rewrites it. This is a traditional "fund a project" use case.

**Curated collections**: Alignment attesters review content and attest "this piece discusses [topic] from [perspective] without being inflammatory." A funding portal for "noninflammatory left-wing content on immigration" aggregates all attested pieces, creating a discovery mechanism.

### Retroactive funding

Retroactive funding is arguably the *best* fit here. Content creators publish the work first, let the actual reception prove it was noninflammatory, *then* get retroactively funded via the token model. Early supporters who bet on a creator's quality can later sell their tokens to altruistic donors. The proof-of-quality is baked into the retroactive model — no separate verification needed.


## The hard part: verification

"Noninflammatory" is subjective. Three viable approaches, in order of complexity:

1. **Retroactive-only** (easiest): Fund content that already exists. Real-world reception *is* the verification. No new infrastructure needed. Start here.

2. **AI evaluator service** (medium): An AI service (analogous to the implication attester) that scores content against defined criteria — tone, steelmanning, absence of strawmanning, etc. — and publishes a "quality attestation." A natural extension of the attester model. Also note that this may combine nicely with retroactive content funding: we could have funding 

3. **Cross-partisan attestation** (most legitimate): This is where it gets really interesting. A right-winger is the best judge of whether left-wing content is inflammatory to right-wingers. So the ideal attester for "this left-wing post is noninflammatory" is someone from the other side. Cross-partisan attestation carries more weight precisely because it's cross-partisan. This creates a natural role for cross-partisan delegates and attesters — people trusted by the other side to evaluate tone.

The cross-partisan attestation idea could be formalized: a content piece that has an attestation from someone known to hold the *opposite* political views gets a stronger signal. This doesn't require new smart contracts — it's just a pattern of who does the attesting, surfaced in the UI. (How do you avoid having people game that, though, by *pretending* to hold opposite views? Still, yes, I expect that people will configure their content-funding portals to respect only attesters they trust, and those will be the ones on their side. And if we're gonna have that AI evaluator service anyway, we could either create a really really good impartial one that both sides might trust, or else create one on each side so that each side can trust their own side's attester.)

### "Noninflammatory" is itself contested

Some people find *any* presentation of an opposing viewpoint inflammatory. The standards need to be defined carefully — probably in project descriptions and attester criteria rather than encoded in smart contracts, at least initially. Different attesters having different standards is fine; that's how the system is designed to work. Users choose which attesters they trust.

(Yes, I agree. I'm not worried about this; it'll just be baked into the attester criteria.)


## A potential AI skill

There's a natural new AI skill here (see [ai-assistance.md](ai-assistance.md)):

**Noninflammatory Content Assistant**
  - *Generation mode*: "Write a post on [topic] from [perspective], designed to be engaging to in-group while not alienating out-group" — with explicit criteria (steelmanning, no ad-hominem, honest framing, etc.)
  - *Evaluation mode*: Score existing content on inflammatory dimensions, suggest rewrites.
  - *Attester mode*: As an AI quality attester, publish quality attestations for submitted content.

This would be a genuinely novel application of an AI service acting as a quality gatekeeper within the funding flow.


## The showcase moment

The demo that makes people get it: a left-wing post gets rewritten, attested as noninflammatory by a conservative attester, and funded by donors from both sides who found it through different statements in the implication graph. Neither side had to coordinate with the other. They just individually said what they valued, and the system connected them.

This is the [Millbrook water walkthrough](motivation/walkthrough.md) but for something much bigger and more visible — and it directly demonstrates the "discovering commonality" thesis that the whole system is named for.


## Practical path

1. **Build one or two more smart contracts first** so the system is battle-tested on simpler use cases.
2. **Seed the conceptspace** with statements spanning the political spectrum around noninflammatory discourse. Make sure statements are phrased in terms each side would naturally use.
3. **Start with retroactive funding** of existing noninflammatory content. No new infrastructure needed. This validates whether people actually want to fund this.
4. **Try rewriting bounties** — small, concrete, verifiable. A single rewrite of a viral inflammatory post is a self-contained project. Demonstrates the concept without needing sustained creator relationships.
5. **Recruit a few cross-partisan attesters** — even two or three people willing to evaluate content from the other side.
6. **Build the AI evaluator** in parallel as a second-phase addition once the pattern is validated.
7. **Consider a specialized showcase funding portal** for noninflammatory content as a demo of the whole system.

## User talking out these ideas to himself

### Content tokens

Question: what would it take to create an ERC-1155 token where every post out there on every platform (e.g. every tweet, every blog post, etc.) has a token type that is claimable by the "rightful owner" of that post? (That is, the owner of the Twitter account would need to prove that he's the owner of some particular Ethereum account - which is maybe already handled by that ENS thing, at least for linking Twitter accounts? - and then he'd be able to move the tokens representing posts by that Twitter account to that Ethereum account.)

### "This content item is noninflammatory" attestations?

We already have the pretty-general AlignmentAttestations.sol smart contract. Is that good enough?
  - The statementId will do fine - the statement can just be "this is content from the orange perspective that won't piss off the purples."
  - The contract assumes that the "subject" being attested about is representable as an Ethereum address, which is maybe not quite what we want. We could generalize the contract (or make one specifically geared to social-media content items, or whatever) pretty easily.

### Who does these attestations?

In the abstract, anyone. Just like the alignment attestations for projects. People can configure their funding portal to pay attention only to the attesters they trust.

But in particular, I do like the idea of setting up an AI evaluator service to do it, as mentioned above.

### Putting this together

So if we had those pieces in place, then anyone (and in particular, delegates who are controlling delegatable notes pledged towards noninflammatory content) could simply make offers to buy the content tokens corresponding to posts they deem noninflammatory. And those posts could be made easier to find by having a funding portal dedicated to posts that have received noninflammatory-content attestations.

### Assurance contracts

This does seem like it might potentially be a good use case for assurance contracts. Like, people might prefer to say, "I'm not going to just unconditionally give $5 for this post, but I'll pledge $5 towards the post's $100 funding goal."
