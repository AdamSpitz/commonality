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

For each site, we've got (here in this file) a brief description, as well as a "Key ideas to make salient" section. Each describes its title, description, spotlights, sections, actions; the idea is to update the landing pages to match. (I'm finding it easier to think through the landing sites by rearranging stuff on this page here; eventually I imagine we'll just make the actual landing-site code be the official Source of Truth.) If I ask an LLM to update the landing pages to match, I want it to stick to the wording I have here. (Later on I'll want to wordsmith, but for now I don't trust the LLM's rephrasings, and it's easier for me to keep track of all of this if it's in my own words.)

### 1. Commonality — the movement

A movement site for internet-age coordination on public-goods funding. The broad thesis: we're remarkably bad at producing public goods, and new tech (assurance contracts, delegation, blockchains, AI) makes a much better approach viable. The `docs/vision-and-strategy/` narrative and `pitches.md` live here.

Commonality does *not* host the funding tools themselves — those are on Pubstarter and Alignment. Commonality links to them as concrete instances of what the movement is for.

A secondary page carries the **founder pitch**: "build a vertical on this substrate — here's how, and here are the verticals already built (CSM, Civility, Content Funding, Pubstarter, Alignment, Delegation)."

Audience: people drawn to the broader thesis, plus founders/organizers who might start their own vertical.

Key ideas to make salient:
  - title: It's time for Internet-age public-goods-funding
  - description: Governments and big charity orgs both suck
  - spotlights:
    - label: New tech
      text: Internet, blockchains, and AI make a much better approach viable
  - sections:
    - title: Read more about the vision
      description: What is this all about?
    - title: For founders/organizers
      description: it's easy to build a vertical on this substrate, here's how, here's some examples
    - title: How can I participate?
      description: (link to a page that points to Alignment, Civility, CSM, etc., and explains what each is for)

### 2. Pubstarter — individual assurance contracts

The product surface for individual assurance contracts: public-goods crowdfunding. (Name is provisional. The differentiators from Kickstarter are retroactive funding and delegation, not "for public goods.")

Contains: contract creation, browsing/searching, individual contract pages (pledge, view progress, refund logic), retroactive-funding contracts.

Audience: project creators and one-off pledgers.

Key ideas to make salient:
  - title: Retroactive crowdfunding
  - spotlights:
    - label: You won't be donating alone
      text: Either the project reaches its funding goal or your pledge is refunded
    - label: Don't want to gamble on which projects will pan out?
      text: Fund proven projects retroactively, after they've delivered, to compensate the scouts who took a risk by investing early — your contribution is still valuable to the ecosystem and appears on the list of contributors. CTA: Learn about retroactive funding
    - label: Not inclined to make each decision personally?
      text: Delegate your donation decisions to anyone you trust; your name will still show up on the contributor list
  - actions:
    - Create a project
    - Browse projects

### 3. Alignment — funding portals and scouts

The product surface for ongoing funding flows: portals organized around statements/causes, and statement-anchored alignment-attestation flows.

Contains: portals (browse/create/contribute), statement-anchored alignment-attestation flows.

Audience: continuous-giving donors, scouts, and the orgs/causes that operate portals.

Key ideas to make salient:
  - title: Browse and fund projects aligned with causes you care about
  - sections:
    - title: Want to donate to the cause?
      description: View crowdfundable projects aligned with a cause
    - title: Want to call attention to a project?
      description: Attest that this project is aligned with this cause.
    - title: Follow the project ecosystem closely?
      description: Find people who trust you enough to let you make their donation decisions on their behalf.
  - actions:
    - Explore causes (links to an [explorer](specs/tech/subsystems/conceptspace/explorer.md) that guides the user to active areas, or areas he might be interested in)

### 4. Delegation

The site for setting up and managing delegation relationships. As a donor, you pick a delegate (anyone you choose); your money flows through their judgment while your name stays on the contributor list. As a delegate, you build a public on-chain track record. Used by Pubstarter, Alignment, and Content Funding.

Contains: delegate discovery, delegation setup and revocation, delegate track-record views.

