# Retroactive funding

Traditional public-goods funding is prospective: you evaluate proposals, pick the ones that sound promising, and hope they deliver. This selects for grant-writing skill and political connections, not project quality. The people who are best at writing proposals are not the same people who are best at executing projects.

Commonality enables retroactive funding: you can fund projects that have *already demonstrated results*. This reverses the selection — it rewards execution, not proposal-writing.

## How it works

Every contribution to a Commonality project mints tokens (ERC-1155). These tokens are transferable. This creates a two-sided market:

  - **Early funders (nano-VCs)** buy tokens in projects they think will succeed. They're taking a risk — the project might fail, the tokens might be worthless. But they're good at *spotting* promising projects, and that skill is valuable.
  - **Retroactive donors** buy tokens in projects that have already proven their value, then burn them (converting from investor to donor). They pay more per token than the early funders did — but they're paying for certainty, not speculation. They get social recognition for their contribution (leaderboard credit, burn receipts) even though they came in late.

The price difference between what early funders paid and what retroactive donors pay is the reward for taking the risk of betting early. This is exactly how venture capital works, just applied to public goods.

## Why this is better than prospective-only funding

  - **Better selection.** Instead of a committee guessing which proposals will pan out, the market rewards what actually worked. Projects that delivered get more funding; projects that didn't, don't.
  - **Separates skills.** "Good at identifying promising projects" and "willing to donate to public goods" are different skills held by different people. Retroactive funding lets each group do what it's good at. The nano-VCs do the evaluation; the altruistic donors provide the capital. Neither group has to do the other's job.
  - **Attracts more evaluators.** In traditional philanthropy, project evaluation is volunteer work — unpaid and underappreciated. With retroactive funding, early identification of good projects is *financially rewarded*. This draws in more talent and attention to the evaluation problem.
  - **Reduces fraud risk.** It's much harder to fake having already delivered results than to fake a convincing proposal. Retroactive funding naturally filters out vaporware.

## The tip-jar on-ramp

There's no reason for *any* form of donation to remain as a plain unrecorded transfer of money. Even the simplest tip jar can mint tokens — the floor case is functionally identical (uncapped supply at a trivial price), but it preserves the option to upgrade to retroactive funding later. See [tip-jar-upgrade-path.md](../ease-of-adoption/tip-jar-upgrade-path.md) for the full argument.

## Orthogonal but synergistic

Retroactive funding is conceptually independent of the rest of Commonality — any public-goods funding system could implement it. But it works especially well with Commonality's other mechanisms:

  - **Assurance contracts** provide the prospective funding for projects that need upfront capital. Retroactive funding kicks in once results are visible.
  - **Delegation** lets donors who don't want to evaluate projects themselves route funds through delegates who specialize in retroactive evaluation.
  - **Transparency** (onchain records) makes it easy to verify what a project has actually delivered, which is the foundation retroactive funding needs to work.





TODO: Here's some criticism to incorporate:

Retroactive funding is intriguing, but the current writeup assumes a healthier market than many public goods will support. The mechanism depends on meaningful resale, legible impact, and enough donor demand to reward early evaluation. That may work for some categories, but not all. Without acknowledging thin liquidity, noisy impact measurement, and speculative distortion, this section reads more confident than the rest of the argument earns.
