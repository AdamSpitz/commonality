# Commonality and the case for more-local government

Commonality's mechanisms — trust-based delegation, assurance contracts, onchain transparency — all work better at smaller scales. This isn't a design choice; it's structural. The result is a natural gravitational pull toward localism: communities that use Commonality will find it easiest and most rewarding to fund local public goods, and over time this may shift the balance of power toward more-local government — not through confrontation, but by routing around the higher levels.

This is all speculative, obviously, and there are plenty of forces pushing in the opposite direction. The argument isn't "this is inevitable." It's that voluntary public-goods funding has a structural bias toward localism, and that bias might tip the scales — gradually, through a thousand small choices that each make sense on their own.

## Why localism is better (briefly)

The standard subsidiarity argument: local government has better information about local needs, tighter feedback loops, and more accountability (it's easier to hold your town council accountable than your federal representative).

This deserves a caveat. Local government can also be *more* captured, not less — small-town corruption, local elites dominating meetings with no press scrutiny, HOA-style petty tyranny. The subsidiarity case depends on people actually paying attention and participating. Commonality's mechanisms — onchain transparency, direct donor control, revocable delegation — help ensure that they do. And there's a competitive dynamic: it's much easier to move to the next town than to the next province or country, which puts pressure on local governments to perform in a way that higher-level governments don't face.

Beyond the generic subsidiarity argument, there's the more visceral version: people *notice* that things done by larger-scale governments are bizarrely expensive, or nonexistent, or weirdly corrupt. The intuition "we should be able to do this ourselves more effectively" is widespread and, frankly, usually correct. Once people are familiar with Commonality's tools — once they've successfully used an assurance contract to fund a local project — the question "wait, why can't we just do a lazyGiving for that?" becomes natural.

## Why the balance is shifting

One of the reasons we centralized so many government functions was that *coordination at scale was hard*. Provincial and federal governments served as coordination layers — pooling resources, standardizing services, managing inter-community dependencies. That wasn't the only reason for centralization (there's ideology, path dependence, economies of scale, and the desire for wealth redistribution), but coordination costs were a big part of it.

"Coordination at scale is hard" is exactly the kind of problem that internet-era tools are good at solving. We can transfer data instantly, create interoperability standards, build market-based systems where separate entities cooperate and pay each other, and use smart contracts to create trustless coordination between towns without a single entity overseeing them.

This doesn't eliminate all justifications for centralization. But it removes one of the major ones, which shifts the balance. Consider education: even if we want publicly-funded schools, why does the *province* need to manage the system? Standards can be created and shared online. Funding can come from local sources. The coordination function that justified provincial control is increasingly something a protocol can handle.

## Why Commonality naturally favors the local level

Three structural reasons:

**Denser trust networks.** Commonality's delegation system works better when people know their delegates personally. A retired teacher attesting alignment for youth programs is genuinely trusted in a small town in a way that no provincial bureaucrat can be. Delegation — one of Commonality's core advantages over both government and traditional charity — has a natural gravity toward the local. And the information advantage is qualitative: your local delegate can literally walk to the project and see whether it's working.

**Lower coordination thresholds.** Reaching an assurance-contract pledge threshold is easier when the community is smaller and more cohesive. 200 families in a town can coordinate around a $120K/year contract. Getting equivalent per-capita participation for a provincial-scale initiative is much harder. Assurance contracts inherently favor the more-local level.

**People want to fund their own communities.** Since assurance contracts solve the free-rider problem, contributing to local public goods feels like "I want this thing to exist, and I need to chip in to make it happen (and I don't mind because I know others are too)." That's a natural, strong motivation — much stronger than "send my money to the provincial capital and hope some of it comes back." If you give people tools for voluntarily funding public goods, they'll naturally fund local ones.

Together, these say: *voluntary public-goods funding has a structural bias toward localism that tax-funded government doesn't.* Tax revenue flows up to higher levels and then back down with strings attached. Voluntary funding stays local by default.

This isn't an accident, but it also isn't an ideological design choice. Commonality is designed to be a system people will actually use voluntarily — which means minimizing friction. The delegation system is composable and revocable because I want people to feel comfortable delegating, and that means delegating to people they know. Users donate their own money because that's the only money I have the ability to enable them to donate. They donate toward local projects because those are the projects they personally care about. The localism bias isn't something I aimed for; it's what falls out of designing a public-goods-funding system that people will actually use. "Put your own money in the hands of people you know, to be used for projects you care about" just turns out to be more naturally suited to local government than to higher-level government.

## Rails for local government, substitute for higher-level government

