# Composable assurance contracts (capabilities)

Assurance contracts compose. This document is the product-level "what becomes possible and why it's exciting"; the mechanics (the actual plug points, combinator semantics, and invariants) live in [specs/tech/subsystems/lazyGiving/composability.md](../tech/subsystems/lazyGiving/composability.md).

The headline: several things that *look* like distinct features turn out to be **compositions of primitives we already have** — not new contract types. The architecture deliberately separated three concerns — *measurement* (how much has been pledged), *judgment* (has the contract succeeded/failed), and *money* (who gets paid) — and made each a pluggable seam. Most of the value below comes from treating each seam as a slot rather than a fixed thing.

## Capabilities that fall out of composition

### Credible threats (no new primitive)
A standby "fund X if the province cuts the grant" contract is just an *inversion* of a "government keeps funding" trigger: it succeeds precisely when the trigger says funding stopped. This is the core mechanism behind the [localism / power-shift angle](./localism-movement.md), and it needs no new contract architecture — only a real-world-event oracle to invert.

### Milestone / tranche funding
Split a big project into a sequence of contracts where each tranche's release is gated on an attestation that the previous milestone actually delivered. Pledgers commit to phase 2 up front, but money only moves if phase 1 ships. Risk drops, so more people are willing to pledge to ambitious multi-stage projects.

### All-or-nothing bundles of interdependent goods
A block party needs a venue *and* a permit *and* a band. Fund all three as separate contracts joined by AND: each vendor runs their own contract, but no money moves unless the whole bundle clears. Generalizes the [block-party walkthrough](/docs/end-user/shared/use-case-walkthroughs/block-party.md) to interdependent sub-projects with different recipients.

### Federated regional coordination
Town-level contracts feed a regional meta-contract (e.g. "the project proceeds if ≥2 of 3 towns reach their local thresholds"). Each town's decision to participate is *itself* a local assurance contract, so the delegation chains stay local and revocability composes — you withdraw at your town's level, not the regional one. This is the [three-towns water-infrastructure walkthrough](/docs/end-user/shared/use-case-walkthroughs/local-funding-shift.md), and it's pure composition.

### Retroactive funding (emerges from pieces we already shipped)
We already have ERC-1155 contribution receipts *and* a secondary market for them. A retro-funding pool is just a contract whose trigger is an attestation that a project delivered real impact, and which then *bids for the receipt tokens of proven-successful projects*. Early believers hold receipts; the retro pool buys them at a premium. [Retroactive funding](/docs/end-user/shared/key-ideas/retroactive-funding.md) and "reward early believers" stop being bespoke features and become a composition of receipts + secondary market + an impact-attesting pool.

### Matching campaigns / leverage
A matching pool contributes to a project's measured progress as a formula over grassroots pledges (e.g. 1:1 match, or a concave quadratic-funding-style match). A donor sees their $10 unlock another $10. "Matching funds" is a progress-aggregation composition, not a new contract.

### Competing-approaches portfolios
Pledge to "whichever of these three competing designs reaches its threshold first" via an OR composition — backers express support for an outcome without having to pre-pick the winning team.

## Why this matters strategically

- **Fewer primitives to build, audit, and explain.** If credible threats, milestones, matching, retro funding, and federation are all compositions of a small combinator set plus oracles, we build and audit the combinators once instead of shipping a contract type per feature.
- **A trustworthy story.** Because conditions are immutable once set, a composed structure is frozen at deploy. That's exactly what makes a credible threat *credible* (nobody can quietly rewire it after pledges land) and what lets a pledger verify what they're committing to.
- **It's a moat of capability, not lock-in.** Open primitives that compose let third parties build verticals (the [movement sites](./ui-domains.md)) on top without our permission — which is the whole point of being a protocol rather than an organization.

## Cautions (product-facing)

