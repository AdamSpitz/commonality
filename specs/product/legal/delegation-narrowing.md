# Delegation: further ways to narrow the legal story

Thinking notes, 2026-09-25. Not a decision, not legal advice, and not a plan to publish delegation as its own package. This assumes delegation stays inside integrated Commonality.

The discussion follow-up and priority list at the end capture the latest direction. Earlier sections retain the original candidates for context; mandatory expiry, a separate cancellation watcher, and automatic termination on contribution are not the preferred first version.

Three items already in [TODO.md](/TODO.md) are the working baseline, and this file does not reopen them:

- One hop. The delegate cannot pass spending authority onward unless the donor approves that next person.
- One voice. The donor is authorizing a spend. The delegate promises nothing. Intent is public and does not bind. Commonality does not choose or supervise the delegate. "Scout" remains the word for an early contributor who may be reimbursed at cost, not a manager of other people's money.
- An optional delay the donor sets, including zero. The spend stays a scheduled spend on the note. She can revoke or approve early. Only someone she already trusts can page her. Only a setting she turns on lets that flag pause the clock.

With that baseline, the product is a limited authorization. The ideas below are about what that authorization is allowed to do. Adam has not picked any of them.

## Risk tiers

Worth having, and the first version's triggers are probably wrong.

A tier that treats "the project is new" as automatically suspicious makes it harder for a new project to get its first funding and start a snowball. That cost may be too high.

"The payout address is the delegate" and "the payout address has never been paid by anyone else" are easy to fake. A malicious delegate can create other addresses and move money among them until the payout address looks used and independent.

A vouch is a better direction than those mechanical tests: people vouch for particular payout addresses, and the donor's existing trust graph decides whose vouches count. What "vouch" means, who can issue one, how fast a new honest project can get one, and what happens to a spend with no vouch are open. A sybil who vouches for his own payout address should not satisfy a donor who only counts people she trusts.

Until that exists, do not treat the three mechanical triggers as the design.

## Rules she signs, separate from prose intent

At setup she could turn on constraints the contract actually enforces: this cause only, a per-month cap, an expiry, a payout address that someone she trusts has vouched for. A spend outside a rule she turned on reverts.

Prose intent stays a label for humans. It is not a condition the contract interprets. Hopes she did not turn into a rule remain unenforced, on purpose.

## His control ends when the gift is made

Refunds and at-cost reimbursement claims would come back to the donor, undelegated. The delegate directed a donation. He would not keep a balance, a receipt he can redirect, or a claim he can recycle into the next project. Further budgets would require her to delegate again.

This changes the current chain behavior, where the chain survives purchases, refunds, and reimbursements. That survival is load-bearing for the present note design, so this is a real product change, not a copy change.

## The authority expires

Spending authority lapses unless she renews. The renewal screen shows what he funded. Each renewal is a fresh authorization after she could have seen the record.

## A watcher who cannot spend

She could name one person she already trusts who may cancel a pending spend and cannot receive the funds or spend them. Optional. Donors who want the delegate alone are not forced to name one. This is a stop button, stronger than a notification, and it is not a second spending hop.

## He never holds the balance

The stronger variant: the delegate nominates a project, and her budget pays that project only when the rules she signed pass and her delay runs out. There is no balance he can draw. The monthly pledge is the closest current shape. What this gives up is the note as a pool he can split and carry across refunds.

## Still settled only at the baseline

None of the ideas above replace the counsel question for the baseline: one named delegate, donor-set amount and delay, spends only into project contracts, no fee, no directory, revocable unspent and pending funds, Commonality operating the site and the notification. They are candidates for making that question easier, after the vouch and the refund-path consequences are thought through.

## Discussion follow-up: preserve hands-off delegation

Adam's feedback, 2026-09-25. These qualify the candidates above; they do not authorize implementation:

- Prefer objective evidence where available, with trust-graph judgments as a fallback. Explore the existing [beneficiary identity system](../../tech/subsystems/claimable-beneficiaries.md) before introducing payout-address vouches. Different purposes may need different trust graphs; record that concern without designing those graphs yet.
- Keep “$100/month” as depositing another $100 each month. Additional spending-cap accounting is low priority.
- Rules constrain the delegate's independent authority. The donor should be able to authorize an exception to their own rules, with a clear warning about what this spend overrides. No need to reclaim and redeposit just to exercise that control.
- Refund destination remains open. Failed assurance projects are expected, and requiring fresh delegation after each failure creates donor work and discourages the delegate from helping projects that may not reach threshold.
- Mandatory expiry is unattractive: it adds renewal work and can encourage spending before authority expires. A watcher with cancellation powers also appears to add too much complexity for now.

