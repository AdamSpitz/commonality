# Doesn't require coordination

TODO: What's a better name/title for this file and this line of argument? What's the general idea here? It feels like a couple of things:
  - Minimizing "ugh" feelings and other sources of resistance. Even trivial obstacles will deter people from taking an action; we need to remove as many as possible.
  - In particular, "collective action" generally involves a LOT of those: "ugh, I have to compromise", "ugh, this effort is all going to be wasted if we don't reach critical mass", "what if I regret my choice?", etc.




## Traditional = aggregate early; Commonality = aggregate later

The standard technique for collective action is: aggregate individual contributions (money, votes, preferences) into a centralized entity (government, treasury, charity board, political party), and then that entity carries out the rest of the pipeline — deciding which projects to fund, evaluating alignment, making tradeoffs. The problem is that individuality is lost at the aggregation step. After that, the entity acts as a monolith, and you're along for the ride.

Technology (especially blockchain and AI) makes it possible to propagate [individuality](./individualization.md) much further down the pipeline, so that the system can achieve collective-scale outcomes without requiring the lossy early-aggregation step. Individuals act directly, and the system aggregates the results:

  - **Implication attestations** replace "rally around one canonical statement." Each person says exactly what they want to say. The system discovers the commonality. (Analogous to Web 2.0 upvotes: individual expression, system-level aggregation.)
  - **Assurance contracts** replace "pool money into a central treasury that a committee spends." Individuals pledge directly to specific projects. Aggregation happens per-project: did enough people pledge?
  - **Fine-grained delegation** replaces "elect one legislature for your district." Pick your own delegate(s), per-cause, revocable anytime. Your funding flows through your chosen chain, not through a collective decision.
  - **Individualized filtering** replaces "a central committee decides which projects fit our cause." Each user chooses which attesters to trust, so "which projects align with my values?" is answered per-user, not collectively.

## Individualization makes participation easier

Some aspects of pushing individualization further make participation strictly less stressful than in the traditional system:

  - **Delegation:** You get exactly the delegate you want, specialized per-topic, revocable at any time. You're not stuck with one representative for all issues for four years. There's no need to stress over the choice the way you do over a normal election — if it doesn't work out, just revoke.
  - **Statements:** You sign exactly the statement you want to sign. No need to compromise on wording, no need to figure out which of the three popular statements is closest to your position. Implication attestations connect you with others saying similar things, without you having to do anything.

## Also creates some new concerns, but they can be mitigated

Other aspects do create objections that the traditional aggregate-early approach doesn't have:

  - **"What if I pledge and nobody else does?"** Without a central treasury committing funds, each individual bears the risk that a project won't reach its funding threshold. Assurance contracts fix this: you get refunded if the threshold isn't met. See [costless-to-try.md](./costless-to-try.md).
  - **"What if there's too much noise without gatekeepers?"** If anyone can publish projects, statements, and attestations, you'll get a flood of garbage. The fix is to use Web 2.0 techniques like upvotes/likes/reposts to surface the best stuff: [publish, then filter](./publish-then-filter.md).
  - **"What if we *want* N=1?"** All these subsystems aggregate N participants, but they work fine with N=1. You can start by mimicking the old aggregate-early system exactly — a single attester, a single donor, a single delegate — and let N grow organically. See [scales-down.md](./scales-down.md) and [dial-not-switch.md](./dial-not-switch.md).

## Side note: retroactive funding via tokens

Using tokens as donation receipts is an orthogonal improvement — a good idea for any public-goods-funding system, not specifically tied to the individualization theme. But it has the same [dial-not-switch](./dial-not-switch.md) property: moving from "make a donation" to "make a donation and receive a token" costs nothing extra, and the token unlocks powerful optionality (secondary markets, investor/donor distinction, retroactive value) without requiring any commitment upfront.

## Value grows smoothly

The point of the above isn't that Commonality magically jumps to full value on day one. Of course a cause still needs to gather users — get donors to pledge money, get doers to start projects.

But value scales smoothly rather than requiring a critical mass. This isn't like starting a political party, where you've accomplished nothing until you hit millions of members. Each action produces its own value independently:

  - Fund 10 projects, that's 10 projects' worth of value. Fund 20, that's 20.
  - Sign exactly the statement you believe in, and the implication-attestation system connects you with the coalitions you'd naturally want to join.
  - Delegate to someone, and you get exactly the delegate you want — regardless of what anyone else does.
  - Attest to a project's alignment, and whoever trusts you sees it. Your influence grows linearly with followers, not as an all-or-nothing "are you on the board or not?"

The [pitches](./pitches.md) to each user are straightforward precisely because each action stands on its own. No one needs to have faith that the entire system will take over the world.
