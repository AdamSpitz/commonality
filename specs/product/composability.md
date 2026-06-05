# Composable assurance contracts (capabilities)

Assurance contracts compose. This document is the product-level "what becomes possible and why it's exciting"; the mechanics (the actual plug points, combinator semantics, and invariants) live in [specs/tech/subsystems/lazyGiving/composability.md](../tech/subsystems/lazyGiving/composability.md).

The headline: several things that *look* like distinct features turn out to be **compositions of primitives we already have** — not new contract types. The architecture deliberately separated three concerns — *measurement* (how much has been pledged), *judgment* (has the contract succeeded/failed), and *money* (who gets paid) — and made each a pluggable seam. Most of the value below comes from treating each seam as a slot rather than a fixed thing.

## Capabilities that fall out of composition

### Credible threats (no new primitive)
A standby "fund X if the province cuts the grant" contract is just an *inversion* of a "government keeps funding" trigger: it succeeds precisely when the trigger says funding stopped. This is the core mechanism behind the [localism / power-shift angle](./localism-movement.md), and it needs no new contract architecture — only a real-world-event oracle to invert.

### Milestone / tranche funding
Split a big project into a sequence of contracts where each tranche's release is gated on an attestation that the previous milestone actually delivered. Pledgers commit to phase 2 up front, but money only moves if phase 1 ships. Risk drops, so more people are willing to pledge to ambitious multi-stage projects.

### All-or-nothing bundles of interdependent goods
A block party needs a venue *and* a permit *and* a band. Fund all three as separate contracts joined by AND: each vendor runs their own contract, but no money moves unless the whole bundle clears. Generalizes the [block-party walkthrough](/docs/end-user/shared/use-case-walkthroughs/block-party.md) to interdependent sub-projects with different recipients.

### Federated regional coordination
Town-level contracts feed a regional meta-contract (e.g. "the project proceeds if ≥2 of 3 towns reach their local thresholds"). Each town's decision to participate is *itself* a local assurance contract, so the delegation chains stay local and revocability composes — you withdraw at your town's level, not the regional one. This is the [three-towns water-infrastructure walkthrough](/docs/end-user/shared/use-case-walkthroughs/local-funding-shift.md), and it's pure composition.

### Retroactive funding (emerges from pieces we already shipped)
We already have ERC-1155 contribution receipts *and* a secondary market for them. A retro-funding pool is just a contract whose trigger is an attestation that a project delivered real impact, and which then *bids for the receipt tokens of proven-successful projects*. Early believers hold receipts; the retro pool buys them at a premium. [Retroactive funding](/docs/end-user/lazyGiving/retroactive-funding.md) and "reward early believers" stop being bespoke features and become a composition of receipts + secondary market + an impact-attesting pool.

### Matching campaigns / leverage
A matching pool contributes to a project's measured progress as a formula over grassroots pledges (e.g. 1:1 match, or a concave quadratic-funding-style match). A donor sees their $10 unlock another $10. "Matching funds" is a progress-aggregation composition, not a new contract.

### Competing-approaches portfolios
Pledge to "whichever of these three competing designs reaches its threshold first" via an OR composition — backers express support for an outcome without having to pre-pick the winning team.

## Why this matters strategically

- **Fewer primitives to build, audit, and explain.** If credible threats, milestones, matching, retro funding, and federation are all compositions of a small combinator set plus oracles, we build and audit the combinators once instead of shipping a contract type per feature.
- **A trustworthy story.** Because conditions are immutable once set, a composed structure is frozen at deploy. That's exactly what makes a credible threat *credible* (nobody can quietly rewire it after pledges land) and what lets a pledger verify what they're committing to.
- **It's a moat of capability, not lock-in.** Open primitives that compose let third parties build verticals (the [movement sites](./ui-domains.md)) on top without our permission — which is the whole point of being a protocol rather than an organization.

## Cautions (product-facing)

- **Comprehensibility is the real constraint.** A deeply nested contract tree can be mechanically sound but incomprehensible to a pledger. The UI must be able to render "what am I actually committing to, and under what conditions does my money move?" for a composed structure, or we shouldn't expose that composition. Favor a small set of legible, named patterns (bundle, tranche, match, federation) over arbitrary trees.
- **Trust compounds.** Composing with someone else's condition means trusting their code. Product should lean on a whitelist of audited combinator/condition types rather than letting users wire in arbitrary addresses — see the tech spec for the security discussion.
- **Don't build the combinators speculatively.** Each combinator is only worth shipping when a concrete capability above is being productized. This doc is a map of what's *possible*, not a build queue.

