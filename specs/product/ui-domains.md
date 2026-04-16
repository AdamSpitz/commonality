# Multiple UI Domains

Rather than presenting the whole system as one big "Commonality" website, we present several focused sites, each compelling to a different audience. When someone asks "what have you been building?", the right answer isn't the general-purpose infrastructure — it's whichever specific use case will resonate with that person.

For the technical implementation, see [specs/tech/ui-domains.md](../tech/ui-domains.md).


## The four sites

### 1. Commonality

The conceptspace site. You're looking at a page for a particular statement, with links to related statements (implication graph), who has signed it, and a link to the funding portal for projects aligned with that statement. "Commonality" is the right name for this — the whole point of the conceptspace is finding common ground.

This is also the home of the general-purpose public-goods funding infrastructure: pubstarter (crowdfunding), funding portals, delegation, and the other subsystems. But the primary thing a visitor sees is the statement/implication-graph UI.

Infrastructure-level features (delegation, mutable refs, trust graph management) live here rather than on the more focused sites.

### 2. Content Funding

A user-facing site for creating and browsing content-funding contracts. Social media content is a public good; this site lets you fund it.

This is its own domain (not just an architectural layer) because people may want to fund content with arbitrary criteria — not just "noninflammatory" but "funny," "educational," "investigative," etc. A lightweight way to experiment: just make a statement (e.g. "this is funny") and fund content that gets attested against it, without needing a whole dedicated branded site for every criterion.

Content Funding is built on Commonality's pubstarter infrastructure. Content contracts are a specialized kind of pubstarter project.

### 3. Noninflammatory Content

Built on Content Funding, focused specifically on the noninflammatory evaluation criteria: content that communicates perspectives from one side in a way that's engaging rather than alienating to the other side.

This is separate from Common Sense Majority because some people are interested in producing/funding/promoting noninflammatory content without necessarily wanting to join a political movement. But the two are closely related — almost by definition, noninflammatory content is meant to function as a statement that the other side can sign, which implies a commonality statement. Writing noninflammatory content is the *mechanism* by which [hidden majorities](./tech/subsystems/conceptspace/content-patterns/hidden-majority.md) get revealed.

**What the site contains:**
- Landing page: "Are you sick of the usual polarized bullshit? This is a site where we explicitly reward building bridges." Lean into the political angle — that's the whole point. Two CTAs: "Browse Content" | "I'm a Creator."
- Browse content by platform (Twitter, YouTube, Substack). Sort by recently funded, most funded, newest, highest attestation scores. Show all content submitted for content funding, but highlight/prioritize attested content.
- Individual content/channel pages with attestation summaries and active contracts.
- Contract creation flow, scoped to the noninflammatory framing.
- Contract viewing (not redirecting to pubstarter — links shared on this domain should resolve here with the right branding).
- Creator dashboard: verification, contracts, earnings.
- Attestation transparency: which attesters scored what, on which dimensions (steelmanning, contempt, ad hominem, tribal signaling, emotional manipulation). All three attester personas (neutral, left-leaning, right-leaning) are visible by default.
- "About" page explaining what "noninflammatory" means and how the attester model works.
- Links to Commonality for conceptspace exploration (statement pages, implication graphs). Not embedded — just linked.

**What the site does NOT contain:**
- Full conceptspace/implication-graph explorer (that's the Commonality site).
- Generic pubstarter browsing or project creation.
- Funding portals / causes (the noninflammatory site *is* essentially one focused funding portal).
- Crypto wallet management (keep crypto as invisible as possible; eventually use embedded wallets).

**"Built on Commonality"** should be fairly prominent — we want to draw attention to the general platform.

### 4. Common Sense Majority

The movement site. The [hidden majority](../tech/subsystems/conceptspace/content-patterns/hidden-majority.md) thesis is that on many polarized issues, a supermajority holds a common-sense position that's invisible because the political system is structured around two coalitions dominated by their loudest members. This site is about making those hidden majorities visible and organizing around them.

Noninflammatory Content is a major component — it's the primary mechanism for surfacing hidden-majority positions. But Common Sense Majority is broader: it also uses Commonality's funding infrastructure for the movement's own projects (organizing, advocacy, etc.), not just content funding.

Separate from Noninflammatory Content because it's "a movement" rather than "a tool for a specific kind of content."


## How the sites relate

```
Common Sense Majority
  ├── uses Noninflammatory Content (as its primary content component)
  └── uses Commonality (for funding movement projects)

Noninflammatory Content
  ├── built on Content Funding (content contracts with noninflammatory criteria)
  └── links to Commonality (for conceptspace exploration)

Content Funding
  └── built on Commonality (content contracts are specialized pubstarter projects)

Commonality
  └── the foundation: conceptspace, pubstarter, funding portals, delegation, trust
```
