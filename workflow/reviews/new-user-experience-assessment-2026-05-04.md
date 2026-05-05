# New-user experience: an honest assessment

*Reviewer: Claude (Opus 4.7), 2026-05-04. Scope: founder-level docs (`docs/vision-and-strategy/`), user-level docs (`docs/`), and the six domain landing pages (`ui/src/domains/*/LandingPage.tsx`) per `specs/product/ui-domains.md`.*

## TL;DR

The intellectual architecture is genuinely good. The six-domain shape is internally coherent, the vision-and-strategy narrative is sharp, and each landing page is well written sentence-by-sentence. But for someone arriving cold, the experience reads more like **a thoughtful org chart of a movement-plus-platform** than **a product that tells me what it does in ten seconds**. New users will probably understand *that* something interesting is here, but most will not stick around long enough to figure out *what* and *why now*. The biggest wins are not in writing more — they're in cutting, sequencing, and committing to one front door per audience.

---

## What works

1. **The "B/A dialogue" in `docs/vision-and-strategy/README.md` is excellent.** It is the single best on-ramp in the entire repo: it pre-empts the obvious objections in the order a skeptic actually thinks them. If a newcomer reaches it, they get hooked.
2. **The use-case walkthroughs are the strongest single asset.** `block-party.md`, `defunding.md`, `research-funding.md`, and `local-funding-shift.md` each turn abstract mechanisms into a story a normal person can picture. These are gold.
3. **The six-domain split makes sense once you understand it.** Tally (consumer signing), Commonality (funding + movement), Content Funding, Noninflammatory Content, CSM, Conceptspace — each has a defensible reason to be its own surface.
4. **The vocabulary is mostly defined where it appears.** "Assurance contract," "delegation," "implication graph," "retroactive funding" all have key-ideas pages that link from the right places.
5. **Trust is addressed up-front** (`why-trust-it.md`, the "nobody controls it" bullet). For a project that touches money + politics + crypto, that matters.

---

## Where the new-user experience breaks down

### 1. There is no single front door, and the front door we *do* have is doing three jobs

The Commonality landing page (`ui/src/domains/commonality/LandingPage.tsx`) is simultaneously:
- a **movement manifesto** ("Build the movement for better public-goods funding"),
- a **product chooser** ("Choose your path: I want to fund / I have a project / I want to delegate / I want to learn"),
- and a **directory of five sibling sites** ("Related product sites").

Three jobs is too many for one landing page, and the third job — the sibling-site grid — is the worst offender. A new user has not yet been convinced this thing is worth understanding, and we're already asking them to disambiguate "Tally vs. Content Funding vs. Noninflammatory vs. CSM vs. Conceptspace." That's a sitemap, not a hook. **The grid should be below the fold or on a separate page.** (USER: Agreed. The point of splitting into separate sites was to avoid this; it's *meant* to be many front doors, not a single one. They're related, so the list should be somewhere, but not prominent like it is now.)