## Sequencing

This is mostly post-MVP. The natural first composition to want is the credible-threat inversion (it unlocks the power-shift angle and needs only one new oracle plus a NOT-wrapper). Milestones and matching are the next most broadly useful. Federation and retro-pool composition are larger and depend on the others.

## MORE THINKING

A thought that's tickling me:
  - When I hear a story about a particular person who needs help, yes, I want to help out, but also I have this feeling of "I don't know how many *other* stories there are out there at approximately this level of need; I kinda want to have a broader sense of who's out there and who needs what, so that we as a community can coordinate effectively." (e.g. Imagine someone who needs a $100k lifesaving medical procedure, and five people who each need a $20k lifesaving medical procedure, and a charity is deciding how to allocate $100k that it has available. It sucks to have to make cold-hearted decisions like that, but better to save five lives than one.) (Different example: there's five people who each need a $20k lifesaving medical procedure, and there's a $100k intervention that would save ten lives but it's all-or-nothing. So you'd want to say "donate to the $100k thing *only* if we actually have the full $100k; if we only have $40k just save the two lives.")
  - Like, if there were a Public Goods Czar or a Charity Czar who had *all* the info, and *all* the potential donation money, and enough ability to look at everything and understand it, he could look at the whole picture and decide where to direct money. (This is what the government pretends to be, but it's awful at it.) The point of Commonality is that I want to achieve a similar effect (if possible) but via bottom-up decentralized means.
  - And one part of that might be that we need more coordination primitives. Assurance contracts are one, but maybe there are more, and maybe they're composable?
  - Let's think about aggregation:
    - The system currently has some ways of aggregating:
      - An Alignment board shows you an aggregate of many projects aligned with the cause. (Note that this is NOT an aggregate of projects that you have pledged money to or are currently pledging money to or have explicitly indicated interest in pledging money to.)
      - You can create a delegated note to delegate money to a particular delegate person, who can then use it (by splitting the delegated note) for multiple projects if he chooses.
      - But each note is a separate thing (e.g. you delegate some money to Alice and some to Bob, but there's no real connection between them). And each project you donate to directly is a separate thing.
    - So this doesn't feel like a clean or complete story, in terms of composition/aggregation.
  - Imagine that you had a dashboard of *all* the public-good/charity projects that you care about. In particular, ongoing ones or upcoming one-shots (which are roughly the same thing; an ongoing one is basically just "the next one-shot project in the series, followed by future ones", except that maybe you have ongoing funding set aside that you *intend* to put toward the ongoing future ones; see [recurring pledges](/specs/product/recurring-pledges.md)). It might help to imagine this as being analogous to what the above-mentioned imaginary Czar (or a government) might see if he were looking at a big dashboard of all the potentially-fundable projects, except that the imaginary Czar is funding the entireties of each project, whereas you're only contributing a portion. But still, you could have this big dashboard of all the public-good projects and charity projects you're contributing to.
    - And the reason *why* it would be valuable to think of these as an aggregate (not just in the shallow sense of "the website shows them all together on the same page", but in a deeper sense of "the smart contracts are interconnected" or at least "there's offchain code that is doing some coordination work between them") is because it lets you incorporate some composition operations:
      - here's my pool of pledgeable funds, and here's a prioritized list of projects I'd be interested in funding (with limits: up to $100 for at least X% of this one, etc.) *if there's enough in my pool*;
      - pledge to project P, but if P fails to make threshold by its deadline, the money goes back into my pool of pledgeable funds
      - I dunno, is this actually worthwhile? now that I'm describing it it sounds like it might be more trouble than it's worth
  - Would it make sense to think of a delegatable note as a Pledge? Like, a variant of a pledge to an assurance contract?


I dunno, thoughts?


## AI thoughts on the above

Here's my attempt to find the load-bearing idea underneath these musings, because I think there *is* one and it's tighter than it first appears.

### What you're actually reaching for: a bottom-up Czar is a personal allocation *policy*

The Czar fantasy is "one mind with all the info and all the money, optimizing globally." You can't have that bottom-up — but you don't need to. What you can have is: **each donor declares their own allocation policy, and the system executes it.** The Czar decomposes into N little personal Czars, each operating over only its owner's money and only its owner's declared priorities. That's not a watered-down version of the dream; for a donor it's arguably *better* than the real Czar, because it's *their* values doing the allocating, not a central planner's.

And notice: your two medical examples are not two illustrations of one idea — they're two *different* mechanisms, and they map exactly onto the two composition operations you list later:

- **"$100k available; one person needs $100k, five need $20k."** This is *substitution/triage across alternatives under a budget* — a knapsack. It needs a comparison of value across heterogeneous projects (one life vs. five). **The system cannot do this part**, and that's important to say out loud (more below).
- **"Fund the $100k all-or-nothing intervention only if the full $100k is there; otherwise just save the two you can afford."** This is *conditional priority with a fallback* — and it's purely mechanical. This one the system absolutely can do. It's your "pledge to P, but if P fails, money returns to pool" plus "fund this if there's enough in my pool," combined.

So one of your examples is the hard judgment problem and the other is the easy plumbing problem, and keeping them apart is the whole game.

### There are two different aggregations, and conflating them is why it "doesn't feel clean"

You noticed that the Alignment board is *not* an aggregate of what you've pledged. That's the tell. The system has (and should have) two distinct aggregate views:

- **The landscape** — "who's out there, what do they need, at what level of urgency." This is the Czar's dashboard. Alignment boards and funding portals are early versions of it. It's about *discovery*, and it is deliberately decoupled from your wallet.
- **The portfolio** — "what am I actually doing about it: my committed and reserved money, across all causes." This is the thing you're saying is missing. Today it's scattered — a note to Alice here, a note to Bob there, a direct pledge over there, with no connective tissue.

The portfolio is the genuine gap. And the thing that *bridges* landscape→portfolio — that turns "here's the field of needs" into "here's how my money flows across it" — is exactly the allocation policy from the previous section. So the missing primitive isn't a smart-contract feature; it's a **first-class "plan"** (call it a portfolio, a giving plan, whatever): a user-authored object that declares priorities, limits, conditions, and fallbacks, and which the dashboard renders and the system executes.

### The unifying technical move: make the *refund edge* composable

Here's the part I'm most confident is a real insight. The combinators in this doc so far all route **success**: AND/OR/threshold decide *when money moves to a recipient*. The credible-threat trick is the one exception — it inverts a trigger. But every pledge also has a **failure/refund edge**, and right now that edge dead-ends: a failed contract refunds to the pledger's wallet, full stop.

Almost everything in your MORE THINKING list falls out of one move: **treat the refund edge as a first-class output that can be wired somewhere, instead of a terminal.**

- "If P fails, the money goes back into my pool" = route P's refund edge into a note/pool rather than the EOA.
- "Fund the big all-or-nothing thing; if it doesn't clear, fund the small ones" = an **ordered fallback cascade**: wire A's refund edge into B's pledge edge, B's into C's. A new named combinator, and a very legible one ("if this doesn't happen, then try that").
- "A pool of pledgeable funds I draw down by priority" = a pool note whose disbursement is governed by a priority-ordered list, fed by incoming refunds.

Mechanically this is cheap-ish: if a failed assurance contract refunds *to the DelegatableNotes contract on behalf of the root* rather than to the EOA, the refund lands back as a note — i.e. back in the pool — and the cascade can continue. The plumbing is mostly "where does the refund go," not new contract types.

### Is a delegatable note a Pledge? — yes, they're the same substance

Your last question is the right one, and I'd push it further: **a note and a pledge are two dispositions of one underlying thing — reserved capital.** Reserved capital is money that's been set aside but not finally spent, and it always has three facets:

- an **authority structure** (who can act on it — the delegation chain),
- a **disposition** (where it's trying to go), and
- a **reclaim/refund path** (how it comes back if it doesn't get there).

A **note** is reserved capital with an *open* disposition and a human (or chain of humans) holding authority. A **pledge** is reserved capital with a *committed* disposition (one assurance contract) plus a success condition. So:

> **pledge = note + a chosen disposition (assurance contract X) + auto-spend-on-success + auto-reclaim-on-failure.**

And the inverse closes the loop with delegation: your "pool of funds allocated by a prioritized policy" is just **a note whose leaf — the thing holding spending authority — is a *policy* rather than a person.** The delegation subsystem already separates "whose revocable money" (the chain) from "who decides" (the leaf). Today the leaf is always a human. Let the leaf be a declared policy, and "delegate to Alice" and "let my rules allocate my pool" become the same operation with a different delegate. That is a genuinely satisfying unification, and it means the pool idea is *mostly already specced* — it's delegation-to-an-algorithm.

### What the system fundamentally *can't* do (and shouldn't pretend to)

The triage example — five $20k lives vs. one $100k life — requires comparing *value* across projects. No combinator computes that. The value judgment has to come from somewhere, and there are only three honest sources:

1. **The user**, via an explicit priority ranking in their plan.
2. **A delegate**, which is just "delegate to Bob and let Bob decide" — already supported.
3. **Attestations + trust**, i.e. impact attesters whose claims are filtered through Subjectiv. This is the same machinery retroactive funding leans on.

So the clean split is: the system does **mechanical allocation** (thresholds, limits, ordering, fallback cascades, refund routing); it does **not** do **value comparison** — that's supplied by the user's ranking, a human delegate, or the attestation/trust graph. The "bottom-up Czar" is mechanical-allocation-engine + judgment-supplied-from-outside. Keeping that boundary sharp is what stops this from quietly turning into "trust our central optimizer."

### Reuse the recurring-pledges pattern wholesale

The plan/portfolio doesn't need a big new on-chain surface. [Recurring pledges](./recurring-pledges.md) already established the right shape: a **public intent record** (indexable, foldable, the thing the UI and any credible-threat math reads) plus a **swappable off-chain executor** that performs ordinary on-chain ops. Generalize it: the allocation plan is a *richer* intent record (priorities, limits, conditionals, fallbacks), and the executor is a *slightly smarter* off-chain runner (a small solver) whose every action is an existing op — deposit, split, delegate, pledge, reclaim. Same intent/execution split, same "pokeable by anyone for robustness," same backing-strength display.

### So — is it worth it?

Your gut ("might be more trouble than it's worth") is half right, and the half it's right about is the important one.

The real cost isn't implementation — most of it is recombination, in the spirit of the rest of this doc. The real cost is the same one already flagged in **Cautions**: **comprehensibility**, made worse by *time*. A static composed tree is at least frozen and inspectable. A policy that allocates a pool by priority-with-fallbacks produces outcomes that depend on the *state of the world at execution time* — which projects happened to clear first, what was left in the pool when project C's deadline arrived. That introduces genuine hazards:

- **Execution-order races.** Two high-priority contracts both clear but the pool only covers one. Who wins — priority order, deadline order, whoever cleared first? Every answer is surprising to *some* user.
- **Adversarial timing.** If your pool drains by deadline order, a project can move its deadline to capture your money before a rival's contract resolves. The policy becomes a thing to game.
- **"I can't tell what my money will do."** The whole trust story rests on a pledger being able to answer "under what conditions does my money move?" A solver-driven pool is much harder to render legibly than a bundle or a tranche.

My recommendation, then:

- **Don't build the general personal-solver/pool.** It's the most Czar-like and the least legible, and it's the part your instinct is rightly wary of.
- **Do treat the refund edge as composable, and ship one named, legible combinator from it: the ordered fallback cascade** ("fund A; if A doesn't clear by its deadline, the same money tries B; then C"). It's the direct realization of your second medical example, it's trivially explainable in one sentence, its outcome is deterministic and inspectable, and it has no cross-project race because it's a single ordered chain of *one* donor's money. It slots right next to bundle/tranche/match/federation as a legible pattern.
- **Do build the portfolio dashboard** as a read-model over your reserved-capital graph (notes + pledges unified as "reserved capital," per above) — that's pure upside, no new contract risk, and it fills the aggregation gap you actually feel.
- **Treat the full priority-pool-with-limits as a research item**, gated on the comprehensibility problem being genuinely solved (a UI that can honestly answer "what will my money do?" for a stateful policy), and on a concrete demand for it — same discipline as "don't build the combinators speculatively."

The through-line: you're right that there's a deeper aggregation story than "a webpage shows them together," and right that it's about composition. But the deep version is *one substance (reserved capital) flowing through combinators, with the refund edge finally made first-class* — not a central optimizer, even a personal one. Ship the legible slice (cascade + portfolio view); shelve the solver until legibility is solved.

### Status update (implemented)

The load-bearing on-chain primitive for all of this — making the refund edge composable — has shipped: `DelegatableNotes.refundIntoNote` lets a receipt note from a *failed* assurance contract be refunded back into a settlement-token note rooted at the same delegation chain, so a failed pledge replenishes the same revocable pool it was funded from. SDK fold/decoder/action support and contract + fold tests are in place. Mechanics live in the [tech composability spec §4a](../tech/subsystems/lazyGiving/composability.md#4a-the-refund-edge-the-dual-of-seam-3). Still to do (and deliberately *not* yet built): the off-chain ordered-fallback-cascade executor and the portfolio dashboard read-model.
