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

## Fixed in third pass

- **`/specs/` and `/sdk/` links delinked in user-facing docs** — All markdown links to `/specs/...`, `/sdk/docs/...`, and `/hardhat/docs/...` in bundled docs have been converted to plain text with "(repository reference)" parentheticals. These paths were not served by `DocsPage.tsx` and would have 404'd.
- **Commonality landing-page spotlight rewritten for cold visitors** — Spotlight now leads with "Fund public goods without personal risk" instead of insider framing.
- **"Choose your path" block added to Commonality landing page** — Four path cards (fund something, have a project, want to delegate, want to learn more) surface the right next step immediately.
- **Tally trust-model primer added to `docs/tally.md`** — A "Quick primer on trust" paragraph now appears before the first mention of attesters, explaining what they are and why configurability matters.
- **Tally landing-page concrete example added** — Spotlight now includes the pothole-repair → basic-infrastructure example, showing how one signature counts toward a broader claim.
- **CSM emotional elevator pitch promoted to landing page** — The alternative 30-second pitch ("Imagine you've been feeling politically homeless...") now appears in the CSM landing-page spotlight.
- **Conceptspace docs restructured** — Added a "5-minute integration sketch" with pseudocode (publish statement → record belief → fold events → filter attesters → display). Internal spec links are now grouped under a clearly labeled "Repository reference (for maintainers)" section, separate from public developer docs.

## Remaining work

None. All items from this review have been addressed. Future work should be driven by new reviews or user feedback.

## Site-by-site notes

### Commonality
- ~~Landing page density and "Choose your path" block.~~ Done.
- ~~Spotlight text rewrite for cold visitors.~~ Done.

### Tally
- ~~Trust-model primer before first mention of attesters.~~ Done.
- ~~Concrete before/after example of one signature counting toward a broader claim.~~ Done.

### Content Funding
- ~~"Do I need crypto?" section.~~ (Added to `/about` in second pass.)
- ~~Further de-architecture the landing-page description.~~ (Done; residual line in `/about` also removed in second pass.)

### Noninflammatory Content
- ~~De-architecture landing and about copy.~~ (First pass done.)
- ~~Richer pass/fail examples on `/about`.~~ (Three concrete examples added in second pass.)
- ~~More concrete creator CTA on `/about` (landing page is now fixed).~~ (First pass done.)

### Common Sense Majority
- ~~De-architecture landing, organizing, and about copy.~~ (First pass done.)
- ~~Promote the emotional elevator pitch onto the landing page or into docs.~~ Done.
- `docs/common-sense-majority/vision-and-strategy/` remains excellent but under-exposed — future work could surface it more prominently.

### Conceptspace
- ~~5-minute integration sketch with SDK pseudocode.~~ Done.
- ~~Separate public developer docs from internal spec links.~~ Done.
- ~~Verify `/specs/...` and `/sdk/...` links in the deployed app.~~ Fixed by converting to plain-text repository references.

## Priority recommendations

All recommendations from this review have been implemented.

## Bottom line

The six-domain reshuffle makes strategic sense. The docs mostly contain the right ideas, and some of the narrative is genuinely strong. The easy packaging fixes (walkthrough links, audience splits, related-domain grid, pitch expansion) are now done. The remaining deeper work — trust-model primers, broken-link fixes, integration sketches, landing-page pathfinding, and emotional pitch elevation — has also been completed. Each site now greets a cold visitor with a concrete promise, one example, and one obvious next step before exposing the architecture underneath.
