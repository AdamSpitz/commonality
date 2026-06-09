# Matching funds (product)

"We'll put up half if you raise the other half." The product-manager view: who it's for, how to position it, what to build, and whether it deserves its own entry point.

- **End-user / strategy framing** (the "credible benefit" pitch): [docs/.../credible-solution/matching-funds.md](/docs/end-user/commonality/vision-and-strategy/credible-solution/matching-funds.md).
- **Contract mechanics**: [specs/tech/subsystems/lazyGiving/matching.md](/specs/tech/subsystems/lazyGiving/matching.md).
- **Fiat plumbing** (bridge operators, govt matching programs): [specs/tech/bridges.md](/specs/tech/bridges.md).

This sits alongside [composability.md](composability.md), which already lists matching as a composition of existing primitives. This doc is the matching-specific product detail.

## Who it's actually for (segment notes)

The edge over mainstream matching is largest exactly where mainstream matching is weakest, and it's worth being honest internally about where it *isn't* a clear win so we don't oversell:

- **Strong fit:** matcher and crowd don't already trust each other; the recipient isn't a registered 501(c)(3) (little league team, neighborhood garden, an individual's work); the matcher wants verifiable proof its money was catalytic; cross-org or cross-ideological co-matching where neither side will share a stage.
- **Weak fit:** single trusted institution running an internal challenge grant (a university's "alumni match week") — everyone already trusts the matcher, so the trust-and-verification edge mostly evaporates. Don't lead with these.
- **Honest caveat to hold internally:** Commonality removes the *forgot-to-file* leakage of corporate matching, but it does **not** conjure tax-deductibility. A US matcher who needs a deduction still has to route through the [charity-as-onramp bridge](/specs/tech/bridges.md). Don't let marketing imply otherwise.

## Positioning vs. quadratic funding

Quadratic funding (Gitcoin et al.) already exists as a sophisticated onchain matching mechanism, matching on *breadth* of support via a formula. Don't position assurance-contract matching as a QF replacement — it's complementary and **more legible to a normie org**. "We cover half" is something every development director understands instantly; a QF formula is not. The line to take: *the familiar kind of matching, done trustlessly.* (QF, if we ever want it, is the seam-2 virtual-match path in the tech spec — a different mechanism for a different audience.)

## What to build

Two tiers, and the first is the one that matters:

1. **Fixed gap-fill — already works, zero new code, ship as MVP messaging.** A matcher putting $5K toward a $10K threshold *is* a conditional match: their money is spent iff the crowd raises its half, and refunds otherwise. No new contract, no new UI primitive strictly required — just `buyERC1155`. The product work here is **framing and surfacing**, not engineering: make it obvious in the project-creation and contribution flows that "fund part of a threshold" is a first-class matching move, and attribute the matcher prominently on the leaderboard.

2. **Partial-proportional matching (`MatchingPool`) — deferred, niche.** "If the crowd only raises $3K, I'll still chip in $3K for a smaller version" needs the additive `MatchingPool` pledger contract *and* a project whose scope can flex with the amount — which most threshold projects can't. Treat it the same way [composability.md](composability.md) treats combinators: **don't build speculatively.** It lands only when a concrete flexible-scope project demands it. Mechanics are specced in [the tech doc](/specs/tech/subsystems/lazyGiving/matching.md) so we can move fast if that demand appears.

## Does matching deserve its own entry point?

Open question worth a decision. The case *for* a dedicated top-level surface (see [ui-domains.md](ui-domains.md)):

- Matching is the **friendliest possible org on-ramp** — a concept every org already understands and feels good about, lower-threat than "assurance contracts" or anything in the adversarial credible-threat framing. A door labeled "matching" may convert hesitant orgs that bounce off the rest of the system.
- It's naturally **two-sided**: "Got a budget to match?" ↔ "Looking for a matcher?" — a marketplace view pairing standing match offers with threshold-seeking projects. That's the [matching supply-and-demand](/docs/end-user/commonality/vision-and-strategy/credible-solution/matching.md) idea applied to funds specifically.

The case *against* (or for restraint): it's **surfacing over existing contracts, not a new mechanism** — so it should be a view/filter, not a new subsystem or a fifth deployed site. Recommendation: treat a "matching" surface as a *lens* within an existing domain (a filter/landing for match offers and match-seeking projects), not a new UI domain, unless a partner org concretely wants a white-labeled matching portal. Defer until there's real demand; the fixed-gap-fill framing (tier 1 above) can ship in existing flows long before any dedicated surface.

## Sequencing

- **Now / MVP:** the framing work for fixed gap-fill (surface "fund part of a threshold" as matching; matcher leaderboard attribution). No contracts.
- **On demand:** `MatchingPool` for partial-proportional matching; a matching "lens" view if an org asks for it.
- **Only if we pursue QF:** seam-2 virtual matching + a payout pool — separate effort, separate audience.
