# Earmarking a note for a purpose

This page builds on the base idea of [delegation](../shared/key-ideas/delegation.md) — you pledge funds and let someone you trust decide where they go. The mechanics there are the same everywhere on Commonality: you create a delegatable note, assign it to a delegate, watch where it goes, and revoke unspent funds whenever you like.

Alignment adds one thing on top: when you create a note, you can **mark it as explicitly meant for a particular purpose**.

## What that means

A plain delegated note says, in effect, "spend this on whatever you think is worthwhile." A purpose-marked note says "spend this *in service of this cause*" — where the cause is a [statement](../tally/statements-and-implication-graph.md) you pick. The note carries that intent with it.

This matters most on Alignment, because Alignment is where money is routed by *cause* rather than by individual project. A delegate (or a cause pool) holding purpose-marked notes knows not just that they've been trusted with funds, but what those funds were meant to advance. The earmark:

- **Tells the delegate what you intended.** Your note shows up in their pool tagged with its purpose, so funding it toward something off-purpose would be visibly against your wishes.
- **Lets pooled, cause-based funding stay honest.** When many people earmark notes for the same cause, the pool behind that cause is made of money everyone agreed was for that cause — not a general slush fund.
- **Still leaves you in control.** Like any delegation, it's transparent and revocable: you can see where the money went and pull back anything unspent.

## How it relates to the rest

- The base mechanism — pledging, delegating, revoking — is the same one described in **[delegation](../shared/key-ideas/delegation.md)**. The funding actions themselves run on [LazyGiving](../lazyGiving/index.md).
- Purpose-marking is what makes [pledging to a cause](pledge-to-a-cause.md) and [becoming a delegate](become-a-delegate.md) work at the level of *causes* rather than one project at a time.
