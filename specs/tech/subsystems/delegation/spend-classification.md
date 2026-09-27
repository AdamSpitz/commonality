# Spend classification

A donor cannot stop a delegate from spending in ways she would not have chosen. That is what the delegation is for. She can, though, attach criteria that sort his spends into classes, and set one treatment per class, so the worst cases take more of her attention and the payees she already accepts take less. Accepted in [ADR 0017](/specs/decisions/0017-spend-classification.md). How a standing pledge gets those fields onto its first note, and the 72 hour form prefill, are [ADR 0018](/specs/decisions/0018-pledge-classification-before-first-note.md).

This file specifies the beneficiary-identity classification implemented by the note contracts. The donor-set delay itself is [waiting-period.md](./waiting-period.md). A one-payment way through a block is [partial-takeback.md](./partial-takeback.md): she takes that amount back and pays it herself. It is not an approval that lets the delegate break the rule.

## Classes

A criterion returns only **unsuspicious** or **suspicious**. It does not name a delay or a block. She sets those once, per class.

| Class | When |
|---|---|
| Suspicious | Any enabled criterion returns suspicious |
| Unsuspicious | At least one returns unsuspicious, and none returns suspicious |
| Unmarked | Every criterion is silent |

Suspicious wins. Unmarked is the ordinary case, not a third setting.

The rules apply only when the delegate spends on his own. When the donor holds the note and submits the spend herself, neither the class nor `T` delays or blocks it.

## What she stores

On the note, beside the standing delay `T` from [waiting-period.md](./waiting-period.md):

- A **fine list** of `beneficiaryId`s. It starts empty.
- `U`, the unsuspicious delay, in seconds. `0 ≤ U ≤ T`. The default is `0`. Adding a name does not require her to pick `U`.
- No suspicious criterion is implemented. The policy has a slot, unset. Enabling one later requires her, in that same action, to choose either an extended delay `S` with `S ≥ T`, or **block**. There is no default.

She edits these in place. She does not reclaim or redeposit. `splitNote` copies them the way it copies `T`. `replaceDelegate` copies them onto the new note.

## Standing pledges

A standing pledge stores the same fine list and `U`. `createStandingPledge` takes the initial list and `U`. In that transaction it stores the pledge, writes `U`, writes the list, then mints the first note, so the first note copies them. `executeDue` mints later notes only. It is permissionless, and it is not how the first note is created. `pledgeFineList(pledgeId)` returns the list. `U` and `T` are read from the pledge. The indexer does not store the list.

Editing the pledge changes notes minted afterward. It does not change notes already minted, including that first one once it exists. There is no action that copies the pledge's list or `U` onto those notes. She edits a minted note on the note page. The SDK exposes one call per contract function, `setPledgeFineListed` and `setPledgeUnsuspiciousDelay`. It does not batch them and it does not write existing notes.

`U` cannot exceed the pledge's `T`. Callers that omit a delay still get 0. See [ADR 0018](/specs/decisions/0018-pledge-classification-before-first-note.md).

The deposit screen, on both create paths, shows one wait prefilled at 72 hours and a list of names that can be paid immediately. The list is empty until she adds a name. She can clear the wait. A shorter wait for those names is optional and stays hidden while it is zero. The screen says an immediate payment cannot be cancelled, and that a name matches only a payment straight to the wallet that currently controls it. A one-shot delegation writes that list onto the new note. It writes `U` only when the shorter wait is not zero.

The monthly-pledge card on My Notes stays a summary and links to a pledge page. That page edits what future notes inherit: `T`, `U`, the fine list, strict mode, and flaggers. The list uses the same domain field as the note and saves as she adds or removes a name. `T`, strict mode, and flaggers are one `updateSpendPolicy` save. `U` is `setPledgeUnsuspiciousDelay` after that, so a lower `T` can clamp it and the page shows the clamped value. A pledge already stored shows its stored `T`, not 72 hours. The page says that a save applies to notes minted afterward and not to notes already minted.

On a note, the same wait and the same names are the spend section. The shorter wait stays behind the same optional control. Strict mode and flaggers are a separate section: someone she names can pause a spend that is already waiting. Pending rows are labeled "On your list" or "Not on your list". The product does not show a suspicious label. No criterion returns that class.

An empty fine list never matches. That is not a separate "off" switch.

## The one criterion

A delegate spend is unsuspicious only when all of these are true:

1. The note's fine list contains a `beneficiaryId`.
2. The project records that same id **on-chain**, not in its metadata.
3. The project's assurance contract has an immutable recipient, and that recipient is still `payoutAddress(beneficiaryId)` on the beneficiary registry.

Escrow does not match. Neither does a project whose proceeds stay in the contract and are claimed later by whoever the registry names at claim time (`IdentityHeldProceeds` / `createERC1155AndAssuranceContractForBeneficiary`). A recipient fixed at creation that is no longer the current payout does not match. Both stay unmarked. They are not suspicious. A new domain, a new wallet, or a delegate who proved control of his own domain is not a suspicious criterion.

A third-party project matches if, and only if, it meets the three conditions above. The class does not mean the beneficiary endorses the project. Disavowal does not change it.

A verified identity is created as `FixedControllerAssuranceContract`: the recipient is the registry payout at creation, and `beneficiaryId` is stored on the contract. Its authorized factory pins the beneficiary registry at deployment and rejects a caller-supplied replacement registry. An identity that is not verified yet stays on `BeneficiaryAssuranceContract`, whose recipient is the contract itself until claim. That route does not match. Do not invent a match by reading metadata, and do not add payout-attestation machinery.

The pending spend shows that on-chain route. It does not substitute the registry's current wallet when the project pays something else.

## Treatments

| Class | Delegate spend |
|---|---|
| Unmarked | Wait `T`. No notification. |
| Unsuspicious | Wait `U`. No notification. |
| Suspicious | Wait `S` and warn, or block, as she chose when she enabled the criterion |

`U = 0` spends in the delegate's transaction and stores no pending row, same as `T = 0` on an unmarked spend. It is labeled unsuspicious in that authorization's history.

A suspicious warning is off-chain and follows her existing notification opt-in. The longer wait and the block are on-chain. [waiting-period.md](./waiting-period.md) already lets her approve a scheduled spend early. A block has no schedule, so **Approve now** has nothing to pay. The delegate's blocked spend reverts. She can take an amount back and pay it herself without changing the list, `U`, `S`, or the block on the note that stays delegated. See [partial-takeback.md](./partial-takeback.md).

## Deadlines already running

`setSpendDelay` does not move a deadline already given. That rule stays in [waiting-period.md](./waiting-period.md).

Classification is different. The schedule stores the time it was created. While it has not executed, the contract reclassifies it when the fine list, `U`, the project's route, or the registry payout changes the answer. The deadline becomes `scheduledAt +` the delay for the class it is in now. A deadline already in the past may be executed. Losing a match restores `T` from that same `scheduledAt`, which can put the spend back into the waiting period. The clock does not restart at the edit.

## What she sees

One section on her notes page lists her pending delegate spends. Each row says "On your list" or "Not on your list". The reserved class is not shown, because no criterion returns it. While she is signed in and any spend of hers is in that reserved class and still pending, one banner at the top of Commonality points at that section. The banner does not follow the notification opt-in. Email or push does. Neither is sent yet.

Immediate payments to a listed name are not in that pending section. They are in the authorization's history, labeled as on her list.
