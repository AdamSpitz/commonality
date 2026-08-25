# Why are statements so peculiar?

(AI: feel free to flesh this out, but please don't rewrite my words too much.)

The core reason we have to write statements in this peculiar way is that we're facing a tension between several goals/constraints:
  - We want the implication system to reduce the need for coordination. (Requiring people to agree on how to word a statement is basically a non-starter. Major pain in the ass, people won't do it. Coordination is hard. Anything that reduces the need for coordination is good.)
  - We want to create "bridges", at various scales: between people who mostly agree but disagree on minor details; between different movements that are obviously quite different but would be natural allies in some ways (e.g. Christians and secular conservatives); between different movements who are mostly enemies but maybe some common ground can be found (e.g. right and left).
  - BUT people hate having words put in their mouth.

So:
  - We have this implication system, where an AI "implication attester" says "if you believe S1, you almost certainly believe S2 also". It's meant to be extremely conservative; it should reject anything ambiguous. The system does try to display a clean distinction between "M people signed this directly" and "N people signed other statements that imply this one", but still, we're putting words in people's mouths; we should only do that when the statements imply each other so clearly that nobody is likely to object. We're doing this for the sake of reducing the need to coordinate on exact wordings, and also for the sake of allowing [organic coalitions](/docs/end-user/commonality/vision-and-strategy/why-its-better/organic-coalitions.md) where people who have signed significantly-different statements can still be shown to be allied in some way. (You might wonder: "if two statements are similar but worded differently, are they *really* similar enough that we can be sure people won't object to the asserted implication?" First, we do allow people to explicitly say "nope, I *don't* believe that" if they really must. And second, we don't need to be *so* strict that we end up with nothing but formal logical implication; there's an in-between space where people will say "maybe that's not exactly how I would have phrased it, but yes, that's what I believe.")
  - We have the [nudger/suggester](/docs/end-user/tally/suggestions-and-nudges.md) system, where we *don't* put words in people's mouths, but we do offer than a way to opt in to suggestions: "Since you signed S1, maybe you'd be willing to sign S2?"
  - And we have various [patterns](/docs/end-user/common-sense-majority/hidden-majority-patterns.md) that should be helpful in writing statements that play nicely with the implication attester and with the suggester system.

So, yeah, statements are:
  - plain natural language
  - meant to be something that normal people will be willing to both sign ("I support this") and attest to a project's alignment ("project P is aligned with this goal")
  - but they still need to be written in this finicky way (and so we have an AI service to help with writing them, or to write them and then suggest them)
