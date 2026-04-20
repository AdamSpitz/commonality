# New-user experience and exploration

How a new user gets started and discovers content.

## The core tension

New users need guidance — the statement graph is unfamiliar, they don't know what conceptspace is, and they need a path from "I just showed up" to "I've signed some statements that represent my beliefs."

But the mechanisms that provide guidance (nudgers, suggestions, prompts to sign things) are inherently pushy. If they're too eager, they become the equivalent of a clingy app sending notifications you didn't ask for. Worse, because nudges touch on *beliefs*, being pushy feels manipulative rather than just annoying.

## Explorers are nudgers

An "explorer" and a "nudger" are doing the same thing: suggesting statements a user might want to sign. The difference is in *presentation* (a dedicated exploration page vs. contextual suggestions on pages you're already viewing) (NOTE: or even just separate dedicated pages - this is the one for exploring funding areas, this is the one that'll try to find common ground between you and the other side, etc.) and *strategy* (what the nudger is trying to accomplish), not in architecture.

This means explorers fit into the existing [nudger framework](../tech/subsystems/nudger/README.md). An explorer is a nudger with a particular strategy and a particular UI surface. The UI can differentiate between nudges from different nudgers and present them differently — an explorer's suggestions get a dedicated page/tab, while an implication-graph nudger's suggestions appear contextually on statement pages.

### Why this is the right framing

The original instinct was to separate "exploration" (pull-based, user-initiated) from "nudging" (push-based, system-initiated). But the meaningful distinction isn't pull vs. push — it's about the *goal* and the *UI surface*. The user still has to opt in (by opening the explorer page, or by trusting a nudger), and both systems are ultimately suggesting statements. Treating them as architecturally separate would mean building two parallel systems for the same underlying operation.

What *does* matter is that the explorer's UI surface respects the user's agency — it's a page you go to, not something that interrupts you. But that's a UI decision, not an architectural one.

## Goal-oriented explorers

The key insight: an explorer shouldn't try to map out all of your beliefs about everything. That's an unbounded problem with no clear payoff for the user. Instead, each explorer should be oriented toward a specific goal that the user actually cares about.

There are two main purposes for using this system:

- **Head count:** Signing statements, letting your head be counted, feeling like part of a bigger movement.
- **Funding:** Using the funding system as a doer, donor, delegate, or interested bystander.

Each purpose benefits from a different kind of exploration.

### Fundable Project Explorer

Goal: get a user from "nothing is known about you" to "I know which funding areas you're likely to be interested in."

A background LLM maintains a curated collection of statements that map the space of fundable projects. It watches for projects and their alignment attestations, delegatable-notes and their alignments, and builds a decision tree: a set of statements that routes users from broad interests to specific funding areas. The collection is small (dozens to low hundreds of statements) and non-redundant.

When the user opens this explorer, the system asks: "given what this user has already signed, which branches of this tree are already covered, and which should I suggest next?" This is a per-user LLM call, but it's cheap — the inputs are small (the user's signed statements plus the explorer's curated collection).

### Movement-specific explorers (e.g. CSM / bridge-creator)

Goal: elicit the information needed for a specific initiative.

The Common Sense Majority movement, for example, needs to know where people stand on specific issues in order to find common ground. A CSM explorer maintains a curated set of statements designed to efficiently elicit that information. It's a separate nudger from the bridge-creator (which synthesizes new compromise statements) — the CSM explorer figures out *where you stand*, and the bridge-creator uses that to suggest *where you might meet in the middle*.

Users opt into movement-specific explorers the same way they opt into any nudger: by adding it to their trusted nudgers list.

## The new-user entry point

When a new user arrives with zero signatures, the explorer should be prominent — a clear "Start here" path. It walks the user through:

1. "What is this system?" — a conversational explanation, adapted to what the user seems to already know.
2. "What's out there?" — showing high-level topic areas as statements the user can browse without commitment.
3. "What do you believe?" — helping the user articulate and sign their first few statements.
4. "What can you do with this?" — introducing funding portals, delegation, and other features once the user has some context.

The explorer doesn't need to cover everything in one session. It should feel like a natural conversation that the user can leave and return to. At some point the user will be like, "That's enough, I don't need to explore anymore" — that's fine, just close the page. There's no reason for the explorer to decide the user has "enough" signatures; the user will notice when the Funding tab comes alive.

## Why not formalize "nearness"?

When thinking through how an explorer should decide what to suggest, it's tempting to define a general "nearness" relation between statements — something richer than implication links but less specific than nudges. "I have an opinion about abortion" feels *near* "I am interested in the politics of abortion." "I have an opinion about abortion" breaks down into "I am pro-life" and "I am pro-choice." These feel like useful semantic links.

But formalizing nearness as a graph relation is the Semantic Web trap: you end up building ontologies, taxonomies, and spending forever on "is 'interested in' the same kind of relation as 'has an opinion about'?" It's exactly the kind of half-baked heuristic that [lean-on-ai.md](lean-on-ai.md) warns against.

The goal-oriented explorer architecture avoids this. The explorer's curated collection *is* the structure — it replaces what a general nearness relation would provide. And the per-user "which branches are covered?" check is a judgment call that an LLM handles naturally. Anti-correlations (don't suggest "I'm pro-life" when the user signed "I'm pro-choice"), redundancy (don't show five ways of saying "I lean right"), and topic relevance all fall out of the per-user LLM call without needing to be encoded as relations.

See [lean-on-ai.md](lean-on-ai.md) for more on this principle and how it applies to the explorer specifically.

## Nudge UX

As the user becomes more established, contextual nudges (from non-explorer nudgers) become relevant. See [nudge-ux.md](nudge-ux.md) for the full design — graduated visibility, surface area budgets, dismissal, user controls, and filtering strategy. The key point for new users: **contextual nudges should stay minimal until they've signed at least a few statements.** The explorer is the onboarding path.

## Relationship to content bootstrapping

See [content.md](content.md) for the broader content strategy.

The new-user experience depends on there being enough content in the system to explore. If the statement graph is nearly empty, even a great explorer can't help. The [seed content](../tech/subsystems/conceptspace/seed-content/README.md) and [content finder](../tech/subsystems/content-finder/) services address this from the supply side; explorers and nudgers address it from the demand/discovery side.

## Shareable links

People will find the site via links from others: "Hey, I bet you'd enjoy using this site because..." There should be a way for people to create links that suggest particular statement(s) to sign. This is separate from the explorer/nudger system — it's a direct entry point that bypasses exploration.

## What exists vs. what needs to be built

| Component | Status |
|---|---|
| Explorer spec | Specified ([explorer.md](../tech/subsystems/conceptspace/explorer.md)) |
| Explorer implementation | Not built |
| Fundable Project Explorer strategy | Not built |
| Movement-specific explorer strategies | Not built |

For nudge-related build status, see [nudge-ux.md](nudge-ux.md).
