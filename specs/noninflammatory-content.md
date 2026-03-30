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

**It's an infinite, repeatable pattern.** Unlike a one-time infrastructure project, there's an endless supply of noninflammatory content to produce. This makes it a *category* of funded activity, not a single project — exactly the kind of thing that can become a commonly-used pattern.


## How it maps onto existing mechanics

### Conceptspace

Create a cluster of statements, expressed in terms each side would naturally use (not a single "centrist" framing):
  - "Political perspectives can and should be communicated in ways that don't alienate those who disagree"
  - "Left-wing perspectives can be presented in ways that conservatives can engage with non-defensively"
  - "Right-wing perspectives can be presented in ways that progressives can engage with non-defensively"
  - "I want political content I consume to not be designed to make me angry"
  - "Progressive ideas should be communicated in ways that persuade rather than antagonize"

The implication attester links all of these up to broader statements like "reducing political polarization through content." Donors who care about the general cause can fund both sides' content without needing to personally endorse either perspective. A project funded from any of these portals is visible to all.

### Funding model: creator-level assurance contracts

The natural unit for funding noninflammatory content is the **creator**, not the individual content item. The MVP funding flow uses standard Pubstarter assurance contracts:

1. Someone creates a normal Pubstarter assurance contract where the recipient is a content creator's Ethereum address.
2. The contract's description references the specific content items (tweets, posts, etc.) that motivated the campaign — e.g., "funding @creator for their noninflammatory political commentary, including [these specific posts]."
3. Donors pledge toward the threshold: "I'll contribute $5 toward this creator's $500 funding goal."
4. If the threshold is met, the creator gets the funds. If not, pledges refund.

This uses existing infrastructure with zero new contracts. The tokens donors hold represent "I contributed to a campaign funding this creator's noninflammatory work" — meaningful, tradeable on secondary markets, and compatible with the retroactive funding dynamics (early supporters can sell to later altruistic donors).

The "someone funded you for writing that tweet" viral aspect is preserved: the campaign description names the specific content, even though the contract itself is at the creator level. And this still allows for delegation: "I delegate $20/month toward noninflammatory political content" and a trusted delegate picks the creators.

**Why not per-content-item contracts?** Tokenizing individual content items (giving every tweet its own on-chain identity) is an interesting future direction but adds substantial complexity — content identity, rightful-owner claims, fractionalization — without being necessary for the core value proposition. The free-rider problem exists at the "should I fund this creator?" level, not the "should I fund this specific tweet?" level. Per-item tokenization can layer on top later if there's demand.

### Retroactive funding

Retroactive funding is arguably the *best* fit here. Content creators publish the work first, let the actual reception prove it was noninflammatory, *then* get retroactively funded via the token model. Early supporters who bet on a creator's quality can later sell their tokens to altruistic donors. The proof-of-quality is baked into the retroactive model — no separate verification needed.

### Other models

**AI tools/services**: Fund development of an AI service that helps authors self-edit before posting, or that takes inflammatory content and rewrites it noninflammatorily. This is a traditional "fund a project" use case.

**Curated collections**: Alignment attesters review content and attest "this piece discusses [topic] from [perspective] without being inflammatory." A funding portal for "noninflammatory left-wing content on immigration" aggregates all attested pieces, creating a discovery mechanism.


## Verification: is the content actually noninflammatory?

"Noninflammatory" is subjective. Two viable approaches:

### 1. Retroactive-only (easiest)

Fund content that already exists. Real-world reception *is* the verification. No new infrastructure needed. Start here.

### 2. AI evaluator service

An AI service (analogous to the [implication attester](subsystems/conceptspace/implication-attester-ai.md)) that evaluates content and publishes attestations. Structurally almost identical to the implication attester:

  - Same architecture: standalone Express service with its own Ethereum key
  - Same payment model (x402, cost-plus)
  - Same on-chain output: publishes attestations (using whatever attestation contract we settle on — see open questions below)
  - Different LLM prompt: instead of "does S1 imply S2?", it evaluates content against noninflammatory criteria

