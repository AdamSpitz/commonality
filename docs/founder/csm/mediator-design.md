# CSM mediator — design notes

Builder-facing design reasoning for the CSM mediator. The public [mediator doc](../../end-user/csm/vision-and-strategy/mediator.md) covers the vision (why it's an opinionated-but-transparent mediator, why a user opts in, how a user's POV crosses the divide). This covers how it's structured and how we'll know it's working.

For how it's built, see `specs/product/bridge-creator.md` and the [nudger spec](../../../specs/tech/subsystems/nudger/README.md).

## Static strategies plus a curated list of statements

Concretely, a CSM mediator is two things:

1. **A set of strategies.** Heuristics like "look for moderate-left and moderate-right statements that don't actually conflict and synthesize a bridge." Encoded as prompts and (eventually) some structured policy.
2. **A curated list of statements.** A list of CIDs the mediator considers anchor points for the territory it's mediating. Because the statements live on Tally, the mediator knows how popular each one is and can use that signal.

Both are mutable, and they need to be:

- **The initial strategies will be wrong.** No one has done this before. The first version's ideas about what bridges are reachable on which issues will turn out to be partly right and partly naïve. We need to learn and revise.
- **The opinion landscape evolves.** New statements get written; positions move; what counted as "the moderate position" three years ago doesn't anymore. A frozen mediator would steer toward stale common ground.

Mutability is fine because nudgers are ephemeral (see the [trust model](../../end-user/csm/vision-and-strategy/trust-model.md)) — yesterday's suggestion has no lingering effect on today's support counts. A nudge that turns out to be naïve does no permanent damage: it either gets signed (in which case it's now a real statement standing on its own) or it doesn't.

## Why the incentive structure depends on "popular AND sane"

The mediator surfaces the *popular sane* statements on each side and looks for overlap. That filter is load-bearing — it's not an aesthetic preference, it's what makes cross-side propagation actually work, and it creates the within-side incentive the movement needs (write reasonably, and your side's view becomes a candidate the mediator can carry across; write inflammatorily and it's not censored, just not load-bearing). The public doc explains this as "sanity-as-filter"; the design implication is that the curated list and strategies should both be tuned to weight *popularity × non-inflammatoriness*, not either alone.

## What success looks like for the mediator

A mediator is doing its job when:

- Users on each side are signing statements written sanely enough that the mediator can find bridges from them.
- The bridge statements it synthesizes are getting signed (modified versions on each side, with the common-ground statement implied by both — see `specs/product/bridge-creator.md`).
- Users who opted in report that what reached them from the other side was readable and not enraging.
- Over time, the curated statement list shifts as the territory does, without losing coherence.

It's failing when its bridges feel forced, when its curated list ossifies around stale framings, or when the moderate-sane statements on either side don't exist in enough volume for it to work with. The first two are fixable by editing strategies and curation. The third is the actual hard problem the movement is trying to address — and no amount of mediator tuning fixes it; it's a signal that the upstream work (getting sane statements written and popularized on each side) hasn't happened yet.
