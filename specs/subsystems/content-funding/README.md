# Content Funding

A subsystem for retroactively funding individual pieces of content via creator-level assurance contracts with per-content-item tokens.

The core idea: any piece of content with a canonical URL or identifier can be registered on-chain, tokenized via ERC-1155, and funded through an assurance contract. Early supporters buy tokens tied to specific content items; if the contract's threshold is met, the creator gets the funds. Tokens are tradeable on secondary markets, so early supporters can profit when later donors arrive — creating a speculative incentive to identify good content early.

This is a general-purpose mechanism. You could fund content for any reason: noninflammatory political discourse, investigative journalism, educational material, open-source documentation, whatever. The *reason* for funding lives in the attester prompts and alignment attestations, not in the contracts themselves.


## Components

- **[Canonicalization](canonicalization.md)** — Rules for turning platform URLs and identities into stable canonical IDs before hashing or claiming.
- **[Content registry](content-registry.md)** — On-chain mapping ensuring each content item appears in at most one *active* assurance contract.
- **[Creator contracts](creator-contracts.md)** — Creator-level assurance contracts using ERC-1155 token types for individual content items.
- **[Channel claiming](channel-claiming.md)** — Rules for who can create contracts for a creator's content, and how creators take ownership.
- **[Channel escrow](channel-escrow.md)** — Holding contract that receives funds for unclaimed channels and releases them when the creator verifies.
- **[Content attesters](content-attesters.md)** — AI services that evaluate content quality and publish attestations. General framework; specific attester criteria are per-use-case.
- **[Indexer](indexer.md)** — Data architecture: event cache integration, SDK fold functions, notification service.

## Use cases

- **[Noninflammatory content](noninflammatory-content/)** — Funding political content that communicates perspectives without antagonizing the other side. The inaugural use case and the one that best demonstrates organic coalition-building.


## Relationship to other subsystems

Content funding builds on top of existing Commonality infrastructure:

- **Pubstarter**: Creator contracts are a specialization of Pubstarter assurance contracts. The ERC-1155 structure, threshold/deadline mechanics, and secondary market all come from Pubstarter. The new piece is using token type IDs to represent content items (via content ID hashes) rather than price tiers.
- **Conceptspace**: Content is funded *for a reason*, expressed as alignment with statements in conceptspace. The same alignment-attestation and implication-graph mechanics connect content funding to causes.
- **Delegation**: "I delegate $20/month toward noninflammatory political content" works unchanged — the delegate picks creators and content items on the donor's behalf.
- **Funding portals**: A specialized portal for content funding is a natural extension of the existing portal UI.
