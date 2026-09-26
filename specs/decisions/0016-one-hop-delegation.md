# 0016. A delegated note has one delegate, and replacing that delegate mints a new note

- **Status:** Accepted
- **Date:** 2026-09-26
- **Related specs:** [`specs/tech/subsystems/delegation/one-hop.md`](../tech/subsystems/delegation/one-hop.md)

## Context

`DelegatableNotes` stored one note id and rewrote its `chainHash` when the leaf delegated onward. A chain could reach `MAX_DELEGATION_DEPTH` (200). The leaf could hand spending authority to someone the donor had never named. Revoke and a full `delegate()` already rewrote the chain on the same note id. A partial `delegate()` did the other thing: it minted a new note for the part that changed hands and left the remainder on the original id.

The product rule is one delegate per note. The donor names that person. If someone else should direct the funds, the donor replaces the delegate. The delegate can spend, or hand the whole note back. The delegate cannot add another hop. A chain longer than the donor plus one delegate cannot be spent or extended until it is revoked back down. Recurring pledges already mint `[donor, delegate]`. Changing the pledge's delegate applies to later mints. A note already minted changes only when the donor replaces it.

## Decision

A note is the donor alone, or the donor plus exactly one delegate.

`delegate` succeeds only when the caller is the leaf of an undelegated note. `replaceDelegate` is root-only and only on a note whose chain is exactly those two addresses. It mints a new note whose chain is `[donor, newDelegate]`. It does not rewrite the chain on the note the previous delegate held. A full replacement retires that note. A partial replacement leaves the remainder delegated to the current delegate. The donor signs the replacement. There is no on-chain nomination.

Purchases, refunds, and reimbursements still copy the chain they already copy. A copied chain longer than one hop cannot be spent until it is revoked back down.

## Alternatives considered

- **Rewrite the existing note's chain from Bob to Carol.** Rejected. Partial replacement already mints a new note. Full replacement is that same path with nothing left over. Rewriting the old id would make "who holds this note" change underneath a stable id, which the rest of replacement does not do. `delegate` and `revoke` still rewrite a chain in place. This decision does not make those two append-only.
- **Let the donor approve a third address on the same chain.** Rejected. That keeps the previous delegate in the chain, able to cut the new one off. The approval that matters is who holds the single spending seat.
- **Revoke, then delegate, as the only replacement path.** Rejected as the designed action. It still works as two transactions, and the note is undelegated between them. One replacement transaction moves the named amount with no gap on any remainder.
- **Grandfather longer chains so they can still be spent.** Rejected. A chain that is already longer than one hop stays in storage until someone revokes it, and it cannot be spent or extended while it is longer.

## Consequences

Callers that stored a note id across a full replacement must follow `NoteDelegateReplaced` to the new id. The fold keeps the retired note inactive, with the chain it had.

An off-chain request in the UI, where the current delegate names a proposed successor for the donor to sign, is not part of this decision.

Revisit this if a note id has to stay the accounting identity across a change of delegate, or if `delegate` and `revoke` themselves should stop rewriting a chain in place.
