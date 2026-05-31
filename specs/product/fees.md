# Fees

See [costs](../tech/costs.md) for a list of the costs of running this project.

This page is meant to be for thinking about how we *want* the product to work, in terms of who pays for what.

## Thoughts

  - I don't want to be a middle-man.
  - Microtransactions make the UX much worse.
    - Especially for low-value or non-monetary user actions (e.g. signing a statement).
  - OTOH it's important to have sustainable economics. We *could* cover all of these costs by creating a single LazyGiving project and using it to cover everything, but it might make more sense to include tx fees as an anti-spam measure so that people don't abuse the system. (Probably not early on - not likely to be a big problem, and growth matters a lot more. We can deal with this later if it becomes a problem.)
  - I'm not sure how much to ask for, for my development time. This has taken a lot of my time, and I do have to feed my family. (I don't have any other source of income.)
  - At the very least I think I should split out the "my time" costs from the "paying for Alchemy and Pinata and OpenRouter and Render and so on" infrastructure costs - if those aren't being covered by some sort of fees, they should be a separate LazyGiving project (or series of projects, e.g. one per month), not included in the "my development time" project(s).


## Notes from an AI on a particular risk

When you subsidize a user action, you're paying a cost that scales with usage. The question is whether that cost is:

  Bounded and predictable — you can plan for it, cover it via a LazyGiving project, and it doesn't blow up unexpectedly. Example: IPFS pinning for a statement a user signed. Small, one-time, you could absorb thousands of these.

  Unbounded or spiky — a single user or bot could generate costs that meaningfully hurt you before you notice. Example: if you're paying gas to submit transactions on behalf of users, and someone scripts 10,000 transactions, you're out real money fast.

  The distinction matters because they call for different responses:
  - Bounded costs → just fund them collectively, no per-user charging needed
  - Unbounded costs → you need either a rate limit, a deposit/stake from the user, or the user pays directly

  For Commonality specifically, the question is: which actions does your system pay for on behalf of users? If users sign their own transactions with their own wallets and pay their own gas, you have no direct exposure there. Your exposure is only to the off-chain services (Alchemy RPC calls, Pinata pins, OpenRouter tokens, Render compute) where you're the account holder paying the bill.

  Those off-chain costs are probably the ones worth stress-testing: what's the worst-case cost if a single motivated bad actor hammered your system? If the answer is "a few dollars before I notice and block them," that's manageable. If it's "hundreds of dollars," you want a rate limit or some friction.
