# Tax

Recorded 2026-10-06 from a product discussion. This is a stance and a record of what the mechanism already does. It is not a legal opinion. Counsel still has to review it before any charity is told that a Commonality contribution can support an official tax receipt. Adam is a Canadian resident and the product may reach US users, so both a CRA official donation receipt and a US written acknowledgment are in scope.

The default remains: Commonality does not issue tax receipts, and the interface must not say that a contribution is tax-deductible. See [charitable solicitation](charitable-solicitation.md). The create-project website flow already says contributions are not tax-deductible gifts.

## Standing notes

- The tokens-as-receipts language should explicitly say "not a tax receipt." A LazyGiving recognition receipt is the non-transferable ERC-1155 from [ADR 0003](/specs/decisions/0003-reimbursement-only-retroactive-funding.md). It is not an official donation receipt.
- Adam's own dev-time funding via LazyGiving is ordinary income to him — fine, just plan for it.

## When a receipt could even be discussed

An official receipt names a completed gift from a legal person to a qualified donee (a CRA-registered charity, or a US organization whose determination allows the deduction). Three things have to have happened, and a fourth has to be false:

1. The assurance contract has succeeded, so the donor's refund right is gone.
2. The beneficiary has claimed the money. Under [ADR 0015](/specs/decisions/0015-per-project-beneficiary-proceeds.md) the proceeds sit in the project until that project's controller claims them. A payee who has not taken the funds has not yet received a gift.
3. The donor has permanently given up reimbursement. `forgoReimbursement` burns the caller's remaining at-cost claim and leaves the recognition receipt in place. Reimbursement already earned stays withdrawable. `donateNormallyERC1155` never records a claim. The amount that could be receipted is the part that was forgone or never claimed, not the original contribution if some of it was already paid back.
4. The donor did not merely delegate to the charity. A donor-owned note names an agent. The donor still owns the unspent balance and can revoke it. That is not a gift to the charity. The vision note in `docs/end-user/commonality/vision-and-strategy/hard-to-stop/after-tax.md` that treats "charity as delegate" as the deductible path is looser than this rule.

Reimbursement is paid by later donors out of the reimbursement pool. It is not a clawback of the charity's withdrawal. The charity can truly say it was paid and does not owe the money back while the donor still holds a claim on that pool. The outstanding claim is why the forgo still matters: until it is burned, the donor has not finished giving the money away. The receipt date is the later of the charity's claim and the donor's forgo. When the contribution was `donateNormallyERC1155`, the forgo is simultaneous with the contribution, so the date is the claim.

Whether the project is the charity's own activity, rather than a pass-through to someone the charity does not control, is the charity's decision. A conduit gift is the charity's problem to refuse. Commonality does not decide that a given project is receiptable.

## What the charity still needs about the donor

The chain shows that an address paid. A receipt has to name a person.

A KYC link helps when it gives the fields the receipt has to contain, tied to the address that held the contribution when the gift closed. In Canada that is the donor's legal name and mailing address. In the US the charity's acknowledgment has to identify the charity and the amount and say whether any goods or services came back; the donor's name is how the gift is filed to a person. An attestation that an address "passed KYC" fills none of those blanks. An attestation that a named issuer, on that date, binds the address to a legal name and mailing address does.

The charity issues the receipt and is liable for it. They may rely on an issuer they trust. The useful Commonality record is a lookup, not a document that looks like a receipt: address, attestations, project, net amount, and the time the refund right and the reimbursement claim were both gone.

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

Some pieces around it can be independent, and should be. Linking an Ethereum address to the legal name and mailing address a jurisdiction wants on a receipt is a KYC problem. It involves issuers, liability, and identity rules that are outside what Commonality should operate. When a standard way to publish that link exists, a donor should be able to use any issuer of that standard. The line we would then be able to say is: if you register your address with a standard Ethereum KYC provider, a project recipient that is a legal charity may be willing to issue you a tax receipt. "May" is the charity's choice. We do not build the issuer, and we do not require a particular one.

Until then, the onchain record still has to be complete enough that a charity who already knows the donor, or who later gains a KYC attestation, can do the rest without asking us what happened.

The facts that close the gap:

- **The contribution.** Which address, which project, which token, how much, and when. Purchases already emit `ERC1155Bought`.
- **The refund right has ended for good.** Success is not enough on an identity-targeted project. Contributors can still reclaim if the beneficiary does not claim within the unclaimed-proceeds window (or refuses). `SuccessNoted` records that someone marked success. `ProceedsClaimed` records that the current payout address for that `beneficiaryId` actually took the funds, which address took them, and how much. `ProceedsRefused` records the other ending. A receipt a charity is considering sits after `ProceedsClaimed`, and it is in question again if a later event returns those funds.
- **The donor has given up the reimbursement claim, and for how much.** `forgoReimbursement` and `donateNormallyERC1155` both emit `ReimbursementForgone` for the contributor and the amount. The receipt amount is that forgone amount, minus any reimbursement already paid to that contributor before the forgo. The record has to include those withdrawals too, because the forgo leaves already-earned reimbursement withdrawable.
- **The date.** The later of `ProceedsClaimed` and that contributor's `ReimbursementForgone`. For a normal donation the forgo is in the same purchase, so the date is the claim.

Those events are how this is baked in. A charity should be able to reconstruct each fact from the chain without trusting our database. Indexer views can make the reconstruction easier. They are not the source.

What the charity still brings, and what we do not have: its registration, its judgment that the project is its own receiptable activity, the purpose it put the money toward, and its decision to rely on a KYC attestation (or on knowing the donor directly) for the legal name and mailing address.

## Links outward

The interface can point at the steps we do not perform:

- A link to the standard Ethereum KYC registration, once one exists, for a donor who has not registered the address that paid.
- A link to the recipient's own website, for a donor who wants to ask that organization for a receipt. The charity's published statement, described above, is what makes that link honest: legal name, registration number, and which beneficiary ids are theirs.

The copy beside those links stays descriptive. It does not say the contribution is deductible, and it does not present our page as the receipt.

Do not issue receipts, generate a PDF that could be mistaken for an official receipt, or say in the interface that a contribution is deductible. Do not treat a recognition receipt, a leaderboard row, or a claim link as the tax receipt. Do not receipt an amount at pledge time, or any amount that can still be refunded or reimbursed. The US property-gift appraisal threshold for larger cryptocurrency contributions, and the exact Canadian split-receipting treatment of a forgone reimbursement claim, are counsel questions; they are not answered here.
