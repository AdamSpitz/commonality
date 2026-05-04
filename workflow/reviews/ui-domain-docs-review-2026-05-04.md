# UI domain docs review — May 4, 2026

Review of the six-site shape after the UI-domain reshuffle: Commonality, Tally, Content Funding, Noninflammatory Content, Common Sense Majority, and Conceptspace.

Sources reviewed: `specs/product/ui-domains.md`, public docs under `docs/`, and domain landing/about copy under `ui/src/domains/`.

## Status: mostly done

Most fixes were addressed in a follow-up pass. Remaining open items are listed below.

## Executive summary

The reshuffled domain model is coherent, and the best copy is genuinely compelling: the Commonality docs explain why better public-goods funding matters; Tally has a clear petition/poll hook; the noninflammatory-content and CSM walkthroughs have emotional force.

The main remaining problems are **discoverability** and **audience fit**. The strongest explanations are often in Markdown docs not exposed by the relevant site, while some site-level pages still read like implementation notes. New users will mostly understand Commonality and Tally; they will likely struggle with Content Funding, Noninflammatory Content, and CSM unless they find the right walkthroughs.

## Remaining work

### 1. Refocus copy on user payoff, not architecture

Site copy often foregrounds the dependency model before explaining the user's payoff. Phrases like "this surface reuses the shared content-funding machinery" or "this domain is the movement layer in the multiple-domain UI plan" are useful for developers, not for donors, creators, or politically homeless newcomers.

**Action:** Keep the "built on X" line, but move it below a user-centered explanation: "What can I do here?" / "Why should I care?" / "Where do I go next?" This applies to Content Funding, Noninflammatory Content, and CSM landing/about pages.

### 2. Each domain needs a consistent docs/about page

Commonality, Tally, and Conceptspace have `/docs` routes. Content Funding, Noninflammatory Content, and CSM do not. For those sites, the relevant explanations exist partly as Commonality docs, partly as UI about pages, and partly as deeper Markdown docs not bundled into the docs UI.

**Action:** Each product site should have a short domain-specific overview page. Minimum template:

1. One-sentence promise.
2. Who this is for.
3. What you can do here.
4. How money/signatures/attestations flow.
5. How this site relates to the other sites.
6. A concrete walkthrough.

This is done for Content Funding. Still needed: Noninflammatory Content and CSM.

### 3. Put walkthroughs on the newcomer path

Walkthroughs do a much better job than landing pages at making products feel real:

- `docs/use-case-walkthroughs/noninflammatory-content.md` gives a vivid donor/creator/reader story.
- `docs/use-case-walkthroughs/common-sense-majority.md` has the best emotional explanation of indirect support counts.
- `docs/use-case-walkthroughs/block-party.md` and `defunding.md` likely help Commonality feel concrete.

**Action:** Every landing/about page should link one primary walkthrough above the fold. New users should see an example before they see a taxonomy.

### 4. Links to `/specs/` and `/sdk/` may be broken in the deployed app

Conceptspace docs link directly to `/specs/...`, `/sdk/...`, and `/hardhat/...`. These are likely not readable pages unless separately served.

**Action:** Verify these links work in the deployed app, or serve those pages.

### 5. Stale links in Commonality docs

- `docs/index.md` links to `docs/vision-and-strategy/README.md`, but `ui/src/docs/DocsPage.tsx` excludes `docs/vision-and-strategy/`. The main "Vision and strategy" link may render as "Page not found."
- **Action:** Bundle `docs/vision-and-strategy/` into the docs UI, or remove the link from `docs/index.md`.

## Site-by-site notes

### Commonality

**What works:** The "What can I do here?" section is useful and role-oriented. The trust section is practical and addresses obvious objections.

**Remaining work:**
- The page is still dense: assurance contracts, delegation, retroactive funding, funding portals, implication graph, trust networks, content funding, Conceptspace all appear. Consider a "Choose your path" block (donor, project creator, delegate, scout, existing org).
- The landing page spotlight says "This is no longer..." — helpful for returning insiders but strange for a first-time visitor.
- Sibling-site links name Content Funding and CSM but don't point to obvious overview pages for those products.

### Tally

**What works:** The core hook is understandable: petitions/polls plus an implication graph. `docs/tally.md` explains fragmented support and indirect coalitions well.

**Remaining work:**
- "Your signature is public and permanent (you can revoke it)" sounds contradictory. Clarify revocation semantics.
- "AI services and verified through a trust network" arrives before the trust model is explained.
- No concrete example of one signature counting toward a broader claim. Add a tiny before/after example.

### Content Funding

**What works:** The basic promise is strong: fund articles/videos/posts you want more of.

**Remaining work:**
- Site copy leans on "contracts," "attestation-driven funding routes," and "shared content-funding flow" before explaining the simple donor/creator experience.
- Explain whether users need crypto today and what's coming later.
- Split explanation by audience: "I'm a reader/donor," "I'm a creator," "I'm a delegate."

### Noninflammatory Content

**What works:** One of the most compelling concepts in the ecosystem. The walkthrough gives a strong emotional reason to care. The site correctly says this is not bland centrism.

**Remaining work:**
- The `/about` page is thinner than the walkthrough and the product spec. Expand it to cover evaluation dimensions (steelmanning, contempt, ad hominem, tribal signaling, emotional manipulation).
- Add examples of content that passes/fails the standard.
- Make the creator CTA more concrete: "Get paid for bridge-building work" is stronger than "I'm a creator."

### Common Sense Majority

**What works:** The founder-level CSM docs are the most compelling strategic writing in the reviewed set. The "two million indirect supporters" emotional payoff is excellent. The "credible neutrality" argument is a real differentiator.

**Remaining work:**
- `docs/common-sense-majority/README.md` is stale (says "one of four branded surfaces") and does not appear to be exposed through `DocsPage`. Either update it to match the six-domain reshuffle or remove the link from `docs/index.md`.
- Promote the 30-second pitch from `docs/common-sense-majority/vision-and-strategy/elevator-pitch.md` into the public site.

### Conceptspace

**What works:** Correctly positioned as developer-facing infrastructure. Landing page correctly redirects end users to Tally. The "implications are not transitive" note is exactly the right developer warning.

**Remaining work:**
- The docs are mostly a list of internal spec links. Add a "5-minute integration sketch" with concrete SDK calls or pseudocode.
- Separate "public developer docs" from "repository/spec links."

## Priority recommendations (remaining work only)

1. Bundle `docs/vision-and-strategy/` into the docs UI or remove the broken link.
2. Update or remove the stale `docs/common-sense-majority/README.md`.
3. Verify `/specs/...` and `/sdk/...` links work in the deployed app.
4. Expand Noninflammatory Content and CSM about pages.
5. Add walkthrough links above the fold on landing pages for all domains.

## Bottom line

The six-domain reshuffle makes strategic sense. The docs mostly contain the right ideas, and some of the narrative is genuinely strong. The remaining work is packaging: each site needs to greet a cold visitor with a concrete promise, one example, and one obvious next step before exposing the architecture underneath.
