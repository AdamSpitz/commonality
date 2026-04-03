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


## Per-platform deployment

The four new smart contracts — ContentRegistry, ChannelRegistry, ChannelEscrow, and CreatorAssuranceContractFactory — are deployed as a **set per platform**. Twitter gets one set, YouTube gets another, Substack gets another.

This keeps the system open: anyone can deploy a new set of contracts for a new platform (Bluesky, Mastodon, whatever) without needing permission or coordination. The contracts themselves don't privilege any particular platform — the question of "which platform deployments are the legitimate ones" is pushed upward into **UI configuration**.

The UI maintains a list of known platform contract sets. Assurance contracts created via a known factory get a trust indicator; contracts from unknown factories get a warning. Adding support for a new platform means deploying a new contract set and updating the UI config — no existing contracts need to change.

### Why per-platform

1. **Channel verification is platform-specific.** Twitter uses tweet-based proof, YouTube might use video descriptions, Bluesky could use DID-based proof. Separate ChannelRegistry contracts per platform keep verification logic clean.

2. **Independent namespace governance.** If the ContentRegistry were shared across platforms, the first person to deploy Bluesky contracts would start claiming content IDs in that namespace, blocking anyone else's competing Bluesky deployment. Per-platform registries mean competing deployments each have their own content-item space — the UI decides which to trust.

3. **Clean upgrades.** When contracts need updating, the UI config can specify "this was the YouTube contract set valid until timestamp X, and this new one after." Old contracts keep working on-chain (refunds, withdrawals, secondary trading), but the UI stops creating new contracts through the old factory.

### UI configuration

```json
{
  "youtube": [
    {
      "factory": "0xabc...",
      "registry": "0x123...",
      "escrow": "0x456...",
      "channelRegistry": "0x789...",
      "validUntil": 1720000000
    },
    {
      "factory": "0xdef...",
      "registry": "0x...",
      "escrow": "0x...",
      "channelRegistry": "0x...",
      "validFrom": 1720000000
    }
  ]
}
```

### Contract metadata

Creator assurance contracts don't need a free-text description of which content items they fund. The on-chain data already provides that: the contract's token type IDs are the content ID hashes, and the ContentRegistry's `ContentItemRegistered` events map those hashes back to canonical URLs. The UI treats contracts created by a known CreatorAssuranceContractFactory as a known contract type and renders a standard template derived from on-chain data. The IPFS metadata CID can carry supplementary information (channel ID, round number) but is not the source of truth for what the contract funds.


## Relationship to other subsystems

Content funding builds on top of existing Commonality infrastructure:

- **Pubstarter**: Creator contracts are a specialization of Pubstarter assurance contracts. The ERC-1155 structure, threshold/deadline mechanics, and secondary market all come from Pubstarter. The new piece is using token type IDs to represent content items (via content ID hashes) rather than price tiers.
- **Conceptspace**: Content is funded *for a reason*, expressed as alignment with statements in conceptspace. The same alignment-attestation and implication-graph mechanics connect content funding to causes.
- **Delegation**: "I delegate $20/month toward noninflammatory political content" works unchanged — the delegate picks creators and content items on the donor's behalf.
- **Funding portals**: A specialized portal for content funding is a natural extension of the existing portal UI.
