# Revocation of delegated authority

Revocation is per note in the contract. The client is what makes one Takeback cover the notes that came out of the one she named.

The contract does not store which receipt came from which payment note. Those links are in the logs: `ChainSplit`, `NoteSplitSameChain`, `ERC1155Purchased`, `RefundedIntoNote`, and `ReimbursementClaimedIntoNote`. The client reads those logs from the chain. The indexer may paint the page, but it is not the source of the revoke set.

## What one action covers

The closure of a note is that note plus every note reached by walking those links forward. It does not include another note she delegated to the same person. It does not follow `replaceDelegate` or `partialTakeback`. A receipt left with an earlier delegate, or a slice she already took back, stays out until she names that note.

`revokeMany(noteIds, owners)` revokes each note with the same rules as `revoke`, including clearing that note's pending spend. A note that is already gone is skipped. A note that still exists but whose chain or caller is wrong reverts the whole call. There is no parent pointer and no cascade inside the contract.

## Confirm list

Takeback and Hand back both open a list of every note in the closure that is still delegated. Each row can be unchecked. Takeback starts with every row checked. Hand back starts with only the note on the page checked. One control checks or unchecks the rest.

The client sends `revokeMany` for the checked notes only. It then reads the logs again. A new note that appeared from a checked note, and that she did not uncheck, joins the next batch. A note she unchecked, and anything that comes out of it afterward, does not. The action is finished only when a pass finds nothing still delegated in that set. If she rejects a later transaction, the page keeps showing what is still his and does not say the authority is gone.

Partial takeback is not this walk. It is still one note, and it still does not clear a pending spend.

## Refunds and rules

`refundIntoNote` still requires the current leaf. After the receipt has been revoked, only she can refund it, and the new note is hers. If she has not revoked it, the delegate refunds into a note he still holds.

A purchase copies that payment note's delay, unsuspicious delay, strict mode, flaggers, and fine list onto the receipt. She can edit that copy while the receipt exists. The setters are the same ones as on a payment note. Editing the unspent remainder does not change a receipt already issued. A refund copies the receipt's rules onto the new settlement-token note. That is the "current rules" a failed-project refund comes back under.

`claimReimbursementIntoNote` is unchanged. It still copies the receipt's chain and does not copy the rules. This does not decide whether a successful-project reimbursement keeps the delegation. A reimbursement note that is already inside the closure can still be revoked by the walk above.
