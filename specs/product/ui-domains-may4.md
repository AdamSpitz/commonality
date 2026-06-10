# Multiple UI Domains

> Historical snapshot (May 4, 2026). This file is kept for context on an earlier six-domain reshuffle. The current product-domain source of truth is [ui-domains.md](./ui-domains.md), and the current technical/build source of truth is [specs/tech/ui-domains.md](../tech/ui-domains.md).

Rather than presenting the whole system as one big website, we present several focused sites, each compelling to a different audience. When someone asks "what have you been building?", the right answer isn't the general-purpose infrastructure — it's whichever specific use case will resonate with that person.

For the technical implementation, see [specs/tech/ui-domains.md](../tech/ui-domains.md).

## Status (May 4, 2026): reorganization complete

The six-domain shape described below was the implemented shape on May 4. It is no longer current. The "What's changing from the old shape" section below is historical context for understanding why things changed.

## New shape

Six surfaces in total: four product sites and two developer/infrastructure-facing sites (Conceptspace and Commonality carry the docs). No separate docs domain. No ecosystem-wide product umbrella — instead, **Commonality** is itself a *movement* site (peer to CSM), with the funding infrastructure as its concrete instrument.

### 1. Commonality — movement + funding infrastructure

A movement site for **internet-age coordination / better public-goods funding**. This is a movement distinct from CSM: it's not about the quiet-middle thesis, it's about the broader claim that we're remarkably bad at producing public goods and that new tech (assurance contracts, delegation, blockchains, AI) makes a much better approach viable. The `docs/end-user/commonality/vision-and-strategy/` narrative and `pitches.md` live here.

Commonality is *also* the home of the public-goods funding infrastructure itself: assurance contracts (lazyGiving), delegation, cause boards, retroactive funding, scouts. The movement and the tools share a brand because the tools *are* what the movement is for. "Working together toward common goals" fits both meanings.

Audience: donors, delegates, scouts, project creators, existing orgs, plus people drawn to the broader thesis.

### 2. Tally — statement-signing / polling

The user-facing site for signing statements and seeing who else has signed (directly *and* indirectly via the implication graph). Think "petitions / polls, but with an implication graph that reveals indirect support, plus attester transparency."

This is a standalone consumer product because petitions and polls are a recognizable category that can attract people who'd never touch the funding side. The implication-graph differentiator ("we're tallying up everyone who's signed any of these 17 related statements") is the hook.

Built on top of Conceptspace infrastructure.

### 3. Content Funding

A user-facing site for creating and browsing content-funding contracts. Social media content is a public good; this site lets you fund it.

This is its own domain (not just an architectural layer) because people may want to fund content with arbitrary criteria — not just "noninflammatory" but "funny," "educational," "investigative," etc. A lightweight way to experiment: just make a statement (e.g. "this is funny") and fund content that gets attested against it, without needing a whole dedicated branded site for every criterion.

Built on Commonality's funding infrastructure. Content contracts are a specialized kind of assurance contract.

### 4. Noninflammatory Content

Built on Content Funding, focused specifically on the noninflammatory evaluation criteria: content that communicates perspectives from one side in a way that's engaging rather than alienating to the other side.

Separate from CSM because some people are interested in producing/funding/promoting noninflammatory content without necessarily wanting to join a political movement. But the two are closely related — almost by definition, noninflammatory content is meant to function as a statement that the other side can sign, which implies a commonality statement. Writing noninflammatory content is the *mechanism* by which [hidden majorities](/docs/end-user/common-sense-majority/hidden-majority-patterns.md) get revealed.

**What the site contains:**
- Landing page: "Are you sick of the usual polarized bullshit? This is a site where we explicitly reward building bridges." Lean into the political angle — that's the whole point. Two CTAs: "Browse Content" | "I'm a Creator."
- Browse content by platform (Twitter, YouTube, Substack). Sort by recently funded, most funded, newest, highest attestation scores. Show all content submitted for content funding, but highlight/prioritize attested content.
- Individual content/channel pages with attestation summaries and active contracts.
- Contract creation flow, scoped to the noninflammatory framing.
- Contract viewing (not redirecting elsewhere — links shared on this domain should resolve here with the right branding).
- Creator dashboard: verification, contracts, earnings.
- Attestation transparency: which attesters scored what, on which dimensions (steelmanning, contempt, ad hominem, tribal signaling, emotional manipulation). All three attester personas (neutral, left-leaning, right-leaning) are visible by default.
- "About" page explaining what "noninflammatory" means and how the attester model works.
- Links to Tally for statement exploration / signing. Not embedded — just linked.

