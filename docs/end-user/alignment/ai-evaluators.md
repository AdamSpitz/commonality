# AI evaluators

## What this is

An attester is anyone who vouches that something meets a standard. Most attesters are people — see [help connect things](help-connect-things.md). But an attester can also be an **AI service**: one that reads a piece of content, judges whether it meets a particular standard, and publishes that judgment as an attestation, exactly the way a human voucher would.

That's what lets a cause pool fund a whole *kind* of content automatically, instead of someone hand-picking each piece.

## How it works

- A cause pool (or a [delegate](become-a-delegate.md)) decides which evaluators it trusts — human, AI, or both.
- An AI evaluator is configured with a standard: a target statement plus a profile describing what qualifies. ("Does this explain the topic clearly?" "Does this make its case without contempt for the other side?")
- It reads a submitted piece, judges it, and — when the piece passes with enough confidence — publishes an attestation that it aligns with that standard.
- Content that passes becomes visible to, and fundable by, the cause pools and delegates that trust the evaluator. The money still flows through the same [assurance-contract mechanism](../lazyGiving/assurance-contracts.md) that all content funding uses; the evaluator only decides what qualifies.

## You choose which evaluators to trust

There's no single gatekeeper. Different evaluators can apply different standards — stricter or looser, calibrated for different audiences — and you decide which ones to rely on, the same way you decide which people to trust as attesters. If you don't trust any AI evaluator, you don't have to use one: you can fund content directly or rely on human vouchers.

And you don't have to take any evaluator on faith. The default evaluators are **open** — you can read their [actual prompts](../civility/evaluator-prompts.md), or even run your own. Judging tone is inherently subjective, so the point isn't to crown one "correct" judge; it's to let you pick the judgment you trust and swap it whenever you want.

## Why automate it at all

For some kinds of content the demand is large but diffuse. Thousands of people would happily fund "political writing that doesn't caricature the other side," but nobody wants to read and grade every submission. An AI evaluator does that legwork so funding can reach qualifying content at scale, while humans stay in control of which standards count and which evaluators are trusted.

## The kinds of evaluators

- **Content attesters** read a self-contained piece and judge it against a standard.
- **Content finders** watch for candidate content and submit it to attesters, so creators don't have to do all the submitting themselves.
- **Beat agents** follow an ongoing slice of discourse (a "beat") and judge content *in context* — useful when whether a piece is fair depends on the surrounding conversation. Following the ambient chatter is also what lets them catch references, read sarcasm, and notice snark that a piece read in isolation would miss. The first place beat agents are used is Civility.

## On other sites

- **[Civility](../civility/index.md)** — the concrete instantiation: evaluators tuned for noninflammatory political content (steelmanning, avoiding contempt, resisting tribal signaling).
- **[Content Funding](../content-funding/index.md)** — the base mechanism the funded content rides on.
- **[Help connect things](help-connect-things.md)** — the human version of the same idea: you, vouching for content yourself.
