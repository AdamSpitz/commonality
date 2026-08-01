# 0005. Founder-first: recruit vertical founders instead of operating generic sites

- **Status:** Accepted
- **Date:** 2026-07-31
- **Related specs:** [`specs/product/founder-first.md`](../product/founder-first.md), [`specs/product/marketing.md`](../product/marketing.md), [`specs/product/legal/operator-posture.md`](../product/legal/operator-posture.md), [`specs/product/ui-operator-posture.md`](../product/ui-operator-posture.md)

## Context

The original shape of the project was: we build the generic, purpose-neutral sites
(Conceptspace, Tally, LazyGiving, Aligning, Content Funding), we operate them, and
end users come to them directly. Two forces made that untenable.

**Legal.** The [operator-posture](../product/legal/operator-posture.md) analysis found
that "we're just a decentralized protocol" does not survive scrutiny while we are the
sole operator of every front door. Operating a universal, neutral marketplace that
displays arbitrary projects and routes arbitrary contributions is what attaches the
conduct elements of nearly every other risk to us: sanctions facilitation, content
liability after notice, in-kind political support, charitable-fundraising-platform
duties. The problem is not being a platform; it is being *the* platform for everything,
with no editorial principle to point at when we decline something.

**Product.** Distribution is inherently vertical-specific. The people who care about
civil political media are not reached the same way as people funding local public goods.
There is no credible umbrella-level growth motion for "Commonality," and the standing
objection "you've done nothing about distribution" assumed one was needed.

Both forces pointed the same way, which is why this was worth freezing rather than
leaving as a mood in the marketing doc.

## Decision

**Commonality is a platform whose customer is the vertical founder, not the end user.**

We build substrate and reference software; a founder stands up a vertical — positioning,
audience, a selection of substrate, and their own front door with their own policies —
and owns distribution and moderation for it. We run Civility and CSM ourselves *as
reference verticals whose purpose is to recruit other founders*, not primarily to
succeed on their own terms.

This yields the triage rule that governs platform work:

- Generic umbrella end-user growth → **not** our job.
- Making a founder's job easier → **core** job.
- Making Civility/CSM exemplary as reference verticals → **core** job.

## Alternatives considered

- **Stay the generic operator and manage the risk with procedures.** Rejected: the
  securities prong in particular isn't fixable with procedure, and the content/sanctions
  exposure scales with how universal the front door is. Being the neutral marketplace is
  precisely the posture that maximizes it.
- **Run no UI at all — pure protocol, ship contracts and SDK only.** Rejected: nobody
  adopts a substrate with no worked example. Verticals need something to copy, and
  founder recruiting needs something to point at. Hence *reference* verticals rather
  than zero.
- **Keep operating generic sites but disclaim endorsement.** Rejected: affordances don't
  count, only facts on the ground. A disclaimer on a site we operate and curate does not
  change who is making the display choices.
- **Retire the generic sites entirely.** Not adopted. They remain usable directly and
  serve as infrastructure documentation; the decision is about where *effort and
  marketing* go, not about deleting surfaces.

## Consequences

**Buys us:** a coherent answer to "who decides what's shown here" (the vertical
operator, per their own stated policy); an honest decentralization story that improves
as real independent operators appear; a sharp prioritization rule; a marketing target
that's a few dozen people rather than a mass market.

**Costs us:** adoption is now gated on recruiting founders, which is slow and unproven —
we have zero external verticals today. It also forces real platform work we could
otherwise defer: operator-scoped indexer deployments, policy lists, per-vertical
substrate selection, and documentation good enough for a stranger to build against.
And we will disapprove of some verticals people build; that's the accepted cost of
neutral tools.

**What would make us revisit:** (a) a sustained founder-recruiting effort produces no
externally-run vertical — the premise that founders exist and are reachable would be
falsified, and we'd have to own distribution ourselves after all; (b) counsel concludes
that publishing reference software plus running two verticals still leaves us
characterized as the operator of everything downstream, in which case the split isn't
buying the legal benefit it was chosen for; (c) a vertical succeeds so far beyond the
others that it's really the product, and the platform framing is overhead.

Note that the *naming* of this posture is still open — see the "causelets"/"CauseStarter"
thread in [`inbox.md`](/inbox.md). This ADR freezes the strategy, not the brand.
