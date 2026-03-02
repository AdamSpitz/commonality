# A bit more philosophizing

The point of Commonality is twofold:
  - We have the tech to build a public-goods-funding system that's just as good or better than traditional government OR traditional private charity.
  - We can build it *without* a major coordination hassle.

## At least as good as traditional government

Various aspects:
  - Free-rider solution: assurance contracts. Not quite the same as "tax everyone" but probably still sufficient.
  - Laziness solution: delegation system. Basically representative democracy but more fine-grained and transparent (and without the coordination problem of "who should we all delegate to" - see below).
  - Effectiveness: retroactive funding. Not always applicable, but where it *is* applicable it should be an improvement on the system's ability to successfully get stuff done.
  - Both supply signaling and demand signaling: project creation signals "here's some work I could do, if there's money for it"; pledged money with declared intents signals "here's some money for this purpose, if there's anyone willing to do it." Demand can bring demand into existence or vice versa. (Government equivalent of demand signaling: RFPs and grant programs, but without the centralized bottleneck of a procurement office.)
  - Discovery and vetting: funding portals with a trust network feeding delegates a stream of aligned projects. (Government equivalent: grant review panels and planning committees, but distributed across many individuals rather than one small committee.)

This isn't an ideological libertarian argument for the abolition of government. We simply don't need government for public-goods-funding, because we have better tech now.

### This is much easier than politics

I'm not suggesting going to the government (or to normal people who are basically satisfied with the way the system works) and saying "hey, we've got a better way of doing this, we can dismantle the government's public-goods-funding apparatus now." Obviously that's not going to happen.

What I *am* saying, though, is:
  - If you're looking at various problems in your country and thinking that fixing those problems would require winning the next election or forming a better political party or having a revolution...
  - ...or even if you've just got some particular project that you want funded, and it's obviously not going to be funded by the government or at least you're wincing at the prospect of wading through the horrible bureaucratic mess...

...Commonality may actually offer a MUCH easier solution.

You DO NOT NEED to somehow drum up widespread support for some New Political Party or New Alternative Government.

The point of the "hey, look, we have the tech to do public-goods-funding at least as well as government" section above isn't that we're going to persuade the incumbent system to dismantle itself, it's that if you're *already* feeling like "we HAVE to win the next election" or "omg we need to fix/replace the government"... relax, you don't have to. Your goal can instead be to just start using Commonality instead.

## At least as good as private charity, too

The above section compares Commonality with government. But a lot of public-goods funding already happens through private charity - and Commonality improves on that too.

Private charity has problems:

  - **Free-rider problem is unaddressed.** Charities basically say "please give unconditionally." There's no assurance-contract mechanism. You hand over your money and hope enough other people do too. Commonality's assurance contracts fix this: your money is only spent if enough others also pledge.
  - **Discovery and evaluation burden.** Finding good charities, vetting them, deciding how much to give to each - it's a lot of work. Most people either don't bother, or they pick one or two well-known names and call it a day. Commonality's delegation system lets you offload that work to someone you trust, with full transparency and revocability. And funding portals give the decision-makers a curated view of aligned projects.
  - **Opaque decision-making.** When you donate to a big charity, you mostly have no idea how the money gets spent. Maybe there's an annual report. Commonality's onchain transparency is dramatically better - you can see exactly where every dollar went, who made each decision, the full delegation chain.
  - **Organizational overhead and capture.** Charities are organizations. They have staff, offices, boards, executives. They accumulate overhead. They can be captured by people whose priorities diverge from the donors'. They can become self-perpetuating institutions that optimize for their own survival. Commonality has no central organization to accumulate overhead or be captured.
  - **Centralized chokepoints.** A charity has bank accounts that can be frozen, a legal entity that can be sued, leadership that can be pressured. (This is the same censorship-resistance argument as with government, but it applies to charities too - especially charities working on anything politically contentious.)
  - **No retroactive funding.** Charities fund stuff prospectively - they pick projects and hope they work out. Commonality enables retroactive funding, where you can reward projects that have *already* demonstrated value.

