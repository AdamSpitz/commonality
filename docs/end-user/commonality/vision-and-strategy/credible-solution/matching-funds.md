# Matching funds: the credible *benefit*

> Not to be confused with [matching supply and demand](./matching.md) (work ↔ money). This is about **matching funds** — "we'll put up half if you raise the other half."

Matching is one of the most familiar moves in the entire funding world. A foundation says "we'll match donations up to $50K." A local business sponsors half the little league team's new uniforms. A city offers "you crowdfund the playground, we'll cover the matching grant." An employer matches its employees' charitable gifts. Everyone already understands it and feels good about it.

Here's the quietly important part: **matching funds is already implemented in Commonality.** It's just an [assurance contract](./assurance-contracts.md). An org that puts $5K toward a $10K threshold *is* offering a match — its name shows up on the contributor list, its money is only spent if the crowd shows up, and everyone is refunded if the threshold isn't met. No new mechanism required.

## The cooperative twin of the credible threat

The [hard-to-stop](../hard-to-stop/README.md) section frames assurance contracts adversarially: a community visibly preparing to fund something *despite* a hostile funder — a [credible threat](../hard-to-stop/credible-threat.md), a strike fund.

Matching funds is the same primitive pointed the other way. Instead of a community signalling "we can do this without you," it's an org signalling "we'd love to help you do this." Same escrow, same threshold, same refund logic — but the posture is a handshake, not a standoff.

This makes it the **friendliest possible on-ramp** for the established orgs that [for-established-orgs](../ease-of-adoption/for-established-orgs.md) is trying to court. An org put off by the confrontational framing of credible threats will happily try matching, because matching is something it already does and already feels good about. It's a low-key, low-threat way to shift the needle from big-org funding toward crowdfunding — and the money never passes through Commonality's hands.

## Where this is genuinely better than mainstream matching

Not "different" — *better*, in ways an org can feel:

1. **Verifiable, programmatic contingency — nobody has to trust anybody.** In a traditional challenge grant, "we'll match if you raise your half" is a *promise* on both sides: the crowd has to trust the match is real and actually conditional, and the matcher has to verify the crowd really raised its half. In an assurance contract, both sides' money sits in one contract under one threshold, enforced by code. The matcher's $5K *cannot* be spent unless the crowd's $5K materializes, and vice versa. The match isn't a promise — it's escrowed and conditional.

2. **It dissolves "would they have given anyway?"** Because the match is *structurally* contingent, the matcher gets cryptographic proof that its money was catalytic: "our $5K provably unlocked $5K from 80 neighbors who only paid because we did." No mainstream mechanism can prove catalysis. Commonality gets it for free from the threshold logic.

3. **No unclaimed-match leakage.** The *billions* left unclaimed each year in corporate matching-gift programs come entirely from friction: a separate portal, a deadline, paperwork to verify the recipient is a registered charity. On Commonality the match lives in the same contract and settles atomically with the crowd's funding. There's no "file a form within 90 days" step to forget. It happens together or refunds together.

4. **Permissionless — it matches things that can't be matched today.** Mainstream matching requires a registered 501(c)(3); whole companies exist just to maintain eligibility whitelists. A little league team, a neighborhood garden, an individual's work — none of those can get a corporate match today. On Commonality the matcher just buys into the contract. This is [publish-then-filter](../why-its-better/openness.md) applied to matching, and it dramatically widens what's matchable.

5. **Costless to offer, so the bar for matchers drops.** If the crowd doesn't show, the threshold isn't met and the matcher is refunded automatically — it paid nothing. An org can dangle a match into uncertainty at zero risk. That's the assurance-contract property applied to the *matcher's* side, and it's exactly what makes this an easy yes.

6. **Public, permanent, itemized recognition.** For the local-business-sponsors-little-league case, recognition *is* the point. An onchain contributor entry beats a logo on a banner: permanent, verifiable, attributable, and legible as proof-of-impact — and the money never touches anyone's pockets in between.

7. **Stacked and cross-cutting matches — no mainstream analog.** Conditional commitments can nest: Org A pledges "$5K if the crowd matches," Org B pledges "$3K more if A's match triggers." In tradfi that coordination is a pile of letters-of-intent; here it's nested on-chain conditions, transparent and self-enforcing. And two orgs that would never share a stage can both match the same concrete project without endorsing each other — the contract just sees money (see [organic coalitions](../why-its-better/organic-coalitions.md) and the clean-water example in [for-established-orgs](../ease-of-adoption/for-established-orgs.md)).

8. **Standing / delegated matching.** Via [delegation](./delegation.md), an org can commit to match *anything* a trusted attester tags as aligned — "we'll top up 20% of any clean-water project our delegate vouches for" — matching at ecosystem scale without running a grants committee or an RFP process.

## Where it's *not* clearly better (be honest)

- **Single-institution challenge grants.** When everyone already trusts the matcher (a university's "alumni match week"), the trust-and-verification edge mostly evaporates. Commonality's advantage is largest precisely when matcher and crowd *don't* already trust each other, or the recipient isn't a registered charity.
- **Tax-deductibility.** A US matcher giving to a 501(c)(3) gets a deduction; a raw Commonality project may not, unless routed through the [charity-as-onramp bridge](../ease-of-adoption/bridges.md). Commonality removes the *forgot-to-file* leakage of corporate matching, but it doesn't conjure deductibility. See [after-tax](../hard-to-stop/after-tax.md).
- **Quadratic funding** (e.g. Gitcoin) already exists as a sophisticated onchain matching mechanism, matching on *breadth* of support via a formula. Assurance-contract matching is complementary, not competing: it's threshold-based and far more legible to a typical org — "we cover half" is something every development director understands instantly, whereas a QF formula is not. It's the familiar kind of matching, done trustlessly.

For the plumbing of how a matcher's fiat actually reaches the contract (bridge operators, government matching programs, hybrid projects), see [bridges](../ease-of-adoption/bridges.md).
