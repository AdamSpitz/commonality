# Common Sense Majority: Vision and Strategy

[Common Sense Majority](../README.md) (CSM) is a movement built on the [Commonality](/docs/vision-and-strategy/README.md) platform. It's an attempt to give a voice and funding power to the hidden moderate majority that's currently invisible because the political system is structured around two coalitions dominated by their loudest members.

## The simple version

The idea is actually very simple:

- Have an AI **mediator** who understands both sides and is trying to bring them together.
- Keep **running tallies** of how many people support what.

That's about it. The theory is that most people are sane, and that common ground can be found (even though currently the quiet sane majority has been carved up by the polarization machine into two camps who *think* they have no common ground).


### Why does the tally help?

Suppose the system reports that 1.8 million people support a moderate-left statement on topic T, 2.1 million support a moderate-right one, and both imply the same common-ground statement. So what? Why does that change anything? A few answers:

- **The tally and the mediator feed each other.** The mediator needs to know which statements actually gain traction so it can find bridges that have weight; the mediator then helps those numbers grow. The numbers are useful even if nobody but the mediator looks at them, and — since the numbers are useful for other reasons too — the mediator is useful even to people who only look at the numbers and never directly engage with it.
- **Recurring patterns become legible — and give people a concrete bridge they can walk across without leaving their side.** The real situation is that there *are* genuine differences between the two sides *and* there's real common ground; the recurring shape — *[moderate-lefty statement, nudged moderate-lefty statement, moderate-righty statement, nudged moderate-righty statement, common-ground statement]* — gives words to that, and makes the pattern visible. You can look at those five statements and see a real pathway: a moderate-lefty signs the moderate-lefty statement, gets nudged into the nudged moderate-lefty statement, and the system correctly shows that statement implying the common-ground statement — and the same thing happens on the right. So this isn't an exhortation to abandon "your side" and join a new centrist movement. A moderate-lefty stays a moderate-lefty while *also* joining a growing coalition of sane people from both sides. That's a very concrete pattern for creating a bridge — and once it's been demonstrated on one issue, it gives future bridge-finding a reusable template instead of starting from scratch on every issue.
- **It rejiggers the us-versus-them.** Once that pattern is visible, moderates on each side have a concrete way to see and talk about their counterparts on the other side — not as "the other team," but as the people on the far end of a specific, named bridge. "Right versus left" starts becoming "the quiet middle versus the loud extremes," and moderate-left and moderate-right start seeing each other as natural allies against the extremists leading their own coalitions. ("Hey, a million people signed this moderate-righty statement that's actually pretty reasonable — I didn't realize there were that many of them. I'd rather work with those guys than with the nutjobs running my own party.")
- **The numbers connect to funding.** The Alignment funding portals turn visible cross-partisan support into actual money flowing toward content and projects that serve the moderate majority. (See [Commonality vision and strategy](/docs/vision-and-strategy/README.md).)
- **It shifts the broader discourse.** Most people will never touch the mediator or look at the Tally directly, but they're on social media, they read the news, they talk to friends. When visible cross-partisan supporter counts and synthesized common-ground statements start showing up in those channels, the ambient conversation shifts — and the people who never engaged directly get exposed to it anyway.


And the reason this couldn't be done until now is twofold:

- **Both sides distrust each other**, so the infrastructure has to be credibly neutral — money on a blockchain that nobody can capture, and AI whose prompts are open-source and can be re-hosted by *your* side if you don't trust ours. (See [credible neutrality](./credible-neutrality.md) and the [trust model](./trust-model.md).)
- **The mediator goes directly to the crowd, not between the leaders.** When we say "mediator," we don't mean a mediated meeting between the two sides' elites — the whole point is to show widespread mass support for positions that are *not* the ones being put forth by the politicians and media currently running the show. We mean a mass-scale mediator nudging *large numbers of individuals* toward sane common-ground positions. That's only possible if the mediator is AI.

So: a weird kind of mediation, done at scale. Conceptually still just "have a mediator between the sides, and count who supports what."


## Why this works even though most people won't engage with it

