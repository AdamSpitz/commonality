# Assurance contracts as credible threats

> For the cooperative mirror image of this pattern — the same primitive used as a friendly handshake rather than a standoff — see [matching funds: the credible benefit](../credible-solution/matching-funds.md).

Assurance contracts aren't just a funding mechanism — they're a **coordination-proof threat mechanism**. A community can publicly demonstrate its willingness and ability to fund something independently, at zero cost if the threat is never called. This shifts negotiating power away from whoever currently controls the funding spigot, even if the alternative funding is never actually used.

## The pattern

Any time funding comes with strings attached — policy conditions, compliance requirements, ideological mandates — the funder has leverage over the recipient. The recipient's options in the traditional world are: comply, or lose the funding and scramble.

Commonality adds a third option: **visibly prepare to not need the funding.**

1. Community sets up an assurance contract (or a set of them) covering the at-risk funding.
2. Community members pledge. The pledges are onchain, publicly verifiable. The funder can see exactly how much is committed and by whom.
3. If the funder backs down, the contract doesn't activate, everyone gets refunded. The credible threat was costless to make.
4. If the funder follows through on the cut, the contract activates and the community is already funded. The transition is smooth because the infrastructure was already in place.

This is the logic of a **strike fund**. A union doesn't build a strike fund because it *wants* to strike — it builds one so that management knows a strike is survivable, which changes the negotiation.

## Why assurance contracts are uniquely good for this

Traditional "we'll fundraise if we have to" threats aren't very credible, because fundraising is hard, slow, and uncertain. The funder can reasonably bet that the community won't actually pull it off.

Assurance contracts flip this:

- **Pledges are public and verifiable.** The other side can see exactly how much is committed. There's no bluffing.
- **Pledges are conditional.** Nobody risks anything unless the threshold is met, so people pledge more readily than they'd donate. The bar for participation is "would you pay this much *if* enough others do too?" — which is a much easier yes than "please donate now."
- **The coordination problem is already solved.** The whole point of an assurance contract is that it solves the "I would if others would" problem. Each pledger knows their money is only spent if the collective threshold is reached.
- **Pledges are binding but refundable.** The money is locked, not just a verbal promise. But it's locked *conditionally* — you get it back if the threat is never called. This makes the threat simultaneously credible (the money is real and committed) and costless (if unneeded).

A traditional petition says "1,000 people are upset." An assurance contract says "1,000 people have collectively locked $2M that activates the moment you cut our funding." One of these changes negotiations; the other doesn't.

## The preparation phase

The credible-threat pattern has a natural preparation phase that maps onto Commonality's [dial-not-switch](../ease-of-adoption/dial-not-switch.md) adoption path:

**Step 1: Get on the rails.** Before any crisis, the institution (hospital, school, community program) starts using Commonality infrastructure for its existing charitable arm. Donations come in through [bridge operators](../ease-of-adoption/bridges.md), get recorded onchain, donors get leaderboard credit. Functionally identical to what they're doing now — just on infrastructure that can't be taken away.

**Step 2: Build the delegation network.** Identify trusted local figures — a respected doctor, a business owner, a community leader — and have them set up as delegates. People who trust their judgment can route funds through them. This network doesn't need to *do* anything yet; it just needs to exist and be ready.

**Step 3: Signal readiness.** Create an assurance contract in standby mode. Community members pledge. The contract is publicly visible: "If provincial funding is cut, we have $X committed from Y families." This is the credible threat. The pledges sit there, costing nothing, shifting the negotiation.

**Step 4 (if needed): Activate.** If funding is actually cut, the contract activates. The delegation chains route money to the institution's operations. The transition is smooth because everything was already set up.

**Step 4 (if not needed): Stand down.** If the funder backs off, pledges are refunded. The infrastructure stays in place for next time. The community has demonstrated its capacity and can re-signal at will.

The key insight: steps 1-3 are all [costless to try](../ease-of-adoption/costless-to-try.md). Getting on the rails has immediate minor benefits (transparency, verifiable receipts). Building a delegation network costs nothing. Pledging to a standby assurance contract risks nothing (refundable if not activated). The entire preparation phase is free, and the mere *existence* of the preparation shifts the power dynamic.

## Where this applies

Any situation where a higher-level entity uses funding as leverage over a lower-level one:

- **Provincial/state government vs. local institutions.** Hospital funding contingent on policy compliance. School funding contingent on curriculum mandates. Municipal infrastructure funding contingent on zoning or immigration enforcement.
- **Federal government vs. states/provinces.** Federal highway funding contingent on drinking-age laws. Federal grants contingent on regulatory compliance.
- **Large donors vs. organizations.** A foundation threatening to pull a grant if the org changes direction. A corporate sponsor threatening withdrawal over a controversy.
- **International aid vs. recipient countries.** Development funding contingent on governance reforms or policy adoption.

In all these cases, the pattern is the same: the recipient's ability to credibly say "we can do this without you" changes the negotiation, even if they'd prefer not to. For the longer-term implications — how repeated use of this pattern at the local-vs-provincial level may gradually shift the balance of power toward more-local government — see [local government](../so-what/local-government.md).

## Interaction with other dynamics

**Insurance ([game theory](./game-theory.md), Layer 1).** The credible-threat pattern is a more active version of the insurance argument. Insurance says "you should build independent funding capacity because you'll need it eventually." Credible threat says "building that capacity *also* reduces the probability that you'll need it, because it changes the other side's incentives."

**Censorship resistance.** The threat is only credible if the funder can't squash the backup plan. If the province could shut down the assurance contract, the threat is empty. [Censorship resistance](./censorship-resistance.md) is what makes the threat credible — there's no "Commonality Inc." to pressure, no bank account to freeze, no platform to ban.

**After-tax dollars ([after-tax.md](./after-tax.md)).** The credible-threat pattern actually *reduces* the importance of the after-tax disadvantage. If the mere existence of the backup plan is enough to prevent the funding cut, then you never actually have to spend those after-tax dollars — you just have to credibly commit to being *willing* to. The tax inefficiency only matters in the scenario where the threat is called, and the threat being credible makes that scenario less likely.

**[Scales down](../ease-of-adoption/scales-down.md).** You don't need to replace the *entire* budget to have a credible threat. If the province is threatening to cut a $5M annual grant, and the town can credibly demonstrate $3M in pledges, that alone changes the calculus — the province now knows it's inflicting $3M of pain on the town rather than $5M. Partial credible threats still shift negotiations.

## What the system might need

A couple of features that would make this pattern work better:

- **Standby/conditional assurance contracts.** Currently assurance contracts have deadlines. For the credible-threat use case, you'd want a contract that sits in a "pledges accepted, not yet activated" state, with activation triggered by a trusted party (e.g., a multisig of town council members) rather than a deadline. This is a modest extension of the existing design.
- **Recurring pledge commitments.** Institutions like hospitals need ongoing funding, not one-time lump sums. Rolling monthly assurance contracts (or a contract that collects monthly and refunds if the monthly threshold isn't met) would fit better than a single large contract.

Neither of these is architecturally difficult — they're variations on the existing assurance contract pattern, not new subsystems.
