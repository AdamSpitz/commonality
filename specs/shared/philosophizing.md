# A bit more philosophizing

(Just trying to clarify the vision - how we think this system has the potential to end up reshaping the way some stuff is done.)


## Bunch of smaller ideas coming together

I have trouble describing this idea coherently to people, because in my head it's a collection of a bunch of ideas that I think ought to work together well and make a whole that's better than what we've got today.

  - Assurance contracts (i.e. Kickstarters) are important and underused as a mechanism for funding public goods. "I'll contribute a bit as long as enough other people do too" is very powerful.
  - Social recognition is a good motivator for funding public goods. (Like seeing the list of donors on a public building or some other big thing, except this can be for small things.) Can attach a "brought to you by" list to anything, via QR codes on real-world objects and so on.
  - Like Kickstarter but you can sell your shares: adding the secondary market enables retroactive funding, i.e. VC for public goods.
  - People are so lazy that the hassle of having to choose projects-to-donate-to explicitly is too much to expect of most. But delegation might help reduce this problem down to a single decision (to delegate those decisions to someone he trusts). And this can be done with great transparency and flexibility.
  - For these people who are actually making project-funding decisions themselves, it'd be good to have a single portal for viewing many potential projects that are aligned with this cause.
  - We can use AI to smooth over the concept space, so that we don't need to all coordinate on a particular statement.

## Contrast with big groups

Stop trying to do big groups. Big groups are awful. And we don't need them: we can get all the benefits of big groups in a much more individualist kind of way.

  - You don't need a single big group in order to count the number of members; as long as the individuals have unique (but possibly anonymized) IDs, it's fine to just count the number of unique members in the set-union of many groups. (e.g. How many people have bought any of these 17 NFTs?)
  - You don't need a single big discussion group or Discord; Twitter does the job just fine, and that way everyone can follow and not-follow whoever they want, with no need to argue over who's allowed to join or who's so annoying that they need to be kicked and so on.
  - You don't need a single big group treasury in order to do crowdfunding. Reify each potential project as its own separate thing (like a Kickstarter), and then there can be many individuals or groups who contribute to the same project.
  - You don't even need a single big group treasury in order to get relatively-efficient centralized-decision-making regarding funding; having a delegation system ought to get us somewhat close to that.


## Contrast with various ways of funding stuff

In the mainstream world, here are some ways that we fund stuff:
  - VC (effective at early funding, but doesn't work if no profit)
  - each project has a Kickstarter, people can spread the link to it via social media and then donate if they want to: (flexible and transparent, but most people won't put in the work to evaluate each project)
  - there's a centralized cause-specific fund, people donate to it, then the fund forwards that money to various specific projects (efficient centralized decision-making, but inflexible and opaque)
    - also note that government itself is the biggest example of this

We can get a best-of-all-three:
  - Retroactive funding gives us VC, even for public goods.
  - Delegation system gives us the efficiency of centralized decision-making.
  - Revocability and onchainness of the delegation system gives us the flexibility and transparency of just donating to stuff directly.

### Special note about government

This is obviously much more of a pie-in-the-sky kind of thing, but I'm kinda thinking of this as a potential (far-off future) replacement for "government collects taxes and then supposedly makes efficient centralized decisions and spends the money on public goods".

  - The delegation system is a much-improved version of "vote for your representative in the legislature."
  - The donations are voluntary rather than coerced, but the assurance-contract aspect gives you some of the same feeling of "I'm pitching in but only as long as many others do the same."
  - Transparency is much *better*.
  - The retroactive-funding aspect is a new angle on it. The "government's" job is now no longer to predict winners but just to identify them in retrospect.

I'm not saying I expect this system to replace government anytime soon. But in the spirit of Balaji's "network state" idea, having this system available means that any potential network state is hopefully not going to get stuck at the point of "yikes, we need to collectively fund stuff but that introduces a gigantic can of worms." Hopefully this system reduces the size of the can of worms: better representation, less coercion, better transparency, less need to predict winners in advance.

Also, more decentralized. Like, I'm speaking in terms of a "network state" as a coherent organized thing that can crowdfund whatever public-goods it needs, but the funding decisions aren't being made by any specific "leadership" group or "legislature" that could be attacked or captured or coerced; at the end of the day it's just people donating to these kickstarters.


## What the new world looks like

Having this system around just kinda enables public goods to *happen*.

  - See a project that you think ought to be done? Start the assurance contract.
  - Having trouble getting people to donate to the project? Just get them to pledge money to the cause, delegate the decisions to you or someone else they trust.
  - "What if the money is spent on people who don't actually get the project done?" No, you can delegate the money with the intention of funding projects *retroactively* after they've *already* produced value.
  - "What if the money is spent corruptly on projects that don't deserve it?" All the decisions will be transparent. You don't have to choose the projects, you can just review the decisions retroactively. You can't claw back the money, but you can cancel any future funding.
  - "What do I get out of this?" Your name will show up on the project and on the contribution boards (if you don't want to be anonymous).
  - blah blah


Right, so the big things we should be doing differently than the way things are currently done in the mainstream world:
  - Incept the cultural idea of *decoupling* the old "here's my money into the pot for this project that I hope will produce something useful in the future":
    - You're supposed to delegate some monthly money towards a cause, to someone you trust who wants to put in more time looking at specific projects.
    - You are *not* supposed to accept that the project itself is something you donate to unconditionally; a project's donation bin should come with a threshold and a deadline.
    - You are *not* supposed to just hope that it produces something useful in the future; you're supposed to donate *retroactively*.
  - Plus you can get social recognition (if you want it).
  - Plus the decision-makers (delegates) can have a portal to look at. (And you don't even need to coordinate on that one portal; the implication attestations mean that the portal will find stuff that people have tagged under a different-but-similar statement.)
  - Plus the project-creators don't need to get their project listed by some official committee or whatever; they just need *someone* within the trust network (which is much wider and more decentralized and more *personalized* than some tiny centralized committee) to attest that the project is aligned.





## "Nano" stuff

One of the neat things enabled by crypto is that it gives is democratized "nano" versions of a whole bunch of different concepts from the mainstream world.

Why?
  - negligible transaction fees, so doing smaller-scale things doesn't get bogged down by overhead from fees
  - can handle money without needing big bulky legal/financial bureaucracy

What we mean is:
  - nano-VC: A "venture capitalist" is just anyone who buys a token in an early-stage project, intending to resell it later after the project has proven its value. This can be small-scale stuff.
  - nano-crowdsourcing: Crowdsourced projects can be small.
  - nano-currency / cause-coins: A project's tokens are like a little currency showing support for the cause that that project is aimed at.
  - nano-trustee: Anyone can be given a delegated note saying "I trust you to put this money toward cause C."
  - nano-influencers: There'll be influencers trying to get this money to go to various projects.
  - etc.

## Won't this be used for evil?

Ugh, probably.

This system is meant as a neutral tool, usable for helping people coordinate. It's certainly going to end up being used for purposes that we would consider wrong.

I'm not really inclined to try to prevent that (e.g. by moderation/censorship).

I guess I'm kinda just expressing some optimism regarding humanity: I think people are more sane/good than our current systems might suggest, and if we had decent coordination tools (as opposed to our current systems of government and bureaucracy and so on) the result would be overall more good than not.
