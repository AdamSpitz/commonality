# Retroactive funding

## The problem

You want to support a good cause. But how do you know your money will actually help? The project might fail. It might be a scam. It might be well-intentioned but incompetent. Traditional philanthropy asks you to make this judgment *in advance* — read the proposal, evaluate the team, hope for the best. And traditional philanthropy selects for grant-writing skill and political connections, not project quality.

Most people deal with this by donating to a big established name and hoping it works out. That's rational — but it means innovative new projects starve while brand-name charities absorb most of the money.

## The simple answer

Don't try to predict. Fund things that have already worked.

If a project has already delivered results — already cleaned the river, already built the software, already run the mentorship program for a year — you can see that with your own eyes. No guesswork, no trust required. You're paying for something that demonstrably exists.

This is retroactive funding: directing money toward proven results rather than promising proposals.

## The obvious objection

"If everyone waits until after, who funds things in the first place?"

This is the key question, and the answer is: **scouts**. Some people are good at spotting promising projects early — they have domain expertise, local knowledge, or just good instincts. In the current system, these people volunteer their judgment for free (if they participate at all). In Commonality, they put their money where their mouth is: they fund projects early, taking on the risk that the project might fail.

When you — the retroactive funder — later come along and fund a project that has already proven its value, part of your money flows to the scouts who spotted it early. The scouts make a return on their good judgment. You get the certainty of funding something that worked. The project gets funded at every stage.

This is a virtuous cycle:
  - Scouts are rewarded for finding good projects early, so more scouts look.
  - More scouts looking means more good projects get funded at the start.
  - More funded projects completing means more proven successes for retroactive funders to support.
  - More retroactive funding means bigger rewards for scouts, attracting even more of them.

## What this looks like in practice

You don't need to understand any of the underlying mechanics to participate. From your perspective as a retroactive funder:

  1. You browse projects that have already delivered results.
  2. You see transparent evidence of what they accomplished (all onchain, all verifiable).
  3. You fund the ones you think created genuine value.
  4. You appear on the project's leaderboard. You get a permanent, verifiable receipt of your contribution.

That's it. You're doing roughly the same thing you'd do with any donation — finding something good and supporting it — but with far more confidence that your money is going to something real, and with the knowledge that your donation also strengthens the incentive for scouts to find the *next* good project.

## How it works under the hood

Every contribution to a Commonality project mints tokens (think of them as resellable donation receipts). These tokens are transferable. This creates a two-sided market:

  - **Scouts (early funders)** buy tokens in projects they think will succeed. They're taking a risk — the project might fail, the tokens might be worthless. But they're good at *spotting* promising projects, and that skill is valuable.
  - **Retroactive funders** buy tokens in projects that have already proven their value, then burn them (converting from funder to donor). They pay more per token than the scouts did — but they're paying for certainty, not speculation. They get social recognition for their contribution (leaderboard credit, burn receipts) even though they came in late.

The price difference between what scouts paid and what retroactive funders pay is the reward for taking the risk of betting early.

Note that this is *not* the same as "fund a producer with a good track record so they can do the next thing." That's just smarter prospective funding. Retroactive funding is more powerful: it rewards people specifically for *the thing they already did*. A producer who has delivered items #1, #2, and #3 gets retroactive funding *for those items specifically*. Item #4 might get proactive funding (because the producer has a track record), or it might get funded by scouts who believe in it, or it might get retroactive funding after it's done. Each item stands on its own. And the track record effect still works naturally within this system — a proven producer can set a higher initial token price because scouts see less risk, which means less of the value leaks to speculation and more goes to the producer.

## Why this is better than prospective-only funding

  - **Better selection.** Instead of a committee guessing which proposals will pan out, the market rewards what actually worked. Projects that delivered get more funding; projects that didn't, don't.
  - **Separates skills.** "Good at identifying promising projects" and "willing to fund public goods" are different skills held by different people. Retroactive funding lets each group do what it's good at. The scouts do the evaluation; the altruistic funders provide the capital. Neither group has to do the other's job.
  - **Attracts more evaluators.** In traditional philanthropy, project evaluation is volunteer work — unpaid and underappreciated. With retroactive funding, early identification of good projects is *financially rewarded*. This draws in more talent and attention to the evaluation problem.
  - **Reduces fraud risk.** It's much harder to fake having already delivered results than to fake a convincing proposal. Retroactive funding naturally filters out vaporware.

## The tip-jar on-ramp

There's no reason for *any* form of donation to remain as a plain unrecorded transfer of money. Even the simplest tip jar can mint tokens — the floor case is functionally identical (uncapped supply at a trivial price), but it preserves the option to upgrade to retroactive funding later. See [tip-jar-upgrade-path.md](../ease-of-adoption/tip-jar-upgrade-path.md) for the full argument.

## Orthogonal but synergistic

Retroactive funding is conceptually independent of the rest of Commonality — any public-goods funding system could implement it. But it works especially well with Commonality's other mechanisms:

  - **Assurance contracts** provide the prospective funding for projects that need upfront capital. Retroactive funding kicks in once results are visible.
  - **Delegation** lets funders who don't want to evaluate projects themselves route funds through delegates who specialize in retroactive evaluation.
  - **Transparency** (onchain records) makes it easy to verify what a project has actually delivered, which is the foundation retroactive funding needs to work.

## Known limitations

Retroactive funding isn't a silver bullet. It works best when:

  - **Impact is legible.** If you can't tell whether a project actually delivered results, retroactive evaluation is no easier than prospective evaluation. Some public goods (basic research, preventive programs) have effects that are diffuse or delayed.
  - **There's enough donor demand.** Scouts need to believe that retroactive funders will show up later to buy their tokens. If a category of public good doesn't attract much donor interest, the scout incentive is weak.
  - **Liquidity exists.** In small or niche markets, there may not be enough trading activity for the price signal to work well. A token that nobody wants to buy or sell doesn't tell you much about whether the project was valuable.
  - **Speculation doesn't dominate.** If most token activity is speculative trading rather than retroactive funders buying-and-burning, the price signal may reflect hype rather than genuine impact.

These limitations are real, and they mean retroactive funding will work better for some categories of public goods than others. But even in less-than-ideal conditions, it's strictly better than having no retroactive channel at all — and the [tip-jar upgrade path](../ease-of-adoption/tip-jar-upgrade-path.md) means projects lose nothing by keeping the option open.
