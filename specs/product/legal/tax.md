# Tax

Recorded 2026-10-06 from a product discussion. This is a stance and a record of what the mechanism already does. It is not a legal opinion. Counsel still has to review it before any charity is told that a Commonality contribution can support an official tax receipt. Adam is a Canadian resident and the product may reach US users, so both a CRA official donation receipt and a US written acknowledgment are in scope.

The default remains: Commonality does not issue tax receipts, and the interface must not say that a contribution is tax-deductible. See [charitable solicitation](charitable-solicitation.md). The create-project website flow already says contributions are not tax-deductible gifts.

## Standing notes

- The tokens-as-receipts language should explicitly say "not a tax receipt." A LazyGiving recognition receipt is the non-transferable ERC-1155 from [ADR 0003](/specs/decisions/0003-reimbursement-only-retroactive-funding.md). It is not an official donation receipt.
- Adam's own dev-time funding via LazyGiving is ordinary income to him — fine, just plan for it.

## When a charity could review a contribution

An official receipt or acknowledgment concerns a gift from a legal person to an eligible organization. The following are useful conditions for referring a contribution to a charity for review, not a test that establishes a gift or its eligible amount:

1. The project has succeeded and the relevant contribution is no longer refundable. Success alone does not close the later reclaim path: for every new project, unclaimed recipient proceeds can be returned after refusal or the 90-day claim window.
2. The beneficiary has claimed this project's proceeds. Under [ADR 0015](/specs/decisions/0015-per-project-beneficiary-proceeds.md), they stay in the project until its controller claims them.
3. The contributor's reimbursement position is known. `forgoReimbursement` extinguishes the specified future claim, but reimbursement already earned stays withdrawable. `donateNormallyERC1155` creates no reimbursement claim. The charity needs the full history of claims, accruals, withdrawals, and refunds to evaluate any benefit to the donor.
4. The transfer was more than revocable delegation. A donor-owned note names an agent; its unspent balance remains the donor's and can be revoked. The vision note in `docs/end-user/commonality/vision-and-strategy/hard-to-stop/after-tax.md` treats "charity as delegate" as a deductible path, but that claim should not guide product copy without counsel's review.

Reimbursement is paid by later donors out of the reimbursement pool; it does not claw back the charity's withdrawal. Still, an outstanding or already accrued claim may matter to the donor's gift and its value. Neither the charity's claim nor the contributor's forgo event, separately or together, establishes the legal date or amount of a gift. Those are questions for the charity and counsel.

Whether the project is the charity's own activity, rather than a pass-through to someone the charity does not control, is the charity's decision. A conduit gift is the charity's problem to refuse. Commonality does not decide that a given project is receiptable.

## What the charity still needs about the donor

The chain shows that an address paid. A receipt has to name a person.

A KYC link helps when it gives the fields the receipt has to contain and helps identify the actual donor; the address that received the recognition token might not be the person who paid. In Canada the charity needs the donor's legal name and mailing address. In the US the charity's acknowledgment has to identify the charity and the amount and say whether any goods or services came back; the donor's name is how the gift is filed to a person. An attestation that an address "passed KYC" fills none of those blanks. An attestation that a named issuer, on that date, binds an address to a legal name and mailing address may help, but the charity must still establish who made the gift.

The charity issues the receipt and is liable for it. They may rely on an issuer they trust. The useful Commonality record is a lookup, not a document that looks like a receipt: addresses, attestations, project, token amounts, and the relevant transaction history. It should not label a computed net amount or timestamp as the eligible gift amount or donation date.

## What the charity still needs about itself

A beneficiary id such as `dns:example.org` proves that someone who controls a name also controls a key. A receipt has to name a legal entity and a registration number: a CRA business number, or an EIN plus a 501(c)(3) determination. Domain control supplies neither, and the domain can belong to a webmaster, a chapter, or the next registrant.

The charity does not need that proof to know it received the money. If its own key claimed, and the funds landed in an account on its books, it already knows. The missing link runs the other way, so a donor can ask the right organization and the organization can say so publicly.

What carries that is a statement the charity publishes under a name it already controls:

- its legal name and registration number
- the beneficiary id, and the payout address allowed to claim for it
- a place donors send the request

The strongest cheap anchor is to publish that statement on the website the CRA public listing already shows for that registration number, and to prove control of that website the way `dns:` control is already proved. The chain is then: the regulator's list says this registration number and this website; the website says these Commonality ids and addresses are ours; the address that claimed is one of those. A registrar-only proof, with no registration number on the statement, is not enough.

A self-serve "we are a charity" toggle on project creation does not establish any of this.

## What Commonality publishes, and what it does not decide

The final call is the charity's. Our job is to make the facts easy to read. A charity combines those facts with its own knowledge (what the money was for, and whether this project is an activity it is allowed to receipt) and with third-party identity data, and then decides whether to issue a receipt. We do not issue one, and we do not certify that a contribution is eligible in any jurisdiction.

A standalone package — "a bundle of info demonstrating that this contribution is eligible for a tax receipt in this jurisdiction" — does not work. Eligibility depends on mechanism details that belong to these contracts. The reimbursement claim is one of them: it is a LazyGiving rule, and the donor's ability to extinguish it is part of the legal story. That record has to live inside Commonality. It cannot be a generic receipt-eligibility protocol.

