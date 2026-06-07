# Civility

Civility is a way to put money behind one specific kind of content: political writing you'd actually be willing to read from people you disagree with — because it makes its case without treating you as stupid or evil.

It isn't a new piece of technology. It's an ecosystem built on top of [Content Funding](../content-funding/index.md), pointed at a single kind of content and wired up to make funding that content nearly effortless. The funding mechanism is the same (supporters and cause pools back content through pledge-and-refund contracts), and the [AI-evaluator mechanism](../alignment/ai-evaluators.md) that decides which content qualifies is the same. What Civility adds is the *standard* — "noninflammatory" — and the evaluators, filters, and defaults tuned for it.

## Why this content needs funding at all

Some of it already exists. People who argue hard without contempt, who steelman the other side, who make a strong case in a way the other side can actually hear — they're out there, and right now nothing rewards them: outrage and dunks are what ad-driven feeds pay for, so that's what the feeds pull more of. Good-faith argument is left to fend for itself.

And a lot of it *doesn't* exist yet — precisely because there's no incentive to make it. Civility is the missing reward, and it works both ways: it pays the good content that's already out there, and it calls more of it into existence by making the demand visible.

## The kind of content we're funding

Picture the statement at the center of all this:

> "I'm willing to read content from people I disagree with — *if* it's written in a way that doesn't piss me off."

A lot of people would sign that.

What makes a piece "noninflammatory" is partly generic and partly personal:

- **Generic:** the things good-faith writing does regardless of side — steelmanning the opposing view instead of strawmanning or weakmanning it, arguing without contempt, not reaching for tribal applause lines.
- **Point-of-view-specific:** what actually *reads* as respectful depends on who's reading. A left-leaning reader and a right-leaning reader get set off by different things, so they filter differently. There's no single "neutral" judge — and that's fine. Civility lets each side define what *doesn't* piss them off.

This is **not** a demand for bland centrism. A strongly left-wing piece can be noninflammatory; so can a strongly right-wing one. The question is never "is this moderate?" — it's "is this written so the other side can actually hear it?"

## Two reasons to fund it

People back this content for two complementary reasons:

- **To read better stuff from the other side.** You'd genuinely consider views you disagree with — if they weren't delivered as an insult. Funding noninflammatory content gets you more of what you'd actually be willing to read.
- **To get your own side's ideas heard.** You can also fund noninflammatory content from *your* side — writing crafted to land with the other side instead of bouncing off it. That's how your perspective actually crosses the divide. The test is the same either way: not "do I agree with it?" but "could the *other* side read this without bristling?"

That symmetry shows up in the evaluators themselves: there's one that judges right-wing content from a left-leaning reader's point of view, and a mirror-image one for left-wing content. A conservative who wants to reach the left funds writing that passes the left's filter; a progressive who wants to reach the right does the reverse.

## Funding it without it becoming a chore

Every funding decision ultimately belongs to a human donor. But two things keep those decisions easy instead of exhausting.

**AI does the legwork.** Finding the rare good piece means wading through mountains of the other side's content — which is, by its nature, aggravating work that almost nobody wants to do. So Civility leans on [AI evaluators](../alignment/ai-evaluators.md): services that read enormous amounts of content, judge whether each piece meets a noninflammatory standard, and surface a short list of plausible candidates. You browse what the AI has already vouched for instead of grinding through the slop yourself.

**The AI is open, and you choose which to trust.** To judge tone well, these services have to follow the ambient social-media discourse closely enough to catch references, read sarcasm, and notice snark. That's inherently subjective and a little controversial, so we don't ask you to take any single AI on faith:

- We provide **default evaluators**, but they're **open** — you can read the [actual prompts they use](evaluator-prompts.md), or even self-host your own.
- **Which evaluators you trust is configurable.** Don't like the defaults? Switch to a different one, or trust several at once. There's no single gatekeeper.

**Or hand the keys to a person.** If you'd rather not manage any of this, [delegate](../shared/key-ideas/delegation.md) your money to someone whose judgment you trust and let them make the calls. You can watch what they fund — everything is public — or change your mind anytime.

## The whole thing, in one breath

> "Sure — I'll put $10 a month toward making more noninflammatory content exist. I'll let my friend Andrew, who follows this stuff more closely than I do, make the actual picks." *…and then never think about it again.*

That's the experience Civility is built around. And from the other side, a creator looks at the funding portal and sees real money — pledged and waiting — specifically earmarked for noninflammatory content, and thinks, *"Huh. I could write some of that."* Visible demand pulls supply into existence.

## Part of a bigger bridge-building effort

Civility is useful entirely on its own. But it's also the engine the [Common Sense Majority](../common-sense-majority/index.md) movement uses to build bridges between opposite sides: noninflammatory content is how an idea gets carried across the divide in a form the other side can actually take in. The [walkthrough](../shared/use-case-walkthroughs/noninflammatory-content.md) traces that connection in detail.

## Start here

- **[Noninflammatory content walkthrough](../shared/use-case-walkthroughs/noninflammatory-content.md)** — the full story, end to end.
- **[Fund content you value](../content-funding/fund-content.md)** — back the pieces you want more of.
- **[Get your content funded](../content-funding/get-your-content-funded.md)** — for creators ready to write it.
- **[AI evaluators](../alignment/ai-evaluators.md)** — how the legwork-doing, open, swappable AI judgments work.
- **[The evaluator prompts](evaluator-prompts.md)** — the actual prompts the default evaluators run, so you can see exactly how they judge.
- **[Delegation](../shared/key-ideas/delegation.md)** — let someone you trust do the picking.
- **[Common Sense Majority](../common-sense-majority/index.md)** — the movement that uses this to reveal hidden common ground.

## Beat agents

Some content can't be judged in isolation — whether a piece is fair often depends on the conversation around it. A **beat agent** is an evaluator that follows an ongoing slice of discourse (a "beat") and judges content in that context rather than treating each piece as self-contained. Beat agents are the first evaluators built for Civility, and the discourse context they maintain is exactly what the Common Sense Majority effort draws on.
