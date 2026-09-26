# 0015. Beneficiary proceeds stay in the project that raised them

- **Status:** Accepted
- **Date:** 2026-09-26
- **Related specs:** [`specs/product/fund-now-claim-later.md`](../product/fund-now-claim-later.md), [`specs/tech/subsystems/claimable-beneficiaries.md`](../tech/subsystems/claimable-beneficiaries.md)

## Context

`BeneficiaryIdentity` lets a controller voluntarily bind a public name to a payout address. That binding is not custody, and a direct payment to the bound address is still the sender's transfer to an address the controller published.

`BeneficiaryEscrow` did something else. Successful LazyGiving projects and content contracts deposited into one balance per name. One withdrawal paid every project that had deposited for that name. A controller who claimed money from one project also took every other project in that escrow, including projects they had not accepted. A second escrow deployment would have been a separate pot, but projects inside one deployment were pooled.

The project contract was already holding the contributions, already knew the contributor receipts, and already reserved reimbursement balances. The shared escrow was an extra hop that discarded that separation. It also froze a verified payout address onto projects created after verification, so a later rotation did not follow those funds.

## Decision

An identity-targeted project keeps its proceeds. There is no second escrow per project and no shared pot for new projects.

After success, the registry's current payout address may claim this project's recipient balance, or refuse this project. Claiming and refusing read the registry at that moment. They affect only this contract. Registering a payout address, and claiming some other project, do not accept this one.

A refusal before success lets contributors use the ordinary purchase-refund path. A refusal after success, or silence for 90 days after success is noted, lets contributors reclaim the recipient surplus in proportion to their claim-share balance. Reimbursement reserves stay reserved. The 90-day window starts when someone notes success, which the project page does, because the funding condition has no success timestamp.

`withdraw()` on these contracts reverts. The parent recipient is the contract itself. `BeneficiaryEscrow` remains deployed for old wiring and is not a destination for new projects.

## Alternatives considered

- **Keep one shared escrow per product.** Rejected. A single claim would keep accepting every project that later deposited for that name.
- **Deploy a fresh escrow contract per project.** Rejected. The project contract is already that box. A second contract would repeat custody and split the reimbursement accounting away from the receipts.
- **Freeze the payout address at project creation once the name is verified.** Rejected. Verification is not acceptance, and a later rotation would strand or misdirect that project's funds.

## Consequences

The UI has to say three separate things: the name is proved, this project's rules, and this balance was accepted. A Verified or Domain-controlled mark is not acceptance.

Content contracts use the same claim and refuse path. `CreatorAssuranceContractFactory` deploys those contracts through `CreatorAssuranceDeployer` so the factory stays under the contract size limit.

Someone must call `noteSuccess` after success or the 90-day reclaim clock does not start. The project page makes that call available.

Revisit this if a project needs to pay out before success, if reimbursement reserves and the recipient surplus can no longer be separated from `withdrawableRecipientBalance`, or if a real recovery flow needs balances keyed by claim generation rather than by project.