Some pieces around it can be independent, and should be. Linking an Ethereum address to the legal name and mailing address a jurisdiction wants on a receipt is a KYC problem. It involves issuers, liability, and identity rules that are outside what Commonality should operate. When a standard way to publish that link exists, a donor should be able to use any issuer of that standard. We could then say that identity information may help a project recipient that is a legal charity evaluate a receipt request. It does not establish that the address holder made the gift or that the contribution qualifies. We do not build the issuer, and we do not require a particular one.

Until then, the onchain record still has to be complete enough that a charity who already knows the donor, or who later gains a KYC attestation, can do the rest without asking us what happened.

The chain facts to expose for charity review:

- **Payments and refunds.** Which address paid, which address received the recognition token, which project and payment token were involved, amounts, and timestamps. Purchases emit `ERC1155Bought`; refunds emit `ERC1155Sold`. The payer and recipient need not be the same person, and an address alone does not establish the true donor.
- **Project and beneficiary history.** `SuccessNoted` records that success was marked. On an identity-targeted project, `ProceedsClaimed` records which payout address took this project's proceeds and how much; `ProceedsRefused` records refusal. The view must account for any later return of funds or other change affecting the contributor's refund rights.
- **Reimbursement history.** Show claim creation, accrued and withdrawn reimbursement, and claim extinguishment. `forgoReimbursement` and `donateNormallyERC1155` emit `ReimbursementForgone`, but the former extinguishes a specified future claim while leaving previously accrued reimbursement withdrawable. `recordPrimaryRefund` also emits `ReimbursementForgone` as it reduces accounting basis during a refund on failure. The event therefore cannot, by itself, prove a gift or supply its amount. Interpret it alongside purchase, refund, reimbursement, and project events.
- **Event times.** Show the times of payment, success, beneficiary claim, reimbursement accrual and withdrawal, forgo, and refund. Do not designate the later of claim and forgo as the donation date; counsel and the charity must determine when, if ever, a gift was made.

These events and contract state are the evidence Commonality can supply. A charity should be able to reconstruct the transaction history from the chain without trusting our database. Indexer views can make that easier, but must not present a computed "receiptable amount," "eligible gift," or "receipt date" as an established fact.

What the charity still brings, and what we do not have: its registration, its judgment that the project is its own receiptable activity, the purpose it put the money toward, and its decision to rely on a KYC attestation (or on knowing the donor directly) for the legal name and mailing address. It must also determine the true donor, whether and when a gift occurred, the value of what it received, and the value of any benefit or remaining right the donor had.

## Questions for counsel before any tax-receipt flow

- In Canada and the US, when does a gift occur in each purchase and reimbursement path, especially when a reimbursement claim is waived after the charity claims proceeds? The event sequence is evidence, not the legal answer.
- What property, if any, is given at that point, and how should it be valued in the relevant currency? How do accrued or paid reimbursement, a remaining claim, and other donor benefits affect the eligible amount? Canadian split receipting and deemed fair market value rules may matter.
- How should the charity substantiate that it controlled this project and that the funds supported its own charitable activities rather than an earmarked payment to another person or entity?
- For US digital asset gifts, what acknowledgment, Form 8283, and qualified appraisal requirements apply? IRS guidance says a qualified appraisal is generally required when the claimed deduction exceeds $5,000. This is a donor substantiation issue that an onchain record does not solve.

## Links outward

The interface can point at the steps we do not perform:

- A link to the standard Ethereum KYC registration, once one exists, for a donor who has not registered the address that paid.
- A link to the recipient's own website, for a donor who wants to ask that organization for a receipt. The charity's published statement, described above, is what makes that link honest: legal name, registration number, and which beneficiary ids are theirs.

The copy beside those links stays descriptive. It does not say the contribution is deductible, and it does not present our page as the receipt.

Do not issue receipts, generate a PDF that could be mistaken for an official receipt, or say in the interface that a contribution is deductible. Do not treat a recognition receipt, a leaderboard row, or a claim link as the tax receipt. Do not suggest receipting at pledge time or while funds remain refundable. The questions above are not answered by this spec.

## Tax authority references

- [CRA: What you need to know to issue an official donation receipt](https://www.canada.ca/en/revenue-agency/services/charities-giving/charities/operating-a-registered-charity/issuing-receipts/what-you-need-know-issue-official-donation-receipt.html) — true donor, date received, fair market value, and advantages.
- [CRA: Deemed fair market value rule](https://www.canada.ca/en/revenue-agency/services/charities-giving/charities/operating-a-registered-charity/issuing-receipts/deemed-fair-market-value-rule.html) — possible limit on the receipted value of non-cash gifts.
- [IRS: Frequently asked questions on digital asset transactions](https://www.irs.gov/individuals/international-taxpayers/frequently-asked-questions-on-digital-asset-transactions) — digital asset acknowledgment and appraisal requirements.
- [IRS: Publication 526](https://www.irs.gov/publications/p526) — qualified organizations, donor benefits, and gifts earmarked for a specific person.
