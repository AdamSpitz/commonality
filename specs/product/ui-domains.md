# Multiple UI Domains

Rather than presenting the whole system as one big website, we present several focused sites, each compelling to a different audience. When someone asks "what have you been building?", the right answer usually is not the general-purpose infrastructure — it is whichever concrete use case will resonate with that person.

For the technical implementation, see [specs/tech/ui-domains.md](../tech/ui-domains.md). For the cross-domain AI-service taxonomy and service/domain ownership map, see [ai-assistance.md](./ai-assistance.md).

## Source of truth

This file is the product-boundary source of truth: which sites exist and what job each one has.

It is **not** the source of truth for landing-page copy, CTA wording, spotlight cards, or navigation. The live domain manifests and landing pages live under [`ui/src/domains/`](/ui/src/domains/) and should be treated as the source of truth for the actual site copy.

## Current shape: eight sites

Four product sites for funding (LazyGiving, Aligning, Content Funding, Civility), one product site for signing (Tally), two movement sites (Commonality, CSM), and one mostly developer-facing infrastructure site (Conceptspace).

No ecosystem-wide product umbrella. Each site stands on its own and pitches to its own audience. Cross-site links are kept lightweight (nav/footer or secondary pages), not prominent above the fold on every landing page.

## Primary UX workflows

This is the product-level checklist of the workflows each site needs to make obvious and keep healthy. Use it when designing pages, writing manual test scripts, and choosing verifier journeys. The route examples are descriptive, not a promise that every route is production-complete today.

### Commonality

- **Understand the thesis:** a newcomer lands on the movement site, reads the public-goods funding thesis, and leaves knowing which concrete product site to try next.
- **Founder/operator evaluation:** a potential project or vertical founder reads the founder pitch, checks docs, and decides whether Commonality infrastructure fits their public-goods funding problem.
- **Choose a participation path:** a motivated supporter picks a concrete next action: browse LazyGiving projects, explore Aligning cause boards, set up delegation, sign statements on Tally, or follow the CSM/Civility verticals.

Mobile priority: medium. The landing and participation flows should read well on phones, but long-form founder evaluation can assume desktop-friendly reading and note-taking.

### LazyGiving

- **Browse and evaluate projects:** a donor scans projects, opens a project detail page, understands goal/progress/refund mechanics, and decides whether to pledge.
- **Create a project:** a creator starts a project, supplies goal/metadata/deadline, understands the assurance-contract terms, and shares the resulting page.
- **Pledge, confirm, and recover:** a donor contributes, sees pending/confirmed/error states, and later understands either success/receipt-token status or refund status.
- **Use delegation for funding judgment:** a user manages delegation notes and can inspect delegate profiles when deciding whose judgment to follow.
- **Retroactive funding / secondary-market discovery:** a retroactive funder finds already-successful projects and understands how to buy exposure after success.

Mobile priority: high for browse, project detail, pledge status, and refund/confirmation; medium for project creation and delegation setup, which can tolerate more desktop-oriented forms.

### Aligning

- **Explore cause boards:** a donor lands on Explore Causes, finds a statement/cause board, and understands why projects are shown there.
- **Inspect a cause board:** a user opens a board, sees aligned projects, attestation/trust signals, and leaderboard/status information.
- **Fund an ongoing cause:** a donor chooses how to contribute or delegate support to a cause rather than a one-off project.
- **Attest alignment:** an attester/scout records or reviews whether a project belongs on a cause board.
- **Follow trusted judgment:** a donor understands how delegation and trust affect what they see, even if delegation management lives on LazyGiving.

Mobile priority: high for explore, board detail, and contribution status; medium for attestation and trust/delegation configuration.

### Tally

- **Start signing:** a user writes or finds a statement, signs it, and sees their signature reflected in their profile or the statement page.
- **Browse public opinion:** a visitor browses statements and compares direct support with implication-derived support.
- **Inspect a statement:** a user opens a statement page, sees supporters, related statements, implication edges, and linked cause-board/funding contexts.
- **Manage identity/trust settings:** a signed-in user reviews their profile and configures trust/nudger settings.
- **Cross over to action:** a user who agrees with a statement can follow links to related Aligning cause boards or other action surfaces.

Mobile priority: very high for discovery, statement reading, signing, and sharing; medium for settings and dense implication-graph inspection.

### Content Funding