- **Comprehensibility is the real constraint.** A deeply nested contract tree can be mechanically sound but incomprehensible to a pledger. The UI must be able to render "what am I actually committing to, and under what conditions does my money move?" for a composed structure, or we shouldn't expose that composition. Favor a small set of legible, named patterns (bundle, tranche, match, federation) over arbitrary trees.
- **Trust compounds.** Composing with someone else's condition means trusting their code. Product should lean on a whitelist of audited combinator/condition types rather than letting users wire in arbitrary addresses — see the tech spec for the security discussion.
- **Don't build the combinators speculatively.** Each combinator is only worth shipping when a concrete capability above is being productized. This doc is a map of what's *possible*, not a build queue.

## Sequencing

This is mostly post-MVP. The natural first composition to want is the credible-threat inversion (it unlocks the power-shift angle and needs only one new oracle plus a NOT-wrapper). Milestones and matching are the next most broadly useful. Federation and retro-pool composition are larger and depend on the others.

## MORE THINKING

A thought that's tickling me:
  - When I hear a story about a particular person who needs help, yes, I want to help out, but also I have this feeling of "I don't know how many *other* stories there are out there at approximately this level of need; I kinda want to have a broader sense of who's out there and who needs what, so that we as a community can coordinate effectively." (e.g. Imagine someone who needs a $100k lifesaving medical procedure, and five people who each need a $20k lifesaving medical procedure, and a charity is deciding how to allocate $100k that it has available. It sucks to have to make cold-hearted decisions like that, but better to save five lives than one.) (Different example: there's five people who each need a $20k lifesaving medical procedure, and there's a $100k intervention that would save ten lives but it's all-or-nothing. So you'd want to say "donate to the $100k thing *only* if we actually have the full $100k; if we only have $40k just save the two lives.")
  - Like, if there were a Public Goods Czar or a Charity Czar who had *all* the info, and *all* the potential donation money, and enough ability to look at everything and understand it, he could look at the whole picture and decide where to direct money. (This is what the government pretends to be, but it's awful at it.) The point of Commonality is that I want to achieve a similar effect (if possible) but via bottom-up decentralized means.
  - And one part of that might be that we need more coordination primitives. Assurance contracts are one, but maybe there are more, and maybe they're composable?
  - Let's think about aggregation:
    - The system currently has some ways of aggregating:
      - An Alignment board shows you an aggregate of many projects aligned with the cause. (Note that this is NOT an aggregate of projects that you have pledged money to or are currently pledging money to or have explicitly indicated interest in pledging money to.)
      - You can create a delegated note to delegate money to a particular delegate person, who can then use it (by splitting the delegated note) for multiple projects if he chooses.
      - But each note is a separate thing (e.g. you delegate some money to Alice and some to Bob, but there's no real connection between them). And each project you donate to directly is a separate thing.
    - So this doesn't feel like a clean or complete story, in terms of composition/aggregation.
  - Imagine that you had a dashboard of *all* the public-good/charity projects that you care about. In particular, ongoing ones or upcoming one-shots (which are roughly the same thing; an ongoing one is basically just "the next one-shot project in the series, followed by future ones", except that maybe you have ongoing funding set aside that you *intend* to put toward the ongoing future ones; see [recurring pledges](/specs/product/recurring-pledges.md)). It might help to imagine this as being analogous to what the above-mentioned imaginary Czar (or a government) might see if he were looking at a big dashboard of all the potentially-fundable projects, except that the imaginary Czar is funding the entireties of each project, whereas you're only contributing a portion. But still, you could have this big dashboard of all the public-good projects and charity projects you're contributing to.
    - And the reason *why* it would be valuable to think of these as an aggregate (not just in the shallow sense of "the website shows them all together on the same page", but in a deeper sense of "the smart contracts are interconnected" or at least "there's offchain code that is doing some coordination work between them") is because it lets you incorporate some composition operations:
      - here's my pool of pledgeable funds, and here's a prioritized list of projects I'd be interested in funding (with limits: up to $100 for at least X% of this one, etc.) *if there's enough in my pool*;
      - pledge to project P, but if P fails to make threshold by its deadline, the money goes back into my pool of pledgeable funds
      - I dunno, is this actually worthwhile? now that I'm describing it it sounds like it might be more trouble than it's worth
  - Would it make sense to think of a delegatable note as a Pledge? Like, a variant of a pledge to an assurance contract?


I dunno, thoughts?
