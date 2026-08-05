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
5. Tokens are permanent, non-transferable recognition receipts. Money comes back to an early funder only through the inherited [reimbursement waterfall](/specs/product/legal/retroactive-funding-redesign.md): later retroactive donors reimburse earlier contributors pro-rata, at cost, capped at what they put in. There is no secondary market and no resale.

## Contracts as "rounds"

Each contract represents a funding round for a batch of content. Once funded and closed, a new contract can be created for the creator's newer content. This preserves clean assurance-contract semantics (one threshold, one outcome) and maps naturally onto the rhythm of "here's what I produced recently — was it worth funding?"

## Prospective content rounds

Future content is funded through `ProspectiveContentRoundFactory`, which atomically creates a one-token-type assurance round only for the current verified channel owner. Its non-transferable prospective receipts move through the assurance market for purchases and failure refunds. Holders cannot burn while the outcome is unresolved or failed; after success they may burn voluntarily.

Only a successful round can create its one materialized collection. The current channel owner adds suffixes, from which the collection derives canonical IDs inside the authenticated channel namespace. For each item, holders can claim non-transferable recognition up to their **current** prospective balance. Claims record the high-water amount already recognized, so a later receipt purchase can be claimed once the current balance exceeds that amount. A post-success receipt burn therefore reduces later claims without changing reimbursement history.

A prospective round may materialize content gradually. The content registry maps every resulting ID to the source prospective assurance contract, whose one-time `materializedContentTokens` field links to recognition inventory. See [materialization.md](materialization.md).

## Supply and pricing

**Supply per content item** is configurable per contract or per content item. It functions purely as a price/participation dial: supply × price is what the item can raise, so lower supply (e.g., 10 tokens) implies a higher per-token contribution and fewer participants, while higher supply (e.g., 500 tokens) implies broader access at a smaller ticket size. The contract creator sets this based on the expected donor base and desired price point. (Supply is *not* a scarcity or speculation lever — the tokens are non-transferable and cannot appreciate.)

**Price tiers.** Existing LazyGiving contracts use different token types for different price tiers ($5, $25, $100 "Gold Supporter" etc.). With token types now representing content items, explicit tiers go away — but a donor who wants to contribute $50 to a $5-per-token content item just buys 10. The granularity of having many tokens per item handles this naturally. Cosmetic tier differences (badges, etc.) can move to a quantity-held basis if anyone cares.

## Why per-content-item tokens matter

Per-content-item granularity is how a funder expresses *which piece* they are backing, rather than just "this creator." That drives three things:

- **A fine-grained demand signal.** The creator can see which specific posts people were willing to pay for — the signal the ad model never gives them.
- **The content-registry invariant.** Token type IDs *are* content ID hashes, which is what lets the [content registry](content-registry.md) enforce "each content item appears in at most one active contract."
- **Per-item recognition.** A receipt names the exact piece you helped fund, so leaderboards and track records can be attributed at the item level.

This rationale used to be stated in terms of a secondary market, where per-item tokens let a viral piece's price rise and reward whoever spotted it. That market has been [deleted](/specs/product/legal/retroactive-funding-redesign.md); per-item tokens survive on the grounds above, not on price discovery.

## Retroactive funding

Retroactive funding is arguably the *best* fit for content. Creators publish first, let the actual reception prove quality, *then* get retroactively funded. Because `CreatorAssuranceContract` extends `MultiERC1155AssuranceContract`, it inherits the reimbursement waterfall unchanged: a scout who funded a piece early gets reimbursed pro-rata **at cost, capped at their own contribution**, out of donations from later supporters who close the loop. The scout's reward is getting the same giving budget back to spend on the next piece, plus a public track record — never interest, a premium, or a profit.

## Delegation

"I delegate $20/month toward [cause]" works unchanged — a trusted delegate picks creators and content items, buying tokens on the donor's behalf.

## What's actually new vs. LazyGiving

Not much. The actual new infrastructure is:
- The [content registry](content-registry.md) contract (a simple mapping plus access check)
- A content ID field on assurance contracts (the token type ID *is* the content ID)
- A factory check against the registry at creation time
- [Channel claiming](channel-claiming.md) logic

These four contracts (ContentRegistry, ChannelRegistry, ChannelEscrow, CreatorAssuranceContractFactory) are deployed as a [per-platform set](README.md#per-platform-deployment). The factory, registry, escrow, and channel-claiming contracts for Twitter are separate deployments from the YouTube ones, etc.

The ERC-1155 structure, threshold/deadline mechanics, escrow, reimbursement waterfall, and delegation all come from LazyGiving unchanged.

To create social-recognition incentives for owning the tokens, the contribution leaderboards may need to be specialized for this system, because they should show "who owns (or has burned) the tokens for this content item" as well as "who owns (or has burned) the tokens for this creator".
