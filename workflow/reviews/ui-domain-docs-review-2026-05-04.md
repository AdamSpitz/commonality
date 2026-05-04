# UI domain docs review — May 4, 2026

Review of the six-site shape after the UI-domain reshuffle: Commonality, Tally, Content Funding, Noninflammatory Content, Common Sense Majority, and Conceptspace.

Sources reviewed included `specs/product/ui-domains.md`, the public docs under `docs/`, and the domain landing/about copy under `ui/src/domains/`.

## Executive summary

The reshuffled domain model is coherent, and the best copy is genuinely compelling: the Commonality docs explain why better public-goods funding matters; Tally has a clear petition/poll hook; the noninflammatory-content and CSM walkthroughs have emotional force.

The main problem is discoverability and audience fit. The strongest explanations are often in Markdown docs that are not exposed by the relevant site, while several site-level pages still read like implementation notes for people who already know the reshuffle. New users will mostly understand Commonality and Tally; they will likely struggle to understand Content Funding, Noninflammatory Content, and CSM unless they happen to find the right walkthroughs.

## Cross-site observations

### 1. The dependency model is clear, but too visible to end users

The new relationships are internally clear:

- Tally is built on Conceptspace.
- Content Funding is built on Commonality funding infrastructure.
- Noninflammatory Content is built on Content Funding and links to Tally.
- CSM uses Noninflammatory Content, Tally, and Commonality.
- Conceptspace is infrastructure.

But site copy often foregrounds this architecture before explaining the user's payoff. Phrases like “this surface reuses the shared content-funding machinery” or “this domain is the movement layer in the multiple-domain UI plan” are useful for developers, not for donors, creators, or politically homeless newcomers.

Suggestion: keep the “built on X” line, but move it below a user-centered explanation: “What can I do here?” / “Why should I care?” / “Where do I go next?”

### 2. Docs exposure does not match the six-domain plan

Commonality, Tally, and Conceptspace have `/docs` routes. Content Funding, Noninflammatory Content, and CSM do not. For those sites, the relevant explanations exist partly as Commonality docs, partly as UI about pages, and partly as deeper CSM Markdown docs that are not bundled into the docs UI.

This is especially noticeable because the spec says Commonality and Conceptspace carry the docs, but users arriving on Content Funding / Noninflammatory / CSM still need a domain-specific “what is this?” page.

Suggestion: each product site should have a short domain-specific docs/about page, even if deeper docs live on Commonality. Minimum template:

1. One-sentence promise.
2. Who this is for.
3. What you can do here.
4. How money/signatures/attestations flow.
5. How this site relates to the other sites.
6. A concrete walkthrough.

### 3. Several links/docs still reflect the old or internal shape

Concrete issues found:

- `docs/index.md` links to `docs/vision-and-strategy/README.md`, but `ui/src/docs/DocsPage.tsx` intentionally excludes `docs/vision-and-strategy/`, so the main Commonality “Vision and strategy” link may render as “Page not found” in the app. The product spec says the vision/strategy narrative lives on Commonality, so this should probably be included.
- `docs/common-sense-majority/README.md` says CSM is “one of four branded surfaces” and depends on Commonality for “funding/conceptspace infrastructure”; that is stale after the six-domain reshuffle.
- `docs/vision-and-strategy/README.md` has a malformed link: `/docs/use-case-walkthroughs/defunding.mdwalkthrough.md`.
- `docs/tally.md` links to `https://commonality.example`, which looks like a placeholder.
- Conceptspace docs link directly to `/specs/...`, `/sdk/...`, and `/hardhat/...`. That may be fine for a repository browser, but in the React docs UI those are likely not readable pages unless separately served.

### 4. The strongest storytelling is in walkthroughs, not landing/about pages

The walkthroughs do a much better job than most landing pages at making the products feel real. In particular:

- `docs/use-case-walkthroughs/noninflammatory-content.md` gives a vivid donor/creator/reader story.
- `docs/use-case-walkthroughs/common-sense-majority.md` has the best emotional explanation of indirect support counts.
- `docs/use-case-walkthroughs/block-party.md` and `defunding.md` likely help Commonality feel concrete.

Suggestion: every landing/about page should link one primary walkthrough above the fold. New users should see an example before they see a taxonomy.

## Site-by-site notes

## Commonality

What works:

- `docs/index.md` now clearly frames Commonality as a movement plus public-goods funding tools, not as the old all-purpose foundation site.
- The “What can I do here?” section is useful and role-oriented.
- The trust section is practical and addresses obvious objections.

What may confuse new users:

- The page still has a lot of concepts at once: assurance contracts, delegation, retroactive funding, funding portals, implication graph, trust networks, content funding, Conceptspace. It is coherent, but dense.
- Sibling-site links name Content Funding and CSM but do not point to obvious overview pages for those products.
- The landing page spotlight says “This is no longer...” which is helpful for returning insiders but strange for a first-time visitor.

Suggestions:

- Replace “no longer the ecosystem-wide foundation site...” on the public landing page with first-time-user copy; keep the historical note in internal docs or specs.
- Add a “Choose your path” block: donor, project creator, delegate, scout, existing org.
- Make one concrete walkthrough the first or second thing a newcomer sees.

## Tally

What works:

