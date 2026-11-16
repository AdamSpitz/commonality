# Claim ticket (commit first, onboard the doer later)

Status: product shape only. Not a contract design, and not scheduled work.

Related: [fund now, claim later](fund-now-claim-later.md) (public identity, not a secret), [foolproof project creation](foolproof-project-creation.md) (recipient picker; its later email-bound embedded wallet is a different idea), [bridges.md](/specs/tech/bridges.md) (Linkdrop, for the donor direction).

## Motivation

Alice has money pledged and earmarked for a cause. Off-chain, she finds Bob, who would be a good person to do a particular piece of work. She would rather not hand him cash. She wants Commonality in the middle of the *record*: the project exists, the funding is visible on the site and on her profile, and if a delegate is the one actually spending, the spend goes through the delegate's rules instead of around them.

Bob does not have an Ethereum account, and Alice does not want the sequence "you go create a wallet, then tell me the address, then I create the project." The money should be committed first. Bob onboards when he is ready.

An email beneficiary does not solve this. "Whoever proves they own `bob@example.com`" needs a central verifier, the proof is not publicly re-checkable, and mailbox control is a weak stand-in for "this is the person I meant." See the discussion that produced this page. Do not build that namespace for this job.

## What this is

A **claim ticket** is a bearer secret. Alice (or her delegate) creates the project now. Its recipient is a fresh address derived from a transit key she generates. She gives Bob a claim code, not a wallet and not a private key to keep.

The project, the funding, and the receipt exist before Bob has an account. The code can do one thing: point the payout at an account Bob creates later (passkey, injected wallet, whatever already exists). Then the code is dead. A relay pays the gas for that claim, so Bob does not need ETH to pick the money up.

That is the same shape as a Linkdrop transit key, aimed at a project recipient rather than at a donor who is owed tokens. Prior art is already named in [bridges.md](/specs/tech/bridges.md). Prefer that shape over a Commonality-run custodial escrow.

## What this is not

- **Not a beneficiary identity.** It does not go through `BeneficiaryIdentity`, and it must not be displayed as a verified person, org, or domain. The UI says: anyone with this code can take the funds, including Alice if she kept a copy.
- **Not "import this private key."** Bob must not be asked to paste a raw key or seed into a wallet. That is the phishing gesture, the key has no gas, and it would become his long-term account by accident.
- **Not an email claim, and not an embedded wallet bound to Bob's inbox.** Those still require a verifier or a login provider to decide who Bob is. This ticket does not.
- **Not a way for Alice to prove she can no longer take the funds.** She generated the secret, so she can keep a copy. Getting both "Bob has done nothing yet" and "Alice is locked out" requires a third party to generate the key and split it. That third party is a custodian. Do not add one. The honest model is: Alice is trusted to hand the code over and delete her copy, the same way she would be trusted to hand over cash. The on-chain gain is the visible project and the delegate path, not theft-proof delivery.
- **Not a substitute for [fund now, claim later](fund-now-claim-later.md).** That primitive is for a public identity the world can still check (a domain, a channel) when the recipient has not heard of us. A claim ticket is for when Alice already knows Bob and can hand him a secret. Do not key the ticket to a name, an email, or an EIN.

## Product shape

1. Alice creates a project and chooses "claim ticket" instead of a recipient address. The form generates the transit address and shows the code once, with a copy warning.
2. The project is live immediately. Donations and delegate spends can land under the normal project rules. The recipient shown on the project is "unclaimed ticket," not a person we verified.
3. Alice gets the code to Bob however she already talks to him. Loss or leak of the code is loss or theft of the claim. Say that in the UI.
4. Bob creates an account on his own, opens the claim page, and redeems the code to that account. Redemption is a single rotation or sweep. It does not import the transit key into his wallet.
5. If Bob never shows up, the project's existing success / deadline / reclaim rules apply. The ticket is not a reason to trap funds, and it is not a reason for Commonality to become the fallback payee.

A delegate may be the one who creates the project and spends into it. A brand-new recipient address is not, by itself, a suspicious spend ([spend classification](/specs/tech/subsystems/delegation/spend-classification.md)). The receipt the donor wants is the project and the spend, not a verified identity for Bob.

## Open questions (do not invent answers while implementing from this page)

- Whether the transit address is the project `recipient` directly, or a tiny one-shot claim contract in front of the existing proceeds rules. Either way, success, refusal, and the 90-day reclaim window in [fund now, claim later](fund-now-claim-later.md) still have to apply. A ticket must not create a second, stuck escrow.
- Who runs the gas relay for redemption, and what it is allowed to submit. It may sponsor the claim transaction. It must not be able to choose the destination.
- Whether Alice gets a short cancel window before she reveals the code. Default assumption: no. Commit-first means the project exists when she hands the code over. Cancel after reveal is just "Alice kept a copy."
- How the code is encoded so it is safe to paste into a chat without looking like a seed phrase.

## When to build

Not part of the current beneficiary-claim work. Build this when a real "I found the person, they have no wallet" path is blocking a delegate or a donor. Until then, the workaround is the thing this spec refuses to require: Bob creates an account first, Alice uses that address.
