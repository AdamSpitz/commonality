# How Alignment works

Alignment is a thin layer over a few simple pieces. Once you've seen them once, the rest of the site makes sense.

## The one-sentence version

A *cause* is a statement. People *vouch* that specific projects fit that cause. Your *trust graph* picks whose vouches you see. Your *portal* is the list that comes out the other end.

## The pieces

### Causes are statements

A cause isn't a category someone hand-picked from a menu. It's just a [Conceptspace statement](../shared/key-ideas/statements-and-implication-graph.md) — a sentence somebody wrote and signed. "Rural communities deserve access to clean drinking water." "Open-source climate models should stay maintained." "Small-town journalism is worth saving."

Anyone can write one. Anyone can sign one. The statement's content-addressed ID is what other parts of the system refer to.

### Projects live on LazyGiving

Project pages, funding goals, contributor lists, refunds — all of that is on [LazyGiving](../lazyGiving/index.md). Alignment never owns projects. It just points at them.

### Vouches connect projects to causes

A *vouch* is an on-chain attestation: "this project is aligned with this cause." It costs nothing and commits you to nothing, but it's public and permanent. Your vouches are part of your reputation.

Vouching is the only way projects get into portals. There is no admin queue.

### Your trust graph decides whose vouches count

You name a handful of people — friends, organizations, domain experts — whose judgment you respect. Their vouches show up on your portals. So do the vouches of people *they* trust, transitively, out to whatever depth you've set.

You don't have to babysit this. Pick a few people once; the network does the work.

If you care about a cause and your portal is empty or full of junk, the fix is to follow someone whose taste matches yours — not to file a complaint with a moderator. There is no moderator.

### A portal is the result

Open a cause. Alignment computes: "Which projects has anyone in this user's trust network vouched as aligned with this cause?" That's the page. Browse it. Fund the projects you like — directly on LazyGiving, or by [pledging to the cause and delegating](pledge-to-a-cause.md) the funding decisions to someone else.

## The implication-graph trick

Here's the thing that makes this more than just hashtags.

Two people might care about the same cause but phrase it completely differently:

- "Rural communities deserve clean drinking water regardless of economic status."
- "Local communities should control their own water infrastructure."

Different statements. Different politics, even. But an implication attester (a person, or an AI) can publish: *the first statement implies a third one,* and *the second statement also implies that third one.* Now both groups' portals — when keyed to that third, more general cause — pull in the same projects. Neither side had to agree on framing, join a coalition, or know the other side existed.

This is what the [organic-coalitions](../commonality/vision-and-strategy/why-its-better/organic-coalitions.md) idea is about, applied to cause-funding. You write what you actually believe, in your own words; the implication graph finds your allies.

## Where abuse comes in (and what we have so far)

A vouching system with no gatekeeper has obvious failure modes: spam vouches, politically-motivated mis-vouches, fake projects, hijacked causes. Alignment's main defense is the trust graph itself — if a voucher isn't in your network, you don't see their vouches, full stop. Bad actors can shout into the void; they can't put junk on your portal unless someone you trust trusts them.

That defense is real but not complete. A few honest limits:

- **Sybil attacks on the trust graph.** If a trusted person mass-follows low-effort accounts, the rot propagates. Treat trust like a small, well-tended garden, not a follow-everyone-back social-media graph.
- **Project-creator credibility.** We don't yet have strong tools for project creators to post verifiable qualifications. This is a known gap.
- **Punishing bad vouches.** Reputation damage from bad vouches is the current mechanism, and it's slow. Stronger anti-abuse measures are an active area of work.

If you have ideas — or run into abuse in practice — that's useful feedback. The current thinking on stronger defenses (verifiable project credentials, trust-graph ergonomics, stake-and-slash, etc.) is collected in [specs/product/alignment-anti-abuse.md](../../../specs/product/alignment-anti-abuse.md).

## What this site is *not*

- **Not where projects are created.** Use [LazyGiving](../lazyGiving/index.md) for that.
- **Not a curated directory.** Nobody is approving listings. The portal you see reflects the network you've built.
- **Not a coordination point.** You don't need to "join" a cause. You just sign the statement (on [Tally](../tally/index.md)) or simply view its portal here.
