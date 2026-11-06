# Swappable funders: open rails make the funding source replaceable

**TL;DR:** Once a project's "who gets paid how much for what" lives on open, permissionless rails, *anyone* can fund it. Switching funders is no longer a logistics project: the payees, the work definitions, and the payment history all stay put; only the source of the money changes. This is the structural property underneath several other arguments ([credible threats](./credible-threat.md), [game theory](./game-theory.md), [local government](../so-what/local-government.md)), and it's a big reason people might adopt Commonality eagerly instead of reluctantly.

## What does "building up our ability to use Commonality" actually mean?

Some of it is soft: awareness, familiarity, experience. Those matter, but there are concrete things too:

  - **Accounts and addresses.** Everyone who might pay or be paid already has an address to receive funds and an account to donate from.
  - **Templates and running projects.** Sample projects exist for common kinds of work, and real projects are already running, including ongoing ones (see [recurring pledges](/specs/product/recurring-pledges.md)).
  - **Open data with permissionless funding.** This is the big one, and the rest of this doc is about it.

## The structural difference

Look at how an existing funder runs things, whether that's a government (even a small local one), a foundation, or a big charity. The financial machinery is mostly *closed*: an internal ledger of which employees and contractors get paid how much for what, with invoices, contracts, and approvals behind it. Some of it gets published. Many jurisdictions put public-sector salaries above a threshold on public lists, and procurement contracts are often disclosed. But those disclosures are *reports about* the machinery. They aren't the machinery itself. Nobody else can plug money into it.

So when that funder stops paying (the other side wins the election, the province attaches new strings, the foundation changes priorities), the work loses more than its money. It loses its *administrative home*. Anyone who wants to keep it going has to rebuild the payee list, the contracts, the accountability structure, and the donor relationships, usually in a hurry and under hostile conditions. That rebuilding cost is a big part of why defunding works.

On Commonality, the "paperwork" is the open, onchain project: what the work is, who does it, what they're paid, and what's been delivered. Funding it is permissionless. That leaves the funder as **just one input, and it can be swapped out**:

  - **Your side loses the election.** The government stops funding your program. The project, its payees, and its track record are all still there, so voluntary donors on your side can step in. Nothing gets re-incorporated or re-contracted.
  - **Higher-level government pulls out.** A town uses Commonality as rails, but the money comes from the province or the feds. If that money stops, or comes with strings the town won't accept, local people can fund the same projects directly. See [local government](../so-what/local-government.md).
  - **A foundation moves on.** A sole-funder project can be taken over by co-funders with no transition. See [donor-project-tension](../ease-of-adoption/donor-project-tension.md).
  - **Mixed funding all along.** None of this is all-or-nothing. A project can be 90% government-funded and 10% donor-funded, and that ratio can drift in either direction without anyone touching the project's structure. (Same idea as [dial, not switch](../ease-of-adoption/dial-not-switch.md), applied to funders instead of adopters.)

## Why this makes adoption *attractive*, not just defensible

It's in each person's, org's, and faction's own interest to set up *its own* projects this way, **while it's still the one paying for them**. The reasoning: "I fund this now, and I'd like it to survive the day I no longer can or no longer control the budget." Being on open rails costs the current funder little, and it insures the work against that funder disappearing.

That turns the [game-theory argument](./game-theory.md) into something concrete. The in-power side's reason to adopt isn't vague "future resilience." It's "put your programs into a form where your supporters can take them over in one step." And it makes [credible threats](./credible-threat.md) cheap to set up, because the backup funding source doesn't need to build anything. It just needs to be willing to pay.

## Open data doesn't mean every detail is public

Being able to swap funders requires that *enough* be open for a new funder to pay for the work and check that it's happening. It doesn't require publishing every salary. There are several ways to keep sensitive details private:

  - **Pay an org, not individuals.** A contractor org (or a government department acting as one) gets paid through Commonality and pays its own staff privately. The swappable unit is "this org does this work for this much."
  - **Pseudonymous identifiers** for payees, where whoever needs to know who they are can verify it.
  - **Zero-knowledge proofs** later on, for claims like "these payments went to N credentialed staff" without revealing who they are.

The design question for any given project is where to draw the open/private line so that a replacement funder can still evaluate and fund it.

## Caveats

This is speculative. The main open questions:

  - **Scale.** Replacement funders pay with [after-tax money](./after-tax.md), and voluntary donors may not cover a full government-sized budget. Swapping funders is a lot easier than rebuilding, but it doesn't make the money appear. [Assurance contracts](../credible-solution/assurance-contracts.md) and standby pledges are how a community finds out whether it can cover the gap.
  - **Willingness of incumbents.** A government has to *choose* to run its funding through these rails. The argument above is why it might, but procurement law, labour agreements, and institutional inertia are real obstacles.
  - **Privacy engineering.** The private-payee techniques above are mostly future work.
