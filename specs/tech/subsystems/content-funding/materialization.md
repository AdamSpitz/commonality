# Future-content materialization

Prospective rounds use the accepted channel-bound design in [ADR 0007](../../../decisions/0007-channel-bound-prospective-content-materialization.md).

`ProspectiveContentRoundFactory.createProspectiveRound` is the only authoritative creation path. It verifies that the channel is claimed, the caller is its current owner, and the supplied canonical channel string hashes to the channel ID. It atomically deploys the channel-bound receipt, `ProspectiveContentAssuranceContract`, threshold condition, inventory, and price, then records provenance.

After the condition succeeds, the current channel owner calls `createMaterializedContentTokens`. The factory permits this exactly once, deploys and authorizes the collection, and sets the assurance contract's one-time `materializedContentTokens` link. Pending and failed rounds cannot materialize.

The owner adds content by suffix. The collection derives:

```text
canonical ID = channel canonical ID + separator + suffix
content ID   = uint256(keccak256(bytes(canonical ID)))
```

The registry stores `content ID → source prospective assurance contract`. Holders claim each item once, in an amount equal to their current prospective-receipt balance.

Both receipt types reject holder-to-holder transfers. Prospective receipts cannot be burned while the round is pending or failed, preserving token-backed refunds. After success they may be burned; this does not alter reimbursement history but does reduce claims on content materialized later. Materialized recognition may be burned without accounting effects.