Commonality keeps the good part of charity - it's voluntary, not coerced - while fixing many of the bad parts. And the pitch is actually similar to the pitch for charity: "contribute a bit to something you believe in." It's just that the mechanism is much better.

### Commonality is a tool that private charities can use

The section above compares Commonality with private charity and points out ways that Commonality improves on the charity model. But the point here isn't "charities are bad and we should replace them." It's that charities themselves can use Commonality as infrastructure.

Think about it from a charity's perspective. A charity already has:
  - A cause it cares about.
  - Donors who trust it.
  - Some expertise in evaluating which projects are worth funding.

What a charity *doesn't* love dealing with:
  - The overhead of running an organization (staff, offices, compliance, fundraising operations).
  - Donors who are skeptical about where their money goes.
  - The difficulty of convincing new donors that this charity, specifically, is worth trusting.

Commonality can help with all three. A charity (or even just a well-known individual associated with a charity) can act as a delegate: donors send funds via delegatable notes, the charity directs those funds toward aligned projects, and the entire chain is transparently visible onchain. The charity keeps doing what it's good at - evaluating projects and making funding decisions - but without needing to run a whole organization around it. No bank accounts to maintain, no annual reports to produce (the blockchain *is* the report), no overhead to justify.

And this is a much easier sell than getting government to adopt any of this. A charity director doesn't need to win an election or pass a law. They just need to say "hey donors, here's a new way to give to our cause - you get full transparency, your money is refunded if we don't hit our target, and you can revoke your delegation at any time." That's a pitch that makes the charity *more* attractive to donors, not less.

It also helps with the trust problem. A new charity faces a brutal chicken-and-egg: you need donors to trust you, but donors want to see a track record before they trust you. With Commonality, a new delegate can start small - direct a few small delegatable notes toward good projects - and their track record is right there onchain for anyone to verify. No need to incorporate a nonprofit, hire an accountant, and produce glossy annual reports just to demonstrate that you're trustworthy.

In short: existing charities can adopt Commonality to reduce their overhead and increase their transparency, and new charitable efforts can skip the "form an organization" step entirely. Either way, the donors win.

## And we can do this *without* much need for coordination

### Examples of how this system avoids needing coordination

  - Signing a statement costs you nothing and doesn't require anyone else to have signed it. You don't even need to compromise on the exact wording and choose the most-popular statement that sorta vaguely says what you want - just say exactly what you want to say, implication attestations will connect you with others who are saying similar things.
  - Trusting attesters is an individual choice. No need to collectively agree on who the "official" implication attester is. You trust whoever you trust, your neighbour trusts whoever he trusts. If an attester starts producing bad attestations, each person can individually stop trusting that attester - no need to coordinate a collective "vote of no confidence."
  - Pledging to an assurance contract risks nothing if others don't join.
  - Starting a project requires no permission. Anyone can create an assurance contract. There's no application process, no committee to approve your project proposal, no platform that has to list you. You just click the button. ("Publish, then filter.")
  - Successfully crowdfunding one project is useful even if this system doesn't take over the entire world.
  - Delegating to someone you trust is a single personal decision. We don't need to agree on who should be our delegate to the legislature in this district; delegate to whoever you individually want.
  - Also, delegation is revocable at any time - you're not committed to this delegate for the next four years. If you hand him a bit of money and he uses it for something you don't like, just turn off the spigot.
  - Also, delegate $X to Alice for cause C and $Y to Bob for cause D. No need to find one delegate to represent you on all issues.
  - Attesting that a project is aligned is something any individual can do. We don't need to agree on who should be the gatekeepers for determining project alignment.
  - We don't need to coordinate to pool our funds in one particular centralized treasury, and we don't need to agree on who should control that treasury. Many separate groups/individuals is fine, we can all contribute to an assurance contract we all like.

### General patterns/principles of avoiding the need for coordination

