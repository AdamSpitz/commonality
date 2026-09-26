# Donor-set waiting period

A donor may set a delay, including zero, on a delegated note. A delay above zero means the delegate cannot pay a project in the same transaction. He schedules the whole note. When the delay ends, anyone may complete that spend. She can release it early or cancel it. This file is the proposal the waiting-period item in [TODO.md](/TODO.md) asked for, and the contracts follow it.

The delay is her control over one delegate's spends. It is not a second escrow, and it does not interpret a sentence of intent. Cause-level intent stays a [NoteIntent](/hardhat/contracts/delegation/NoteIntent.sol) attestation. The schedule records the project and the amount.

## Where the delay lives

`spendPolicies[noteId]` stores `delay` (seconds) and `strictMode`. A note with no policy has delay zero and strict mode off. She can change either in place. A spend already scheduled keeps the deadline it was given (`block.timestamp + delay` at schedule time). Setting the delay to zero does not make that in-flight spend immediate. She approves it if she wants it paid now.

`delegate` still creates a note with delay zero. `delegateWithDelay` is the same delegation with a delay. `setSpendDelay` and `setStrictMode` are root-only on that note.

A same-chain `splitNote` is leaf-only on a delegated note. It moves part of the amount to a new note with the same chain and copies the delay, the strict-mode switch, and the flagger list. The new note does not add a hop. A note with a pending spend cannot be split.

`replaceDelegate` cancels a pending schedule and moves the funds with no project attached. The new note copies the strict-mode switch and the flagger list, and it keeps the current delay. `replaceDelegateWithDelay` is that same replacement when she sets a different delay in the action. A full replacement deletes the old note. A partial replacement leaves the remainder delegated to the current leaf, with its schedule cleared, because a schedule covers the whole note.

`revoke` clears a pending schedule and then truncates the chain as it does today.

## One schedule for the whole note

The delegate schedules one project for the whole note: primary market, ERC-1155 contract, token id, and count. He splits first when he wants to send only part of the money. A second schedule on the same note reverts.

Delay zero spends in that transaction and stores no pending row. `purchaseFromPrimaryMarket` still spends immediately when the delay is zero, which is the existing path. When the delay is above zero, that direct purchase reverts. The delegate uses `scheduleSpend`.

After `deadline`, `executeScheduledSpend` is permissionless. It pays the project through the same purchase path. Her `approveScheduledSpend` pays immediately, including while the spend is paused and before the deadline. If the purchase reverts, the schedule stays pending, anyone may retry, and the deadline does not move.

The delegate's `cancelScheduledSpend` returns the note to him with no project attached. Scheduling again starts a fresh delay and a new nonce. Her cancel does the same and leaves him as delegate.

## Pause

Strict mode is off unless she turns it on. She names flaggers with `setSpendFlagger`. The list is not her Subjectiv trust graph. A flagger call reverts when the caller is the current leaf or the scheduled primary market.

`flagScheduledSpend` always emits `SpendFlagged`. In the default mode the countdown continues. In strict mode that call sets `paused`. Turning strict mode on does not pause a spend that was already flagged. Removing a flagger, or turning strict mode off, does not clear a pause that already happened.

While `paused` is true, `executeScheduledSpend` reverts and the delegate cannot cancel. She can approve, cancel, or revoke. `replaceDelegate` is her transaction, so it also clears the schedule.

## Recurring pledges

A standing pledge stores `spendDelay`, `strictMode`, and its own flagger list. Each note it mints copies all three. `updateSpendPolicy` changes what later notes receive. Notes already minted keep the settings they were born with. She can still edit those notes in place.

## Events

| Event | When |
|---|---|
| `SpendDelaySet` | She sets the delay on a note |
| `StrictModeSet` | She turns strict mode on or off |
| `SpendFlaggerSet` | She adds or removes a flagger |
| `NoteSplitSameChain` | The delegate splits a note without adding a hop |
| `SpendScheduled` | A pending spend is recorded. `nonce` identifies that schedule |
| `SpendFlagged` | A flagger flags it. `paused` is true only in strict mode |
| `SpendCancelled` | She or the delegate cancels it |
| `SpendScheduleCleared` | Revoke or replacement drops it |
| `SpendExecuted` | Approve or permissionless completion pays the project |

`StandingPledgeCreated` carries `spendDelay` and `strictMode`. `PledgeSpendPolicyUpdated` records a later edit.

## Off-app notification

A follower of `SpendFlagged` pages her only when she has opted into a channel, and only once per `(noteId, nonce)`. Later flags still emit, and a later flag in strict mode can still pause, but they do not page her again. A new schedule has a new nonce and can page her once. The decision lives in `service-host/src/spendFlagNotifier.ts`. The chain does not store messages or email addresses.

Public remarks from people who are not flaggers are a later UI feature. They are not stored on-chain. The schedule is the on-chain record.

## What a project page should show

`SpendScheduled` is a pending contribution of the note's full amount until `SpendExecuted`, `SpendCancelled`, or `SpendScheduleCleared`. The page shows the amount and the deadline as money that can still be cancelled. It does not count as raised. That page is not wired yet.

## Out of scope

Beneficiary allow-lists, donor exceptions, refund authority, and a prose label on the schedule are other items. This design does not add them.
