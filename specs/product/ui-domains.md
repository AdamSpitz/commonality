# Multiple UI Domains

Rather than presenting the whole system as one big website, we present several focused sites, each compelling to a different audience. When someone asks "what have you been building?", the right answer isn't the general-purpose infrastructure — it's whichever specific use case will resonate with that person.

For the technical implementation, see [specs/tech/ui-domains.md](../tech/ui-domains.md).

## Reshufflings

We've been trying to get the shape of this right; it's gone through a few iterations.

  - [May 4 reshuffling](./ui-domains-may4.md)
  - [May 5 reshuffling](./ui-domains-may5.md)

## Current shape: nine sites

Four product sites for funding (Pubstarter, Alignment, Content Funding, Delegation), one product site for signing (Tally), two movement sites (Commonality, CSM), one focused-content site (Civility), and one mostly-developer-facing infrastructure site (Conceptspace).

No ecosystem-wide product umbrella. Each site stands on its own and pitches to its own audience. Cross-site links are kept lightweight (nav/footer), not prominent on landings.

### 1. Commonality — the movement

A movement site for internet-age coordination on public-goods funding. The broad thesis: we're remarkably bad at producing public goods, and new tech (assurance contracts, delegation, blockchains, AI) makes a much better approach viable. The `docs/vision-and-strategy/` narrative and `pitches.md` live here.

Commonality does *not* host the funding tools themselves — those are on Pubstarter and Alignment. Commonality links to them as concrete instances of what the movement is for.

A secondary page carries the **founder pitch**: "build a vertical on this substrate — here's how, and here are the verticals already built (CSM, Civility, Content Funding, Pubstarter, Alignment)."

Audience: people drawn to the broader thesis, plus founders/organizers who might start their own vertical.

Key ideas to make salient:
  - Governments and big charity orgs both suck; it's time for Internet-age public-goods-funding
  - New tech (Internet, blockchains, AI) makes a much better approach viable
  - For founders/organizers: it's easy to build a vertical on this substrate, here's how, here's some examples

### 2. Pubstarter — individual assurance contracts

The product surface for individual assurance contracts: public-goods crowdfunding. (Name is provisional. The differentiators from Kickstarter are retroactive funding and delegation, not "for public goods.")

Contains: contract creation, browsing/searching, individual contract pages (pledge, view progress, refund logic), retroactive-funding contracts.

Audience: project creators and one-off pledgers.

Key ideas to make salient:
  - Retroactive crowdfunding
  - Either the project reaches its funding goal or your pledge is refunded
  - Don't want to gamble on which projects will pan out? Fund proven projects retroactively, after they've delivered, to compensate the scouts who took a risk by investing early — your contribution is still valuable to the ecosystem and appears on the list of contributors
  - Not inclined to make each decision personally? Delegate your donation decisions to anyone you trust; your name wills till show up on the contributor list

### 3. Alignment — funding portals and scouts

The product surface for ongoing funding flows: portals organized around statements/causes, and statement-anchored alignment-attestation flows.

Contains: portals (browse/create/contribute), statement-anchored alignment-attestation flows.

Audience: continuous-giving donors, scouts, and the orgs/causes that operate portals.


Key ideas to make salient:
  - View crowdfundable projects aligned with a cause
  - Pledge money towards a cause; let your chosen delegate (anyone you want) (make that a link to the Delegation site) decide which particular projects to direct the money to; it'll still be your name that shows up on the contributor list

Key ideas to make salient:
  - Browse and fund projects aligned with causes you care about
  - Pledge money towards a cause; let someone you trust direct your money; your name stays on the contributor list (link to Delegation)

### 4. Delegation

The site for setting up and managing delegation relationships. As a donor, you pick a delegate (anyone you choose); your money flows through their judgment while your name stays on the contributor list. As a delegate, you build a public on-chain track record. Used by Pubstarter, Alignment, and Content Funding.

Contains: delegate discovery, delegation setup and revocation, delegate track-record views.

Audience: donors who want to contribute without deciding everything themselves, and people who want to act as delegates.

Key ideas to make salient:
  - Trust someone's judgment? Route your donations through them — they decide which projects to fund; your name still shows up on the contributor list; revoke anytime
  - Build a public track record as a delegate: direct money toward good projects; your decisions are transparently on-chain; no nonprofit required
  - Works across Pubstarter, Alignment, and Content Funding

### 5. Tally — statement-signing / polling