**Key framing for the LLM prompt: this is about persuasion effectiveness, not politeness.** The evaluator should assess whether content is *effective at communicating its perspective to people who disagree*, not whether it's "nice." Specific criteria:
  - Does it steelman the opposing view (or at least not strawman it)?
  - Does it avoid ad hominem, mockery, and contempt?
  - Is the substantive point preserved and clearly stated?
  - Would a reasonable person holding the opposing view feel that they could engage with this without being attacked?
  - Does the framing invite consideration rather than defensive reaction?

The evaluator takes as input: the content (URL, pasted text, or IPFS CID), the declared perspective ("this is from a left-wing perspective"), and the target audience ("evaluate whether this would be inflammatory to right-wingers"). Returns a boolean attestation with confidence score and explanation (stored on IPFS).

In practice, multiple AI evaluator services will exist with different standards and calibrations. Users choose which attesters they trust, just as with implication attesters. People will naturally gravitate toward attester services aligned with their views — a left-leaning attester service and a right-leaning one, each trusted by their respective side. This is fine; that's how the system is designed to work. Cross-partisan attestation (where it happens naturally) carries extra weight, but it doesn't need to be engineered.

### "Noninflammatory" is itself contested

Some people find *any* presentation of an opposing viewpoint inflammatory. The standards are defined in attester criteria, not encoded in smart contracts. Different attesters having different standards is fine and expected.


## A potential AI skill

There's a natural new AI skill here (see [ai-assistance.md](ai-assistance.md)):

**Noninflammatory Content Assistant**
  - *Generation mode*: "Write a post on [topic] from [perspective], designed to be engaging to in-group while not alienating out-group" — framed around persuasion effectiveness, not politeness. Explicit criteria: steelmanning, no ad-hominem, honest framing, etc.
  - *Evaluation mode*: Score existing content on inflammatory dimensions, suggest rewrites.
  - *Attester mode*: As an AI quality attester, publish quality attestations for submitted content.

This would be a genuinely novel application of an AI service acting as a quality gatekeeper within the funding flow.


## The showcase moment

The demo that makes people get it: a left-wing post gets attested as noninflammatory by an AI evaluator, and funded by donors from both sides who found it through different statements in the implication graph. Neither side had to coordinate with the other. They just individually said what they valued, and the system connected them.

This is the [Millbrook water walkthrough](motivation/walkthrough.md) but for something much bigger and more visible — and it directly demonstrates the "discovering commonality" thesis that the whole system is named for.


## Practical path

1. **Seed the conceptspace** with statements spanning the political spectrum around noninflammatory discourse. Make sure statements are phrased in terms each side would naturally use.
2. **Build the AI content evaluator** — fork the implication attester architecture, swap the prompt and contract call. This is cheap to build and solves the verification problem that makes everything else work.
3. **Start with retroactive funding** of existing noninflammatory content via creator-level assurance contracts. This validates whether people actually want to fund this.
4. **Build a specialized showcase funding portal** for noninflammatory content as a demo of the whole system.
5. **Per-content-item tokenization** can be explored later if there's demand for finer-grained funding.


## Open questions

### Attestation contract: generalize or specialize?

The existing `AlignmentAttestations.sol` identifies subjects by `address`, but content items don't have Ethereum addresses. Two options, still undecided:
  - **Generalize**: Change `address subjectAddress` to `bytes32 subjectId` in `AlignmentAttestations`, allowing it to identify subjects by address (left-padded) or content hash. One contract for both use cases.
  - **Specialize**: Create a new `ContentAttestations.sol` (or similar) purpose-built for content items. Avoids touching the existing contract but introduces near-duplicate code.

For the creator-level MVP (where the "subject" is the creator's assurance contract address), the existing contract works as-is. This question only matters when/if we want to attest about individual content items directly.

### Per-content-item tokenization (future)

What would it take to create an ERC-1155 token where every post out there on every platform (e.g. every tweet, every blog post, etc.) has a token type that is claimable by the "rightful owner" of that post? Content identity, rightful-owner verification (ENS Twitter linking?), and the relationship between content tokens and assurance contracts are all open design questions. Not needed for MVP but worth exploring later — the "someone offered money for your tweet" notification could be a powerful viral growth mechanism.
