# Content Funding

A subsystem for retroactively funding individual pieces of content via creator-level assurance contracts with per-content-item tokens.

The core idea: any piece of content with a canonical URL or identifier can be registered on-chain, tokenized via ERC-1155, and funded through an assurance contract. Early supporters buy tokens tied to specific content items; if the contract's threshold is met, the creator gets the funds. Tokens are tradeable on secondary markets, so early supporters can profit when later donors arrive — creating a speculative incentive to identify good content early.

This is a general-purpose mechanism. You could fund content for any reason: noninflammatory political discourse, investigative journalism, educational material, open-source documentation, whatever. The *reason* for funding lives in the attester prompts and alignment attestations, not in the contracts themselves.


## Components

TODO: this "table" format is annoying, just make a simple list.

| Component | Description | Spec |
|---|---|---|
| **Content registry** | On-chain mapping ensuring each content item appears in at most one *active* assurance contract. | [content-registry.md](content-registry.md) |
| **Creator contracts** | Creator-level assurance contracts using ERC-1155 token types for individual content items. | [creator-contracts.md](creator-contracts.md) |
| **Channel claiming** | Rules for who can create contracts for a creator's content, and how creators take ownership. | [channel-claiming.md](channel-claiming.md) |
| **Content attesters** | AI services that evaluate content quality and publish attestations. General framework; specific attester criteria are per-use-case. | [content-attesters.md](content-attesters.md) |
| **Indexer** | Data architecture: event cache integration, SDK fold functions, notification service. | [indexer.md](indexer.md) |

## Use cases

TODO: ditto here, just make a list.

| Use case | Description | Spec |
|---|---|---|
| **Noninflammatory content** | Funding political content that communicates perspectives without antagonizing the other side. The inaugural use case and the one that best demonstrates organic coalition-building. | [noninflammatory-content.md](noninflammatory-content.md) |


## Relationship to other subsystems

Content funding builds on top of existing Commonality infrastructure:

- **Pubstarter**: Creator contracts are a specialization of Pubstarter assurance contracts. The ERC-1155 structure, threshold/deadline mechanics, and secondary market all come from Pubstarter. The new piece is using token type IDs to represent content items (via content ID hashes) rather than price tiers.
- **Conceptspace**: Content is funded *for a reason*, expressed as alignment with statements in conceptspace. The same alignment-attestation and implication-graph mechanics connect content funding to causes.
- **Delegation**: "I delegate $20/month toward noninflammatory political content" works unchanged — the delegate picks creators and content items on the donor's behalf.
- **Funding portals**: A specialized portal for content funding is a natural extension of the existing portal UI.
