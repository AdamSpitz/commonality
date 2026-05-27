# Common Sense Majority


## "What is this?"

It's an attempt to build a movement out of sane people with common-sense opinions (drawn from both left and right), to counteract the crazy polarization we're seeing in Western culture right now.

This is a hard problem, and it's been [tried and failed](./why-previous-attempts-fail.md) a dozen times before. We think this one has a chance of working. See [Why This Could Work](./why-this-could-work.md) for more detail, but the bottom line is that [better tech](./why-now.md) enables coordination without needing to agree on leaders, and lets us make [credibly-neutral](./credible-neutrality.md) infrastructure (i.e. stuff both sides can trust) that works at scale. We've also incorporated a handful of other underused ideas that I think are important (assurance contracts, fine-grained delegation, retroactive funding).


## "How does it work?"

Three things, working together:

- **Find common ground.** Lots of people on both sides tell the system what they think, in their own words. An [AI mediator](./mediator.md) (verifiably!) understands both sides and looks for the places where they already overlap, or nearly do, nudging them toward compatible positions. (It's a bit weird to call this a mediator, because it isn't mediating a discussion between the leaders of each side — it's mediating *en masse*.)
- **Make the majority visible.** The system keeps [running tallies](./why-does-tally-help.md) of how many people support what — including the people who never signed a given statement but signed something that *implies* it (so we don't need people to coordinate around one particular statement).
- **Fund what's aligned.** A [crowdfunding system](/docs/end-user/alignment/index.md) helps aligned projects and noninflammatory content actually happen. This isn't just "let's all express some pro-sanity sentiment"; there's a whole system for letting that sentiment bring funding into existence, and that funding can fuel aligned projects designed to spread the sentiment, so we get a feedback loop.


## "As a user, what do I actually *do*?"

TODO write this up more cleanly, but:
  - If you want to, you click the button saying "yes, I'd like the CSM mediator to show me suggestions for statements I might be willing to sign in the Tally UI." In the Tally UI, you'll be shown some suggestions. (Some of these will come with AI-attested noninflammatory social-media content that might persuade you to sign the statement.) You can click the Like button on statements you like. (Or write your own.)
  - If you want to, in the Content Funding website, you can donate money towards funding particular content items you like. Or you can use the Alignment website to donate towards noninflammatory content in general. (Or you can delegate some money that someone you trust can direct - see the LazyGiving docs.) You can also suggest particular content items to the noninflammatory-content AI attester.
  - If you want to, use the Alignment system to follow projects aligned with the general CSM cause; this might show you content creators, politican campaigns, or various infrastructure projects (hopefully including CSM itself, and the rest of the Commonality infrastructure projects) that you might want to donate to to help further the cause. (Yes, I'm using this project I built to ask for money to let me keep building it.)

There's no real functionality baked into the CSM website (although CSM does have the AI mediator service associated with it). The core functionality is all on the other sites: Tally, LazyGiving, Alignment, Content Funding.


## "Having an AI give me statements to sign sounds annoying and preachy and untrustworthy."

If we implement it badly, it really will be. But it's all opt-in and open and transparent and configurable, and the AI is (verifiably) instructed to be really careful not to be annoying in those ways. See [Why This Might Not Be Obnoxious](./not-obnoxious.md) for more detail.

In particular, see [the mediator doc](./mediator.md), and the [hidden-majority patterns](./hidden-majority-patterns.md) that it's instructed to look for.


## "What's the end goal?"

[What this looks like if it's successful](./what-success-looks-like.md):
  - on LazyGiving, there's lots of funding for noninflammatory social-media content
  - on Tally, there are big support numbers for reasonable common-sense views
  - there's also lots of funding and lots of support for meta-statements like "it'd be good if our society was run by the quiet middle rather than the crazy polarized extremes"


## "Are you a fund? A media company? A party?"

None of those. There's no organization holding money — funding flows through smart contracts. The content is normal social-media content, written by anyone, on existing platforms. There's no party to join. CSM is a protocol and a set of conventions on top of [Commonality](/docs/end-user/commonality/vision-and-strategy/README.md).


## "Do you have a hidden agenda?"

Sort of?

I've got my own opinions about where this might lead — about whether the resulting common-sense majority will end up looking more like the current moderate-left or the current moderate-right. But it doesn't matter. Everything I'm building here is either verifiably neutral or transparent and configurable. The point is to create a credibly-neutral *process* that lets people talk to people on the other side and see where that leads.