Patterns in the above:
  - Individualization. No need for collective agreement. No leadership to agree on, no charter to ratify. This also enables organic alliances: implication attestations let two disparate groups discover shared ground and fund overlapping projects, without either group needing to compromise on their specific wording or even be aware of each other upfront.
  - Scales down. (Assurance contract system is useful even for a single project. Delegation system is useful to you if you use it, even if no one else uses it.) There's no need to win everything, no threshold you have to clear before the system becomes useful.
  - It's nearly costless to try-and-fail, even for each individual little decision. (Assurance contract refunds if threshold not met, delegation revocation.) No need to be certain that even this one small thing will succeed, let alone that the entire system will succeed. There's no need to be confident that this is all a great idea before trying it out.
  - "Publish, then filter." A big insight of the Web 2.0 era was that we can reduce the need for coordination by moving away from the "centralized gatekeepers filter the applications and then only publish the best stuff." No need to coordinate on the gatekeepers. Anyone can just publish whatever they want, anyone can signal-boost whatever they want; this might produce a huge mass of mostly-garbage, but then we can promote the best stuff.

### Pitches to various types of users, and why they're viable

Of course a cause still does need to actually gather users - get donors to pledge money, get doers to start projects. But it's not a horrible coordination problem either. The pitch can be:
  - "Here's this one small project we're trying to get funded." (NOT "here's our plan to persuade half the country to vote for our new political party.")
  - "Want to contribute financially to a particular cause? Pledge some money per month, delegate to whoever you want, watch the decisions with complete transparency if you want, revoke at any time. This allows you to contribute-while-being-lazy *right now*; it doesn't depend on what anybody else does."
  - "Want to help aligned projects gain visibility? Just vouch for a few people you trust - not even in any major way, just 'if he says project P is aligned, it's probably aligned.'"
  - "Have an idea for a project aligned with cause C? There's $X available, in the hands of Y delegates who are actively looking to direct that money towards C. You probably even know some people whose alignment attestation would bring significant visibility to your project. Also, feel free to write up your project's mission statement using language that satisfies you; the implication system will take care of connecting it to the causes that others have said they're interested in funding."
  - "Donors and delegates, don't even worry about trying to predict which projects *will be* successful. If you don't feel confident that you can do that, it is perfectly fine and actually extremely valuable to buy-and-burn the tokens of public-good projects that have already proven their value. Even if there's a project that *still needs* funding in the here and now, it's perfectly fine for you to decline to fund them in-advance but to publically proclaim that you'll retroactively buy their tokens if they succeed. And you'll still receive social recognition (if you want it) for your financial contribution, even if that contribution is retroactive."

## Censorship resistance

And because the system runs on smart contracts and IPFS rather than through any centralized organization, it has no chokepoints for a hostile government to attack:
  - No bank accounts to freeze (funds live in smart contracts, not custodial accounts).
  - No platform to ban (statements are on IPFS, beliefs are onchain transactions).
  - No organization to target (there's no "Commonality Inc." to sue, sanction, or raid).
  - No treasury to seize (funding is per-project, not pooled in one place).
  - No leadership to arrest or coerce (delegation is person-to-person across many individuals).

## Bottom line

So the response to "the government is hostile, how do we fund public goods?" isn't "organize a massive political movement" - it's "just start using this." Each additional participant makes it work a little better, and there's no single point of failure that can shut the whole thing down.

## Won't this be used for evil?

Ugh, probably.

This system is meant as a neutral tool, usable for helping people coordinate. It's certainly going to end up being used for purposes that we would consider wrong.

I'm not really inclined to try to prevent that (e.g. by moderation/censorship). For one thing, any moderation mechanism would be a chokepoint that a hostile government could capture.

Still, does the use of this system for evil mean that I shouldn't build it?

I dunno. I guess I'm kinda just expressing some optimism regarding humanity: I think people are more sane/good than our current systems might suggest, and if people in general had the ability to make public-goods happen, the result would be overall more good than not.
