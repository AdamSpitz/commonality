# Multiple UI Domains

Rather than presenting the whole system as one big website, we present several focused sites, each compelling to a different audience. When someone asks "what have you been building?", the right answer usually is not the general-purpose infrastructure — it is whichever concrete use case will resonate with that person.

For the technical implementation, see [specs/tech/ui-domains.md](../tech/ui-domains.md). For the cross-domain AI-service taxonomy and service/domain ownership map, see [ai-assistance.md](./ai-assistance.md).

## Source of truth

This file is the product-boundary source of truth: which sites exist and what job each one has.

It is **not** the source of truth for landing-page copy, CTA wording, spotlight cards, or navigation. The live domain manifests and landing pages live under [`ui/src/domains/`](/ui/src/domains/) and should be treated as the source of truth for the actual site copy.

The historical reshuffling notes below are kept for context only:

- [May 4 reshuffling](./ui-domains-may4.md)
- [May 5 reshuffling](./ui-domains-may5.md)
- [May 19 removal of Delegation](./ui-domains-may19.md)

## Current shape: eight sites

Four product sites for funding (LazyGiving, Alignment, Content Funding, Civility), one product site for signing (Tally), two movement sites (Commonality, CSM), and one mostly developer-facing infrastructure site (Conceptspace).

No ecosystem-wide product umbrella. Each site stands on its own and pitches to its own audience. Cross-site links are kept lightweight (nav/footer or secondary pages), not prominent above the fold on every landing page.

### 1. Commonality — the movement

A movement site for internet-age coordination on public-goods funding. The broad thesis: we are bad at producing public goods, and new tech plus better mechanisms — assurance contracts, delegation, retroactive funding, implication graphs, and open ledgers — makes a better approach viable.

Commonality does not own all product workflows. It explains the movement and links to LazyGiving, Alignment, Content Funding, Civility, CSM, and Tally as concrete instances of the broader substrate.

Audience: people drawn to the public-goods thesis, plus founders/organizers who might start their own vertical.

### 2. LazyGiving — individual assurance contracts

The product surface for individual assurance contracts: create a project, browse projects, pledge, get refunded if the goal is not met, and use retroactive-funding / donation-receipt-token mechanics.

Audience: project creators, one-off pledgers, retroactive funders, and early backers/scouts when the workflow is contract-shaped.

#### What I want to convey

Short version: it's like Kickstarter, but onchain, with retroactive funding, and delegation.

