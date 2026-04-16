# Multiple UI domains

Rather than presenting the whole system as one big "Commonality" website, we present several focused sites, each compelling to a different audience. They share the same codebase (sdk, dependencies, lower-level UI primitives) but build separate artifacts with different branding, landing pages, and routes.

This fits the existing UI direction in [ui/README.md](/ui/README.md), which already treats the frontend as several logical apps rather than one undifferentiated surface.

When someone asks "what have you been building?", the right answer isn't the general-purpose infrastructure — it's whichever specific use case will resonate with that person.


## The domains

There are four user-facing domains, each building on the ones below it:

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

This is separate from Common Sense Majority because some people are interested in producing/funding/promoting noninflammatory content without necessarily wanting to join a political movement. But the two are closely related — almost by definition, noninflammatory content is meant to function as a statement that the other side can sign, which implies a commonality statement. Writing noninflammatory content is the *mechanism* by which [hidden majorities](./subsystems/conceptspace/content-patterns/hidden-majority.md) get revealed.

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

The movement site. The [hidden majority](./subsystems/conceptspace/content-patterns/hidden-majority.md) thesis is that on many polarized issues, a supermajority holds a common-sense position that's invisible because the political system is structured around two coalitions dominated by their loudest members. This site is about making those hidden majorities visible and organizing around them.

Noninflammatory Content is a major component — it's the primary mechanism for surfacing hidden-majority positions. But Common Sense Majority is broader: it also uses Commonality's funding infrastructure for the movement's own projects (organizing, advocacy, etc.), not just content funding.

Separate from Noninflammatory Content because it's "a movement" rather than "a tool for a specific kind of content."


## Architecture

All four sites build from the same codebase. Different branding, different landing pages, different route sets, but shared:
- SDK code and blockchain interactions
- UI component library and design primitives
- Authentication and wallet infrastructure
- Attestation display components

Each site is a separate build artifact that includes only the routes and features relevant to it.


## How the sites relate to each other

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


## Reorganization Plan

### Guiding Principles

- Keep the current feature modules intact as long as possible; the first step is routing and composition, not a rewrite of `src/conceptspace`, `src/pubstarter`, `src/delegation`, `src/fundingportal`, or `src/content-funding`.
- Treat each domain as a manifest: branding, shell chrome, landing page, canonical routes, and feature inclusion live together.
- Make build separation a packaging detail that consumes those manifests, not the place where the domain model is defined.
- Prefer reuse over duplication, especially for content-funding and attestation UI.

### Current State

The UI already has the right rough shape for this plan:
- `src/conceptspace`
- `src/pubstarter`
- `src/delegation`
- `src/fundingportal`
- `src/content-funding`
- `src/shared`

There is already a single router and shell in `ui/src/App.tsx`, and IPFS-specific routing behavior in `ui/vite.config.ts`. That makes this a refactor of composition and packaging, not a new frontend architecture.

### Domain Matrix

| Domain | Reuses | Adds |
|--------|--------|------|
| Commonality | conceptspace, pubstarter, fundingportal, delegation, mutablerefs, docs | Domain landing page, domain shell, cross-links between subsystems |
| Content Funding | content-funding, shared shell/branding/routing | Dedicated landing page, canonical content-funding route set |
| Noninflammatory Content | content-funding plus new attestation-centric views | Noninflammatory landing page, browse/discover flows, creator dashboard, attestation transparency, about page |
| Common Sense Majority | Commonality plus Noninflammatory | Movement landing page, organizing-oriented surfaces, hidden-majority framing |

### Phases

#### Phase 1: Introduce domain manifests and route composition

1. Define a domain manifest for each site that captures:
   - brand name, tagline, and visual tokens
   - shell/nav/footer configuration
   - canonical base path
   - included feature modules
   - route table for that domain

2. Refactor `ui/src/App.tsx` so it composes the active domain from the manifest instead of hardcoding one global route table.

3. Keep the current shared modules and feature folders where they are; expose them through manifest-level composition before moving files around.

#### Phase 2: Split landing pages from feature modules

1. Add domain landing pages under `ui/src/domains/`:
   - `commonality`
   - `content-funding`
   - `noninflammatory`
   - `movement`

2. Let each landing page emphasize the right entry points for that domain while reusing existing feature modules instead of copying them.

3. Make the Commonality landing page the default home for the full platform, with clear links into the more focused domains.

#### Phase 3: Specialize content-funding into two branded surfaces

1. Keep the underlying `content-funding` implementation as the shared base.

2. Add a Content Funding domain surface that is mostly a branded wrapper around the existing browse/create/channel/dashboard flow.

3. Layer Noninflammatory Content on top of that base with attestation-focused views, sharper CTA copy, and a domain-specific contract/viewing experience.

4. Make links shared on the Noninflammatory site resolve back to the Noninflammatory brand rather than redirecting users into a generic pubstarter flow.

#### Phase 4: Add Common Sense Majority on top of the Noninflammatory foundation

1. Build the movement landing page and basic organizing surfaces.

2. Reuse Noninflammatory Content as the primary content mechanism and Commonality as the funding/infrastructure layer.

3. Keep this domain intentionally narrower than Commonality and broader than a single content tool.

#### Phase 5: Package separate builds from the manifests

1. Parameterize Vite build output by domain instead of creating one-off config files per site.

2. Emit one artifact per domain, but keep shared implementation in the same codebase.

3. Preserve IPFS/hash-routing support as a build-mode concern that works consistently across domains.

### Recommended Directory Shape

```
ui/src/
├── shared/                    # Shared SDK, components, hooks, routing, branding helpers
├── conceptspace/              # Commonality feature module
├── pubstarter/                # Commonality feature module
├── delegation/                # Commonality feature module
├── fundingportal/            # Commonality feature module
├── content-funding/          # Shared content-funding base
├── domains/                  # Per-domain manifests, landing pages, route composition
│   ├── commonality/
│   ├── content-funding/
│   ├── noninflammatory/
│   └── movement/
└── main.tsx                   # Selects the active domain build
```

### Build Outputs

```
dist/
├── commonality/
├── content-funding/
├── noninflammatory/
└── movement/
```

### What Not To Do

- Do not split the app into four unrelated routers before the manifests exist.
- Do not duplicate `content-funding` into separate “content” and “noninflammatory” implementations unless reuse proves impossible.
- Do not make separate Vite config files the source of domain truth.
- Do not move infrastructure-only features out of Commonality unless a domain boundary truly requires it.

### Priority

1. Domain manifests and router composition
2. Domain landing pages
3. Content Funding and Noninflammatory specialization
4. Separate build outputs
5. Common Sense Majority surfaces
