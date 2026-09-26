# Spend classification

A donor cannot stop a delegate from spending in ways she would not have chosen. That is what the delegation is for. She can, though, attach criteria that sort his spends into classes, and set one treatment per class, so the worst cases take more of her attention and the payees she already accepts take less. Accepted in [ADR 0017](/specs/decisions/0017-spend-classification.md).

This file is the proposal the beneficiary-identity item in [TODO.md](/TODO.md) asked for. It does not change contracts. The donor-set delay itself is [waiting-period.md](./waiting-period.md). A one-payment way through a block is [partial-takeback.md](./partial-takeback.md): she takes that amount back and pays it herself. It is not an approval that lets the delegate break the rule.

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

She edits these in place. She does not reclaim or redeposit. `splitNote` copies them the way it copies `T`. `replaceDelegate` copies them onto the new note. A recurring pledge stores the same fields and copies them onto each note it mints. Editing the pledge changes later notes only. Notes already minted keep what they have until she edits those notes.

An empty fine list never matches. That is not a separate "off" switch.

## The one criterion

A delegate spend is unsuspicious only when all of these are true:

1. The note's fine list contains a `beneficiaryId`.
2. The project records that same id **on-chain**, not in its metadata.
3. The project's assurance contract has an immutable recipient, and that recipient is still `payoutAddress(beneficiaryId)` on the beneficiary registry.

Escrow does not match. Neither does a project whose proceeds stay in the contract and are claimed later by whoever the registry names at claim time (`IdentityHeldProceeds` / `createERC1155AndAssuranceContractForBeneficiary`). A recipient fixed at creation that is no longer the current payout does not match. Both stay unmarked. They are not suspicious. A new domain, a new wallet, or a delegate who proved control of his own domain is not a suspicious criterion.

A third-party project matches if, and only if, it meets the three conditions above. The class does not mean the beneficiary endorses the project. Disavowal does not change it.

A verified identity is created as `FixedControllerAssuranceContract`: the recipient is the registry payout at creation, and `beneficiaryId` is stored on the contract. An identity that is not verified yet stays on `BeneficiaryAssuranceContract`, whose recipient is the contract itself until claim. That route does not match. Do not invent a match by reading metadata, and do not add payout-attestation machinery.

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

One section on her notes page lists her pending delegate spends. Each row is labeled unmarked, unsuspicious, or suspicious, and suspicious rows stand out. Unmarked and unsuspicious rows are still there. While she is signed in and any spend of hers is suspicious and still pending, one banner at the top of Commonality points at that section. The banner does not follow the notification opt-in. Email or push does. Neither is sent yet.

Immediate unsuspicious spends are not in that pending section. They are in the authorization's history, with the same label.
