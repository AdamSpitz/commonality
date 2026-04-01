# Creator Contracts

Creator-level assurance contracts with per-content-item tokens. A specialization of Pubstarter's `MultiERC1155AssuranceContract` where ERC-1155 token type IDs represent individual content items (via their content ID hashes) rather than price tiers.

## Structure

A single creator contract lists specific content items:

| Token type (`uint256`) | Content | Supply | Price |
|---|---|---|---|
| `keccak256("twitter:18347")` | That great thread on housing | 100 | $5 |
| `keccak256("twitter:29451")` | The immigration steelman post | 100 | $5 |
| `keccak256("substack:example/the-long-form-essay")` | The long-form essay | 100 | $5 |

## Funding flow

1. Someone creates an assurance contract for a content creator, listing specific content items by their canonical IDs. (See [channel-claiming.md](channel-claiming.md) for who's allowed to do this.)
2. Each content item becomes a token type in the ERC-1155 contract, with a configurable supply and price.
3. Donors choose which content items to fund by buying tokens of that type. To fund the creator without expressing a preference, buy some of each.
4. Funds go into escrow. If the contract's threshold is met, the creator gets the funds. If not, token holders can reclaim.
5. After funding, tokens are tradeable on secondary markets — at the per-content-item level.

## Contracts as "rounds"

Each contract represents a funding round for a batch of content. Once funded and closed, a new contract can be created for the creator's newer content. This preserves clean assurance-contract semantics (one threshold, one outcome) and maps naturally onto the rhythm of "here's what I produced recently — was it worth funding?"

## Supply and pricing

**Supply per content item** is configurable per contract or per content item. Lower supply (e.g., 10 tokens) means more scarcity and stronger speculative incentives but fewer primary-market participants. Higher supply (e.g., 500 tokens) means broader access but a diluted scarcity signal. The contract creator sets this based on the expected donor base and desired price point.

**Price tiers.** Existing Pubstarter contracts use different token types for different price tiers ($5, $25, $100 "Gold Supporter" etc.). With token types now representing content items, explicit tiers go away — but a donor who wants to contribute $50 to a $5-per-token content item just buys 10. The granularity of having many tokens per item handles this naturally. Cosmetic tier differences (badges, etc.) can move to a quantity-held basis if anyone cares.

## Why per-content-item tokens matter

The per-content-item granularity is what makes the secondary market interesting. A tweet that goes viral as a model of good discourse sees its token price rise, directly rewarding early supporters who identified it. Without per-item tokens, the secondary market would operate at the creator level, which is coarser and less responsive to individual content quality.

## Retroactive funding

Retroactive funding is arguably the *best* fit for content. Creators publish first, let the actual reception prove quality, *then* get retroactively funded via the token model. Early supporters who bet on a creator's quality can later sell their per-content-item tokens to altruistic donors who arrive later. The proof-of-quality is baked into the retroactive model.

## Delegation

"I delegate $20/month toward [cause]" works unchanged — a trusted delegate picks creators and content items, buying tokens on the donor's behalf.

## What's actually new vs. Pubstarter

Not much. The actual new infrastructure is:
- The [content registry](content-registry.md) contract (a simple mapping plus access check)
- A content ID field on assurance contracts (the token type ID *is* the content ID)
- A factory check against the registry at creation time
- [Channel claiming](channel-claiming.md) logic

The ERC-1155 structure, threshold/deadline mechanics, escrow, secondary market, and delegation all come from Pubstarter unchanged.

To create social-recognition incentives for owning the tokens, the contribution leaderboards may need to be specialized for this system, because they should show "who owns (or has burned) the tokens for this content item" as well as "who owns (or has burned) the tokens for this creator".
