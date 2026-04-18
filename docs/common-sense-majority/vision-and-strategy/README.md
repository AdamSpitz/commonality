# Common Sense Majority

## Elevator pitch

See [here](./elevator-pitch.md).

## Just trying to get this whole idea straight in my own head

If I say "I'm making a movement for moderates" it sounds like something lame that I've seen a dozen times before. I think this system actually has a chance of working. I think it's genuinely different from the attempts I've seen before. But it's hard to explain why.

First: I think there's a BUNCH of people who are FED UP with the polarized inflammatory extremist nonsense. Some people who'd be glad to put up some money (as long as enough other people do), some people who would be glad to write up their perspectives and read the other side's perspectives and make an honest respectful attempt to communicate across the aisle, lots of people who would be glad to read that stuff. Like, I think there's a market for this.

But the situation is more complicated than just saying there's a "market", because:
  - (a) social-media content and a healthy political atmosphere are public goods (non-rivalrous, non-excludable) which means they can't be produced adequately by normal markets;
  - (b) on top of that it's also hard to get people to participate because they've got lives and because wading into politics is miserable and because the "quiet moderate majority" is almost by definition not made up of the kind of people who are super-fired-up about politics; and
  - (c) the entire political system is set up in a way that makes it incredibly hard for a new political party to break in.

So the shape of the problem is something like:
  - (a) we need a public-goods-funding system that will actually work for this purpose (and our two primary public-goods-funding systems are government and big private charities, neither of which is a good fit);
  - (b) we need a way for quiet moderate types to talk with each other in a way that *isn't* horrifically miserable, as well as a way for them to participate financially with near-zero effort; and
  - (c) this can't be a normal political party but it does need to have some way of having influence.

Our solution is something like:
  - (a) We use Commonality, which is a public-goods funding system that works via crowdfunding and openness;
  - (b) We have a way of filtering for noninflammatoriness so the discussion isn't miserable, and we have this delegation system so it's incredibly easy to contribute money without having to think about it; and
  - (c) We can count up number of signers as well as amount of money flowing through aligned projects, so the movement might be able to throw its weight around.

Openness/permissionlessness is necessary but it's also a problem. So part of the idea here is to have a credibly-neutral mechanism in the middle: smart contracts, and also AI running open-source prompts (which is not quite verifiable in the same way that a blockchain is, but it's not bad). That is, people donate to the credibly-neutral thing and people write stuff aimed at the credibly-neutral thing. 



Short version?
  - Crowdsource funding and writing. Do this by having a credibly-neutral mechanism (crypto and open-prompt AI).


Interesting. Maybe this kind of movement really really needs credibly-neutral mechanisms? Because it's trying to cross sides.

Like:
  - I've seen various platforms that are like, "Here's a centrist take." Yeah, sure it is. Nobody's gonna trust it. It's not gonna get your side of the argument correct.
  - I've seen various platforms that are like, "Here's a left-wing take, here's a right-wing take." So what, that's annoying, I don't want to read the thing from the other side that's gonna piss me off.
  - I want someone (or something) from *my* side, someone *I* trust, to be filtering the stuff from the other side. If someone like *that* tells me, "Hey, read this, it actually makes some good points and reading it won't piss you off," I'd be more willing to read it.
  - In the current world, Who exactly is doing that filtering job?
  - But maybe we can have an AI do it. It won't get pissed off. And it can be trustworthy if we make the prompt open-source. (Not as bulletproof as having a ZK proof or whatever, but close enough.)
  - So the idea here is:
    - Have this credibly-neutral mechanism for *identifying* noninflammatory content. (Doesn't mean the content will even exist, but at least we could notice it if it did.)
    - Have a mechanism for people to put up money to *incentivize* content like that. (And make it credibly-neutral + individualized + lazy + not-plagued-by-free-rider-problem.)
      - Notice that this is just kinda *not really possible* in the legacy system. Seriously, how do you fire-and-forget "here's $X/month for noninflammatory social-media content"? You could find some content creator who's good at being noninflammatory and give him some money, but he's still a person, not credibly neutral. He's still going to be vulnerable to all the usual legacy incentives: sell out to a media outlet offering him more money, do clickbait/ragebait for ad revenue, etc.
    - Have a mechanism for finding *common ground* while still letting people say exactly what they want to say. (See [hidden majority content patterns](specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md) and [bridge creator](specs/product/bridge-creator.md).) This is something that I'm not sure I've seen before. We've got people coming from two sides that hate each other; they *think* of themselves as being left-leaning or right-leaning; they're not going to want to betray their side; they don't even believe in the same *facts* as the people on the other side (because the media is lying to everybody); and they're not going to have exactly the same values/policy-preferences or phrase things in exactly the same way as their counterparts on the other side. But still there is genuinely a lot of common ground. (See the content patterns to understand what I mean.) So I think it's going to be important to build up the kind of structures of signed-statements that I describe: here's the moderate-left statement that they naturally write themselves, here's the nudged moderate-left statement that they are in fact willing to sign even though it's not quite the statement that they would naturally write themselves (and, importantly, it is *not* the same as the moderate-right statement, and it reemphasizes the moderate lefties' commitment to the left-wing principles that they believe in, and it allows them to save face, and it makes clear that their support for this statement is conditional on the right-wingers not using it as an excuse to ignore the left-wing concerns, and so on - this is a statement that needed quite a lot of massaging in order to make it imply the common-ground statement while also still being acceptable to the moderate lefties), here's the corresponding moderate-right ones, and here's the common ground statement that is implied by both nudged statements. I don't think I've seen a structure like that before. I think it depends heavily on having a credibly-neutral noninflammatory content system in order to get people to look at it at all, let alone actually consider signing it.
    - Use that to build up a movement, as defined by head-count (how many people signed which statements) and funding-for-projects. That is, we've got this conceptspace thing where you can "sign" statements, which is basically just like surveys or polls or whatever, except that the implication-attestation system is actually an important improvement: not just for reducing the need for coordination on a single statement (because people will want to tweak), but also for finding the common ground between genuinely different statements. But the general idea is to notice, "Hey, we've got ten thousand people who've supported this!" And then also the whole funding-portal system, where we can direct funds towards aligned projects.
      - Again, notice that (I think) all of this depends on having the underlying mechanisms that people on both sides actually trust. Can't have support from both sides for content creators who are perceived as being compromised by the other side; it's important that the content is being blessed by *your* side's noninflammatory-content attester and that the money is being directed to them by *your* chosen delegates. Can't have money going through some sort of real-world organization that is perceived as being captured by the other side; it's important that it's done onchain. Can't expect people to directly sign the common-ground statement; they're going to want to sign their side's nudged statement (which implies the common ground), not sign the common ground directly.

(And I've got my own opinions/biases about where this might lead, in terms of "will the resulting common-sense majority end up looking more like the current moderate-left or the current moderate-right?" But it doesn't matter, because the goal here isn't to push some particular POV, the point is to create a credibly-neutral system that lets people talk to people on "the other side" and then see where that leads. It's about creating a fair/trustworthy/credibly-neutral *process*, not a particular outcome.)

So that's the idea. Now I need to try to clarify/distill/flesh-out/crystallize that thinking.
