# Localism / civic self-funding movement

A possible new UI domain: a movement site for the "shift power away from big government" angle — toward privately-funded public goods and more-local government. This spec records the thinking, the concrete functionality gap, and a recommendation about *when* (not whether) to build it.

Status: **speculative / not yet scheduled.** The recommendation is to build a thin *kernel* now and defer the full domain until its prerequisite primitives exist.

## Where this comes from

The vision already has a well-developed argument for this angle:

- [independence/local-government.md](/docs/founder/independence/local-government.md) — the full essay: subsidiarity, the coordination-cost argument for why the balance is shifting, the ratchet, contagion, the tax-competition angle, and a 6-phase strategic sequence. *(Moved out of the public Commonality docs into [docs/founder/independence/](/docs/founder/independence/README.md), the shelved "independence / self-provision" movement material.)*
- [independence/easier-than-politics.md](/docs/founder/independence/easier-than-politics.md) — "many political problems are actually funding problems"; the anti-network-state framing.
- Walkthroughs: [defunding.md](/docs/end-user/shared/use-case-walkthroughs/defunding.md) (one town, credible threat) and [local-funding-shift.md](/docs/end-user/shared/use-case-walkthroughs/local-funding-shift.md) (three towns, horizontal coalition, routing around the province).

So the *narrative* is largely written. The question this spec answers is: what's missing functionally, and should it be its own site?

## The functionality gap

The walkthroughs are written as illustrations of existing primitives. But several pieces they lean on are **not** core Commonality functionality today. Roughly in order of how load-bearing they are:

### 1. Conditional / standby assurance contracts *(contract plug already exists; trigger source + trust mechanics missing)*

The credible-threat mechanism is "fund X at $120K/yr **if the province cuts the grant**." This is not threshold + deadline — it's a contract whose *activation* is gated on an external real-world event.

**The contract architecture already supports this.** `AssuranceContract` (`hardhat/contracts/individual-projects/AssuranceContract.sol`) is abstract and delegates success/failure to a pluggable `IAssuranceCondition` (`hasSucceeded()` / `hasFailed()`). One of the existing condition implementations, `OracleCondition`, delegates to an `IOracle` returning a tri-state (0 undecided / 1 succeeded / 2 failed). So a real-world-event trigger is just: deploy an `IOracle` that reports the event, wrap it in the existing `OracleCondition`, set it as the contract's condition. No new scaffolding needed.

What's actually missing is **(a)** a concrete `IOracle` implementation for real-world events (none exists today — there's only the interface and the generic `OracleCondition` wrapper), and **(b)** the trust/attestation/dispute mechanics *behind* such an oracle: who attests the trigger ("did the province actually cut it?"), how a disputed result is resolved, and how a standby contract that never fires expires and refunds. That's a meaningful design problem, but it's an oracle/governance problem, not a contract-architecture gap.

### 2. Geographic / jurisdictional scoping *(primitive already specced, needs productizing)*

"This town can fund itself," town-vs-town leaderboards, regional rollups, "which *towns* contributed how much" — all presume place/jurisdiction is a first-class tag on statements, projects, pledges, and delegates. Core Commonality is geography-agnostic.

Good news: the primitive is already designed in [locations.md](./locations.md) — self-declared fuzzy location via EAS attestations + H3 hex indices, where coarser-resolution aggregation (neighbourhood → city → region) is free arithmetic. **The localism movement is essentially the killer app for that spec.** What's missing is the product surface: portals/leaderboards/dashboards that consume it.

### 3. Composable / nested assurance contracts

The water-infrastructure scenario has each town run its own contract that feeds a shared inter-town contract (the essay calls this out: "the town runs an assurance contract to determine whether to participate in the larger inter-town contract"). Needs a contract that can pledge into another contract conditional on its own threshold being met. This is one instance of a broader theme — see [composability.md](./composability.md) (and the [tech mechanics](../tech/subsystems/lazyGiving/composability.md)); the federation pattern there is the direct enabler.

### 4. Recurring / standing pledges

The scenarios are denominated in $/month with ongoing thresholds, not one-shot goals. Alignment's [pledge-to-a-cause.md](/docs/end-user/alignment/pledge-to-a-cause.md) already involves monthly pledges, so this may be largely covered on the Alignment side — but it should be confirmed that standing pledges with an ongoing (not one-time) threshold are actually supported by the contract layer, since the credible-threat scenarios depend on it.