The hero has **four CTAs** ("Start with the thesis," "See a walkthrough," "Browse projects," "Open Tally"). When everything is a CTA, nothing is. Pick one primary action. (USER: Agreed, that's silly. Not sure what should go there, though.)

### 2. The six-domain story is structurally hostile to first-time visitors

Each domain's landing page reads like it was written assuming the visitor already understands the *system* and is now choosing which surface to use. Examples:
- Tally's hero ("Petitions and polls with an implication graph") is sharp, but its first three CTAs include "Tune trust settings" — meaningful only if you've internalized the trust model. (USER: Agreed, that's weird.)
- Noninflammatory Content's landing redirects to Tally for "the underlying statements." A first-time visitor doesn't know what that means.
- Conceptspace's landing is honest about being infrastructure, but Conceptspace and Tally share so much conceptual surface that an arriving user who lands on Conceptspace by mistake will be confused before reading the redirect.

There is a **cross-site identity problem** baked into the architecture: each site has to explain *itself* AND its relationship to the other five. That's a heavy tax on every landing page, and you can feel it in the writing. Every page has a "and here are the sibling sites" section.

#### USER'S THOUGHTS

Part of the point of splitting into separate UI domains is that I was hoping to make this less confusing, not more. The sites are related but shouldn't need to put links to each other into their main landing page, at least not in any prominent way.

Each site has its own purpose that is more-or-less independent of the others:
  - common-sense-majority: Let's give the quiet middle a voice
  - noninflammatory-content: Let's build bridges
  - content funding: Let's directly fund content with the qualities we like, rather than hoping that ads and Patreon will somehow produce content with those qualities. (It's more like infrastructure because it probably makes sense for each specific quality to have its own site. So I don't mind if this site's pitch is a bit more abstract, or if it reads more like a pitch to developers/founders to start a new movement around the quality that they want to promote.)
  - Tally: Let's count up how many of us there are who believe in this (without needing to coordinate on a particular writeup).
  - Conceptspace: (Again this is more like infrastructure. It's more general than Tally; it's not just "people sign statements." e.g. Commonality uses conceptspace's statements, but not via Tally's human-signing attestations; it uses alignment attestations instead. Also conceptspace includes the general concept of implication attestations - which Tally uses rather centrally but still the point of Tally is "let's take a census", not "here's the tech used to eliminate the coordination problem." The implication graph is used for more purposes than just Tally's - e.g. it's useful for project-alignment too.)
  - Commonality: Let's update our civilization's coordinated-crowdfunding/public-goods-funding technology.

Some of those make use of others, but that doesn't mean they need to call it out prominently. Commonality makes use of conceptspace's statements as a subject for alignment attestations; and makes use of the implication graph; but that's not something that needs to be on Commonality's front page. Noninflammatory-content makes use of the more-generic content-funding site, which *is* kinda something worth mentioning in small print on the front page (because it's more-or-less a simple instantiation of the general idea that the Content Funding site is meant for), but still it doesn't need to be a big deal. Etc.

### 3. The audience for any given page is over-broad

A representative example, the Commonality "spotlight":
> "Fund public goods without personal risk. Pledge to a project, but only pay if enough others join. Delegate your money to someone whose judgment you trust. Start a project without gatekeepers or applications."

That's four pitches to four different personas in two sentences (donor, pledger, delegator, project creator). Each is reasonable individually; combined, none lands hard. A newcomer reading this learns that the site does many things, not that the site does *one* thing for *them*.

The `roles/` docs do exactly the right thing — separate pages per role — but the landing pages don't commit to a single role per page. CSM is the exception and it's the strongest landing as a result ("politically homeless" is a sharp targeting choice).

#### USER'S THOUGHTS

Hmm. I was hoping that each site might have multiple *roles* but still feel like it's focused on one purpose. e.g. For Commonality, yes, there's donors and scouts and delegates and project-doers, but those are all roles that are closely linked to each other: there's the person who wants money to do the project, and the person who wants the project done so he donates money. I don't think it makes sense to separate those into separate sites.

Maybe just make the roles clear? Actually, later on the page it does that. Maybe it's just the "What you can do here" blurb that's confusingly muddled?


### 4. Concrete is buried; abstract leads

Every landing page leads with the abstraction ("internet-age coordination on public goods," "petitions and polls with an implication graph," "reward content that lowers the temperature") and then *links* to the concrete ("See a walkthrough"). The walkthroughs are the most persuasive content in the project, but they're one or two clicks away. **A new user should land on a page that already shows them a story.**

Compare: a landing page that opens with the first three sentences of `block-party.md` ("A few families on a street want to throw a proper summer block party… It would cost $1,500. Worth it if the whole street chips in; not worth it if only five families do.") would convert better than the current abstract pitch, even though the current pitch is more accurate.

Also, the block-party walkthrough's own header notes it "isn't super compelling yet" and warns against putting it front and center. That's an honest signal: the strongest walkthroughs to lead with are probably **defunding** (high-stakes, dramatic, distinctive) and **research-funding** (shows retroactive funding, which is genuinely novel). Lead with one of those, not block-party.

#### USER'S THOUGHTS

Leading with story sounds good in the abstract but I'm not sure we have a good enough story yet, other than the ones that we've already split off into separate sites.

None of the three stories here is particularly compelling. Block party is at least relatable to normal people, but not really any different from Kickstarter. Research funding is cool but many people won't connect with it. And thinking about protecting against defunding is a weird fantasy for the overly-politics-obsessed for now.

This kinda feels to me like Commonality is still more like an infrastructure site than a user-facing site. If it's a "movement", maybe it's a movement aimed at dev/founder types who will use this infrastructure to create other sites like Content Funding or Noninflammatory or Common Sense Majority (e.g. maybe there'll be one specifically for scientific research funding, or for making credible threats of switching projects to non-government funding), not a movement for ordinary people to join directly.

### 5. Vocabulary load is still high, even though every term is defined

Counted on the docs index page: *assurance contract, delegation, implication graph, retroactive funding, credible threat, conceptspace, attester, nudger, statement, funding portal, scout.* Each is a real concept, but eleven new terms before the first scroll is a lot. A sympathetic reader pushes through; a casual visitor leaves. The fix is not to invent new words — it's to delay introducing the technical vocabulary until *after* the reader has been pulled in by a story.

USER: Yeah, a while ago on an earlier version of the site we did a dejargonification pass through the copy. We'll need to do that again. But let's get the broad structure right and then wordsmith later.

### 6. "Why now" is stated but not felt

`vision-and-strategy/README.md` says "new tech makes this viable when it wasn't before." That's the single most important sentence for a skeptic, because the natural objection is "if this idea is so good, why doesn't it already exist?" But the answer ("blockchains, AI, assurance contracts") is asserted, not demonstrated. A newcomer who isn't already pro-crypto may pattern-match this to "another web3 project" and bounce.

The strongest version of this argument is probably: **"assurance contracts existed in theory for 30 years, but coordinating them at scale was infeasible until X, Y, Z."** That story isn't told anywhere I can find on the user-facing side.

### 7. The relationship between movement and tools is muddled on Commonality's site

Per the spec, Commonality is "a movement *and* a set of tools." That dual identity reads cleanly in `specs/product/ui-domains.md`, but on the actual Commonality landing it manifests as the page trying to recruit you to a movement *and* sell you on a product *and* hand you off to five sibling products. A visitor doesn't know whether they're being asked to *believe* something or *do* something. A clearer split — for example, `commonality.org` as the *movement* page (manifesto, walkthroughs, "join us") with the funding-tools UI living at `commonality.org/app` or under a clearer "tools" subnav — would let each surface do one job well.

---

## Recommendations, in priority order

### P0 — High leverage, low effort

1. **Pick one canonical "first walkthrough" and put it above the fold on Commonality.** Probably `defunding.md` or `research-funding.md`. Two paragraphs of story, then "Here's the system that makes this possible." The current "Spotlight" box is the right shape but the wrong content — replace its abstract pitch with a concrete vignette.
2. **Cut the hero CTA count to two everywhere.** One primary action, one secondary. Move the rest into the body. Currently every hero has 4–6 CTAs.
3. **Demote the "Related product sites" grid below the fold on every domain landing.** It's a sitemap, not a sales tool. Most first-time visitors should never see it.
4. **Add a one-line audience tag to each landing's eyebrow.** E.g., Tally's eyebrow could read "Tally · for people who like petitions and polls." CSM already nails this with "politically homeless." Make every site that explicit.
5. **Write a `docs/why-now.md` that turns the asserted "new tech makes this viable" claim into a 200-word argument.** Link it from the Commonality hero.

### P1 — Medium effort, big payoff

6. **Make a 60–90 second visual/animated walkthrough.** Pick one walkthrough (defunding or research-funding), turn it into stills + captions or a short video. Embed at the top of Commonality and link from every sibling site. Nothing in the current docs replaces seeing the mechanism move.
7. **Build a single cross-site explainer page** ("How these sites fit together") that owns the disambiguation job, so individual landing pages don't have to. Link to it from every domain's footer/nav.
8. **Reduce vocabulary load on the docs index.** Move attester / nudger / scout / portal definitions to second-tier pages. The first scroll should mention at most: *assurance contract, delegation, statement, retroactive funding.*
9. **Decide whether Commonality-the-site is movement-first or tools-first.** Right now it's both, and the schizophrenia shows. My weak recommendation: movement-first homepage, tools at a subroute, with the movement page linking to a single "see the tools in action" walkthrough. This keeps the "movement peer to CSM" framing the spec wants without confusing visitors who came to fund a thing.
10. **Update `block-party.md` per its own warning, or rotate it out of the index.** Its self-flagged weakness undermines the strongest section of the docs page (the "See it in action" list). If it's not compelling yet, don't lead with it.

### P2 — Larger but worth considering

11. **For first-time visitors who don't know which site they want, default them to Tally, not Commonality.** Tally is the most conventional, lowest-stakes mental model ("petitions and polls"); it's a softer landing than "internet-age coordination for public goods." Then upsell from Tally into the funding side once they're engaged.
12. **Treat Conceptspace as truly developer-only.** It currently has a marketing-shaped landing page ("Conceptspace overview," "Review the primitive"). Either make it a flat dev-docs index with no hero, or hide it from anyone who didn't arrive via a `/docs/conceptspace/...` link.
13. **Audit the cross-link density.** Each landing page links to several sibling sites; in aggregate, a confused visitor will bounce between them looking for the "real" home. Make Commonality unambiguously the front door of the ecosystem (even if it's not always the one a given audience should land on directly), and dial back lateral links from the others.

---

## The honest one-liner

The project knows what it is. The user-facing surfaces don't yet *show* what it is — they *describe* it. The fix is mostly about leading with concrete stories, committing to one audience per page, and trusting that the architectural elegance of six domains will be appreciated *after* a visitor has been hooked, not before.
