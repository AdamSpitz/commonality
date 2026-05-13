# FAQ

A more conversational walkthrough of the kinds of reactions a normal person has when they first hear about CSM. The substantive answers are spread across the rest of the docs; this is meant as an accessible entry point.


### "What is this?"

Lots of people on both sides tell the system what they actually think. The system tries to bring you closer to them, and bring them closer to you.


### "That sounds suspicious. How does it 'bring us closer'?"

It doesn't put words in your mouth. It looks for places where you and the other side already overlap, or are *close* to overlapping, and *suggests* slightly-different statements you *might* be willing to sign. You don't have to. The system doesn't *assume* you'll sign the modified statement. But you might find that you're willing to. (See [bridge-creator.md](/specs/product/bridge-creator.md) for how the synthesis works.)


### "What kinds of modified statements?"

Various kinds. The full taxonomy is in [hidden-majority content patterns](/specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md), but examples:

- **No actual modification of your position** — just a statement that makes it clear you *don't* oppose a point that's important to the other side. (You'd be surprised how often the loudest version of "your side" implies opposition you don't actually feel.)
- **A small concession that's not very important to you and very important to them.** Asymmetric trades exist; the bridge-finder looks for them.
- **Conditional agreement** — "*if* the other side is correct about X, then I'd accept Y." This lets you commit without conceding facts you don't believe.
- **Bilateral assurance** — "I care about X, but I also accept Y as long as you also accept X." (See [conditional-support.md](./conditional-support.md) for why this structure is load-bearing.)

If any of these feels wrong or coercive, just don't sign it, or write your own alternative. The system is trying very hard *not* to put words in your mouth, because it doesn't have to: the whole CSM thesis is that most people on both sides are already moderate and reasonable, and the differences are bridgeable or even nonexistent. The mediator's job is to *reveal* that, not to manufacture it.


### TODO: USER JUST ADDED THIS ONE QUESTION AND ANSWER, CLEAN IT UP A BIT: "Why should I trust you when you say that?"

You don't have to. Go read the mediator source code and LLM prompts yourself (TODO: insert link).  Heck, you can go *run* it yourself.


### "Still, why would I voluntarily expose myself to this so-called 'mediator' at all?"

Three reasons (also expanded in the [mediator doc](./mediator.md)):

- **You're tired of the polarization.** You're fed up. You want peace and sanity.
- **You want your ideas seen by the other side**, and you know that they're never going to give any real credence to anything they read directly from your side's info sources. They'll only pay attention to info that's filtered through someone who understands *their* side's point of view - like the CSM mediator. So you want the mediator to know what you think, so that it'll present it to them.
- **It won't be that bad.** The whole experience is designed to be palatable, opt-in, and revocable. The mediator understands *your* side's point of view too, and it's filtering for noninflammatory; it's not going to fling the worst of the other side at you.

### "Isn't 'agreeing to listen with a mediator present' a weird thing to ask of normal people?"

Yup! It's the kind of attitude two parties to a dispute might take, not the kind of attitude everyday people normally have about politics. We've tried to design the system so it's as palatable as possible, but it's still a weird ask, and most people won't do it.

That's fine. The mechanism doesn't depend on millions of people directly engaging with the mediator. It depends on a *few* doing so on each side, and the resulting common-ground statements then spreading **virally and normally** through that side's existing channels — friends, trusted voices, the ordinary social-media stuff. Most people will encounter a CSM statement the same way they encounter anything else: someone they trust says "go click Like on this." That's a normal action. (See the [README](./README.md) for the full version of this argument.)


### "So I can use this without engaging with the weird mediator stuff?"

Yes. Signing statements on Tally is useful all by itself. Supporter counts are what make the movement legible — you don't need to read noninflammatory content from the other side or interact with the mediator to make those numbers go up.


### "Given that this mass-scale AI-driven mediation idea is so weird, why are you doing it that way? Why not just do mediation between vetted voices?"

Three reasons:

1. **The existing leaders and influencers are to a significant extent corrupted** — they're a major part of the problem CSM is trying to route around. Curating them in would defeat the point.
2. **Growth has to work bottom-up, top-down, and sideways.** Sometimes a statement reaches a famous person from below; sometimes a famous person posts about it and their followers try it; sometimes friends pull each other in. Closing any of those channels breaks the spread.
3. **Credible neutrality requires that the answer to "this is just rigged bullshit" is "go look at it yourself."** That's only true if the system is genuinely open and inspectable.


### "Why would I trust the AI?"

You don't have to. The prompts are open-source — you can read them. The reasoning is published alongside each decision. If you still don't trust it, configure a different evaluator, run your own, or ignore the AI entirely and just sign statements directly. (See the [trust model](./trust-model.md).)


### "Are you a fund? A media company? A party?"

None of those. There's no organization holding money — funding flows through smart contracts. The content is normal social-media content, written by anyone, on existing platforms. There's no party to join. CSM is a protocol and a set of conventions on top of [Commonality](/docs/vision-and-strategy/README.md). (See the [elevator pitch](./elevator-pitch.md) for the longer version.)
