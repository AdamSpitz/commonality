# Common Sense Majority


## "What is this?"

It's an attempt to build a movement out of sane people with common-sense opinions (drawn from both left and right), to counteract the crazy polarization we're seeing in Western culture right now.


## "That sounds like something that's been tried and failed a dozen times before."

[Yes](./why-previous-attempts-fail.md). This is a hard problem! Moderates are hard to mobilize, everyone (very reasonably) wants someone else to do it, the whole system has structural forces pushing toward polarization, and we're *starting* with an already-very-polarized population.


## "And yet you think this has a chance of working?"

The difference is that we have [better tech](./why-now.md) (basically AI + blockchains), which might actually make a difference because it enables us to create structural forces pushing in the direction of sanity. In particular, we can now enable coordination without needing to agree on leaders, and we can make [credibly-neutral](./credible-neutrality.md) infrastructure (i.e. stuff both sides can trust) that works at scale.

A handful of other underused ideas — assurance contracts, fine-grained delegation, retroactive funding — complete the picture.


## "How does it work?"

Three things, working together:

- **Find common ground.** Lots of people on both sides tell the system what they think, in their own words. An [AI mediator](./mediator.md) (verifiably!) understands both sides and looks for the places where they already overlap, or nearly do, nudging them toward compatible positions. (But it's a bit weird, because this AI mediator isn't mediating a discussion between the leaders of each side — it's mediating *en masse*.)
- **Make the majority visible.** The system keeps [running tallies](./why-does-tally-help.md) of how many people support what — including the people who never signed a given statement but signed something that *implies* it. That hidden number is the thing nobody's ever been able to count before.
- **Fund what's aligned.** A [crowdfunding system](/docs/end-user/alignment/index.md) helps aligned projects and noninflammatory content actually happen — so the majority isn't just a sentiment, it's an economic force.


## "That sounds suspicious. How does it 'bring us towards compatible positions'?"

It doesn't put words in your mouth. It looks for places where you and the other side already overlap, or are *close* to overlapping, and *suggests* slightly-different statements you *might* be willing to sign. You don't have to. The system doesn't *assume* you'll sign the modified statement. But you might find that you're willing to.


## "What kinds of modified statements?"

Various kinds. The full taxonomy is in [hidden-majority patterns](./hidden-majority-patterns.md), and we expect to figure out more as we go along, but here are some examples:

- **No actual modification of your position** — just a statement that makes it clear you *don't* oppose a point that's important to the other side. (You'd be surprised how often the loudest version of "your side" implies opposition you don't actually feel.)
- **A small concession that's not very important to you and very important to them.** Asymmetric trades exist; the bridge-finder looks for them.
- **Conditional agreement** — "*if* the other side is correct about X, then I'd accept Y." This lets you commit without conceding facts you don't believe. (i.e. "I think your supposed facts are bullshit, but *if* it was true, I'd agree with your response to it.")
- **Bilateral assurance** — "I care about X, but I also accept Y as long as you also accept X."

If any of these feels wrong or coercive, just don't sign it, or write your own alternative. The AI mediator's prompts are written to be very careful *not* to put words in your mouth; that wouldn't work (people would just reject it). The whole CSM thesis is that it doesn't have to put words in your mouth, because most people on both sides are already moderate and reasonable, and the differences are bridgeable or even nonexistent. The mediator's job is to *reveal* that, not to manufacture it.


## "How does the system know that a million people are 'saying the same thing' when they all wrote different words?"

That's the [implication graph](/docs/end-user/shared/key-ideas/statements-and-implication-graph.md) doing its work. People sign statements in their own words; the graph connects them automatically, working out which statements imply which others — so it discovers [organic coalitions](/docs/end-user/commonality/vision-and-strategy/why-its-better/organic-coalitions.md) that nobody had to organize. A statement page can then honestly say "50,000 people signed this exact wording, and 2 million more signed something that implies it." Nobody had to coordinate; the common ground was already there, *implied* by what people independently believed. The mediator's bridge statements are what make it visible — each side signs *their* version, still clearly their side's statement, and the overlap is implied by both.


## "Why should I trust you when you say that?"

You don't have to. The [mediator's](./mediator.md) strategies and LLM prompts are open — you can read them yourself. If you still don't trust our version, you can run your own, or use someone else's, or ignore the AI entirely and just sign statements directly. (See the [trust model](./trust-model.md).)


