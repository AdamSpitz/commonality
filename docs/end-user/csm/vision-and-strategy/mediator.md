# The CSM mediator

A movement that crosses a political divide needs something more than a neutral platform. It needs an active mediator — something that knows the terrain on both sides, has ideas about where common ground could be found, and steers the conversation in those directions (in ways that are *verifiably transparent*). The CSM AI services (the [bridge creator](/specs/product/bridge-creator.md) and the CSM-specific explorer) play that role. Together, that's what we mean by **the CSM mediator**.

This document is about the vision. For how it's built, see [bridge-creator.md](/specs/product/bridge-creator.md) and the [nudger spec](/specs/tech/subsystems/nudger/README.md).

## A mediator, not a neutral tool

The mediator has opinions. It has ideas about what reasonable common ground might look like on each issue, and it actively steers users toward those areas: surfacing moderate statements from each side, synthesizing bridge statements, recommending noninflammatory content the user can stomach reading.

That sounds non-neutral, and it is. But [credible neutrality](./credible-neutrality.md) at the system level doesn't require every component to be neutral; it requires every component to be transparent and choosable. The mediator's strategies and curated content are open data. If you don't like our mediator, you can ignore it, run someone else's, or run your own — see [trust-model.md](./trust-model.md) for how that works for nudgers in general.

## Static strategies plus a curated list of statements

Concretely, a CSM mediator is two things:

1. **A set of strategies.** Heuristics like "look for moderate-left and moderate-right statements that don't actually conflict and synthesize a bridge." Encoded as prompts and (eventually) some structured policy.
2. **A curated list of statements.** A list of CIDs the mediator considers anchor points for the territory it's mediating. Because the statements live on Tally, the mediator knows how popular each one is and can use that signal.

Both are mutable, and they need to be:

- **The initial strategies will be wrong.** No one has done this before. The first version's ideas about what bridges are reachable on which issues will turn out to be partly right and partly naïve. We need to learn and revise.
- **The opinion landscape evolves.** New statements get written; positions move; what counted as "the moderate position" three years ago doesn't anymore. A frozen mediator would steer toward stale common ground.

Mutability is fine because nudgers are ephemeral (see [trust-model.md](./trust-model.md)) — yesterday's suggestion has no lingering effect on today's support counts.

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

## What success looks like for the mediator

A mediator is doing its job when:

- Users on each side are signing statements written sanely enough that the mediator can find bridges from them.
- The bridge statements it synthesizes are getting signed (modified versions on each side, with the common-ground statement implied by both — see [bridge-creator.md](/specs/product/bridge-creator.md)).
- Users who opted in report that what reached them from the other side was readable and not enraging.
- Over time, the curated statement list shifts as the territory does, without losing coherence.

It's failing when its bridges feel forced, when its curated list ossifies around stale framings, or when the moderate-sane statements on either side don't exist in enough volume for it to work with. The first two are fixable by editing strategies and curation. The third is the actual hard problem the movement is trying to address.