**What the site does NOT contain:**
- Full implication-graph explorer or general statement-signing UI (that's Tally).
- Generic assurance-contract browsing or project creation (that's Commonality).
- Cause boards / causes (the noninflammatory site *is* essentially one focused cause board).
- Crypto wallet management (keep crypto as invisible as possible; eventually use embedded wallets).

### 5. Common Sense Majority (CSM)

The CSM movement site. The [hidden majority](/docs/end-user/common-sense-majority/hidden-majority-patterns.md) thesis is that on many polarized issues, a supermajority holds a common-sense position that's invisible because the political system is structured around two coalitions dominated by their loudest members. This site is about making those hidden majorities visible and organizing around them.

Noninflammatory Content is a major component — it's the primary mechanism for surfacing hidden-majority positions. CSM also uses Commonality's funding infrastructure for the movement's own projects (organizing, advocacy, etc.), and uses Tally for movement-aligned statement signing.

Separate from Noninflammatory Content because it's "a movement" rather than "a tool for a specific kind of content." Distinct from Commonality-the-movement because CSM is specifically about the quiet-middle political thesis, not about public-goods funding writ large.

### 6. Conceptspace — infrastructure (mostly developer-facing)

Statements, implication graphs, signing primitives, nudgers, trust/attester graph. Mostly underlying infrastructure that other sites read from. May have a thin developer-facing site (API docs, schema, etc.) but is *not* a consumer destination — the user-facing slice of conceptspace functionality has moved to Tally.

Cross-site identity / account / delegations live here too, since signatures and trust-graph data already sit at this layer.

### How the sites relate

```
Common Sense Majority (movement: quiet middle)
  ├── uses Noninflammatory Content (primary content component)
  ├── uses Tally (movement-aligned statement signing)
  └── uses Commonality (funding for movement projects)

Commonality (movement: internet-age coordination + funding tools)
  └── built on Conceptspace (statements anchor what funding is "aligned with")

Noninflammatory Content
  ├── built on Content Funding (contracts with noninflammatory criteria)
  └── links to Tally

Content Funding
  └── built on Commonality (content contracts are specialized assurance contracts)

Tally (signing / polling)
  └── built on Conceptspace

Conceptspace (infrastructure, mostly dev-facing)
  └── the substrate: statements, implication graph, signing, trust, attesters
```

## What's changing from the old shape

The old shape had **four sites**: Commonality, Content Funding, Noninflammatory Content, CSM. "Commonality" was a single site doing two jobs: hosting the conceptspace/statement/implication-graph UI *and* hosting the public-goods funding infrastructure (lazyGiving, portals, delegation). It was framed as "the foundation."

The reorganization:

1. **Commonality is now a movement + funding-tools site, not a foundation site.** Same name, different framing. It's a peer to CSM (a different movement, about internet-age coordination broadly rather than the quiet-middle thesis specifically). The public-goods funding infrastructure stays here as the movement's concrete instrument.

2. **Conceptspace is split out as its own thing — but mostly as infrastructure, not as a consumer site.** What used to be "the conceptspace UI on Commonality" is gone from Commonality. Conceptspace still exists as a name for the underlying layer (statements, implication graph, signing primitives, trust graph, nudgers) and may have a thin developer-facing site, but it is no longer where end users go to interact with statements.

3. **Tally is a new consumer site that takes over the user-facing statement-signing experience.** Anything in the old Commonality UI that was about a user signing statements, viewing who has signed (direct + indirect via implication graph), or browsing/creating statements as a polling/petition mechanism — that all moves to Tally. Tally is positioned as "petitions/polls with an implication graph and attester transparency," targeting an audience (people who like petitions and polls) that wouldn't necessarily come in via the funding angle.

4. **No ecosystem-wide product umbrella.** Earlier drafts considered whether something should sit *above* all sites. Decided no: each site stands on its own (per the `pitches.md` philosophy). The vision/strategy narrative lives on the Commonality movement site rather than on a separate umbrella.

5. **Downstream sites' "built on" lines need updating.** Old: everything was "built on Commonality." New: be specific — "built on Commonality" (funding infra), "built on Conceptspace" (statement/graph infra), "built on Tally" (signing UI), "built on Content Funding" (content contracts). See the dependency diagram above.

6. **Cross-site identity / account / delegations** live on Conceptspace (the infra layer), not on Commonality. Other sites read from there.

### Renaming summary

| Old | New |
|---|---|
| Commonality (foundation site doing both conceptspace UI and funding infra) | **Commonality** (movement site + funding infra only) |
| — (no separate site for user-facing statement signing) | **Tally** (new consumer site) |
| Conceptspace (described as the user-facing statement/graph site within Commonality) | **Conceptspace** (infrastructure layer, mostly dev-facing; not a consumer destination) |
| Content Funding | unchanged |
| Noninflammatory Content | unchanged |
| Common Sense Majority | unchanged |