## "Still, why would I voluntarily expose myself to this so-called 'mediator' at all?"

Three reasons (also expanded in the [mediator doc](./mediator.md)):

- **You're tired of the polarization.** You're fed up. You want peace and sanity.
- **You want your ideas seen by the other side**, and you know that they're never going to give any real credence to anything they read directly from your side's info sources. They'll only pay attention to info that's filtered through someone who understands *their* side's point of view - like the CSM mediator. So you want the mediator to know what you think, so that it'll present your views to them.
- **It won't be that bad.** The whole experience is designed to be palatable, opt-in, and revocable. The mediator understands *your* side's point of view too, and it's filtering for noninflammatory; it's not going to fling the worst of the other side at you.

## "Isn't 'agreeing to listen with a mediator present' a weird thing to ask of normal people?"

Yup! It's the kind of attitude two parties to a dispute might take, not the kind of attitude everyday people normally have about politics. We've tried to design the system so it's as palatable as possible, but it's still a weird ask, and [most people won't do it](./most-people-wont.md).

That's fine. The mechanism doesn't depend on millions of people directly engaging with the mediator. It depends on a *few* doing so on each side, and the resulting common-ground statements then spreading **virally and normally** through that side's existing channels — friends, trusted voices, the ordinary social-media stuff. Most people will encounter a CSM statement the same way they encounter anything else: someone they trust says "go click Like on this." That's a pretty normal thing to do.


## "So I can use this without engaging with the weird mediator stuff?"

Yes. Signing statements on Tally is useful all by itself. Supporter counts are what make the movement legible — you don't need to read noninflammatory content from the other side or interact with the mediator to make those numbers go up.


## "Given that this mass-scale AI-driven mediation idea is so weird, why are you doing it that way? Why not just do mediation between vetted voices?"

Three reasons:

1. **The existing leaders and influencers are to a significant extent corrupted** — they're a major part of the problem CSM is trying to route around. Curating them in would defeat the point.
2. **Growth has to work bottom-up, top-down, and sideways.** Sometimes a statement reaches a famous person from below; sometimes a famous person posts about it and their followers try it; sometimes friends pull each other in. Closing any of those channels breaks the spread.
3. **Credible neutrality requires that the answer to "this is just rigged bullshit" is "go look at it yourself."** That's only true if the system is genuinely open and inspectable.


## "Why does tallying up the number of signers even help? Who cares if some statement has a bigger number next to it?"

The tally isn't just a vanity metric; it's actually being used, by both the AI mediator and the cause-funding system. See [why does Tally help](./why-does-tally-help.md).


## "I don't really get it. What does this look like, in a down-to-earth practical everyday sense?"

The [emotional core](./what-success-looks-like.md): a person who's been feeling isolated visits a statement page and sees *two million people feel the same way* — not because they joined a movement, but because the system revealed that they were all independently saying versions of the same thing. The practical core: funding portals attract cross-partisan money, content creators see demand for thoughtful writing. The political core: a demonstrated cross-partisan constituency with countable supporters and visible funding capacity that changes political calculations without being a party.

## "Are you a fund? A media company? A party?"

None of those. There's no organization holding money — funding flows through smart contracts. The content is normal social-media content, written by anyone, on existing platforms. There's no party to join. CSM is a protocol and a set of conventions on top of [Commonality](/docs/end-user/commonality/vision-and-strategy/README.md).


## "Do you have a hidden agenda?"

Sort of?

I've got my own opinions about where this might lead — about whether the resulting common-sense majority will end up looking more like the current moderate-left or the current moderate-right. But it doesn't matter. Everything I'm building here is either verifiably neutral or transparent and configurable. The point is to create a credibly-neutral *process* that lets people talk to people on the other side and see where that leads.


## "Where do I go to read more?"

- [Why previous attempts fail](./why-previous-attempts-fail.md) and the [three products](./three-products.md) that address them.
- [Why this is fixable now](./why-now.md) — what AI and blockchains change.
- [The mediator](./mediator.md), the [hidden-majority patterns](./hidden-majority-patterns.md) it works from, and the [trust model](./trust-model.md) that keeps it choosable.
- [What success looks like](./what-success-looks-like.md), in human terms.