That is:
  - this is like Kickstarter (money will be refunded if project doesn't reach threshold), except:
  - on a blockchain (so it's neutral infrastructure)
  - you can sell your shares (so people who don't want to try to weed out the scams and lemons can just retroactively contribute after the project has been successful)
  - the contributor list respects delegation (so you don't need to make these decisions yourself, you can let your trusted friend do it)

(I'm not saying to phrase it exactly that way, I'm just trying to lay out the points.)

### 3. Alignment — cause-based funding

The product surface for ongoing funding flows: portals organized around statements/causes, statement-anchored project-alignment attestations, and delegation-based cause funding.

Audience: recurring donors, delegates, scouts/curators, attesters, organizations, and cause operators.

### 4. Tally — statement-signing / polling

The consumer-facing site for writing, signing, and inspecting statements. Tally looks like petitions and polls, but with direct and implication-derived supporter counts.

Audience: people who want to express what they believe, see whether others agree, or inspect how related statements connect.

### 5. Content Funding

A creator/fan site for funding online content. Content contracts are specialized LazyGiving-style assurance contracts pointed at tweets, videos, posts, and similar social-media artifacts.

Audience: creators who want direct funding for their work, and supporters who want to reward specific content or kinds of content.

### 6. Civility

A focused vertical on top of Content Funding for content that communicates across political divides without contempt, tribal signaling, or needless inflammatory framing.

Audience: people who want better political media without necessarily joining CSM as a movement.

### 7. Common Sense Majority (CSM)

A movement site for the hidden-majority / quiet-middle thesis: on many polarized issues, the loud poles are both minorities, while a common-sense majority is invisible because the system forces everyone into two hostile coalitions.

CSM uses Civility for bridge-building content, Tally for statement signing and supporter counts, and Alignment/LazyGiving for funding.

Audience: people attracted to the quiet-middle political thesis and organizers trying to make that majority visible.

### 8. Conceptspace — infrastructure

Mostly developer-facing infrastructure: statements, implication graphs, signing primitives, trust/attester graph, nudgers, and related APIs. Conceptspace is not normally the cold entry point for nontechnical users; Tally owns the consumer-facing statement-signing experience.

Audience: developers, integrators, operators, and advanced users inspecting the substrate.

#### What I want to convey

I want to convey something like: Look, this site isn't complicated, it has exactly one idea: implication arrows between statements. It's not user-facing; it's meant as infrastructure. It's just a way to let people point to a concept, without needing to care exactly how it's phrased.

The landing page copy kinda does already say that. It's just that I'm not sure it conveys that this is simple and it's not meant to be anything particularly earth-shattering. It doesn't even really need to be its own separate site, except that there are a lot of potential applications and there's no reason why they should need to reinvent this for each one. This is meant to be a very simple no-brainer infrastructure choice for other sites to build on because it solves one specific problem and doesn't really constrain them in any way. Not meant to be a major focus.


## How the sites relate

```text
Common Sense Majority (movement: quiet middle)
  ├── uses Civility (primary content component)
  ├── uses Tally (movement-aligned statement signing)
  └── uses Alignment / LazyGiving (funding for movement projects)

Commonality (movement: internet-age coordination on public goods)
  └── links to LazyGiving, Alignment, and the verticals as concrete instances

Civility
  ├── built on Content Funding (contracts with noninflammatory criteria)
  └── links to Tally

Content Funding
  └── built on LazyGiving (content contracts are specialized assurance contracts)

LazyGiving (individual assurance contracts)
  └── built on Conceptspace (contracts can anchor against statements)

Alignment (cause portals)
  └── built on Conceptspace (portals/alignment attestations anchor against statements)

Tally (signing / polling)
  └── built on Conceptspace

Conceptspace (infrastructure)
  └── the substrate: statements, implication graph, signing, trust, attesters, nudgers
```

## Why so many?

In some ways this feels silly: we've got a *lot* of domains. I'm not totally sure it's the right thing to do. But:
  - Partly the point here is that I've got this vision of these systems I want to build (like CSM), but their prerequisites (like Conceptspace and LazyGiving) aren't built yet so I had to build them first. The prerequisites are real things that could conceivably have been built separately ahead of time; as it happens, they weren't, so I'm building them. I'm trying to build them properly, as real sites that stand on their own, even though I'm also using them as part of this larger whole.
  - Because this is all built on open data (blockchains + IPFS), it feels a bit different to me. This isn't like presenting many different websites that under-the-hood are all backed by a single database owned by a single company (which would falsely present the appearance of those sites being independent even though they're all controlled by the same company); this project's sites are interrelated but there's no entity controlling the database behind the scenes.
  - And also it feels important to keep them separate because some of the aspects are going to turn people off. Some people won't care about the noninflammatory-content/common-sense-majority stuff, but will get excited about the crowdfunding ideas. Or there'll be stuff that appeals to founder types but not to normies. Or whatever. If it's all on the same site, they'll see it and go "ugh, this isn't for me." It needs to be feel like those different aspects are on a whole nother site.
  - And that's also why there's a split between the "functionality" sites and the more-opinionated "movement" sites. The functionality sites are more neutral.
  - So we've got splits between opinionated sites, because the opinionatedness will turn people off.
  - And then we've got splits between functionality sites, kinda for a similar reason.
    - Some people will be glad to express opinions (on Tally) but not to do anything involving money (on LazyGiving or Alignment).
    - Some people will be glad to run a particular project (on LazyGiving) but not care about expressing opinions (on Tally) or supporting a movement (on Alignment).

Anyway, I think it makes sense, but it does feel like a lot.
