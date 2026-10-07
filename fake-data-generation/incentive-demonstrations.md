# Incentive demonstrations

Project work that follows from the public strategy page
[Why benefits fail to become incentives](/docs/end-user/commonality/vision-and-strategy/why-its-better/why-benefits-fail-to-become-incentives.md).
That page is for readers. This file is the inventory and the scenarios still to build.

Extend the existing fake-data pipelines in [PLAN.md](./PLAN.md). Keep invented
actors and behavior separate from the accepted real-statement catalogue.

## What the fake-data examples already cover

Reviewed **2026-10-07**. These are synthetic examples and recorded protocol
exercises, not evidence of real demand or behavioral change.

The [curated project stories](./campaignProjectStories.ts) already include:

| Example | Missing incentive it illustrates |
|---|---|
| Shared dependency and Linux maintenance | Many users benefit, but no single user can justify covering the cost. |
| Independent replication and a neglected-disease dataset | Useful public knowledge has weak conventional rewards or cannot be commercially captured. |
| A watershed sensor network spanning three towns | No jurisdiction owns the full benefit. |
| Parts-interchange tables and local construction field guides | Producing checked knowledge costs time, while other businesses can freely copy the result. |
| Shared factual reviews and cross-camp explainers | Interested people distrust a single camp's ownership of the work. |

The [October 2 step-14 run report](./campaigns/medium-realistic-v2-step14-run.md)
records a synthetic common-ground project reaching its funding threshold through
contributions from opposing camps, followed by four retroactive donations. It
reports successful reconciliation locally and on Base Sepolia. This demonstrates
co-funding and the reimbursement flow. It does not demonstrate that an actual
public good was delivered or that the contributors independently judged its value.

The [content-funding fixtures](./contentFundingActions.ts) also include
prospective rounds and a round that materializes content. They exercise relevant
machinery, but do not yet supply an explicit Civility story showing a creator
choosing different work because of the added reward.

The central gap is **a demonstration of the changed choice**. Existing scripts
prescribe purchases and other actions. A realistic project title plus successful
transactions does not show why a producer would change behavior.

## Demonstrations worth adding

Proposals, not implemented scenarios.

### 1. Civility: make the alternative worth producing

Give a synthetic writer two possible next pieces, with explicit assumed costs
and competing rewards. Show dispersed contributors making the respectful piece
viable, evaluation from the intended audience's perspective, funding, and a
second production round.

Include an underfunded round and a politely worded but misleading piece that
fails the selected evaluation standard. Show that an evaluator's approval makes
work eligible for consideration, not automatically paid. Distinguish producing
the piece from distributing it and observing its effects.

The demonstration should expose its behavioral assumptions: “Under these assumed
rewards, this writer chooses this piece.” Scripted behavior illustrates the
mechanism; it does not establish that real writers will respond that way.

### 2. Replication: reward learning, including unwelcome results

Extend the existing replication story. Contributors fund a preregistered study
whose public result is useful whether it confirms the original finding or not.
The synthetic result is negative. An evaluator judges that the promised work was
performed well, and later donors reimburse early contributors.

This makes the incentive precise: pay for reliable investigation and publication,
not for producing the answer contributors hoped to hear. Keep reaching the
funding threshold separate from the later judgment that the study delivered.

### 3. A shared transition: reduce the cost of going first

Several communities want to leave an unsupported shared software tool, but each
needs migration tooling and support. Their contributions fund those common
prerequisites. Include a branch of the story where adequate money is available
but an essential participant still declines to migrate.

This shows both the useful intervention and its boundary. Financing a transition
can remove a barrier; it is not an enforceable commitment that every participant
will switch. Any proposed multi-party commitment mechanism should be identified
as additional design work rather than silently attributed to assurance contracts.

## Template for future examples

For each proposed project or vertical, record:

- **Beneficiaries:** who gains, including people who will not contribute?
- **Decision-maker:** whose choice determines whether the benefit happens?
- **Current choice:** what do they do now, and what rewards or constraints explain it?
- **Missing connection:** why can't beneficiaries already reward the better choice?
- **Intervention:** which Commonality mechanism changes that situation?
- **Credibility:** what makes the funding opportunity believable before work begins?
- **Evaluation:** who judges delivery, by what evidence, and what could fool them?
- **Demonstration:** what observable transaction or state change exercises the mechanism?
- **Behavioral assumption:** what response is scripted rather than demonstrated?
- **Boundary:** what remains unsolved even if the funding works?

The strongest examples let a reader answer the same question from beginning to
end: **Whose choice changes once this money can reach them—and why?**
