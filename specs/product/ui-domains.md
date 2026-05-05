# Multiple UI Domains

Rather than presenting the whole system as one big website, we present several focused sites, each compelling to a different audience. When someone asks "what have you been building?", the right answer isn't the general-purpose infrastructure — it's whichever specific use case will resonate with that person.

For the technical implementation, see [specs/tech/ui-domains.md](../tech/ui-domains.md).

## Reshufflings

We've been trying to get the shape of this right; it's gone through a few iterations.

  - [May 4 reshuffling](./ui-domains-may4.md)
  - [May 5 reshuffling](./ui-domains-may5.md)

## Current shape: eight sites

Three product sites for funding (Pubstarter, Alignment, Content Funding), one product site for signing (Tally), two movement sites (Commonality, CSM), one focused-content site (Noninflammatory Content), and one mostly-developer-facing infrastructure site (Conceptspace).

No ecosystem-wide product umbrella. Each site stands on its own and pitches to its own audience. Cross-site links are kept lightweight (nav/footer), not prominent on landings.

### 1. Commonality — the movement

A movement site for internet-age coordination on public-goods funding. The broad thesis: we're remarkably bad at producing public goods, and new tech (assurance contracts, delegation, blockchains, AI) makes a much better approach viable. The `docs/vision-and-strategy/` narrative and `pitches.md` live here.

Commonality does *not* host the funding tools themselves — those are on Pubstarter and Alignment. Commonality links to them as concrete instances of what the movement is for.

A secondary page carries the **founder pitch**: "build a vertical on this substrate — here's how, and here are the verticals already built (CSM, Noninflammatory Content, Content Funding, Pubstarter, Alignment)."

Audience: people drawn to the broader thesis, plus founders/organizers who might start their own vertical.

### 2. Pubstarter — individual assurance contracts

The product surface for individual assurance contracts: "public-goods Kickstarter." (Name is provisional.)

Contains: contract creation, browsing/searching, individual contract pages (pledge, view progress, refund logic), retroactive-funding contracts.

Audience: project creators and one-off pledgers.

### 3. Alignment — funding portals, delegation, scouts

The product surface for ongoing funding flows: portals organized around statements/causes, delegation of funds to trusted judgment, and scout activity.

Contains: portals (browse/create/contribute), delegation UI, scout tooling and activity views, statement-anchored alignment-attestation flows.

Audience: continuous-giving donors, delegates, scouts, and the orgs/causes that operate portals.

### 4. Tally — statement-signing / polling

The user-facing site for signing statements and seeing who else has signed (directly *and* indirectly via the implication graph). "Petitions and polls, with an implication graph that reveals indirect support, plus attester transparency."

Standalone consumer product because petitions/polls are a recognizable category that can attract people who'd never touch the funding side. Built on Conceptspace.

### 5. Content Funding

Site for creating and browsing content-funding contracts. Social media content is a public good; this site lets you fund it.

Built on Pubstarter (content contracts are a specialized kind of assurance contract). Its own domain because people may want to fund content with arbitrary criteria — funny, educational, investigative, noninflammatory, etc. — and a lightweight per-criterion experiment is just "make a statement and fund content attested against it."

### 6. Noninflammatory Content

Built on Content Funding, focused on the noninflammatory criterion: content that communicates one side's perspective in a way that's engaging rather than alienating to the other side.

Separate from CSM because some people care about producing/funding noninflammatory content without joining a political movement. Closely related though — noninflammatory content is the mechanism by which [hidden majorities](../tech/subsystems/conceptspace/content-patterns/hidden-majority.md) get revealed.

### 7. Common Sense Majority (CSM)

Movement site for the [hidden majority](../tech/subsystems/conceptspace/content-patterns/hidden-majority.md) thesis: on many polarized issues, a supermajority holds a common-sense position that's invisible because the political system is structured around two coalitions dominated by their loudest members. CSM makes those hidden majorities visible and organizes around them.

Uses Noninflammatory Content (primary content component), Tally (movement-aligned signing), and Alignment / Pubstarter (funding for movement projects).

Distinct from Commonality-the-movement because CSM is specifically about the quiet-middle political thesis, not public-goods funding writ large.

### 8. Conceptspace — infrastructure (mostly developer-facing)

Statements, implication graphs, signing primitives, nudgers, trust/attester graph. Underlying infrastructure that other sites read from. May have a thin developer-facing site (API docs, schema) but is *not* a consumer destination — the user-facing slice has moved to Tally.

Cross-site identity / accounts / delegations live here too, since signatures and trust-graph data already sit at this layer.

### How the sites relate

```
Common Sense Majority (movement: quiet middle)
  ├── uses Noninflammatory Content (primary content component)
  ├── uses Tally (movement-aligned statement signing)
  └── uses Alignment / Pubstarter (funding for movement projects)

Commonality (movement: internet-age coordination on public goods)
  └── links to Pubstarter, Alignment, and the verticals as concrete instances

Noninflammatory Content
  ├── built on Content Funding (contracts with noninflammatory criteria)
  └── links to Tally

Content Funding
  └── built on Pubstarter (content contracts are specialized assurance contracts)

Pubstarter (individual assurance contracts)
  └── built on Conceptspace (contracts anchor against statements)

Alignment (funding portals + delegation + scouts)
  └── built on Conceptspace (portals/alignment attestations anchor against statements)

Tally (signing / polling)
  └── built on Conceptspace

Conceptspace (infrastructure, mostly dev-facing)
  └── the substrate: statements, implication graph, signing, trust, attesters
```
