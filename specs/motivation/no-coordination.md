# Much less need for coordination

## Examples of how this system avoids needing coordination

  - Signing a statement costs you nothing and doesn't require anyone else to have signed it. You don't even need to compromise on the exact wording and choose the most-popular statement that sorta vaguely says what you want - just say exactly what you want to say, implication attestations will connect you with others who are saying similar things.
  - Trusting attesters is an individual choice. No need to collectively agree on who the "official" implication attester is. You trust whoever you trust, your neighbour trusts whoever he trusts. If an attester starts producing bad attestations, each person can individually stop trusting that attester - no need to coordinate a collective "vote of no confidence."
  - Pledging to an assurance contract risks nothing if others don't join.
  - Starting a project requires no permission. Anyone can create an assurance contract. There's no application process, no committee to approve your project proposal, no platform that has to list you. You just click the button. ("Publish, then filter.")
  - Successfully crowdfunding one project is useful even if this system doesn't take over the entire world.
  - Delegating to someone you trust is a single personal decision. We don't need to agree on who should be our delegate to the legislature in this district; delegate to whoever you individually want.
  - Also, delegation is revocable at any time - you're not committed to this delegate for the next four years. If you hand him a bit of money and he uses it for something you don't like, just turn off the spigot.
  - Also, delegate $X to Alice for cause C and $Y to Bob for cause D. No need to find one delegate to represent you on all issues.
  - Attesting that a project is aligned is something any individual can do. We don't need to agree on who should be the gatekeepers for determining project alignment.
  - We don't need to coordinate to pool our funds in one particular centralized treasury, and we don't need to agree on who should control that treasury. Many separate groups/individuals is fine, we can all contribute to an assurance contract we all like.

## General patterns/principles of avoiding the need for coordination

Patterns in the above:
  - Individualization. No need for collective agreement. No leadership to agree on, no charter to ratify. This also enables organic alliances: implication attestations let two disparate groups discover shared ground and fund overlapping projects, without either group needing to compromise on their specific wording or even be aware of each other upfront.
  - Scales down. (Assurance contract system is useful even for a single project. Delegation system is useful to you if you use it, even if no one else uses it.) There's no need to win everything, no threshold you have to clear before the system becomes useful.
  - It's nearly costless to try-and-fail, even for each individual little decision. (Assurance contract refunds if threshold not met, delegation revocation.) No need to be certain that even this one small thing will succeed, let alone that the entire system will succeed. There's no need to be confident that this is all a great idea before trying it out.
  - "Publish, then filter." A big insight of the Web 2.0 era was that we can reduce the need for coordination by moving away from the "centralized gatekeepers filter the applications and then only publish the best stuff." No need to coordinate on the gatekeepers. Anyone can just publish whatever they want, anyone can signal-boost whatever they want; this might produce a huge mass of mostly-garbage, but then we can promote the best stuff.

## "Dial, not switch" — adoption starts wherever you are

Beyond avoiding coordination *between* users, Commonality also avoids requiring any individual user or org to make a big upfront change. Every adoption path starts at a level that's functionally identical to what you're already doing — just on better infrastructure, with a smooth path to more powerful modes:

  - **Tip jars → tokens.** A creator who accepts tips can mint tokens instead — uncapped supply at a trivial price, functionally identical to a tip jar. But the donor gets a verifiable receipt and leaderboard credit, and the creator can later cap supply, enable secondary trading, and plug into the wider ecosystem. See [tip-jar-upgrade-path.md](./tip-jar-upgrade-path.md).
  - **Sole donor → co-funders.** A foundation making a traditional grant can buy all the tokens in an assurance contract — same as a grant, but on transparent infrastructure with a portable track record. They can later leave tokens available for co-funders, and the project naturally tends toward distributed funding over time. See [donor-project-tension.md](./donor-project-tension.md).
  - **Sole attester → open attestation.** An org that evaluates project proposals can hardcode itself as the sole trusted attester — identical to their current "we decide what fits our mission" process, just recorded onchain. They can later accept attestations from trusted partners, then the community, potentially discovering common ground with ideologically-distant orgs who happen to care about the same concrete outcomes. See [alignment-attestation-for-orgs.md](./alignment-attestation-for-orgs.md).

The pattern: the floor case costs nothing extra and already gives you small immediate improvements — transparency, verifiable receipts, leaderboard credit, portable track records. But the real motivation to switch is that you're now one easy step away from much more powerful modes (secondary markets, distributed funding, cross-cutting alliances), and when you take that step, all the historical activity retroactively benefits. A creator who capped supply after a year of uncapped tips just made all those early tippers into "early investors." A sole donor whose project attracted co-funders just got their grant leveraged. An org that opened up to external attesters just discovered allies they didn't know they had. The upgrade isn't speculative — it's a plausible next step that people will naturally take once they see the option, and the fact that you're already on the rails means there's no migration cost when they do.

There's no reason *not* to start, which means adoption doesn't depend on anyone being convinced of the grand vision.

This connects to the other no-coordination principles above: it's individually useful (scales down), nearly costless to try, and doesn't require collective agreement (individualization). The difference is that this principle operates at the level of "should I adopt the system at all?" rather than "what should I do within the system?"

## Gathering users

Of course a cause still does need to actually gather users - get donors to pledge money, get doers to start projects. But it's not a horrible coordination problem either. The [pitches](./pitches.md) to each user are straightforward and don't require them to have faith that the entire enterprise will take over the world.