### 5. Credible-threat *presentation* layer

The value of a standby contract is its legibility to outsiders who are **not users** — the province, the press, watching municipalities. That's a publish/dashboard concern, not a contract primitive: "here is our locked, conditional capacity, denominated and addressed to this counterparty, verifiable by anyone." This is what turns onchain pledges into political leverage.

### 6. Replication / playbook tooling

"Contagion" depends on the next town cloning the previous town's configuration. Templates / "fork this town's setup." Lowest priority; pure convenience until there's real adoption.

Note that #1, #3, #4 belong in **core Commonality / LazyGiving / Alignment**, not in a movement site. #1's contract plug already exists (only the oracle + trust mechanics are missing) and #2 is half-built. A movement site can't be convincing until at least the #1 trigger source and the #2 product surface exist.

## Should it be its own UI domain?

The precedent is clean. Per [ui-domains.md](./ui-domains.md), the system already has two **movement sites** (Commonality, CSM) that own no infrastructure — they're thin narrative + onboarding layers over shared primitives (Tally, Alignment, LazyGiving, Content Funding/Civility), each with its own audience and opt-in. CSM in particular shows the shape: a distinct thesis, its own framing, riding entirely on the substrate.

A localism / civic-self-funding movement is a genuinely **distinct** movement from the existing two:

- **Commonality** = the general public-goods-funding thesis (the umbrella).
- **CSM** = depolarization / hidden quiet middle.
- **Localism** = devolution / route-around-the-higher-level / fund-your-own-community.

It would sit on the same "movements built on Commonality" shelf as a new site. But note it overlaps heavily with the `local-government.md` essay that *currently lives inside the Commonality movement site* — so one real option is "this is a sub-theme of Commonality, not a separate movement," and it only graduates to its own domain if it develops its own audience and energy.

## Recommendation

**Don't stand up a new top-level domain yet. Build the kernel now; defer the domain.**

The full domain is premature because its reason for existing — the credible-threat dashboard, geographic rollups, real-world-event-triggered contracts — depends on pieces that don't exist yet: the #1 trigger oracle + trust mechanics (the contract plug exists, but nothing reports real-world events into it), the #2 geographic product surface, and the #5 presentation layer. Building the shell first would be a hollow narrative page that can't actually *do* the thing it describes.

But a kernel is cheap, gives the energy a place to collect, and surfaces concrete demand that justifies building the primitives. The kernel is:

1. **A narrative hub.** ~90% already exists in `local-government.md` + the two walkthroughs. Pull it together into a single focused entry point (could live as a prominent section *within* the Commonality movement site initially, rather than a new domain).
2. **A curated funding-portal preset** — a "fund your own community / keep it local" portal on Alignment, plus a seed cluster of Tally statements ("our community should be able to fund its own X", "keep tax dollars local", "rural communities deserve reliable infrastructure" — the implication-graph connectors the walkthroughs rely on).

Both of those are content + an existing portal + a statement set — buildable today with zero new primitives.

### Graduation criteria → its own domain

Promote the kernel to a new UI domain only once **both**:

- The #1 real-world-event trigger (a concrete `IOracle` + its trust/dispute mechanics) and a geographic product surface on top of [locations.md](./locations.md) (#2) actually land; **and**
- There's real user pull — actual communities asking to do this, not just the thesis being compelling.

Until then it's a sub-theme of Commonality, and the gap items are tracked as core-infrastructure work, not movement-site work.

## Open questions

- Naming/positioning if it does graduate (it's "localism" but the deeper claim is *ad hoc regional cooperation without permanent regional government* — broader than just "local").
- Redistribution: the essay deliberately scopes this out (separable problem, solvable via direct mechanisms like UBI). Confirm the movement site inherits that scoping rather than trying to solve redistribution.
- Relationship to bridges/tradfi: the walkthroughs lean on bridge operators for tax-deductible giving through existing charities. That's covered by [bridge-creator.md](./bridge-creator.md) / [bridge-finder.md](./bridge-finder.md), but the localism scenarios are a strong motivating use case worth cross-referencing.