Audience: donors who want to contribute without deciding everything themselves, and people who want to act as delegates.

Key ideas to make salient:
  - title: Lazily contribute to causes you care about
  - sections:
    - title: Want to give, but feeling lazy?
      description: Route your donations through anyone you trust — they decide which projects to fund; your name still shows up on the contributor list; revoke anytime
    - title: Follow the ecosystem closely?
      description: Find people who trust you enough to let you make their donation decisions on their behalf; build a public track record as a delegate; your decisions are transparently on-chain
  - actions:
    - View delegation dashboard
  - below the fold:
    - label: Supported by
      text: Pubstarter, Alignment, and Content Funding (link to each other site)
    - text: On each site that supports delegation, donations will show up as "Alice Donor (delegated via Bob Delegate)"

### 5. Tally — statement-signing / polling

The user-facing site for signing statements and seeing who else has signed (directly *and* indirectly via the implication graph). "Petitions and polls, with an implication graph that reveals indirect support, plus attester transparency."

Standalone consumer product because petitions/polls are a recognizable category that can attract people who'd never touch the funding side. Built on Conceptspace.

Key ideas to make salient:
  - title: Petitions and polls, in your own words
  - spotlights:
    - label: No need to compromise
      text: Sign statements of what you believe, using exactly the wording you want
    - label: Count up direct and indirect support
      text: See how many agree, even if they used different words to say it
  - actions:
    - (hmm, the "explorer" idea doesn't really belong here; explorers need to be purpose-specific, so we'll have one from Alignment, one from Civility, one from CSM; what *should* be here on the landing page for Tally? should it link to those?)

### 6. Content Funding

Site for creating and browsing content-funding contracts. Social media content is a public good; this site lets you fund it.

Built on Pubstarter (content contracts are a specialized kind of assurance contract). Its own domain because people may want to fund content with arbitrary criteria — funny, educational, investigative, noninflammatory, etc. — and a lightweight per-criterion experiment is just "make a statement and fund content attested against it."

Key ideas to make salient:
  - title: Fund the kind of social-media content you want to see
  - description: Funny, educational, investigative, noninflammatory — you name the criterion
  - spotlights:
    - label: Base funding on criteria other than eyeballs
      text: Reward exactly the criteria you want (unlike ads, which reward clickbait and outrage)
    - label: Works with mainstream social media
      text: Works with X, YouTube, and Substack — fund creators you like even if they haven't registered here yet
  - actions:
    - Browse (X/YouTube/Substack) creators
    - Create a content contract
    - View a channel
    - I am a content creator
    - Explore kinds of content (links to an [explorer](specs/tech/subsystems/conceptspace/explorer.md))

### 7. Civility

Built on Content Funding, focused on the noninflammatory criterion: content that communicates one side's perspective in a way that's engaging rather than alienating to the other side.

Separate from CSM because some people care about producing/funding noninflammatory content without joining a political movement. Closely related though — noninflammatory content is the mechanism by which [hidden majorities](../tech/subsystems/conceptspace/content-patterns/hidden-majority.md) get revealed.

Key ideas to make salient:
  - title: Fund civility
  - description: Let's reward noninflammatory content
  - spotlights:
    - label: Each side gets to say what they find inflammatory
      text: Identify and fund content that passes your own side's - or the other side's - "will this content *not* piss me off?" filter
    - label: No need to go wading through the other side's bullshit
      text: AI does the filtering so you don't have to
  - sections:
    - title: Want to find out when your own side is lying to you?
      description: Get recommendations vetted by *your* side's AI filter, for noninflammatory content from the *other* side
    - title: Want your side's ideas to actually reach the other side?
      description: Fund the messengers who know how to deliver them
  - actions:
    - View popular filters
    - View popular Civility-related statements on Tally (we should have a list of links to those: "I'm on the left, but I'd be glad to see right-wing content as long as it's not gonna piss me off", etc.)
    - Explore fundable content
    - Nominate noninflammatory content

### 8. Common Sense Majority (CSM)

