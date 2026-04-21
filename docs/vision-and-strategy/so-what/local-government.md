# Commonality and the case for more-local government

Commonality's mechanisms — trust-based delegation, assurance contracts, onchain transparency — all work better at smaller scales. This isn't a design choice; it's structural. The result is a natural gravitational pull toward localism: communities that use Commonality will find it easiest and most rewarding to fund local public goods, and over time this may shift the balance of power toward more-local government — not through confrontation, but by routing around the higher levels.

TODO: try to improve, because the above doesn't quite feel compelling. I think maybe the argument is something like:
  - Local government works better.
  - People are going to notice that.
  - People are going to notice that they have a better alternative now. (Not just Commonality in particular, but internet-age mechanisms in general.)
  - There's a pathway (credible-threat, etc.) to get there from here.
  - So people might push for that.
  - (I'm not arguing that I think this is a slam dunk or whatever. Obviously this is all very speculative and there are lots of forces pushing in the opposite direction and so on. I'm just wondering whether this might tip the scales a bit in that direction.)

## Why localism is better (briefly)

The standard subsidiarity argument: local government has better information about local needs, tighter feedback loops, and is harder for special interests to capture (it's easier to hold your town council accountable than your federal representative). (TODO: the point here isn't "it works better, so it's gonna win!" But I do think that (a) it would be *good* if more stuff were pushed down to local government, and (b) people *notice* that the stuff done by the larger-scale governments is bizarrely expensive or nonexistent or weirdly corrupt and they're like "wait a minute, it seems like we should be able to do this ourselves more effectively than this." That is, I'm expecting it to be an easy sell to persuade people to want to run stuff locally, especially once they've gotten more familiar with the Commonality system and they're like "wait why can't we just do a pubstarter for that?")

