# Delegation: further ways to narrow the legal story

Thinking notes, 2026-09-25. Not a decision, not legal advice, and not a plan to publish delegation as its own package. This assumes delegation stays inside integrated Commonality.

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