Movement site for the [hidden majority](../tech/subsystems/conceptspace/content-patterns/hidden-majority.md) thesis: on many polarized issues, a supermajority holds a common-sense position that's invisible because the political system is structured around two coalitions dominated by their loudest members. CSM makes those hidden majorities visible and organizes around them.

Uses Civility (primary content component), Tally (movement-aligned signing), and Alignment / Pubstarter (funding for movement projects).

Distinct from Commonality-the-movement because CSM is specifically about the quiet-middle political thesis, not public-goods funding writ large.

Key ideas to make salient:
  - title: Giving the quiet middle majority a voice
  - description: On most issues, the loud extremes dominate, while a quiet supermajority holds common-sense positions that never get heard
  - spotlights:
    - label: Build bridges
      text: Sign statements in your own words; the other side does the same; AI helps find overlap; noninflammatory content nudges people toward common ground
    - label: Build momentum
      text: Transparent, verifiable supporter counts and funding flows to demonstrate the size of the movement
    - label: Credible neutrality
      text: The infrastructure is verifiably neutral, *not* capturable by either side
  - actions:
    - Go to Civility
    - View popular CSM-related statements on Tally (we should have a list of links to those: "Most people are reasonable; the loudest voices aren't representative.", etc.)
    - View nudgers (goes to a list of CSM-related nudgers - maybe just one - that people can explicitly sign on to receive nudges from)

### 9. Conceptspace — infrastructure (mostly developer-facing)

Statements, implication graphs, signing primitives, nudgers, trust/attester graph. Underlying infrastructure that other sites read from. May have a thin developer-facing site (API docs, schema) but is *not* a consumer destination — the user-facing slice has moved to Tally.

Key ideas to make salient:
  - title: Make concepts linkable
  - description: Infrastructure that removes the need to coordinate on exactly how an idea is phrased
  - spotlights:
    - label: Use AI to reduce the need for coordination
      text: AI-driven services find statements that mean the same thing; use your own if you don't trust ours
    - label: Link to concepts
      text: Point at a statement that means what you want, without worrying about whether someone else might phrase it in a different way
  - actions:
    - Go to the attester GitHub repo
    - Go to the finder GitHub repo
    - Go to the sample nudger GitHub repo

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

## Why so many?

In some ways this feels silly: we've got a *lot* of domains. I'm not totally sure it's the right thing to do. But:
  - Partly the point here is that I've got this vision of these systems I want to build (like CSM), but their prerequisites (like Conceptspace and Pubstarter) aren't built yet so I had to build them first. The prerequisites are real things that could conceivably have been built separately ahead of time; as it happens, they weren't, so I'm building them. I'm trying to build them properly, as real sites that stand on their own, even though I'm also using them as part of this larger whole.
  - Because this is all built on open data (blockchains + IPFS), it feels a bit different to me. This isn't like presenting many different websites that under-the-hood are all backed by a single database owned by a single company (which would falsely present the appearance of those sites being independent even though they're all controlled by the same company); this project's sites are interrelated but there's no entity controlling the database behind the scenes.
  - And also it feels important to keep them separate because some of the aspects are going to turn people off. Some people won't care about the noninflammatory-content/common-sense-majority stuff, but will get excited about the crowdfunding ideas. Or there'll be stuff that appeals to founder types but not to normies. Or whatever. If it's all on the same site, they'll see it and go "ugh, this isn't for me." It needs to be feel like those different aspects are on a whole nother site.
  - And that's also why there's a split between the "functionality" sites and the more-opinionated "movement" sites. The functionality sites are more neutral.
  - So we've got splits between opinionated sites, because the opinionatedness will turn people off.
  - And then we've got splits between functionality sites, kinda for a similar reason.
    - Some people will be glad to express opinions (on Tally) but not to do anything involving money (on Pubstarter or Alignment).
    - Some people will be glad to run a particular project (on Pubstarter) but not care about expressing opinions (on Tally) or supporting a movement (on Alignment).

Anyway, I think it makes sense, but it does feel like a lot.