- **Browse creators/content:** a supporter chooses a platform or creator/channel, sees fundable or prospective content, and understands what contract they are backing.
- **Start a content contract:** a creator or fan starts a contract for a specific artifact or future content category.
- **Creator dashboard:** a creator checks active contracts, status, and next steps.
- **Contribute and track outcomes:** a supporter contributes to a content contract and can later verify success/refund/receipt-token state.
- **Delegate content-funding judgment:** a user delegates or follows trusted people for content-funding decisions.

Mobile priority: high for browse, creator/channel pages, contract detail, and contribution status; medium for contract creation and dashboard management.

### Civility

- **Discover noninflammatory content:** a supporter browses creators/content that communicate across divides and can inspect why the work qualifies.
- **Nominate a creator:** a user nominates a creator or piece of content for review/funding.
- **Use civility filters:** a user explores the criteria/filters that distinguish Civility from generic content funding.
- **Fund or share a civility contract:** a supporter contributes to a listed contract or shares it with others.
- **Connect to statements:** a visitor follows popular statements or Tally links to understand the broader agreement/disagreement landscape.

Mobile priority: high for discovery, nomination, and sharing; medium for creator dashboards and contract creation.

### Common Sense Majority

- **Understand the hidden-majority thesis:** a newcomer reads the movement case and recognizes whether it matches their political frustration.
- **Explore bridge positions:** a visitor browses bridges/common-sense positions and sees how each side might sign its half.
- **Find popular statements:** a user follows statement links into Tally to sign or inspect support.
- **Organize/nudge:** an organizer learns how to help make the majority visible and coordinate nudgers.
- **Move to concrete tools:** a supporter follows Civility, Tally, Aligning, or LazyGiving links for content, signing, or funding actions.

Mobile priority: very high for thesis, bridges, statement discovery, and sharing; medium for organizer workflows.

### Conceptspace

- **Understand the primitive:** a developer or advanced user learns that Conceptspace is simple statement/implication/trust infrastructure, not a consumer destination.
- **Read integration docs:** an integrator finds developer docs for statements, implication edges, signatures, nudgers, and trust primitives.
- **Inspect substrate behavior:** an advanced user can reason about how Tally, Aligning, LazyGiving, and other sites reuse the same statement/trust graph.

Mobile priority: low to medium. The overview should be phone-readable, but developer docs and substrate inspection can be desktop-first.

## Mobile UX emphasis across the ecosystem

- Treat **read/share/sign/contribute/status** flows as mobile-critical. These are likely to happen from links in chats, social media, email, and creator posts.
- Treat **long forms, dashboards, trust/delegation setup, and developer docs** as responsive but not necessarily mobile-first.
- Every funding flow should preserve context across mobile wallet/on-ramp/login interruptions: what the user was backing, amount, pending transaction/session state, and safe retry behavior.
- Movement sites should optimize mobile landing pages for quick comprehension and one clear next action rather than exhaustive navigation.

### 1. Commonality — the movement

A movement site for internet-age coordination on public-goods funding. The broad thesis: we are bad at producing public goods, and new tech plus better mechanisms — assurance contracts, delegation, retroactive funding, implication graphs, and open ledgers — makes a better approach viable.

Commonality does not own all product workflows. It explains the movement and links to LazyGiving, Aligning, Content Funding, Civility, CSM, and Tally as concrete instances of the broader substrate.

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

### 3. Aligning — cause-based funding

The product surface for ongoing funding flows: cause boards organized around statements/causes, statement-anchored project-alignment attestations, and delegation-based cause funding.

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

CSM uses Civility for bridge-building content, Tally for statement signing and supporter counts, and Aligning/LazyGiving for funding.

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
  └── uses Aligning / LazyGiving (funding for movement projects)

Commonality (movement: internet-age coordination on public goods)
  └── links to LazyGiving, Aligning, and the verticals as concrete instances

Civility
  ├── built on Content Funding (contracts with noninflammatory criteria)
  └── links to Tally

Content Funding
  └── built on LazyGiving (content contracts are specialized assurance contracts)

LazyGiving (individual assurance contracts)
  └── built on Conceptspace (contracts can anchor against statements)

Aligning (cause boards)
  └── built on Conceptspace (cause boards/alignment attestations anchor against statements)

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
    - Some people will be glad to express opinions (on Tally) but not to do anything involving money (on LazyGiving or Aligning).
    - Some people will be glad to run a particular project (on LazyGiving) but not care about expressing opinions (on Tally) or supporting a movement (on Aligning).

Anyway, I think it makes sense, but it does feel like a lot.
