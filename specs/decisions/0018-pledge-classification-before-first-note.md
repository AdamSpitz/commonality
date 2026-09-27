# 0018. A standing pledge applies its fine list before the first note, and new delegations prefill a 72 hour wait

- **Status:** Accepted
- **Date:** 2026-09-27
- **Related specs:** [`specs/tech/subsystems/delegation/spend-classification.md`](../tech/subsystems/delegation/spend-classification.md), [`specs/tech/subsystems/delegation/waiting-period.md`](../tech/subsystems/delegation/waiting-period.md)

## Context

`createStandingPledge` stored the pledge and minted the first note in the same transaction. The fine list and `U` were not arguments, so that note always copied an empty list and `U = 0`. The product also never sent a standing delay, so `T` was 0 and a non-zero `U` could not be saved later. `executeDue` is permissionless, and a pledge with `lastExecuted == 0` is already due.

## Decision

Creation still mints the first note in that transaction. Internally it stores the pledge, sets `U`, sets the fine list, then mints, so the first note receives them. `executeDue` remains the later permissionless execution and is not what produces the first note. A `pledgeFineList` getter exposes the list. Editing the pledge still changes only notes minted afterward.

The deposit screen, for both a new standing pledge and a one-shot delegation, asks for one wait and for names that can be paid immediately. The wait is prefilled at 72 hours. She can clear it, including to 0. A name is paid immediately unless she opens the optional shorter wait. The contract and the SDK still treat an omitted delay as 0. The screen does not lead with a second duration, and it does not use the class names. It says that an immediate payment to a listed name cannot be cancelled, and that the list matches only a payment straight to the wallet that currently controls that name. The note page shows the wait stored on that note.

## Alternatives considered

- **Leave creation as it is and tell her the first note is the exception.** Rejected. With `T = 0` the delegate can spend that note before a follow-up transaction.
- **Stop minting inside create, then let her set policy and call `executeDue`.** Rejected. Anyone can call `executeDue` once the pledge is due, so the first note can still be minted empty, ahead of her next transaction.
- **Separate external calls, batched by a multicall contract.** Rejected. The policy setters require `msg.sender` to be the pledge owner. A multicall would fail that check. Internal calls from the one create function keep `msg.sender`.
- **Default `U` to `T`.** Already rejected in [ADR 0017](./0017-spend-classification.md). An empty list makes `U` unused, and adding a name is not a second chore.
- **Change the contract default of `T` to 72 hours.** Rejected. Zero remains a legal delay, and existing callers that omit it keep today's behavior. 72 hours is only the form prefill.
- **Edit the fine list and `U` on the summary card, or copy them onto notes already minted.** Rejected. The card stays a summary and links to a pledge page. Notes already minted are edited on the note page.
- **Collect the list only for a standing pledge.** Rejected. A one-shot delegation is the same decision for one pile of money. The note is the policy, so the deposit screen writes the list onto that note.
- **Leave strict mode and flaggers off the pledge page.** Rejected. The pledge already stores them and copies them onto later notes. The pledge page is everything a future note inherits. On the note page, flaggers stay in their own section, apart from the wait.

## Consequences

The create signature gains the initial list and `U`. A one-shot delegation uses `delegateWithDelay` for the prefilled wait, then writes the same list onto the new note. It writes `U` only when she set a non-zero shorter wait. `U = 0` needs no extra call.

The pledge page edits `T`, `U`, the list, strict mode, and flaggers. The list is saved as she adds or removes a name. The other fields are one save. The note page shows one wait, the names, and an optional shorter wait. Strict mode and flaggers are a separate section. Pending rows say "On your list" or "Not on your list". The reserved class is not labeled suspicious, and nothing in the product produces it yet.

Revisit the 72 hour prefill if donors treat it as a trap, or routinely clear it to zero. Revisit minting inside create if the first pull should wait a full period.
