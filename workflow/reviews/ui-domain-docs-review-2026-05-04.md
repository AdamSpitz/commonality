# UI domain docs review — May 4, 2026

Review of the six-site shape after the UI-domain reshuffle: Commonality, Tally, Content Funding, Noninflammatory Content, Common Sense Majority, and Conceptspace.

Sources reviewed: `specs/product/ui-domains.md`, public docs under `docs/`, and domain landing/about copy under `ui/src/domains/`.

## Status: mostly done

Most fixes were addressed in a follow-up pass. Remaining open items are listed below.

## Fixed in first pass

- **Tally revocation wording** — `docs/tally.md` now clarifies that the historical signature is permanent but current support is revocable.
- **Walkthrough links on landing pages** — Tally, Content Funding, and CSM landing pages now link a primary walkthrough above the fold.
- **Noninflammatory Content creator CTA** — changed from vague "I'm a creator" to concrete "Get paid for bridge-building work."
- **Commonality related-domains grid** — added missing Noninflammatory Content and Common Sense Majority cards so all six domains are discoverable from the movement home page.
- **CSM about-page pitch** — expanded the 30-second pitch with the richer copy from `elevator-pitch.md`.
- **Content Funding about-page audiences** — split "Who this is for" into explicit reader/donor, creator, and delegate sections.
- **Stale-link review** — `docs/vision-and-strategy/` is already bundled in `DocsPage.tsx` and the `docs/index.md` link works. `docs/common-sense-majority/README.md` no longer contains "one of four branded surfaces" and is also bundled. These were non-issues.
- **Refocus copy on user payoff, not architecture** — First pass across Content Funding, Noninflammatory Content, and CSM landing/about/contract pages. Removed or demoted phrases like "shared content-funding base," "this surface reuses the shared content-funding machinery," "shared pubstarter infrastructure," "contract machinery is shared with Commonality," "branded surface," and "shared registry." User payoff (what you can do, why it matters, what you see) now leads; architecture notes appear lower or are gone. Tests updated to match.

## Fixed in second pass

- **Richer `/about` pages for the three content-funding domains** — Content Funding, Noninflammatory Content, and CSM `/about` pages expanded to match the standard: one-sentence promise, "Who this is for," "What you can do here," flow explanation, site relationships, and a prominent walkthrough link. See details below.
- **Content Funding: crypto onboarding clarity** — Added "Do I need crypto?" section to `/about` explaining current wallet requirement and fiat on-ramps on the roadmap.
- **Noninflammatory Content: richer examples** — Added three concrete pass/fail examples (two passing, one failing) with before/after detail to `/about`.
- **Walkthroughs on the newcomer path** — All three `/about` pages now surface their primary walkthrough prominently in a dedicated block with a button, not just a text link.
- **Residual architecture language removed** — Content Funding `/about` no longer says "specialized assurance contracts built on Commonality funding infrastructure." CSM about-page "surface" uses cleaned up.

## Remaining work (deeper)

### 4. Links to `/specs/` and `/sdk/` may be broken in the deployed app

Conceptspace docs link directly to `/specs/...`, `/sdk/...`, and `/hardhat/...`. These are likely not readable pages unless separately served.

**Action:** Verify these links work in the deployed app, or serve those pages.

### 5. Commonality landing page density and first-visitor experience

The page is still dense: assurance contracts, delegation, retroactive funding, funding portals, implication graph, trust networks, content funding, Conceptspace all appear. The spotlight says "This is no longer..." — helpful for returning insiders but strange for a first-time visitor.

**Action:** Consider a "Choose your path" block (donor, project creator, delegate, scout, existing org). Rewrite the spotlight for cold visitors.

### 6. Tally trust-model explanation

The docs mention attesters and AI services before the trust model is fully explained. A newcomer reading `docs/tally.md` hits "filtered through the attesters you choose to trust" before knowing what an attester is or why they should care.

**Action:** Add a one-paragraph trust-model primer earlier in `docs/tally.md`, or link to it before first mention of attesters.

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
- ~~"Do I need crypto?" section.~~ (Added to `/about` in second pass.)
- ~~Further de-architecture the landing-page description.~~ (Done; residual line in `/about` also removed in second pass.)

### Noninflammatory Content
- ~~De-architecture landing and about copy.~~ (First pass done.)
- ~~Richer pass/fail examples on `/about`.~~ (Three concrete examples added in second pass.)
- ~~More concrete creator CTA on `/about` (landing page is now fixed).~~ (First pass done.)

### Common Sense Majority
- ~~De-architecture landing, organizing, and about copy.~~ (First pass done.)
- Promote the emotional elevator pitch onto the landing page or into docs.
- `docs/common-sense-majority/vision-and-strategy/` remains excellent but under-exposed.

### Conceptspace
- 5-minute integration sketch with SDK pseudocode.
- Separate public developer docs from internal spec links.
- Verify `/specs/...` and `/sdk/...` links in the deployed app.

## Priority recommendations (remaining work only)

1. Add trust-model primer to `docs/tally.md`.
2. Verify `/specs/...` and `/sdk/...` links work in the deployed app.
3. Add 5-minute integration sketch to Conceptspace docs.
4. Rewrite Commonality landing-page spotlight for cold visitors.
5. Promote CSM emotional elevator pitch onto the landing page or into a `/docs` route.

## Bottom line

The six-domain reshuffle makes strategic sense. The docs mostly contain the right ideas, and some of the narrative is genuinely strong. The easy packaging fixes (walkthrough links, audience splits, related-domain grid, pitch expansion) are now done. The remaining work is richer content and structural choices: each site needs to greet a cold visitor with a concrete promise, one example, and one obvious next step before exposing the architecture underneath.
