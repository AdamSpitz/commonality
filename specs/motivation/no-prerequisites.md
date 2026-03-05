# Doesn't require coordination

## Traditional = aggregate early; Commonality = aggregate later

The standard technique for collective action is: aggregate individual contributions (money, votes, preferences) into a centralized entity (government, treasury, charity board, political party), and then that entity carries out the rest of the pipeline — deciding which projects to fund, evaluating alignment, making tradeoffs. The problem is that individuality is lost at the aggregation step. After that, the entity acts as a monolith, and you're along for the ride.

Technology (especially blockchain and AI) makes it possible to propagate [individuality](./individualization.md) much further down the pipeline, so that the system can achieve collective-scale outcomes without requiring the lossy early-aggregation step. Individuals act directly, and the system aggregates the results:

  - **Implication attestations** replace "rally around one canonical statement." Each person says exactly what they want to say. The system discovers the commonality — which is why the system is named Commonality. (Analogous to Web 2.0 upvotes: individual expression, system-level aggregation.)
  - **Assurance contracts** replace "pool money into a central treasury that a committee spends." Individuals pledge directly to specific projects. Aggregation happens per-project: did enough people pledge?
  - **Fine-grained delegation** replaces "elect one legislature for your district." Pick your own delegate(s), per-cause, revocable anytime. Your funding flows through your chosen chain, not through a collective decision.
  - **Individualized filtering** replaces "a central committee decides which projects fit our cause." Each user chooses which attesters to trust, so "which projects align with my values?" is answered per-user, not collectively.

## Some of this makes participation easier

Some aspects of pushing individualization further make the choice to participate in this system much easier and less stressful than participating in the traditional system:

  - **Delegation:** You get exactly the delegate you want, specialized per-topic, revocable at any time. You're not stuck with one representative for all issues for four years. There's no need to stress over the choice in the way you do over a normal election — if it doesn't work out, just revoke.
  - **Statements:** You sign exactly the statement you want to sign. No need to compromise on wording, no need to figure out which of the three popular statements is closest to your position. Implication attestations connect you with others saying similar things, without you having to do anything.

## Some of this creates new concerns (with mitigations)

Other aspects do create objections that the traditional aggregate-early approach doesn't have:

  - **"What if I pledge and nobody else does?"** Without a central treasury committing funds, each individual bears the risk that a project won't reach its funding threshold. Assurance contracts fix this: you get refunded if the threshold isn't met. See [costless-to-try.md](./costless-to-try.md).
  - **"What if there's too much noise without gatekeepers?"** If anyone can publish projects, statements, and attestations, you'll get a flood of garbage. The fix, though, is to use Web 2.0 techniques like upvotes/likes/reposts to surface the best stuff: [publish, then filter](./publish-then-filter.md).
  - **"What if we *want* N=1?"** All these subsystems aggregate N participants, but they work fine with N=1. This means you can start by mimicking the old aggregate-early system exactly — a single attester, a single donor, a single delegate — and let N grow organically. See [scales-down.md](./scales-down.md) and [dial-not-switch.md](./dial-not-switch.md) for more on this.

## Side note: retroactive funding via tokens

Using tokens as donation receipts is honestly an orthogonal improvement — a good idea for any public-goods-funding system, not specifically tied to the individualization theme. But it's worth noting that it has the same [dial-not-switch](./dial-not-switch.md) property: moving from "make a donation" to "make a donation and receive a token" costs nothing extra, and the token unlocks powerful optionality (secondary markets, investor/donor distinction, retroactive value) without requiring any commitment upfront.

## Gathering users

Of course a cause still does need to actually gather users — get donors to pledge money, get doers to start projects. But the [pitches](./pitches.md) to each user are straightforward precisely because each action stands on its own: you don't need to agree on a leader, trust that others will show up, get past a gatekeeper, or have faith that this movement will take over the world.
