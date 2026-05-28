# Common Sense Majority


## "What is this?"

On most polarized issues, the two "sides" that dominate public discourse are actually both minority positions. There's a majority — probably a supermajority — that holds an ordinary common-sense view. But nobody can see it, because the current system forces everyone to pick a team, and each team's position ends up defined by its loudest members.

CSM is an attempt to make that hidden majority visible: to build a movement out of the sane, common-sense people on both left and right, and counteract the crazy polarization we're seeing in Western culture right now.

The goal isn't complete agreement — that's both impossible and unnecessary. What matters is recognizing that there's a large group of people on "the other side" who are sane, decent, and workable. Once that moderate majority becomes visible, disagreements don't disappear, but they transform: from *"no communication is possible, our way of life is threatened, we must win at all costs"* into the ordinary kind of disagreement where people can talk, trade ideas, and usually find something both sides can live with.

This is a hard problem, and it's been [tried and failed](./why-previous-attempts-fail.md) a dozen times before. We think this one has a chance of working. See [Why This Could Work](./why-this-could-work.md) for more detail, but the bottom line is that [better tech](./why-now.md) enables coordination without needing to agree on leaders, and lets us make [credibly-neutral](./credible-neutrality.md) infrastructure (i.e. stuff both sides can trust) that works at scale. And there's a well-designed crowdfunding system baked in (see [LazyGiving](/docs/end-user/lazyGiving/index.md)), so the movement can spin up real funding, not just Likes.


## "How does it work?"

Three things, working together:

- **Find common ground.** Lots of people on both sides tell the system what they think, in their own words. An [AI mediator](./mediator.md) (verifiably!) understands both sides and looks for the places where they already overlap, or nearly do, nudging them toward compatible positions. (It's a bit weird to call this a mediator, because it isn't mediating a discussion between the leaders of each side — it's mediating *en masse*.)
- **Make the majority visible.** The system keeps [running tallies](./why-does-tally-help.md) of how many people support what — including the people who never signed a given statement but signed something that *implies* it (so we don't need people to coordinate around one particular statement).
- **Fund what's aligned.** A [crowdfunding system](/docs/end-user/alignment/index.md) helps aligned projects and noninflammatory content actually happen. This isn't just "let's all express some pro-sanity sentiment"; there's a whole system for letting that sentiment bring funding into existence, and that funding can fuel aligned projects designed to spread the sentiment, so we get a feedback loop.


## "As a user, what do I actually *do*?"

### Opt in

The one thing that actually makes you part of CSM is clicking the **Opt In** button. That tells the mediator it's allowed to show you suggestions: in [Tally](/docs/end-user/tally/index.md), you'll start seeing statements it thinks you *might* be willing to sign — sometimes alongside noninflammatory content from the other side that might persuade you. You're agreeing to *hear* suggestions, not to take them. You can ignore any of them, write your own, or opt back out anytime.

### Basic things you can do

- **Sign a statement.** Go to a Tally statement, read the noninflammatory content backing it, and click Like if you agree. For example (TODO: once we have the real site up, these should be links to the actual statements, not just inline examples):
  - *"Obviously police should be accountable when they abuse their power — but also obviously, don't defund the police."*
  - *"Deport people who've committed other crimes first; I can live with the fact that some peaceful illegal immigrants get deported and some don't."*
  - *"Break up / rein in the big tech platforms"* — signed by the left because of monopoly power and by the right over censorship, but it's the same statement.
- **Fund a piece of content.** Go to [Content Funding](/docs/end-user/content-funding/index.md) and put a dollar toward a piece of content you like.
- **Fund the genre.** Go to [Alignment](/docs/end-user/alignment/index.md) and pledge, say, $10/month toward noninflammatory content in general — then delegate it to someone you trust and never think about it again.
- **Follow the cause.** Use Alignment to follow aligned projects — content creators, political campaigns, or infrastructure projects (hopefully including CSM itself, and the rest of the Commonality infrastructure). (Yes, I'm using this project I built to ask for money to let me keep building it.)

**And you never have to touch the AI if you don't want to.** Signing statements on Tally is useful entirely on its own — those [supporter counts](./why-does-tally-help.md) are what make the hidden majority visible, whether or not you ever opt in to the mediator.


## "Having an AI give me statements to sign sounds annoying and preachy and untrustworthy."

If we implement it badly, it really will be. But it's all opt-in and open and transparent and configurable, and the AI is (verifiably) instructed to be really careful not to be annoying in those ways. See [Why This Might Not Be Obnoxious](./not-obnoxious.md) for more detail.

In particular, see [the mediator doc](./mediator.md), and the [hidden-majority patterns](./hidden-majority-patterns.md) that it's instructed to look for.


## "What does success look like?"

[The full picture is here](./what-success-looks-like.md), but in short: big support numbers next to genuinely reasonable common-ground statements, real funding flowing toward content that treats the other side fairly, and funding and support for people working to advance the general cause of "it'd be good if our society was run by the quiet middle rather than the crazy polarized extremes."


## "Who's running this? Where does my money go?"

Nobody's running it, in the sense you're probably worried about. There's no organization holding the money — it flows through automated rules that nobody, including me, can quietly override. No account to freeze, no board to capture, no operator to bribe. (Under the hood that's smart contracts on a blockchain, but you don't have to care about that part.) The content is normal social-media content, written by anyone, on the platforms you already use. There's no party to join.

If you don't want to take my word for any of it: the instructions we give the AI are open for anyone to read, and you can [choose whose judgment to trust](./trust-model.md) — including running your own version, or ignoring the AI completely.


## "Do you have a hidden agenda?"

Sort of?

I've got my own opinions about where this might lead — about whether the resulting common-sense majority will end up looking more like the current moderate-left or the current moderate-right. But it doesn't matter. Everything I'm building here is either verifiably neutral or transparent and configurable. The point is to create a credibly-neutral *process* that lets people talk to people on the other side and see where that leads.
