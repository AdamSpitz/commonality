# The CSM mediator

A movement that crosses a political divide needs something more than a neutral platform. It needs an active mediator — something that knows the terrain on both sides, has ideas about where common ground could be found, and steers the conversation in those directions (in ways that are *verifiably transparent*). The CSM AI services (the [bridge creator](/specs/product/bridge-creator.md) and the CSM-specific explorer) play that role. Together, that's what we mean by **the CSM mediator**.

This document is about the vision. For how it's built, see [bridge-creator.md](/specs/product/bridge-creator.md) and the [nudger spec](/specs/tech/subsystems/nudger/README.md).

## A mediator, not a neutral tool

The mediator has opinions. It has ideas about what reasonable common ground might look like on each issue, and it actively steers users toward those areas: surfacing moderate statements from each side, synthesizing bridge statements, recommending noninflammatory content the user can stomach reading.

That sounds non-neutral, and it is. But [credible neutrality](./credible-neutrality.md) at the system level doesn't require every component to be neutral; it requires every component to be transparent and choosable. The mediator's strategies and curated content are open data — a set of heuristics (encoded as prompts) plus a curated list of statements it treats as anchor points for the territory it's mediating. If you don't like our mediator, you can ignore it, run someone else's, or run your own — see [trust-model.md](../trust-model.md) for how that works for nudgers in general.

The strategies and the curated list both evolve over time: the opinion landscape shifts, and our early ideas about which bridges are reachable will turn out to be partly naïve. That mutability is safe because nudgers are ephemeral — yesterday's suggestion has no lingering effect on today's support counts.

## Why a user opts in

The user's pitch to themselves, when they decide to listen to the mediator, looks something like this:

> *I want peace, civility, sanity. I'm grudgingly willing to hear the other side — but I'm not going to dive into the depths of their stuff, that'll just piss me off. What I'll do is listen to a mediator who understands my POV and theirs, and who can find areas where we already mostly agree, and who can point me at content from the other side that's been filtered for non-inflammatoriness. My agent will talk to your agent.*

That's a more honest framing than "engage with the other side." Most people aren't willing to do that directly, and there's no point pretending otherwise. The mediator exists precisely because direct engagement across the divide is unworkable for the median person — but agent-mediated engagement is.

A user who opts in is not agreeing to take the mediator's specific suggestions. They're agreeing to *hear* them. The decision about what to actually sign or read remains theirs.

## Three motivations stacked

A typical user's reasons for engaging look like this:

1. **They want peace, civility, sanity.** This is what brings them to the system at all.
2. **They're willing to listen — agent-mediated.** Not directly to the other side; through filters that surface only the noninflammatory, the moderate, the things that won't make them rage-quit.
3. **They want their own POV seen by the other side.** Not just to receive nudges, but to be heard.

The third motivation is where the mechanism gets interesting.

## Sanity-as-filter: how a user's POV crosses the divide

The mediator doesn't directly carry Bob's view to Alice. It doesn't say "here's what Bob thinks." What it does is scan the population of statements on each side, surface the **popular sane** ones, and look for overlap or near-overlap.

That's the filter, and it's the right one. Cross-side propagation only does work if the things crossing are things the other side can actually hear. An inflammatory take, even a popular one, doesn't bridge anything; a niche moderate take, even a sensible one, doesn't have the weight to move the picture. *Popular* and *sane* together — that's what makes a statement load-bearing for bridging.

Which gives Bob a real incentive structure:

- If Bob writes his view sanely — moderate framing, leaves room for the other side's reasonable concerns — and gets it popularized on his own side, the mediator has something to work with. His view becomes one of the popular sane statements that gets surfaced across the divide.
- If Bob writes inflammatorily, or his sane take stays niche, the mediator can't use it. It's not censored; it's just not load-bearing.

This is the heart of what makes the mediator more than a recommendation engine. It creates a within-side incentive to write reasonably and to popularize reasonable takes — *not* because reasonableness is a virtue, but because reasonableness is the channel through which your side's perspective reaches the other side. The mechanism rewards exactly the behavior the movement needs.
