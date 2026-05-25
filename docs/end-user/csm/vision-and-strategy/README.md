# Common Sense Majority: Vision and Strategy

[Common Sense Majority](../README.md) (CSM) is a movement built on the [Commonality](/docs/end-user/commonality/vision-and-strategy/README.md) platform. It's an attempt to give a voice and funding power to the hidden moderate majority that's currently invisible because the political system is structured around two coalitions dominated by their loudest members.

## The simple version

The idea is actually very simple:

- Have an AI **mediator** who understands both sides and is trying to bring them together.
- Keep **running tallies** of how many people support what.

That's about it. The theory is that most people are sane, and that common ground can be found (even though currently the quiet sane majority has been carved up by the polarization machine into two camps who *think* they have no common ground).


### Why does the tally help?

The tally isn't just a vanity metric. An AI mediator watches the numbers and uses them to find bridges that have weight; a recurring *[moderate-left, nudged-left, moderate-right, nudged-right, common-ground]* pattern gives people a concrete way to join a cross-partisan coalition without leaving their side; and the funding portals turn visible support into actual money flowing toward content that serves the moderate majority. (See [why-does-tally-help.md](./why-does-tally-help.md).)

### Why couldn't this be done earlier?

Two new pieces of infrastructure. **Blockchains** make it possible to hold money credibly outside any human organization — no account to freeze, no board to capture. **AI** makes it possible to do high-volume subjective work (connecting statements, evaluating content, synthesizing bridges) with open-source prompts that anyone can inspect and re-host. Previous moderate movements were always *organizations*, and organizations get captured; a *protocol* can be credibly neutral in a way an organization can't. (See [why-now.md](./why-now.md).)

### Why this works even though most people won't engage with it

The mechanism doesn't depend on millions of people sitting down with an AI mediator — most won't, and that's fine. It depends on a few people on each side doing so, and the resulting common-ground statements spreading through that side's normal channels. Most users just hear about a statement from someone they trust and click Like, which is a normal low-friction action that does real work because the supporter counts are what makes the movement legible. (See [most-people-wont.md](./most-people-wont.md).)


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

This is the most original part. People sign statements in their own words. The implication graph connects them automatically, discovering [organic coalitions](/docs/end-user/commonality/vision-and-strategy/why-its-better/organic-coalitions.md) nobody had to build. For the hardest cross-partisan issues, the bridge creator (see `specs/product/bridge-creator.md` in the repository) goes further: it reads what moderate people on opposite sides wrote, notices they don't actually conflict, and synthesizes bridge statements. Each side signs *their* version (still clearly their side's statement), and the common ground is *implied* by both — nobody has to feel like they're betraying their tribe. The hidden-majority patterns (see `specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md` in the repository) describe the taxonomy of gap types this applies to. The bridge creator and the CSM-specific explorer together act as a [mediator](./mediator.md): an opinionated, evolving mediator that users opt into rather than a neutral tool.

Another key mechanism: **coalition unbundling**. Political coalitions package multiple issues into identity bundles ("I support LGBT people," "I'm pro-life") that people sign wholesale because rejecting any piece feels like betraying their side. The bridge creator can atomize these bundles into per-issue statements — and crucially, let people *reaffirm* their support for the parts they agree with while breaking from the one part they don't. This makes it safe to be precise rather than tribal, and reveals cross-partisan common ground that the bundled framing obscures. (For example, many people on both left and right support same-sex marriage but have doubts about the modern transgender movement — but the "LGBT" bundle hides that common ground.)

A key subtlety: on many issues, people won't concede anything unless they're confident the other side is also conceding in good faith. The [conditional-support structure](./conditional-support.md) ("I care about X, but I also agree with Y as long as you also agree with X") handles this — and it's not just rhetoric, it's what makes the implication graph's cross-partisan bridging legitimate.

### The trust model makes all of this work

Everything above depends on people on both sides actually trusting the system. The [trust model](./trust-model.md) has three layers: trustless infrastructure (onchain money — genuinely requires no trust), transparent subjectivity (AI with open-source prompts and published reasoning — low trust burden), and full configurability (choose your own attesters, delegates, nudgers — you don't even need to trust the operators). The system discovers common ground *despite* people having different trusted sources, which is what makes the common ground genuine.

### What success looks like

The [emotional core](./what-success-looks-like.md): a person who's been feeling isolated visits a statement page and sees *two million people feel the same way* — not because they joined a movement, but because the system revealed that they were all independently saying versions of the same thing. The practical core: funding portals attract cross-partisan money, content creators see demand for thoughtful writing. The political core: a demonstrated cross-partisan constituency with countable supporters and visible funding capacity that changes political calculations without being a party.


## What CSM does

Three specific things, built on top of Commonality's general infrastructure:

1. **Fund noninflammatory content.** Crowdfund social-media content that communicates perspectives across the political divide without being inflammatory. (See [noninflammatory content walkthrough](/docs/end-user/shared/use-case-walkthroughs/noninflammatory-content.md).)
2. **Find common ground.** Use AI (bridge creator, see `specs/product/bridge-creator.md` in the repository) and the [implication graph](/docs/end-user/shared/key-ideas/statements-and-implication-graph.md) to discover and synthesize positions that moderate people from opposing sides can both support. This is harder than just writing up an obvious compromise: people won't engage with content from the other side unless it arrives through trusted, noninflammatory channels, and the common ground often requires active AI synthesis rather than simple averaging. Credible neutrality isn't optional here — it's structurally necessary. (See [hidden-majority content patterns](/specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md) in the repository.)
3. **Make the majority visible.** Count supporters and funding flow to demonstrate that common-sense positions have massive cross-partisan support that nobody knew about. (See [CSM walkthrough](/docs/end-user/shared/use-case-walkthroughs/common-sense-majority.md).)

These three work together: noninflammatory content is the *mechanism* for getting bridge statements in front of people; the implication graph is the *structure* that connects independently-authored statements into visible common ground; and the supporter counts and funding portals are the *evidence* that a movement exists.

For how these relate to the other Commonality UI surfaces, see `specs/product/ui-domains.md` in the repository.


## What this is not

I've got my own opinions about where this might lead — about whether the resulting common-sense majority will end up looking more like the current moderate-left or the current moderate-right. But it doesn't matter. The goal isn't to push a particular point of view. The point is to create a credibly-neutral *process* that lets people talk to people on the other side and see where that leads. It's about a fair, trustworthy process — not a particular outcome.


## Elevator pitch

See [here](./elevator-pitch.md).

## FAQ

A more conversational walkthrough of common reactions: see the [FAQ](./faq.md).
