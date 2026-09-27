# Partial takeback

The donor can take part of a delegated note back without ending the delegate's authority over the rest. This is the exact-payment case as well as an ordinary control. There is no separate approval that lets the delegate break a rule for one payment.

A wait is still [waiting-period.md](./waiting-period.md). **Approve now** pays a pending spend, including one that is only unmarked because the beneficiary is not on her fine list. A block still has no schedule. The delegate's blocked spend reverts. She takes an amount back and pays it herself from the note she then holds. That does not change the delay, the fine list, the flaggers, strict mode, or a block on the note that stays delegated.

## Call

`partialTakeback(noteId, owners, amount)`

`owners` is leaf-first, as on every other note call. The caller is the root, `owners[owners.length - 1]`. The note is delegated: the chain is longer than the root alone. A note she already holds is not a takeback. She spends or reclaims it.

`amount` is greater than zero and less than the note's balance. The whole balance is `revoke`, not this call.

If `pendingSpends[noteId]` exists, the call reverts. It does not clear that spend. She can cancel the spend, or revoke the whole note, and those remain separate actions. This is unlike `replaceDelegate`, which clears a pending spend even when it moves only part of the balance.

## What moves

The original note keeps its id, its `chainHash`, and its spend policy. Its balance decreases by `amount`. The delegate is still the leaf. A full takeback emits `NoteRevoked`. This call does not.

The amount she names is a new note. Its chain is the root alone: `keccak256(root, bytes32(0))`. She is the leaf, so a delay or a block does not apply to a purchase she submits from it. The new note receives the spend policy `splitNote` copies: delay, unsuspicious delay, strict mode, flaggers, and the fine list. Those fields do not constrain her while she holds the note. If she delegates it again, they are still there.

The reimbursement claim moves in proportion with the amount, by the same division `splitNote` and `replaceDelegate` use. A note with no claim is unchanged aside from the balance.

This applies to a payment note and to a receipt note. After the slice is hers, a refund is still per note and still whole-note: she can refund the slice she holds, and the delegate can still refund the remainder. A standing pledge is not this note. Later notes it mints are unaffected.

## Events and fold

In the same transaction, in this order:

1. `NoteCreated` for the new note, with her as `owner` and the slice's amount and token.
2. `NotePartiallyTakenBack(noteId, sliceNoteId, amount)`.

Do not emit `NoteRevoked` for either note. Do not emit `ChainSplit`. That event means the new note inherits the delegated chain. This note does not.

`foldDelegationState` leaves the parent chain as it was and reduces the parent balance. The slice stays the root-only chain from `NoteCreated`. It does not gain the parent's delegate.

## Product names

Her full action is **takeback**. It is still the `revoke` function and the `NoteRevoked` event. Her partial action is **partial takeback**. The delegate's use of `revoke` is him handing the note back, not a takeback.

Nothing in this action records a project the delegate asked her to pay. A later purchase is whatever she submits. The interface must not call partial takeback an approval of his payment.

## Implementing this

Do not reopen the design. Read [workflow/roles/developer.md](/workflow/roles/developer.md) and follow it. The behavior is this file. The fold and the SDK action are in [README.md](./README.md). The notes-page controls are in [ui.md](./ui.md). The names are in [specs/glossary.md](/specs/glossary.md): **Takeback** and **Partial takeback**.

In `DelegatableNotes`, add `partialTakeback(noteId, owners, amount)` as specified above. Update `foldDelegationState` so the parent chain stays and its balance drops, and the slice stays root-only. Add the SDK action. In the notes UI, the root sees **Takeback** (existing `revoke`) and **Partial takeback** (this call). The leaf's `revoke` control is **Hand back**. Partial takeback is unavailable while a spend is pending.

Tests must cover: a partial amount; the full amount reverts; zero reverts; a pending spend reverts and is still pending; the policy and the fine list are copied; the claim portion moves; a receipt note as well as a payment note; the parent does not emit `NoteRevoked`; and a later purchase by her is not delayed. Do not change `replaceDelegate`'s habit of clearing a pending spend.
