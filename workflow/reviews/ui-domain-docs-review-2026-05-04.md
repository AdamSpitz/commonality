# UI domain docs review — May 4, 2026

Review of the six-site shape after the UI-domain reshuffle: Commonality, Tally, Content Funding, Noninflammatory Content, Common Sense Majority, and Conceptspace.

Sources reviewed: `specs/product/ui-domains.md`, public docs under `docs/`, and domain landing/about copy under `ui/src/domains/`.

## Status: mostly done

Most fixes were addressed in a follow-up pass. Remaining open items are listed below.

## Fixed in this pass

- **Tally revocation wording** — `docs/tally.md` now clarifies that the historical signature is permanent but current support is revocable.
- **Walkthrough links on landing pages** — Tally, Content Funding, and CSM landing pages now link a primary walkthrough above the fold.
- **Noninflammatory Content creator CTA** — changed from vague "I'm a creator" to concrete "Get paid for bridge-building work."
- **Commonality related-domains grid** — added missing Noninflammatory Content and Common Sense Majority cards so all six domains are discoverable from the movement home page.
- **CSM about-page pitch** — expanded the 30-second pitch with the richer copy from `elevator-pitch.md`.
- **Content Funding about-page audiences** — split "Who this is for" into explicit reader/donor, creator, and delegate sections.
- **Stale-link review** — `docs/vision-and-strategy/` is already bundled in `DocsPage.tsx` and the `docs/index.md` link works. `docs/common-sense-majority/README.md` no longer contains "one of four branded surfaces" and is also bundled. These were non-issues.

## Remaining work (deeper)

### 1. Refocus copy on user payoff, not architecture

Site copy still foregrounds the dependency model before explaining the user's payoff in places. Phrases like "this surface reuses the shared content-funding machinery" or "this domain is the movement layer in the multiple-domain UI plan" are useful for developers, not for donors, creators, or politically homeless newcomers.

**Action:** Keep the "built on X" line, but move it below a user-centered explanation: "What can I do here?" / "Why should I care?" / "Where do I go next?" This applies to Content Funding, Noninflammatory Content, and CSM landing/about pages.

### 2. Each domain needs a richer docs/about page

Commonality, Tally, and Conceptspace have `/docs` routes. Content Funding, Noninflammatory Content, and CSM have `/about` pages, but they are thinner than the deeper Markdown walkthroughs that do the best explanatory work.

**Action:** Expand the existing `/about` pages so they match the Content Funding standard:
1. One-sentence promise.
2. Who this is for.
3. What you can do here.
4. How money/signatures/attestations flow.
5. How this site relates to the other sites.
6. A concrete walkthrough.

### 3. Put walkthroughs on the newcomer path (deeper finish)

Walkthroughs do a much better job than landing pages at making products feel real. Landing pages now link them, but the about pages and docs routes should also surface them prominently.

**Action:** Every `/about` page should embed or prominently link its primary walkthrough. New users should see an example before they see a taxonomy.

### 4. Links to `/specs/` and `/sdk/` may be broken in the deployed app

Conceptspace docs link directly to `/specs/...`, `/sdk/...`, and `/hardhat/...`. These are likely not readable pages unless separately served.

**Action:** Verify these links work in the deployed app, or serve those pages.

### 5. Commonality landing page density and first-visitor experience

The page is still dense: assurance contracts, delegation, retroactive funding, funding portals, implication graph, trust networks, content funding, Conceptspace all appear. The spotlight says "This is no longer..." — helpful for returning insiders but strange for a first-time visitor.

**Action:** Consider a "Choose your path" block (donor, project creator, delegate, scout, existing org). Rewrite the spotlight for cold visitors.

### 6. Tally trust-model explanation

The docs mention attesters and AI services before the trust model is fully explained. A newcomer reading `docs/tally.md` hits "filtered through the attesters you choose to trust" before knowing what an attester is or why they should care.

**Action:** Add a one-paragraph trust-model primer earlier in `docs/tally.md`, or link to it before first mention of attesters.

### 7. Content Funding: crypto onboarding clarity

Site copy does not explain whether users need crypto today and what's coming later (credit cards, fiat on-ramps, tax receipts).

**Action:** Add a short "Do I need crypto?" section to the Content Funding `/about` page. This is a product decision as much as a copy decision.

### 8. Noninflammatory Content about page: richer examples

The `/about` page covers evaluation dimensions and one pass/fail example, but the walkthrough and product spec are still stronger.

**Action:** Add more examples of content that passes/fails the standard. Expand the evaluation-dimensions section with concrete before/after snippets.

### 9. CSM: elevate the elevator pitch further

The 30-second pitch is now on the `/about` page, but it could also appear on the landing page or in the docs index. The founder-level strategic writing in `docs/common-sense-majority/vision-and-strategy/` is the most compelling material in the reviewed set and remains buried.

**Action:** Promote the emotional payoff paragraph ("Imagine you've been feeling politically homeless... two million people independently wrote what they believed") onto the CSM landing page or into a `/docs` route.

### 10. Conceptspace developer docs

The docs are mostly a list of internal spec links. There is no "5-minute integration sketch" with concrete SDK calls or pseudocode.

**Action:** Add a short integration sketch to `docs/conceptspace.md`. Separate "public developer docs" from "repository/spec links" — the latter should be clearly labeled as reference material for maintainers, not integration docs for new developers.

## Site-by-site notes (remaining work only)

### Commonality
- Landing page density and "Choose your path" block.
- Spotlight text rewrite for cold visitors.

### Tally
- Trust-model primer before first mention of attesters.
- Concrete before/after example of one signature counting toward a broader claim (the docs have a tiny one; the landing page has none).

### Content Funding
- "Do I need crypto?" section.
- Further de-architecture the landing-page description.

### Noninflammatory Content
- Richer pass/fail examples on `/about`.
- More concrete creator CTA on `/about` (landing page is now fixed).

### Common Sense Majority
- Promote the emotional elevator pitch onto the landing page or into docs.
- `docs/common-sense-majority/vision-and-strategy/` remains excellent but under-exposed.

### Conceptspace
- 5-minute integration sketch with SDK pseudocode.
- Separate public developer docs from internal spec links.
- Verify `/specs/...` and `/sdk/...` links in the deployed app.

## Priority recommendations (remaining work only)

1. Add "Do I need crypto?" to Content Funding `/about`.
2. Add trust-model primer to `docs/tally.md`.
3. Verify `/specs/...` and `/sdk/...` links work in the deployed app.
4. Expand Noninflammatory Content and CSM `/about` pages with richer examples.
5. Add 5-minute integration sketch to Conceptspace docs.
6. Rewrite Commonality landing-page spotlight for cold visitors.

## Bottom line

The six-domain reshuffle makes strategic sense. The docs mostly contain the right ideas, and some of the narrative is genuinely strong. The easy packaging fixes (walkthrough links, audience splits, related-domain grid, pitch expansion) are now done. The remaining work is richer content and structural choices: each site needs to greet a cold visitor with a concrete promise, one example, and one obvious next step before exposing the architecture underneath.