The main reason we centralized so many government functions was that *coordination at scale was hard*. (TODO: I dunno about that, maybe say "one of the main reasons"; honestly, I feel like there's ideological/political stuff that's more of a factor.) Provincial and federal governments served as coordination layers — pooling resources, standardizing services, managing inter-community dependencies. But "coordination at scale is hard" is exactly the kind of problem that internet-era protocols are good at solving. Much of the centralization we take for granted may be a legacy of pre-internet coordination costs rather than a reflection of where decisions are best made. (TODO: Point probably still stands, more or less. The ability to do internet-era coordination shifts the balance, even if this wasn't the only factor pushing towards centralization. What do you think, AI?)

## Why Commonality naturally favors the local level

Three structural reasons:

**Denser trust networks.** Commonality's delegation system works better when people know their delegates personally. A retired teacher attesting alignment for youth programs is genuinely trusted in a small town in a way that no provincial bureaucrat can be. Delegation — one of Commonality's core advantages over both government and traditional charity — has a natural gravity toward the local.

**Lower coordination thresholds.** Reaching an assurance-contract pledge threshold is easier when the community is smaller and more cohesive. 200 families in a town can coordinate around a $120K/year contract. Getting equivalent per-capita participation for a provincial-scale initiative is much harder. Assurance contracts inherently favor the more-local level.

**People want to fund their own communities.** Since assurance contracts solve the free-rider problem, contributing to local public goods feels like "I want this thing to exist, and I need to chip in to make it happen (and I don't mind because I know others are too)." That's a natural, strong motivation — much stronger than "send my money to the provincial capital and hope some of it comes back." If you give people tools for voluntarily funding public goods, they'll naturally fund local ones.

Together, these say: *voluntary public-goods funding has a structural bias toward localism that tax-funded government doesn't.* Tax revenue flows up to higher levels and then back down with strings attached. Voluntary funding stays local by default.

## Rails for local government, substitute for higher-level government

This is perhaps the most important distinction.

When a town uses Commonality for local projects, it's basically just local experts (project doers, funding-decision delegates) doing local work with locals' money, using better coordination tools. This is *rails for local government* — augmenting it, making it more effective, possibly even making it more legitimate by giving residents more direct control over funding.

(TODO: And that's not coincidence. Commonality is designed to be a system that people will actually use voluntarily, not because I have some ideological bias towards voluntariness - although I do - but because I was like "I think I see an opportunity to use new tech to make humanity better at funding public goods, and if I want to pursue that goal I can either try to somehow improve the existing system of government or I can completely avoid the government and instead just make a thing try to get people to use this system like a normal product", and obviously "improve the government" would have been a miserable way to waste my life. So I'm basically building a startup and so I want people to use the thing I'm building and so I'm designing it to have as little friction as possible. The delegation system is composable and revocable specifically because I want people to feel comfortable delegating, and that means delegating to people they know. Users donate their own money because that's the only money I have the ability to enable them to donate. They probably donate it towards local projects because those are the projects they personally care about. Commonality isn't designed to be rails for local government, it's designed to be an effective public-goods-funding system that people will actually use, and that meant it ended up being more-suitable as rails for local government rather than higher-level government because it's all about putting your own money in the hands of people you know to be used for projects you care about.)

But when Commonality is used for the kinds of things provincial or federal governments currently do — say, ten small towns pooling resources for shared water infrastructure — it feels different. It's not "rails for the province." It's a *coordination protocol that replaces the province's coordination function*. The towns cooperate directly. They don't need a higher-level entity to aggregate their needs, allocate funds, and attach conditions. The delegation chain still goes through each town's local trusted people, so even when you're participating in something larger-scale, you (or your local delegate) can always revoke if you don't like what's happening.

TODO: Right, so I think there are two points here:
  - First, totally apart from anything Commonality does, computers and the Internet and blockchains have improved our ability to coordinate. We can transfer data instantly to anywhere it's needed, we can make standards so that different things can interoperate, we can make market-based systems in which separate entities cooperate and pay each other, we can use smart contracts to create trustless ways for different towns to coordinate without needing a single entity overseeing them, etc.
    - e.g. What exactly is the point of having provicial governments manage the education system? Even if we want a publically-funded education system, why can't the local municipalities do the funding? Setting standards? We can make and share whatever standards we want online. Etc.
  - Second, Commonality itself has mechanisms that *can* scale up to larger scales, even though they don't work as well there as they do at smaller scales.
    - Composable delegation lets us have delegation chains that reach people who are in touch with the larger-scale issues, even though the chains still go through your personal trusted friends and each town's local trusted people.
    - Assurance contracts can be for big projects, even though they're easier to make successful with smaller projects. And those can be composable too (i.e. the town itself runs an assurance contract to determine whether or not to participate in the larger-scale assurance contract between towns).
    - Social recognition via the donation leaderboards doesn't mean as much if the people seeing your name aren't your local townspeople, but it's not nothing. And maybe those too could be composable: show which towns (rather than just which individuals) have contributed how much?


This means Commonality doesn't just shift *funding* downward — it undermines the *justification* for higher-level government. The province's role was "we coordinate things that individual towns can't coordinate alone." If a protocol can do that coordination without a central authority, the province's remaining role shrinks to the genuinely provincial-scale functions (interprovincial infrastructure, courts, standards, TODO: I don't know, specifics don't matter here) — which is arguably where it should be.

## How the shift happens

None of these mechanisms require persuading political opponents, winning elections, or relying on facts mattering in the media. They work through voluntary action and structural incentives.

### Routing around, not confronting

Rather than fighting the higher level, you make it increasingly irrelevant for specific functions. The province's power over municipalities depends substantially on being the funding conduit — money flows up via taxes, then back down with strings attached. Every function a municipality funds independently removes one string the province can pull.

This extends horizontally: the organic coalition discovery mechanism (implication attestation) can connect municipalities with similar needs directly. Ten small towns that all need water infrastructure don't each need to lobby the province — they set up a shared assurance contract, pool their pledges, and fund it collectively. The province was the coordination layer for this; Commonality replaces that function without the strings. (See the [water infrastructure walkthrough](/docs/use-case-walkthroughs/local-funding-shift.md) for a concrete scenario.)

### The ratchet

Each time a community uses Commonality to fund something independently, the infrastructure stays in place afterward. The delegation networks, the pledge capacity, the demonstrated track record — none of it degrades. Each success ratchets up local capacity. Over multiple cycles, more functions migrate to local funding, and the higher level's leverage steadily erodes.

Critically, this ratchet is harder to reverse than political victories. You can't un-build a community's demonstrated funding capacity the way you can reverse a policy in the next election.

### Asymmetric costs

For a local community, setting up Commonality infrastructure is cheap — [costless to try](../ease-of-adoption/costless-to-try.md). For the higher-level government, trying to suppress it is expensive (censorship resistance is the whole design) and creates local resentment ("we're stopping people from voluntarily funding their own community programs"). The higher level would need to spend political capital with local voters and independents to suppress something that costs the local side almost nothing to maintain. And each act of suppression validates the case for independent infrastructure.

### Contagion

When one municipality successfully uses Commonality, the playbook is public and onchain. Other municipalities can see exactly what was done and replicate it. Each success lowers the perceived risk for the next community, and the higher level faces a growing number of communities with credible [independent funding capacity](../hard-to-stop/credible-threat.md). Once enough municipalities demonstrate independence, the higher level's conditional-funding leverage erodes nonlinearly.

### The outside option

In theory, higher-level governments are agents of local populations. In practice, the principal (local population) has almost no leverage over the agent (province). Commonality gives the principal a credible outside option — the textbook game-theory fix for principal-agent problems. "If you won't serve our interests, we'll do it ourselves" changes the agent's incentive structure. And unlike "we'll vote you out" — which requires winning a province-wide election — "we'll fund it ourselves" is achievable unilaterally by a single municipality.

### The tax-competition angle

This is where voluntary action connects to actual structural change in government. If municipalities are already funding public goods effectively via Commonality using after-tax dollars, the argument for sending tax revenue up to the province (only to get it back with conditions) becomes harder to defend. A municipality that can say "we're already funding this ourselves with after-tax dollars; if you'd just let us keep those tax dollars locally, we could do it more efficiently" has a strong position.

This creates political pressure for either (a) lower provincial taxes with compensating municipal tax increases, shifting the tax base downward, or (b) unconditional block grants rather than conditional ones, loosening the strings even if money still flows through the province. Either outcome shifts effective power toward the local level.

This isn't tax evasion — it's a concrete demonstration that local funding works, which makes the case for letting people fund public goods with before-tax money in a more effective way than the legacy system currently allows.

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
- **Winning elections.** Every step is achievable unilaterally by a single community. No majority required.
- **A grand ideological shift.** People don't need to want to "devolve power." They just need to want to fund their local park, and the cumulative effect of many communities doing this is a gradual, voluntary migration of public-goods funding to the local level.

The gravitational pull toward localism is a structural feature of voluntary public-goods funding, not a political program anyone needs to sign up for.