Working direction to develop, not an adopted design: preserve reusable delegated budgets and focus on one hop, revocation, donor-set delay, clear recipient evidence, and explicit donor exceptions. Failed-project refunds and successful-project reimbursements should be considered separately before choosing whether either ends delegation.

Beneficiary integration must distinguish three questions: which public identity the donor intends to fund; evidence connecting that identity to a payout wallet; and whether the proposed work deserves funding. Domain control addresses the second, not all three. Today's verifier uses a trusted platform signer; DNSSEC / zkTLS remain future mechanisms. Unclaimed identity escrow can bind a destination before onboarding, but does not prove the beneficiary will claim or endorse a third-party project.

Check the actual project payout route, not just its metadata or the registry's current wallet: projects created for an already verified beneficiary currently fix the direct recipient at creation, while projects created unclaimed route through beneficiary escrow. Wallet rotation therefore needs explicit treatment when checking a scheduled spend. A new domain or wallet alone must not be treated as suspicious; proving control of a delegate-created domain alone must not be treated as evidence of independence or suitability either.

## Priorities: donor control with minimal ongoing work

Direction discussed with Adam, not a contract implementation specification:

1. **One named delegate**, with donor approval required for replacement.
2. **Reliable revocation**, covering pending spends and authority over future returned funds. Revocation must reach outstanding receipt claims so a later refund cannot revive authority the donor removed.
3. **Optional donor-set delay**, including zero, with clear pending payments and early approval. Zero delay offers no guaranteed intervention window. Keep trusted flags as notification by default and the already-proposed donor opt-in pause mode as the stronger choice.
4. **Beneficiary identity integration**, showing and checking the actual destination. Offer donor-approved identities where useful, without requiring every donor to preselect recipients: broad project discovery can deliberately remain the delegate's job.
5. **Specific donor overrides**, without accidentally changing standing rules. Rules govern what the delegate can do without asking; the donor can approve an exception for an exact payment.

Keep monthly deposits as they are. Defer additional spending caps, compulsory renewal, separate watchers with cancellation authority, and new payout-attestation machinery. Optional spending summaries can prompt review without expiring authority; respect notification preferences.

### Beneficiary evidence and recipient choice

“Has a verified domain” is not a sufficient safety filter: a dishonest delegate can verify their own domain. An optional rule restricting independent spending to identities the donor has approved is stronger, but costs the donor some of the discovery benefit of delegation. Identity verification connects an identity to an authorized payout; it does not establish that the work is worthwhile or aligned with the donor's intentions.

Do not require every beneficiary to claim before receiving contributions. Preserve fund-now-claim-later, while distinguishing “destination reserved for this identity” from “controller has verified and adopted a payout wallet.” Neither implies endorsement of a third-party project. Stronger proof mechanisms can improve verification later without inventing a new product concept now.

### Donor exceptions

For an ordinary pending spend, use **Approve now**. If it violates a configured rule, identify the exception explicitly, for example: “This beneficiary is outside your approved list. Approve this payment anyway?” The donor's approval binds to that exact payment; changing the standing rule is a separate choice. Warnings accompany deliberate donor overrides, while the delegate's independent restrictions remain contract-enforced.

### Reusable budgets and returned funds

The current recommendation is to preserve delegation through failed-project refunds. A useful authorization is: “Keep trying to fund suitable work with this budget until I revoke it.” Failure to reach an assurance threshold is expected, and should not routinely require fresh donor action or penalize a delegate for helping uncertain projects. Returned funds remain subject to the authorization's current rules and revocation state.

Successful-project reimbursements replenish a budget after work actually got funded and remain a separate open choice. Automatic recycling is coherent, but has not been settled. Do not sacrifice routine failed-project recycling merely to simplify the legal narrative. These safety and control improvements do not establish a legal exemption for Commonality's operation of the service.