"Okay, I'll agree to hear the other side out, with a mediator present" is an attitude two parties to a dispute might take. It's not a normal attitude for everyday people in the realm of politics. We've tried to make the experience as palatable as possible (see the [mediator doc](./mediator.md) for the agent-mediated framing), but it's still a weird ask. Some people will do it. Most won't.

That's fine, because the mechanism doesn't depend on millions of people directly engaging with the mediator. It depends on a *few* people on each side doing so, and the resulting common-ground statements then spreading **virally and normally** through that side's existing channels. Two consequences:

- **Signing statements on Tally is useful even without touching the weird mediator stuff.** Most users will hear about a statement from a friend or a trusted source on their own side and click Like. That's a normal, low-friction action — "go make this number go up by one" — and it does real work, because supporter counts are what makes the movement legible.
- **The system still needs to be open to anyone in principle**, even though most won't use the agent-mediated parts. Three reasons: (1) existing leaders and influencers are to a significant extent corrupted, so we can't just curate them in; (2) growth works as a mix of bottom-up, top-down, and sideways spread, which requires the door being open at every level; (3) credible neutrality requires the answer to "this is just rigged bullshit" to be "go look at it yourself, it's all open and verifiable."

For more on the agent-mediated experience and how a typical user encounters the mediator, see the [mediator doc](./mediator.md). For a conversational walkthrough of common reactions ("how does it bring us closer?", "why would I voluntarily expose myself to this?"), see the [FAQ](./faq.md).


## The longer argument

The remainder of this document is the longer-form case for why each of those moving parts is necessary and how they fit together.

### How we ended up here

This polarization wasn't inevitable, but it is structural: first-past-the-post elections push parties toward their extremes, media dynamics amplify the loudest voices, and the result is that moderates on each side get sorted into opposing camps even though they probably have more in common with each other than with the radicals leading their coalitions. This project introduces new structural elements designed to counteract that — though starting from this already-polarized place makes the job harder.

### Previous attempts fail for structural reasons

Centrist takes, petitions, third parties — [they all fail](./why-previous-attempts-fail.md) for three overlapping reasons: (a) a healthy political atmosphere is a public good, which means that normal markets can't produce it effectively, (b) moderates are hard to mobilize because wading into politics is miserable, and (c) the political system is structured to block new parties. Any approach that doesn't address all three is dead on arrival.

### Why this is fixable now

"I'm making a movement for moderates" sounds like something lame that's been tried a dozen times. We think this system is genuinely different, because we have tech that was missing before.

  - **Blockchains** make it possible to hold money outside any human organization — no account to freeze, no board to capture, no operator to bribe.
  - **AI** makes it possible to do high-volume subjective work (connecting statements, evaluating content, synthesizing bridge positions) with open-source prompts that anyone can inspect, at a scale and consistency no human organization could match.

Together they enable the credibly-neutral protocol that previous moderate movements couldn't build. A handful of other underused ideas — assurance contracts, fine-grained delegation, retroactive funding — complete the picture. (See [why this is fixable now](./why-now.md).)

### Cross-partisan trust requires credible neutrality

A movement that crosses the political divide has a harder trust problem than a single-side movement: both sides need to believe the system isn't captured by the other side. No organization can credibly promise that — organizations can be captured. But a *protocol* can, if money flows onchain, AI refereeing uses open-source prompts you can read yourself, and you choose who you trust at every level. This [credible neutrality](./credible-neutrality.md) isn't a nice-to-have; it's structurally necessary for the specific problem CSM is trying to solve.

### Three products address the three failure modes

Each of the three problems above gets a [specific product](./three-products.md). Assurance contracts and delegation solve the public-goods funding problem (a). Noninflammatory content filtering and low-friction entry (just sign a statement) solve the mobilization problem (b). And the protocol produces political influence — head counts, funding flow, credible threats — without needing to be a party (c). None of this requires winning an election; the growth curve produces value at every step.

### How common ground actually gets found

