# Common Sense Majority: Vision and Strategy




### Why this is fixable now

"I'm making a movement for moderates" sounds like something lame that's been tried a dozen times. We think this system is genuinely different, because we have tech that was missing before.

  - **Blockchains** make it possible to hold money outside any human organization — no account to freeze, no board to capture, no operator to bribe.
  - **AI** makes it possible to do high-volume subjective work (connecting statements, evaluating content, synthesizing bridge positions) with open-source prompts that anyone can inspect, at a scale and consistency no human organization could match.

Together they enable the credibly-neutral protocol that previous moderate movements couldn't build. A handful of other underused ideas — assurance contracts, fine-grained delegation, retroactive funding — complete the picture. (See [why this is fixable now](../why-now.md).)

### Cross-partisan trust requires credible neutrality

A movement that crosses the political divide has a harder trust problem than a single-side movement: both sides need to believe the system isn't captured by the other side. No organization can credibly promise that — organizations can be captured. But a *protocol* can, if money flows onchain, AI refereeing uses open-source prompts you can read yourself, and you choose who you trust at every level. This [credible neutrality](./credible-neutrality.md) isn't a nice-to-have; it's structurally necessary for the specific problem CSM is trying to solve.

### Three products address the three failure modes

Each of the three problems above gets a [specific product](../three-products.md). Assurance contracts and delegation solve the public-goods funding problem (a). Noninflammatory content filtering and low-friction entry (just sign a statement) solve the mobilization problem (b). And the protocol produces political influence — head counts, funding flow, credible threats — without needing to be a party (c). None of this requires winning an election; the growth curve produces value at every step.

### How common ground actually gets found

This is the most original part. People sign statements in their own words. The implication graph connects them automatically, discovering [organic coalitions](/docs/end-user/commonality/vision-and-strategy/why-its-better/organic-coalitions.md) nobody had to build. For the hardest cross-partisan issues, the bridge creator (see `specs/product/bridge-creator.md` in the repository) goes further: it reads what moderate people on opposite sides wrote, notices they don't actually conflict, and synthesizes bridge statements. Each side signs *their* version (still clearly their side's statement), and the common ground is *implied* by both — nobody has to feel like they're betraying their tribe. The [hidden-majority patterns](../hidden-majority-patterns.md) describe the taxonomy of gap types this applies to. The bridge creator and the CSM-specific explorer together act as a [mediator](../mediator.md): an opinionated, evolving mediator that users opt into rather than a neutral tool.

### The trust model makes all of this work

Everything above depends on people on both sides actually trusting the system. The [trust model](../trust-model.md) has three layers: trustless infrastructure (onchain money — genuinely requires no trust), transparent subjectivity (AI with open-source prompts and published reasoning — low trust burden), and full configurability (choose your own attesters, delegates, nudgers — you don't even need to trust the operators). The system discovers common ground *despite* people having different trusted sources, which is what makes the common ground genuine.

### What success looks like

The [emotional core](../what-success-looks-like.md): a person who's been feeling isolated visits a statement page and sees *two million people feel the same way* — not because they joined a movement, but because the system revealed that they were all independently saying versions of the same thing. The practical core: funding portals attract cross-partisan money, content creators see demand for thoughtful writing. The political core: a demonstrated cross-partisan constituency with countable supporters and visible funding capacity that changes political calculations without being a party.


## What CSM does

Three specific things, built on top of Commonality's general infrastructure:

1. **Fund noninflammatory content.** Crowdfund social-media content that communicates perspectives across the political divide without being inflammatory. (See [noninflammatory content walkthrough](/docs/end-user/shared/use-case-walkthroughs/noninflammatory-content.md).)
2. **Find common ground.** Use AI (bridge creator, see `specs/product/bridge-creator.md` in the repository) and the [implication graph](/docs/end-user/shared/key-ideas/statements-and-implication-graph.md) to discover and synthesize positions that moderate people from opposing sides can both support. This is harder than just writing up an obvious compromise: people won't engage with content from the other side unless it arrives through trusted, noninflammatory channels, and the common ground often requires active AI synthesis rather than simple averaging. Credible neutrality isn't optional here — it's structurally necessary. (See the [hidden-majority patterns](../hidden-majority-patterns.md).)
3. **Make the majority visible.** Count supporters and funding flow to demonstrate that common-sense positions have massive cross-partisan support that nobody knew about. (See [CSM walkthrough](/docs/end-user/shared/use-case-walkthroughs/common-sense-majority.md).)

These three work together: noninflammatory content is the *mechanism* for getting bridge statements in front of people; the implication graph is the *structure* that connects independently-authored statements into visible common ground; and the supporter counts and funding portals are the *evidence* that a movement exists.

For how these relate to the other Commonality UI surfaces, see `specs/product/ui-domains.md` in the repository.


## What this is not

I've got my own opinions about where this might lead — about whether the resulting common-sense majority will end up looking more like the current moderate-left or the current moderate-right. But it doesn't matter. The goal isn't to push a particular point of view. The point is to create a credibly-neutral *process* that lets people talk to people on the other side and see where that leads. It's about a fair, trustworthy process — not a particular outcome.
