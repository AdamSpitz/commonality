# Creator Contracts

Creator-level assurance contracts with per-content-item tokens. A specialization of LazyGiving's `MultiERC1155AssuranceContract` where ERC-1155 token type IDs represent individual content items (via their content ID hashes) rather than price tiers.

## Structure

A single creator contract lists specific content items:

| Token type (`uint256`) | Content | Supply | Price |
|---|---|---|---|
| `keccak256("twitter:uid:12345678:18347")` | That great thread on housing | 100 | $5 |
| `keccak256("twitter:uid:12345678:29451")` | The immigration steelman post | 100 | $5 |
| `keccak256("substack:example/the-long-form-essay")` | The long-form essay | 100 | $5 |

## Funding flow

1. Someone creates an assurance contract for a content creator, listing specific content items by their canonical IDs. (See [channel-claiming.md](channel-claiming.md) for who's allowed to do this.)
2. Each content item becomes a token type in the ERC-1155 contract, with a configurable supply and price.
3. Donors choose which content items to fund by buying tokens of that type. Third-party contract creators must make an initial token purchase during creation. To fund the creator without expressing a preference, buy some of each.
4. Funds go into the assurance contract. If the contract's threshold is met, the creator gets the funds; for unclaimed channels, successful funds are moved into the channel escrow first. If not, token holders can reclaim.
5. After funding, tokens are tradeable on secondary markets — at the per-content-item level.

## Contracts as "rounds"

Each contract represents a funding round for a batch of content. Once funded and closed, a new contract can be created for the creator's newer content. This preserves clean assurance-contract semantics (one threshold, one outcome) and maps naturally onto the rhythm of "here's what I produced recently — was it worth funding?"

## Prospective content rounds

Future content can be funded before concrete content IDs exist by using a one-token-type LazyGiving assurance contract backed by non-transferable prospective receipt tokens. These receipt tokens are intentionally not tradeable between holders; they can only move through the primary market for the initial purchase/refund flow. This keeps the entitlement table stable without snapshot or Merkle-drop machinery.

After the creator publishes content, they materialize one or more concrete content IDs. For each materialized content item, every prospective receipt holder can claim transferable content-item tokens equal to their prospective-token balance. The resulting content-item tokens are ordinary transferable ERC-1155s, so early backers can still sell the tokens for the actual pieces of content once those pieces exist.

A prospective round may materialize content gradually: if a creator funds "June housing explainers," each explainer can be added as it is published, and backers can claim that item's content tokens immediately. The MVP uses creator self-finalization; reputation and the public round description carry the delivery semantics rather than an on-chain evaluator.

## Supply and pricing

**Supply per content item** is configurable per contract or per content item. Lower supply (e.g., 10 tokens) means more scarcity and stronger speculative incentives but fewer primary-market participants. Higher supply (e.g., 500 tokens) means broader access but a diluted scarcity signal. The contract creator sets this based on the expected donor base and desired price point.

**Price tiers.** Existing LazyGiving contracts use different token types for different price tiers ($5, $25, $100 "Gold Supporter" etc.). With token types now representing content items, explicit tiers go away — but a donor who wants to contribute $50 to a $5-per-token content item just buys 10. The granularity of having many tokens per item handles this naturally. Cosmetic tier differences (badges, etc.) can move to a quantity-held basis if anyone cares.

## Why per-content-item tokens matter

The per-content-item granularity is what makes the secondary market interesting. A tweet that goes viral as a model of good discourse sees its token price rise, directly rewarding early supporters who identified it. Without per-item tokens, the secondary market would operate at the creator level, which is coarser and less responsive to individual content quality.

## Retroactive funding

Retroactive funding is arguably the *best* fit for content. Creators publish first, let the actual reception prove quality, *then* get retroactively funded via the token model. Early supporters who bet on a creator's quality can later sell their per-content-item tokens to altruistic donors who arrive later. The proof-of-quality is baked into the retroactive model.

## Delegation

"I delegate $20/month toward [cause]" works unchanged — a trusted delegate picks creators and content items, buying tokens on the donor's behalf.

## What's actually new vs. LazyGiving

Not much. The actual new infrastructure is:
- The [content registry](content-registry.md) contract (a simple mapping plus access check)
- A content ID field on assurance contracts (the token type ID *is* the content ID)
- A factory check against the registry at creation time
- [Channel claiming](channel-claiming.md) logic

These four contracts (ContentRegistry, ChannelRegistry, ChannelEscrow, CreatorAssuranceContractFactory) are deployed as a [per-platform set](README.md#per-platform-deployment). The factory, registry, escrow, and channel-claiming contracts for Twitter are separate deployments from the YouTube ones, etc.

The ERC-1155 structure, threshold/deadline mechanics, escrow, secondary market, and delegation all come from LazyGiving unchanged.

To create social-recognition incentives for owning the tokens, the contribution leaderboards may need to be specialized for this system, because they should show "who owns (or has burned) the tokens for this content item" as well as "who owns (or has burned) the tokens for this creator".
