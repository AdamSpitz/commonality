# What is Tally?

Tally is a place to sign statements you believe in — petitions, polls, declarations of values — and see how that support adds up across related claims.

It looks like a petition site. Underneath, it's something more: every signature you make is connected to every *other* statement that follows from it, automatically. So when you sign one thing, you're also showing up in the visible coalition for everything it implies.

## Statements

A **statement** is a short, free-text claim someone has written down. Anything you might want to put your name to: "Public libraries should stay free." "Our city should fix the potholes on Maple Street." "I support a carbon tax."

When you sign a statement, the fact that you signed is recorded publicly, but you can revoke your support at any time. Anyone can see how many people currently stand behind a claim, and who. A revoked signature remains visible in history; only your current standing is updated.

That's the petition-and-poll layer. Useful on its own — but Tally adds a second layer underneath.

## The implication graph

Most petition sites treat each petition as its own island. Tally doesn't. Statements are connected by a graph of **implications**: "S1 implies S2" — if you believe S1, you should also believe S2.

### A quick primer on trust

Implication links are proposed and evaluated by AI services called **attesters**. Attesters read statements, decide whether one implies another, and publish their reasoning. You don't have to accept every attester's judgment — you choose which ones you trust in your settings. If you distrust the default attesters, you can run your own or follow someone whose taste you respect. Tally can also show [suggestions and nudges](suggestions-and-nudges.md), but they are opt-in recommendations — never automatic signatures.

This means the graph is inspectable without pretending there is one central referee everyone must accept. Your coalition view is filtered through the attesters you choose.

What this means in practice: when you sign one statement, you're not just adding your name to that one claim. You're adding your weight to every more-general claim it implies, and getting visible alongside everyone else who supports the same broader idea — even if they signed a different specific statement.

Tiny example: you sign “our city should fix the potholes on Maple Street.” If trusted attesters say that implies “the city should maintain basic infrastructure,” your support can count toward both claims. Someone else might sign a sidewalk-repair statement and still show up in the same broader coalition.

For the underlying mechanics, see [Statements and the implication graph](../shared/key-ideas/statements-and-implication-graph.md).

## Why Tally exists

Petitions usually feel like shouting into a void. You sign one, it goes nowhere, and the next time a related issue comes up you sign another one from scratch.

Tally exists to fix two specific problems with that:

- **Fragmented support.** A thousand people who all believe roughly the same thing end up scattered across a hundred different petitions, and nobody — including them — can see that they're a coalition. The implication graph aggregates that scattered support into something visible.
- **No follow-through.** Signing a petition is the end of the interaction. Tally is designed so a signature can become a signal that other tools — funding portals, organizing sites, content-funding contracts — can act on. Your signature on a statement about clean water can route real money toward projects that serve it.

Tally is the consumer-facing front door. The signing primitives, trust network, and implication graph it sits on top of are shared infrastructure used by sibling sites in the [Commonality](/docs) ecosystem.

## Getting started

For a how-to overview, see **[Express what you care about](express-what-you-care-about.md)**.

- **[Start signing](/start)** — pick a statement and add your name.
- **[Explore the graph](/explore)** — see how statements connect.
- **[Browse statements](/statements)** — search public claims and see who's behind them.
- **[Tune trust settings](/settings)** — choose whose attestations and suggestions you want to count.
- **[Understand suggestions](suggestions-and-nudges.md)** — how nudges work and how you control them.
