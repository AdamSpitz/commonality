# One-hop delegation

Accepted in [ADR 0016](/specs/decisions/0016-one-hop-delegation.md).

A note is the donor alone, or the donor plus one delegate. The donor appoints that delegate with `delegate`. The delegate can spend the note on a project, or revoke to hand the whole note back. The delegate cannot add another address.

The donor replaces the delegate with `replaceDelegate`. The donor sends that transaction. A partial replacement mints a new note for the named amount, chain `[donor, newDelegate]`, and leaves the remainder on the original note with the current delegate. A full replacement retires the original note and mints the new one. The original note's chain is not rewritten.

`replaceDelegate` requires a chain of exactly two addresses. A longer chain cannot be spent, refunded, reimbursed, or extended until a revoke shortens it. Revoke still pulls any length straight back to the caller, or, when the leaf revokes, back to that leaf's parent. There is no migration of old chains.

A recurring pledge still mints `[donor, delegate]` for each period. The delegate on that note cannot extend it. Replacing the delegate on a minted note is `replaceDelegate` for that note. Changing the pledge's standing delegate changes later mints only.

Purchases, refunds, and reimbursements keep copying the chain they already copy. A copied one-hop chain stays with that delegate. A copied longer chain is frozen under the same spend rule.

Not in this rule: an off-chain UI where the current delegate names a proposed successor for the donor to sign. The waiting period, delegation copy, refund revocation, beneficiary checks, and exact-payment overrides stay in their own items.