This is the most original part. People sign statements in their own words. The implication graph connects them automatically, discovering [organic coalitions](/docs/vision-and-strategy/why-its-better/organic-coalitions.md) nobody had to build. For the hardest cross-partisan issues, the bridge creator (see `specs/product/bridge-creator.md` in the repository) goes further: it reads what moderate people on opposite sides wrote, notices they don't actually conflict, and synthesizes bridge statements. Each side signs *their* version (still clearly their side's statement), and the common ground is *implied* by both — nobody has to feel like they're betraying their tribe. The hidden-majority patterns (see `specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md` in the repository) describe the taxonomy of gap types this applies to. The bridge creator and the CSM-specific explorer together act as a [mediator](./mediator.md): an opinionated, evolving mediator that users opt into rather than a neutral tool.

Another key mechanism: **coalition unbundling**. Political coalitions package multiple issues into identity bundles ("I support LGBT people," "I'm pro-life") that people sign wholesale because rejecting any piece feels like betraying their side. The bridge creator can atomize these bundles into per-issue statements — and crucially, let people *reaffirm* their support for the parts they agree with while breaking from the one part they don't. This makes it safe to be precise rather than tribal, and reveals cross-partisan common ground that the bundled framing obscures. (For example, many people on both left and right support same-sex marriage but have doubts about the modern transgender movement — but the "LGBT" bundle hides that common ground.)

A key subtlety: on many issues, people won't concede anything unless they're confident the other side is also conceding in good faith. The [conditional-support structure](./conditional-support.md) ("I care about X, but I also agree with Y as long as you also agree with X") handles this — and it's not just rhetoric, it's what makes the implication graph's cross-partisan bridging legitimate.

### The trust model makes all of this work

Everything above depends on people on both sides actually trusting the system. The [trust model](./trust-model.md) has three layers: trustless infrastructure (onchain money — genuinely requires no trust), transparent subjectivity (AI with open-source prompts and published reasoning — low trust burden), and full configurability (choose your own attesters, delegates, nudgers — you don't even need to trust the operators). The system discovers common ground *despite* people having different trusted sources, which is what makes the common ground genuine.

### What success looks like

The [emotional core](./what-success-looks-like.md): a person who's been feeling isolated visits a statement page and sees *two million people feel the same way* — not because they joined a movement, but because the system revealed that they were all independently saying versions of the same thing. The practical core: funding portals attract cross-partisan money, content creators see demand for thoughtful writing. The political core: a demonstrated cross-partisan constituency with countable supporters and visible funding capacity that changes political calculations without being a party.


## What CSM does

Three specific things, built on top of Commonality's general infrastructure:

1. **Fund noninflammatory content.** Crowdfund social-media content that communicates perspectives across the political divide without being inflammatory. (See [noninflammatory content walkthrough](/docs/use-case-walkthroughs/noninflammatory-content.md).)
2. **Find common ground.** Use AI (bridge creator, see `specs/product/bridge-creator.md` in the repository) and the [implication graph](/docs/key-ideas/statements-and-implication-graph.md) to discover and synthesize positions that moderate people from opposing sides can both support. This is harder than just writing up an obvious compromise: people won't engage with content from the other side unless it arrives through trusted, noninflammatory channels, and the common ground often requires active AI synthesis rather than simple averaging. Credible neutrality isn't optional here — it's structurally necessary. (See [hidden-majority content patterns](/specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md) in the repository.)
3. **Make the majority visible.** Count supporters and funding flow to demonstrate that common-sense positions have massive cross-partisan support that nobody knew about. (See [CSM walkthrough](/docs/use-case-walkthroughs/common-sense-majority.md).)

These three work together: noninflammatory content is the *mechanism* for getting bridge statements in front of people; the implication graph is the *structure* that connects independently-authored statements into visible common ground; and the supporter counts and funding portals are the *evidence* that a movement exists.

For how these relate to the other Commonality UI surfaces, see `specs/product/ui-domains.md` in the repository.


## What this is not

I've got my own opinions about where this might lead — about whether the resulting common-sense majority will end up looking more like the current moderate-left or the current moderate-right. But it doesn't matter. The goal isn't to push a particular point of view. The point is to create a credibly-neutral *process* that lets people talk to people on the other side and see where that leads. It's about a fair, trustworthy process — not a particular outcome.


## Elevator pitch

See [here](./elevator-pitch.md).

## FAQ

A more conversational walkthrough of common reactions: see the [FAQ](./faq.md).
