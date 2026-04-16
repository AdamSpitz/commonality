# Top-level spec

This is the top-level spec for a software project called Commonality. It's meant to be built using technology like blockchains and IPFS.

## What is this?

TODO: Read the stuff in the docs/vision-and-strategy directory, then see if you can rewrite this section a bit better using the insights from there. 

Right now, if you want to fund public goods, your options are basically: hope the government does it, or donate to a charity. Both of these have serious problems - government is slow and expensive and captured, charities are opaque and overhead-heavy.

Commonality is a system for crowdfunding public goods without needing a central organization. The theory is that we can build something that does what government and charities do (fund public goods) but better in many ways: much better transparency, much less overhead, and - crucially - almost no need for people to coordinate with each other upfront.

The original motivating thought came from Balaji Srinivasan's "network state" idea: large numbers of aligned people coordinating online to get things done sounds great, except that Balaji seems to envision something like a big monolithic million-member Discord chat with a treasury, which sounds awful. Big groups (governments or corporations or whatever) don't really work all that well. So the goal is: make it possible for large numbers of aligned people to coordinate online and crowdfund projects aligned with their cause, but do it as a network of individuals rather than a big monolithic group.

See [here](/docs/vision-and-strategy/README.md) for the full discussion of what this is and why it might actually work.

## Key ideas

See [here](/docs/key-ideas/README.md).

## Main components

The overall system can be broken down into subsystems:
  - [pubstarter](tech/subsystems/pubstarter/README.md): individual "projects" (Kickstarter-style assurance contracts, implemeneted as ERC-1155 tokens; importantly, these tokens can be resold on secondary markets, enabling profit-seeking investors to supply early funds and then exit by selling to altruistic donors later).
  - [delegation](tech/subsystems/delegation/README.md): donors can create "delegatable notes" to let trusted individuals make funding decisions on their behalf (with composable, revocable delegation chains).
  - [conceptspace](tech/subsystems/conceptspace/README.md): statements, beliefs, and AI-generated implication relationships. Used for declaring a project's alignment ("project P is aligned with statement S") and for declaring a delegatable-note's intended purpose ("this note is intended to be donated to projects aligned with statement S").
    - Importantly, the system allows the (probably AI-assisted) creation of a web of implication arrows, so that a project can be attested to be aligned with S1 and a note can be intended for S2 and the system can notice that S1 -> S2 and so the project is a suitable candidate for that note.
    - As a somewhat-unrelated purpose, individuals can also "sign" statement S, so the statement's page can show the number of supporters (of S or any other statement S2 such that S2 -> S). Not directly related to funding, but a useful other purpose of the conceptspace system.
  - [fundingportals](tech/subsystems/fundingportals/README.md): Each statement has a funding portal showing projects aligned with that statement. (Projects inherit alignment through the implication graph, so submitters don't need to worry about exact statement matching.) The system provides transparency and social recognition by displaying contributor leaderboards and full delegation chains.

## Tech choices

See [tech/shared/tech.md](tech/shared/tech.md) for details on tech choices and rationale, but the basic idea is that this is a decentralized app: Ethereum L2, IPFS, very thin indexer (no business logic, a bit unusual) built using Ponder, UI served via IPFS.

## AI skills

There can be various AI skills to aid in (or partially automate) using various aspects of the system.

See [product/ai-assistance.md](product/ai-assistance.md) for more info.

## Artifacts

See [artifacts](tech/artifacts.md), but:
  - four subsystems are independent of each other: Concept Space, Pubstarter, Marketplace, Delegation
  - and then there's a fundingportals subsystem that integrates them
  - plus there are some services deployed separately

## Implementation notes

The primary integration point between subsystems is the smart contracts in `hardhat/`. Most user actions are onchain transactions that emit events. The indexer exposes `GET /api/events` (filtered by contract address, event name, topic); the SDK's `eventCacheClient.ts` wraps this. All data shaping happens via SDK fold functions, not in the indexer.

See each subsystem's spec directory for implementation details. Key cross-cutting docs:
  - [Conceptspace smart contracts, data flow, and UI](tech/subsystems/conceptspace/README.md)
  - [Funding Portal smart contracts and data flow](tech/subsystems/fundingportals/README.md)
  - [Implication Attester AI](tech/subsystems/conceptspace/implication-attester-ai.md)
  - [Statements](tech/subsystems/conceptspace/statements.md)
  - [Indexer](tech/indexer/README.md)
  - [Conceptspace queries and actions](tech/subsystems/conceptspace/queries-and-actions.md)
  - [Funding Portal queries and actions](tech/subsystems/fundingportals/queries-and-actions.md)

## Additional documentation

- [Vision and strategy](/docs/vision-and-strategy/README.md) - Goes deeper on the motivation: detailed comparison with government and private charity, why every piece of the system avoids requiring coordination, concrete pitches to different types of users (donors, project creators, delegates), censorship resistance, and the "won't this be used for evil?" question. If you're an AI whose job is just to implement the spec, you probably don't need to read it. But it's there if you're thinking about the big picture.
**Technical:**
- [tech/scalability.md](tech/scalability.md) - How each component is expected to scale, and potential bottlenecks
- [tech/security.md](tech/security.md) - Security and abuse prevention
- [tech/bridges.md](tech/bridges.md) - Fiat bridge implementation: Stripe flow, ETH conversion options, licensed third-party services (Transak, Wert, Crossmint), refunds

**Product:**
- [product/mvp.md](product/mvp.md) - MVP planning notes and entry-point descriptions
- [product/future.md](product/future.md) - Post-MVP planning notes
- [product/content.md](product/content.md) - Content bootstrapping: seed statements, AI-assisted discovery, handling the empty-field problem
- [product/ai-assistance.md](product/ai-assistance.md) - AI skills for helping users navigate the system

**Dev:**
- [dev/testing/](dev/testing/README.md) - Test strategy

**Other:**
- [/ROLES.md](/ROLES.md) - Guide to which docs each role should read
- [/docs/chats/](/docs/chats/) - Meeting notes and transcripts from planning sessions (historical context, not needed for implementation)
