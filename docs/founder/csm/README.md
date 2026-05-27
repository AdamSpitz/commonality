# Common Sense Majority — founder & builder docs

Internal documentation for the people *building and championing* Common Sense Majority (CSM), as distinct from the public-facing docs aimed at prospective supporters.

The public docs ([docs/end-user/csm/](../../end-user/csm/index.md)) are the manifesto: what CSM is, why it could work, why it's trustworthy. Read those first — they're the shared understanding everything here builds on. This directory holds the stuff that doesn't belong in front of an end user: the pitching cheat-sheet, design-process reasoning, and the orientation reading list for getting up to speed.

## What's in here

- **[pitching-reference.md](./pitching-reference.md)** — sales-enablement cheat-sheet. The compressed list of "what's actually novel" (credible neutrality as infrastructure, the new mechanisms, the game theory, the growth dynamics), organized for someone who needs to pitch CSM and field objections. The polished escalating pitches themselves live in the public [elevator pitch](../../end-user/csm/vision-and-strategy/elevator-pitch.md).
- **[mediator-design.md](./mediator-design.md)** — design reasoning behind the CSM mediator: that it's a mutable set of strategies plus a curated statement list, why mutability is required and safe, the within-side incentive structure ("sanity-as-filter"), and the success/failure criteria for the component. The public [mediator doc](../../end-user/csm/vision-and-strategy/mediator.md) covers the vision; this covers building it.
- **[conditional-support-design.md](./conditional-support-design.md)** — mechanism-design notes on the bilateral-assurance structure: why it probably doesn't need a formal assurance-contract mechanism, and how it makes the implication attester's job legitimate. The public [conditional-support doc](../../end-user/csm/vision-and-strategy/conditional-support.md) explains the concept to a layperson.

## Getting up to speed on CSM

A reading order for someone new to the project:

1. **The vision.** [CSM vision and strategy](../../end-user/csm/vision-and-strategy/README.md) — the full manifesto. Then the [FAQ](../../end-user/csm/vision-and-strategy/faq.md) for the conversational version.
2. **A concrete scenario.** [CSM walkthrough](../../end-user/shared/use-case-walkthroughs/common-sense-majority.md) — how the common-sense majority actually becomes visible, step by step.
3. **The platform underneath.** [Commonality vision and strategy](../../end-user/commonality/vision-and-strategy/README.md) — the case for decentralized public-goods funding and why the mechanisms (assurance contracts, delegation, implication graphs, onchain transparency) work. CSM is a movement built *on* Commonality, not the same thing as it.
4. **Where CSM sits among the products.** `specs/product/ui-domains.md` — CSM is the quiet-middle movement site; it uses Civility, Tally, Alignment, and LazyGiving rather than owning all of that machinery itself.
5. **The hard technical pieces.**
   - `specs/product/bridge-creator.md` — the AI that synthesizes modified statements and commonality statements from moderate positions on opposing sides.
   - `specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md` — the taxonomy of gap types the bridge creator works against, and the thesis that a supermajority holds invisible common-sense positions.
   - `specs/tech/subsystems/nudger/README.md` — the general nudger pattern the mediator is an instance of.
   - `specs/tech/subsystems/content-funding/noninflammatory-content/` — content attesters and beat agents, the machinery behind "fund an adjective."
6. **The design notes in this directory** — pitching-reference, mediator-design, conditional-support-design.
