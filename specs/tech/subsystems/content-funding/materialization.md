# Future-content materialization

Prospective rounds use the accepted channel-bound design in [ADR 0007](../../../decisions/0007-channel-bound-prospective-content-materialization.md).

`ProspectiveContentRoundFactory.createProspectiveRound` is the only authoritative creation path. It verifies that the channel is claimed, the caller is its current owner, and the supplied canonical channel string hashes to the channel ID. It atomically deploys the channel-bound receipt, `ProspectiveContentAssuranceContract`, threshold condition, inventory, and price, then records provenance.

After the condition succeeds, the current channel owner calls `createMaterializedContentTokens`. The factory permits this exactly once, deploys and authorizes the collection, and sets the assurance contract's one-time `materializedContentTokens` link. Pending and failed rounds cannot materialize.

The owner adds content by suffix. The collection derives:

```text
canonical ID = channel canonical ID + separator + suffix
content ID   = uint256(keccak256(bytes(canonical ID)))
```

The registry stores `content ID → source prospective assurance contract`. A holder initially claims each item in an amount equal to their current prospective-receipt balance. If they subsequently buy enough receipts to raise that balance above the amount already claimed for the item, they may claim the difference.

Both receipt types reject holder-to-holder transfers. Prospective receipts cannot be burned while the round is pending or failed, preserving token-backed refunds. After success they may be burned; this does not alter reimbursement history but does reduce claims on content materialized later. Materialized recognition may be burned without accounting effects.

## Open question: is the claim model too confusing?

Entitlement is read from the *current* receipt balance while `claimedAmount(contentId, account)` is permanent, so the two can disagree in ways that are hard to explain:

- **Claimed more than held.** Claim an item, then burn receipts: the account has claimed more than its balance would now support. Nothing is wrong — the tokens were validly claimed — but any "claimed N of M" phrasing reads as an error.
- **Silently reduced future claims.** Burning before an item is materialized permanently lowers what can be claimed on it, and nothing records that the account once held more. Recovering that would need a high-water mark from the receipt token's transfer history; neither `claimedAmount` nor `ContentTokenClaimed` carries it. So a backer cannot be shown what they gave up, only what they can still take.

Questions to settle: should entitlement track the live balance at all, or a balance snapshotted at materialization? Should unclaimed capacity survive a burn? Is per-content-item claiming the right shape, or should one claim cover the whole round?

Until this is settled, `claimSummary` in `ui/src/content-funding/pages/MaterializeFutureContentPage.tsx` reports only what it can prove and never implies a forgone figure it cannot support.