The user-facing site for signing statements and seeing who else has signed (directly *and* indirectly via the implication graph). "Petitions and polls, with an implication graph that reveals indirect support, plus attester transparency."

Standalone consumer product because petitions/polls are a recognizable category that can attract people who'd never touch the funding side. Built on Conceptspace.

Key ideas to make salient:
  - Petitions and polls
  - Sign statements of what you believe, in your own words
  - See how many agree, even if they used different words to say it

### 6. Content Funding

Site for creating and browsing content-funding contracts. Social media content is a public good; this site lets you fund it.

Built on Pubstarter (content contracts are a specialized kind of assurance contract). Its own domain because people may want to fund content with arbitrary criteria — funny, educational, investigative, noninflammatory, etc. — and a lightweight per-criterion experiment is just "make a statement and fund content attested against it."

Key ideas to make salient:
  - Fund the kind of social-media content you want to see: funny, educational, investigative, noninflammatory — you name the criterion
  - An alternative to ads, which reward clickbait and outrage
  - Works with X, YouTube, and Substack — fund creators you like even if they haven't registered here yet

### 7. Civility

Built on Content Funding, focused on the noninflammatory criterion: content that communicates one side's perspective in a way that's engaging rather than alienating to the other side.

Separate from CSM because some people care about producing/funding noninflammatory content without joining a political movement. Closely related though — noninflammatory content is the mechanism by which [hidden majorities](../tech/subsystems/conceptspace/content-patterns/hidden-majority.md) get revealed.

Key ideas to make salient:
  - Fund civility
  - Identify and fund content that passes your own side's - or the other side's - "will this content *not* piss me off?" filter
    - Want to find out when your own side is lying to you, but can't stomach following the other side's bullshit? Get recommendations vetted by *your* side, for noninflammatory content from the *other* side
    - Want your side's ideas to actually reach the other side? Fund the messengers who know how to deliver them
  - AI does the filtering so you don't have to

### 8. Common Sense Majority (CSM)

Movement site for the [hidden majority](../tech/subsystems/conceptspace/content-patterns/hidden-majority.md) thesis: on many polarized issues, a supermajority holds a common-sense position that's invisible because the political system is structured around two coalitions dominated by their loudest members. CSM makes those hidden majorities visible and organizes around them.

Uses Civility (primary content component), Tally (movement-aligned signing), and Alignment / Pubstarter (funding for movement projects).

Distinct from Commonality-the-movement because CSM is specifically about the quiet-middle political thesis, not public-goods funding writ large.

Key ideas to make salient:
  - Giving the quiet middle majority a voice
    - On most issues, the loud extremes dominate — but a quiet supermajority holds common-sense positions that never get heard
  - Build bridges: Sign statements in your own words; the other side does the same; AI helps find overlap; noninflammatory content nudges people toward common ground
  - Transparent, verifiable supporter counts and funding flows
  - Tally supporters and funding flow to demonstrate the size of the movement
  - The infrastructure is verifiably neutral, *not* capturable by either side

### 9. Conceptspace — infrastructure (mostly developer-facing)

Statements, implication graphs, signing primitives, nudgers, trust/attester graph. Underlying infrastructure that other sites read from. May have a thin developer-facing site (API docs, schema) but is *not* a consumer destination — the user-facing slice has moved to Tally.

Cross-site identity / accounts / delegations live here too, since signatures and trust-graph data already sit at this layer.

### How the sites relate

```
Common Sense Majority (movement: quiet middle)
  ├── uses Civility (primary content component)
  ├── uses Tally (movement-aligned statement signing)
  └── uses Alignment / Pubstarter (funding for movement projects)

Commonality (movement: internet-age coordination on public goods)
  └── links to Pubstarter, Alignment, and the verticals as concrete instances

Civility
  ├── built on Content Funding (contracts with noninflammatory criteria)
  └── links to Tally

Content Funding
  ├── built on Pubstarter (content contracts are specialized assurance contracts)
  └── uses Delegation

Pubstarter (individual assurance contracts)
  ├── built on Conceptspace (contracts anchor against statements)
  └── uses Delegation

Alignment (funding portals)
  ├── built on Conceptspace (portals/alignment attestations anchor against statements)
  └── uses Delegation

Delegation (donor-delegate relationships and track records)
  └── built on Conceptspace (trust graph/signatures)

Tally (signing / polling)
  └── built on Conceptspace

Conceptspace (infrastructure, mostly dev-facing)
  └── the substrate: statements, implication graph, signing, trust, attesters
```
