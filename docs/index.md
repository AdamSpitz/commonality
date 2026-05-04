# Commonality

Commonality is a movement — and a set of tools — for **internet-age coordination on public goods**. We're remarkably bad at producing the things we collectively need: shared infrastructure, independent journalism, scientific research, neighborhood projects, political organizing. New tech (assurance contracts, delegation, blockchains, AI) makes a much better approach viable. Commonality is what that better approach looks like.

The funding infrastructure here is the concrete instrument of the movement: assurance contracts that let you pledge without risk, delegation that lets you contribute without having to pick projects yourself, retroactive funding that rewards early believers, and funding portals that route money to whatever serves a cause you care about.

Commonality is one of several connected sites:

- **Tally** — sign statements (petitions / polls) and see hidden coalitions form via the implication graph. ([overview](tally.md))
- **Content Funding** — fund individual pieces of content (articles, videos, posts) using assurance contracts with arbitrary criteria.
- **Common Sense Majority** — a separate movement focused on the quiet-middle thesis, built on top of these tools.
- **Conceptspace** — the developer-facing infrastructure layer (statements, trust graph, attesters, signing primitives).

This site is for the funding side: pledging, delegating, getting projects funded, and the broader case for why a new approach is needed.


## See it in action

Concrete walkthroughs of the funding tools at work.

- **[Getting a research project funded](use-case-walkthroughs/research-funding.md)** — A niche project gets early backing from people who understand the field. When it delivers, later donors fund the proven success — and the early believers are rewarded for their bet.
  *(Illustrates: delegation, retroactive funding, rewarding early believers)*

- **[A neighborhood throws a block party](use-case-walkthroughs/block-party.md)** — Forty households fund a $1,500 party without anyone chasing payments or risking their money. The system scales down to trivially small things.
  *(Illustrates: assurance contracts, delegation, small-scale coordination)*

- **[A town transitions away from government funding](use-case-walkthroughs/defunding.md)** — A community demonstrates it can fund its own youth program. The visible pledges are enough to make the government back down. Total cost: zero.
  *(Illustrates: assurance contracts, credible threats, delegation)*

- **[Three towns fund shared water infrastructure without the province](use-case-walkthroughs/local-funding-shift.md)** — Three towns coordinate directly, bypassing the province as intermediary.
  *(Illustrates: horizontal coalitions, implication-graph discovery, the ratchet effect)*

Walkthroughs that center on statement-signing or content live on the sibling sites:

- **[Supporting the kind of political writing you actually want to read](use-case-walkthroughs/noninflammatory-content.md)** — primarily a Content Funding / Noninflammatory Content story.
- **[Discovering the common-sense majority](use-case-walkthroughs/common-sense-majority.md)** — primarily a Tally / CSM story.


## What can I do here?

- **[Fund something you care about](roles/fund-something.md)** — Find a project and pledge toward it. Your money is refunded if the goal isn't met.
- **[Pledge funds to a cause](roles/pledge-to-a-cause.md)** — Pledge monthly, delegate to someone you trust, and let them decide where it goes. Revocable anytime.
- **[Get your project funded](roles/get-your-project-funded.md)** — Set up an assurance contract. No gatekeepers, no applications.
- **[Become a delegate](roles/become-a-delegate.md)** — Direct others' funds wisely. Build a transparent track record. No need to incorporate a nonprofit.
- **[Help connect things](roles/help-connect-things.md)** — Vouch that projects align with causes. Your influence grows with followers.

Looking to **express what you care about** by signing statements? That's on **Tally** — see [What is Tally?](tally.md). Statements are the glue that connects the funding tools here to the people they serve, but the signing UI lives there.

Looking to **get a piece of content funded**? That's on **Content Funding**. Content contracts are a specialized kind of assurance contract built on the infrastructure described here.


## Key concepts

The ideas the funding tools rest on:

- **[Assurance contracts](key-ideas/assurance-contracts.md)** — Pledges refund if the goal isn't met. You risk nothing.
- **[Delegation](key-ideas/delegation.md)** — Contribute while being lazy. Let someone you trust decide.
- **[Retroactive funding](key-ideas/retroactive-funding.md)** — Fund things that already worked. Reward early believers.
- **[Credible threats](key-ideas/credible-threats.md)** — Visible pledges change the game even if never spent.
- **[How your actions compound](key-ideas/how-actions-compound.md)** — Every action makes the system work better for everyone else.

Ideas that live mainly on neighboring sites but are load-bearing here too:

- **[Statements and the implication graph](key-ideas/statements-and-implication-graph.md)** — what funding portals point at; the consumer surface is [Tally](tally.md).
- **[Content funding](key-ideas/content-funding.md)** — the specialized contracts the Content Funding site is built on.
- **[Trust networks](key-ideas/trust-networks.md)** — the attester / nudger graph; the underlying infrastructure is Conceptspace.


## Why trust it?

- **The code is open-source** — anyone can verify it does what it claims.
- **All transactions are public** — full transparency by default.
- **Nobody controls it** — no company, no admin, no single point of failure.
- **Assurance contracts mean you risk nothing** — pledges refund if the goal isn't met.
- **Delegation is revocable** — you can take back your funds at any time.
- **It's designed to work with traditional finance** *(coming)* — charities, credit cards, and tax receipts will all still work.
- **It doesn't take a side** — both sides of most political divides have independent reasons to use it.

[Full explanation →](why-trust-it.md)


## The bigger picture

Why a new approach to public goods is needed, and what the movement is arguing for:

- **[Vision and strategy](vision-and-strategy/README.md)** — the case for internet-age coordination, who it's for, and how it spreads.


## Technical reference

- **SDK API docs** (`sdk/docs/api/` in the repository) — TypeScript SDK reference.
- **Contract docs** (`hardhat/docs/` in the repository) — Solidity contract reference.

Deeper developer documentation (statements, trust graph, attesters, indexer, IPFS usage, contract architecture, L2 choice) lives on **Conceptspace**.

## For crypto-native users

[Technical details →](for-crypto-natives.md)
