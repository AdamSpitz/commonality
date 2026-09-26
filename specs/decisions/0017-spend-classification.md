# 0017. Delegated spends are classified, and only a current controller is unsuspicious

- **Status:** Accepted
- **Date:** 2026-09-26
- **Related specs:** [`specs/tech/subsystems/delegation/spend-classification.md`](../tech/subsystems/delegation/spend-classification.md)

## Context

A donor delegates because she does not want to approve each project. The delegate will sometimes spend in ways she would not have. There is no rule that prevents that without undoing the delegation. The useful version is a small set of criteria that mark a spend as probably fine or extra-suspicious, so she is not asked to look at the ordinary ones.

Mechanical tests were already rejected. A new project is not suspicious. "The payout address is not the delegate" and "this address has been paid before" are easy to fake with extra wallets. A vouch for payout addresses was deferred, along with any new attestation machinery. Beneficiary identity was the evidence already on hand.

That evidence answers one question: does this route pay the wallet that currently controls a public name she already accepts? It does not answer whether the work is worth funding, or whether the delegate is independent of the recipient. He can verify a domain he controls. Domain control is a poor blacklist and a usable whitelist.

## Decision

Criteria return only unsuspicious or suspicious. Effects are per class, not per criterion. Suspicious wins. Silence is unmarked and keeps her standing delay `T`, with no extra notification.

The only criterion is her fine list of `beneficiaryId`s. It matches only when the project records that id on-chain and its immutable recipient is still the registry's current payout for that id. Claim-later proceeds and a stale fixed recipient stay unmarked, not suspicious. The list starts empty. The unsuspicious delay `U` defaults to `0` and cannot exceed `T`.

No suspicious criterion ships. Enabling one later requires her to choose, with no default, either a longer on-chain delay plus an off-chain warning, or an on-chain block. A warning alone is not a treatment.

The rules bind the delegate's own spends. Her spend of a note she holds is not classified. List and delay edits apply to spends not yet executed, recomputed from the original schedule time. `U = 0` does not create a cancellable pending spend. She can still see it, labeled, in history. Pending rows are labeled too, and a suspicious one raises a site banner whether or not she opted into push or email.

## Alternatives considered

- **Treat "verified domain" or "new wallet" as suspicious.** Rejected. A dishonest delegate verifies his own domain. An honest project is often new. Both heuristics punish the wrong spends and train her to ignore warnings.
- **Let claim-later escrow for a listed name count as unsuspicious.** Rejected. The short wait is for a payment to the current controller. Escrow, including `IdentityHeldProceeds`, pays whoever controls the name at claim time, which may be someone else. Reserved-for-this-name stays visible. It does not skip her delay.
- **Match on project metadata or on the registry wallet in place of the route.** Rejected. Metadata is not what the contract pays. Showing the live registry wallet hides a stale locked-in recipient.
- **Give each criterion its own delay or block.** Rejected. She would be configuring a matrix. A later criterion, such as an ecosystem vouch, should reuse the same class treatments.
- **Default the unsuspicious delay to `T` until she picks a number.** Rejected. The list starts empty, so a default of `0` changes nothing until she adds a name, and adding a name should not be a second chore.
- **Warn on every unmarked spend.** Rejected. That is alarm fatigue. Unmarked stays in the pending list with no notification. Only suspicious warns, and only suspicious raises the banner.
- **Keep an in-flight deadline frozen when the class changes.** Rejected for classification, not for `setSpendDelay`. Removing a name has to be able to put a spend back on `T`. Adding one has to be able to make `U` apply, including immediately when `U` is `0`. The clock starts at the original schedule time either way.

## Consequences

Website projects created through `createERC1155AndAssuranceContractForBeneficiary` do not match this criterion. They claim later. The fine list does nothing for them until a route fixes the recipient and stores the `beneficiaryId` on-chain. Do not paper over that with metadata.

A block cannot reuse `approveScheduledSpend`, because a blocked spend has no schedule. She takes that amount back and pays it herself. See [partial-takeback.md](../tech/subsystems/delegation/partial-takeback.md). Delayed spends can already be approved early.

Revisit this if claim-time payout and the controller at spend time need to be the same fact, or if a suspicious criterion exists that is not satisfied by the delegate verifying a name he controls.