This is perhaps the most important distinction.

When a town uses Commonality for local projects, it's basically just local experts (project doers, funding-decision delegates) doing local work with locals' money, using better coordination tools. This is *rails for local government* — augmenting it, making it more effective, possibly even making it more legitimate by giving residents more direct control over funding. There are existing real-world parallels: Business Improvement Districts, special assessment districts, school districts with local levies. These already work in limited forms. Commonality generalizes them.

But when Commonality is used for the kinds of things provincial or federal governments currently do — say, ten small towns pooling resources for shared water infrastructure — it feels different. It's not "rails for the province." It's a *coordination protocol that replaces the province's coordination function*. The towns cooperate directly. They don't need a higher-level entity to aggregate their needs, allocate funds, and attach conditions. The delegation chain still goes through each town's local trusted people, so even when you're participating in something larger-scale, you (or your local delegate) can always revoke if you don't like what's happening.

This is a genuinely new capability. It's not just "push things down to the local level" — it's *ad hoc regional cooperation without permanent regional government*. Ten towns that need shared water infrastructure form a temporary cooperation, fund it collectively via a shared assurance contract, and dissolve the arrangement when the project is done. No new bureaucracy created. Neither purely local government nor provincial government currently offers this.

Two things make this possible:

First, quite apart from Commonality, internet-era tools have improved our ability to coordinate across boundaries — data transfer, interoperability standards, smart contracts for trustless cooperation. The raw infrastructure for inter-community coordination without a central authority already exists.

Second, Commonality's own mechanisms *can* scale up, even though they work best locally. Composable delegation lets chains reach people in touch with larger-scale issues while still going through your personal trusted contacts. Assurance contracts can be for big projects (and can themselves be composable — the town runs an assurance contract to determine whether to participate in the larger inter-town contract). Social recognition via donation leaderboards means less when the people seeing your name aren't your neighbors, but it's not nothing — and it too can be composable, showing which *towns* have contributed how much.

This means Commonality doesn't just shift *funding* downward — it undermines the *justification* for higher-level government. The province's role was "we coordinate things that individual towns can't coordinate alone." If a protocol can do that coordination without a central authority, the province's remaining role shrinks to the genuinely provincial-scale functions — which is arguably where it should be.

## What about redistribution?

One objection to localism is redistribution: if wealthy communities fund their own stuff beautifully, what happens to poor communities that can't? This is the main reason higher-level governments collect taxes centrally and distribute downward.

But redistribution is a separable problem. You don't need a wasteful, corrupt, strings-attached provincial funding apparatus just to move money from richer areas to poorer ones. You can do redistribution directly — a UBI, for example. The crypto world already has experiments with this (e.g. Proof of Humanity identities each receiving equal token distributions, backed by external funding). Whether those particular attempts work is beside the point; the point is that "we need redistribution" doesn't require "we need a provincial bureaucracy managing everything."

The current system bundles redistribution with control. Money flows up to the province, the province skims overhead and attaches conditions, then money flows back down. The redistribution function is real and important, but the control function that comes bundled with it is not. Commonality's localism argument is about unbundling these: keep the redistribution (via direct mechanisms), lose the strings.

This doesn't fully solve the problem — poor communities with less discretionary income will still find it harder to fund local public goods voluntarily. But they're already underserved by the current system, and a world where redistribution is direct and local funding is effective seems better than one where both are mediated by a dysfunctional province.

## How the shift happens

None of these mechanisms require persuading political opponents, winning elections, or relying on facts mattering in the media. They work through voluntary action and structural incentives.

### Routing around, not confronting

Rather than fighting the higher level, you make it increasingly irrelevant for specific functions. The province's power over municipalities depends substantially on being the funding conduit — money flows up via taxes, then back down with strings attached. Every function a municipality funds independently removes one string the province can pull.

This extends horizontally: the organic coalition discovery mechanism (implication attestation) can connect municipalities with similar needs directly. Ten small towns that all need water infrastructure don't each need to lobby the province — they set up a shared assurance contract, pool their pledges, and fund it collectively. The province was the coordination layer for this; Commonality replaces that function without the strings. (See the [water infrastructure walkthrough](/docs/end-user/shared/use-case-walkthroughs/local-funding-shift.md) for a concrete scenario.)

### The ratchet

Each time a community uses Commonality to fund something independently, the infrastructure stays in place afterward. The delegation networks, the pledge capacity, the demonstrated track record — none of it degrades. Each success ratchets up local capacity. Over multiple cycles, more functions migrate to local funding, and the higher level's leverage steadily erodes.