- The core hook is understandable: petitions/polls plus an implication graph.
- `docs/tally.md` explains fragmented support and indirect coalitions well.
- The page correctly redirects end users away from Conceptspace-level mechanics.

What may confuse new users:

- “Your signature is public and permanent (you can revoke it)” sounds contradictory. It probably means the historical record is permanent but current support can be revoked.
- “AI services and verified through a trust network” arrives before the trust model is explained and may sound hand-wavy.
- The getting-started links are action-oriented, but there is no concrete example of one signature counting toward a broader claim.

Suggestions:

- Add a tiny before/after example: “I sign ‘fix potholes on Maple Street’; it also counts toward ‘the city should maintain basic infrastructure’ because trusted attesters say the first implies the second.”
- Clarify revocation semantics.
- Replace the placeholder Commonality URL.

## Content Funding

What works:

- The basic promise is strong: fund articles/videos/posts you want more of.
- `docs/key-ideas/content-funding.md` and `docs/roles/get-your-content-funded.md` explain creator value reasonably well.

What may confuse new users:

- There is no obvious `/docs` or `/about` page on the Content Funding domain.
- The site copy leans on terms like “contracts,” “attestation-driven funding routes,” and “shared content-funding flow” before explaining the simple donor/creator experience.
- The creator claim/escrow model is important but not surfaced as a plain-language trust story.

Suggestions:

- Add a Content Funding overview page and link it from the landing page.
- Split the explanation by audience: “I’m a reader/donor,” “I’m a creator,” “I’m a delegate.”
- Include a concrete example: “I liked this YouTube essay; I fund it; the channel owner verifies; escrow pays out.”
- Explain whether users need crypto today and what is coming later.

## Noninflammatory Content

What works:

- This is one of the most compelling concepts in the ecosystem.
- The walkthrough gives a strong emotional reason to care: people want political content that informs without contempt.
- The site copy correctly says this is not bland centrism.

What may confuse new users:

- The domain landing page is decent, but the `/about` page is much thinner than the walkthrough and the product spec.
- The spec promises attestation transparency across dimensions like steelmanning, contempt, ad hominem, tribal signaling, and emotional manipulation; the current about copy only gestures at this.
- “Noninflammatory” is accurate but slightly clinical. The surrounding copy needs to keep translating it into “strong arguments without making the other side feel despised.”

Suggestions:

- Link the noninflammatory-content walkthrough prominently from landing and about pages.
- Add examples of content that passes/fails the standard.
- Add a short “How evaluation works” section with the dimensions and attester personas described in the spec.
- Make the creator CTA more concrete: “Get paid for bridge-building work” is stronger than “I’m a creator.”

## Common Sense Majority

What works:

- The founder-level CSM docs are the most compelling strategic writing in the reviewed set.
- The “two million indirect supporters” emotional payoff is excellent.
- The “credible neutrality” argument is a real differentiator from generic moderate/centrist projects.

What may confuse new users:

- The public CSM about page in `ui/src/domains/csm/CsmPages.tsx` reads like an implementation note: “the movement layer in the multiple-domain UI plan.” That will not sell the movement to newcomers.
- `docs/common-sense-majority/README.md` is stale relative to the reshuffle and does not appear to be exposed through `DocsPage`.
- “The silent majority finds its voice” may carry partisan baggage. “Hidden majority” or “common-sense majority” seems closer to the thesis and less loaded.

Suggestions:

- Rewrite the CSM landing/about copy around the emotional hook: “You are not alone; the system can reveal millions who independently agree.”
- Promote the 30-second pitch from `docs/common-sense-majority/vision-and-strategy/elevator-pitch.md` into the public site.
- Fix stale references to four surfaces and old Commonality/conceptspace ownership.
- Treat the deep founder docs as background, but create a shorter public-facing CSM overview.

## Conceptspace

What works:

- The docs correctly position Conceptspace as developer-facing infrastructure, not a consumer destination.
- The “important design constraint: implications are not transitive” note is exactly the kind of developer warning this page should include.
- The landing page points statement-signing users to Tally.

What may confuse new users/developers:

- The landing page includes deployment/config trivia: “local builds use a placeholder until cross-domain URL support is generalized.” That is not useful public-facing copy.
- The docs are mostly a list of internal spec links. A developer gets pointers, but not a quick integration path.
- If `/specs/...` links are not served in the deployed app, the docs will feel broken.

Suggestions:

- Add a “5-minute integration sketch” with concrete SDK calls or pseudocode.
- Separate “public developer docs” from “repository/spec links.”
- Remove local-build placeholder language from public landing copy.

## Priority recommendations

1. Fix broken/stale docs and links, especially the Commonality vision/strategy docs not being bundled despite being linked.
2. Add or expose one domain-specific overview/about page for Content Funding, Noninflammatory Content, and CSM.
3. Rewrite public landing/about copy that currently talks about “surfaces,” “machinery,” and the reshuffle history.
4. Put the best walkthroughs directly in each domain’s newcomer path.
5. Add concrete examples everywhere the product depends on unfamiliar mechanisms: implication graph, attestation, assurance contracts, channel claiming, delegation.

## Bottom line

The six-domain reshuffle makes strategic sense. The docs mostly contain the right ideas, and some of the narrative is genuinely strong. The remaining work is packaging: each site needs to greet a cold visitor with a concrete promise, one example, and one obvious next step before exposing the architecture underneath.