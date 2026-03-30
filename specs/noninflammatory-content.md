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

### Funding model: creator-level assurance contracts with per-content-item tokens

The natural unit for funding noninflammatory content is the **creator**, not the individual content item. But the retroactive funding model's secondary-market dynamics depend on **scarcity** — a finite token supply tied to a specific piece of work, so that later donors must buy on the secondary market, rewarding early supporters who bet correctly. This means content items need explicit on-chain identity, not just a text description.

The solution uses the ERC-1155 structure Pubstarter already has: **use the content ID as the token type**. A single creator contract might contain:

| Token type (`uint256`) | Content | Supply | Price |
|---|---|---|---|
| `keccak256("twitter:18347...")` | That great thread on housing | 100 | $5 |
| `keccak256("twitter:29451...")` | The immigration steelman post | 100 | $5 |
| `keccak256("substack:https://...")` | The long-form essay | 100 | $5 |

ERC-1155 token IDs are `uint256` and `keccak256` produces `bytes32` — same size, direct mapping. Per-content-item tokens come for free from the ERC-1155 structure.

**The funding flow:**

1. Someone creates a Pubstarter assurance contract for a content creator, listing specific content items by their canonical IDs.
2. Each content item becomes a token type in the ERC-1155 contract, with a configurable supply (e.g., 100 tokens at $5 each).
3. Donors choose which content items to fund by buying tokens of that type. To fund the creator without expressing a preference, buy some of each.
4. Funds go into escrow. If the contract's threshold is met, the creator gets the funds. If not, token holders can reclaim.
5. After funding, tokens are tradeable on secondary markets — at the per-content-item level.

**Content ID uniqueness.** A content registry contract (`mapping(uint256 contentId => address assuranceContract)`) ensures each content item can only appear in one assurance contract. The assurance contract factory checks the registry at creation time and reverts if any listed content ID is already claimed. This enforces the scarcity that makes secondary markets work: if you want to retroactively fund *that specific tweet*, you can't just create a new contract — you must buy tokens from the existing one.

**Content ID scheme.** Content IDs are `keccak256` hashes of canonical identifiers: `keccak256("twitter:18347...")`, `keccak256("https://example.com/post")`, or an IPFS CID. The contract doesn't validate that the content exists — it just enforces ID uniqueness. Social and market forces handle the rest (no one will fund a contract referencing garbage content IDs).

**Contracts as "rounds."** Each contract represents a funding round for a batch of content. Once funded and closed, a new contract can be created for the creator's newer content. This preserves clean assurance-contract semantics (one threshold, one outcome) and maps naturally onto the rhythm of "here's what I produced recently — was it worth funding?"

**Supply per content item** should be configurable per contract or per content item. Lower supply (e.g., 10 tokens) means more scarcity and stronger speculative incentives but fewer primary-market participants. Higher supply (e.g., 500 tokens) means broader access but a diluted scarcity signal. The contract creator sets this based on the expected donor base and desired price point.

**Price tiers.** Existing Pubstarter contracts use different token types for different price tiers ($5, $25, $100 "Gold Supporter" etc.). With token types now representing content items, explicit tiers go away — but a donor who wants to contribute $50 to a $5-per-token content item just buys 10. The granularity of having many tokens per item handles this naturally. Cosmetic tier differences (badges, etc.) can move to a quantity-held basis if anyone cares.

**Delegation still works.** "I delegate $20/month toward noninflammatory political content" → a trusted delegate picks creators and content items, buying tokens on the donor's behalf.

**Why this isn't as complex as it sounds.** The "Per-content-item tokenization" section of this doc originally framed this as a heavy future lift involving content identity, rightful-owner claims, and fractionalization. Using the ERC-1155 token type ID sidesteps most of that:
  - Content identity is just a hash of a canonical URL/ID — simple.
  - Rightful-owner claims are handled at the contract level (the creator claims the contract's funds), not per-token.
  - Fractionalization isn't needed — having 100 tokens of a type *is* the fractionalization.

The actual new infrastructure is modest: one content registry contract (a simple mapping plus access check), a content ID field on assurance contracts, and a factory check. Well below the complexity threshold that would warrant deferring it.

### Retroactive funding

Retroactive funding is arguably the *best* fit here. Content creators publish the work first, let the actual reception prove it was noninflammatory, *then* get retroactively funded via the token model. Early supporters who bet on a creator's quality can later sell their per-content-item tokens to altruistic donors who arrive later. The proof-of-quality is baked into the retroactive model — no separate verification needed.

The per-content-item token model strengthens retroactive funding specifically: secondary markets operate at the granularity of individual content items, so a tweet that goes viral as a model of noninflammatory discourse will see its token price rise on the secondary market, directly rewarding the early supporters who identified it.

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
2. **Build the content registry contract** — a simple `mapping(uint256 => address)` that enforces content-item uniqueness across assurance contracts. Update the assurance contract factory to register content IDs and use them as ERC-1155 token types.
3. **Build the AI content evaluator** — fork the implication attester architecture, swap the prompt and contract call. This is cheap to build and solves the verification problem that makes everything else work.
4. **Start with retroactive funding** of existing noninflammatory content via creator-level assurance contracts with per-content-item tokens. This validates whether people actually want to fund this.
5. **Build a specialized showcase funding portal** for noninflammatory content as a demo of the whole system.
6. **Build the notification indexer** — watch for content registration events, resolve content IDs to platform URLs, and notify creators that their content has been funded.


## Open questions

### Attestation contract: generalize or specialize?

The existing `AlignmentAttestations.sol` identifies subjects by `address`, but content items don't have Ethereum addresses. Two options, still undecided:
  - **Generalize**: Change `address subjectAddress` to `bytes32 subjectId` in `AlignmentAttestations`, allowing it to identify subjects by address (left-padded) or content hash. One contract for both use cases.
  - **Specialize**: Create a new `ContentAttestations.sol` (or similar) purpose-built for content items. Avoids touching the existing contract but introduces near-duplicate code.

For the creator-level MVP (where the "subject" is the creator's assurance contract address), the existing contract works as-is. This question only matters when/if we want to attest about individual content items directly.

### The "someone funded your tweet" notification

The per-content-item token model creates the preconditions for the viral "someone offered money for your tweet" moment. To make it work, an off-chain indexer needs to resolve `keccak256("twitter:18347...")` back to the actual tweet and figure out who the author is. This is tractable: the assurance contract factory can emit an event that includes the plaintext canonical ID alongside the hash when a content item is registered. The indexer watches for these events and handles notifications. The hard part is reaching the creator (who may not be on the platform yet), not the on-chain mechanics.