Critically, this ratchet is harder to reverse than political victories. You can't un-build a community's demonstrated funding capacity the way you can reverse a policy in the next election.

### Asymmetric costs

For a local community, setting up Commonality infrastructure is cheap — [costless to try](../ease-of-adoption/costless-to-try.md). For the higher-level government, trying to suppress it is politically expensive. A government telling people "you may not voluntarily fund your own community programs" has to spend political capital with local voters and independents to suppress something that costs the local side almost nothing to maintain. And each act of suppression validates the case for independent infrastructure.

Governments don't need to attack the protocol itself — they can regulate fiat on-ramps or decline to recognize Commonality spending for tax purposes. But the core asymmetry isn't technical; it's that suppression *looks bad*. The optics of "we're stopping people from voluntarily funding their own parks" are terrible, and the political cost scales with the number of communities doing it.

### Contagion

When one municipality successfully uses Commonality, the playbook is public and onchain. Other municipalities can see exactly what was done and replicate it. Each success lowers the perceived risk for the next community, and the higher level faces a growing number of communities with credible [independent funding capacity](../hard-to-stop/credible-threat.md). Once enough municipalities demonstrate independence, the higher level's conditional-funding leverage erodes nonlinearly.

### The outside option

In theory, higher-level governments are agents of local populations. In practice, the principal (local population) has almost no leverage over the agent (province). Commonality gives the principal a credible outside option — the textbook game-theory fix for principal-agent problems. "If you won't serve our interests, we'll do it ourselves" changes the agent's incentive structure. And unlike "we'll vote you out" — which requires winning a province-wide election — "we'll fund it ourselves" is achievable unilaterally by a single municipality.

### The tax-competition angle

This is where the apolitical strategy meets political reality. If municipalities are already funding public goods effectively via Commonality using after-tax dollars, the argument for sending tax revenue up to the province (only to get it back with conditions) becomes harder to defend. A municipality that can say "we're already funding this ourselves with after-tax dollars; if you'd just let us keep those tax dollars locally, we could do it more efficiently" has a strong position.

Actually achieving lower provincial taxes still requires politics — elections, legislation, the whole thing. But Commonality changes the political landscape in which those fights happen. It's one thing to argue for tax devolution in the abstract; it's another to point to a concrete track record of effective local funding and say "we're literally already doing this, just less efficiently because we're paying twice."

This creates political pressure for either (a) lower provincial taxes with compensating municipal tax increases, shifting the tax base downward, or (b) unconditional block grants rather than conditional ones, loosening the strings even if money still flows through the province. Either outcome shifts effective power toward the local level.

## A possible strategic sequence

1. **Seed phase.** Municipalities adopt Commonality for uncontroversial supplementary funding (tip jars, small community projects). No confrontation. Just better infrastructure.

2. **Capacity phase.** Build delegation networks, establish trust, grow pledge capacity. Still no confrontation — just a community getting organized.

3. **Demonstration phase.** Use Commonality to fund something the province is doing poorly or not at all. Build a track record with onchain transparency.

4. **Credible-threat phase.** When the province next attaches strings to funding, deploy [standby assurance contracts](../hard-to-stop/credible-threat.md). Don't activate them — just make them visible. The province sees the threat and moderates.

5. **Normalization phase.** As more municipalities do this, it becomes normal. The province's conditional-funding model erodes. Political pressure builds for unconditional transfers or tax devolution.

6. **Equilibrium.** The province retains genuinely provincial functions (interprovincial coordination, standards). Everything that can be local is local, funded through a mix of local taxes and Commonality. The province's role has shrunk not through revolution but through a thousand communities routing around it.

No single step is confrontational. No single step requires a critical mass. Every step produces immediate local value regardless of whether the later steps ever happen.

## What this argument does *not* depend on

It's worth being explicit: this argument does *not* require:

- **Persuading political opponents.** Nobody needs to be convinced that localism is good. People just use Commonality because it's useful, and the structural bias toward localism does the rest.
- **Facts mattering in the media.** The mechanisms don't work by proving anything to a hostile audience. They work by giving communities the ability to act independently, regardless of what anyone else believes.
- **Winning elections.** Every step is achievable unilaterally by a single community. No majority required. (The tax-competition angle eventually involves politics, but the value of every prior step is independent of whether that ever happens.)
- **A grand ideological shift.** People don't need to want to "devolve power." They just need to want to fund their local park, and the cumulative effect of many communities doing this is a gradual, voluntary migration of public-goods funding to the local level.

The gravitational pull toward localism is a structural feature of voluntary public-goods funding, not a political program anyone needs to sign up for.
