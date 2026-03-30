# Channel Claiming

Rules for who can create assurance contracts for a creator's content, and how creators take ownership of their channel.

## The problem

We want *others* to be able to fund a creator's work even if the creator doesn't know anything about this system yet. That's the viral "someone offered money for your tweet" moment. But since we only allow one contract per content item (enforced by the [content registry](content-registry.md)) and there are prices and thresholds attached, there's a real opportunity cost if someone else creates a contract with terms the creator doesn't like.

That's fine — that opportunity cost is a great incentive for creators to learn about the system and start using it themselves. But we need clear rules.

## The proposal: open until claimed

**Before the creator has claimed their channel**, anyone can create assurance contracts for that creator's content. The creator address (the address that receives funds on success) is set at contract creation. Third parties set it to the creator's known address (or a placeholder if unknown — see below).

**Once the creator claims their channel**, only the creator can create new contracts for their content. Claiming is an on-chain action: the creator calls a function on a channel registry contract, proving ownership of their platform identity (or simply asserting it — see identity verification below).

### What "claiming" means

A channel is identified by a creator's platform identity (e.g., `twitter:@username`). Claiming it means:

1. An Ethereum address is now the canonical owner of that channel.
2. Only that address can create new assurance contracts containing content items from that channel.
3. Existing contracts (created before the claim) are unaffected — they continue to operate, and the creator can still claim proceeds from them.

### What happens to pre-claim contracts

Contracts created by third parties before the creator claimed continue as normal:
- If they succeed, the funds go to whatever creator address was specified at contract creation.
- If they fail, the content items are freed (per [content-registry.md](content-registry.md)) and the creator can re-register them on their own terms.
- The creator can't cancel or modify pre-claim contracts — they're already deployed. This is intentional: the third party took a risk setting up the contract, and the tokens already sold shouldn't be invalidated.

If a third party set the wrong creator address (or a placeholder), the funds from a successful contract go to that wrong address. This is a known risk of pre-claim contracts and part of why claiming early is valuable.

### Identity verification

How does a creator prove they own a channel? Options, from simplest to most robust:

1. **Self-attestation.** The creator just calls `claimChannel("twitter:@username")` from their Ethereum address. No verification. First-claim-wins. Simple but vulnerable to squatting.

2. **Social verification.** The creator posts a message on their platform containing their Ethereum address (like ENS verification). An off-chain service (or the community) verifies and attests. More robust but requires infrastructure.

3. **Oracle-based.** A trusted oracle service verifies platform ownership. Most robust but adds a dependency.

Recommendation: start with self-attestation. Squatting is unlikely to be a serious problem early on — there's no value in squatting a channel nobody is funding. Add social verification later if needed. The channel registry contract should be designed to support upgrading the verification method without redeployment (e.g., a pluggable verifier interface).

TODO: No. Delete that option. I don't want squatting to be possible. The rest of the world already views anything crypto-related as basically scams; I want it to be clear from the start that this isn't a place for shenanigans like that. And I think ENS already has a Twitter-verification mechanism (maybe involving a third party who does the verification? I forget). Take a look at sdk/src/utils/twitter.ts.

### The "placeholder address" problem

If a third party creates a contract for a creator who isn't on the platform yet, what address receives the funds? Options:

1. **Use the zero address as a placeholder**, with a claim function the creator calls later to redirect funds. This requires the assurance contract to support changing the recipient, which adds complexity.

2. **Use an escrow/claim contract.** Funds go to a holding contract keyed by channel ID. When the creator claims the channel, they can withdraw from the escrow. Cleanly separates the "who gets paid" question from the assurance contract itself.

3. **Require a real address.** The third party must specify some address. If the creator shows up later and it's the wrong address, too bad — the incentive is for third parties to do their homework (check the creator's ENS, ask them directly, etc.).

Option 2 is the cleanest. The escrow contract is simple and addresses the problem directly without modifying assurance contract semantics. Option 3 is acceptable as an MVP.

TODO: yes, option 2. Delete the other two options.

## Incentives

The rules create a natural adoption funnel:

1. **Fan creates a contract** for a creator they admire. Sets reasonable prices and threshold.
2. **Creator gets notified** (via the [notification indexer](indexer.md)) that someone is offering money for their content.
3. **Creator claims their channel** to take control of future contracts.
4. **Creator now has incentive to learn the system** — they're already getting funded, and claiming gives them control over terms.

If the fan set bad terms:
  - The contract might fail (not enough buyers at that price). That's fine — [failed contracts free their content items](content-registry.md), and the creator can try again with better terms.
  - Or the contract might succeed but bring in less money than might have been possible. That's fine too - it's better than nothing, and it's a good incentive for the creator to take control himself.

## Open questions

### Should third-party contracts require a minimum threshold?

Without a minimum, someone could create a trivially-small contract ($1 threshold) just to lock up content items in the registry. With failed-contract freeing, this is a temporary nuisance at worst (the contract fails, items are freed). But it's still annoying. A minimum threshold (or a creation fee) would discourage this.

TODO: yes, I do think I like this idea. I don't like the idea that it's just incredibly cheap for one troll who discovers this system to lock up all the content items ever created for every twitter account in existence. Maybe a third-party creation fee? Even just "you have to donate at least $X per contract" (for third-party creations) might do it?

### Should the creator be able to veto pre-claim contracts?

Currently they can't — pre-claim contracts are fire-and-forget. An alternative: after claiming, the creator gets a grace period to veto any existing contracts for their content (triggering an early failure and refund). This protects creators from being stuck with bad terms but adds complexity and undermines the certainty that token buyers expect.

Lean toward no veto. The failed-contract-freeing mechanism already handles the worst case (bad terms → contract fails → items freed → try again).

TODO: Oh, that's a good point. Assurance contracts have a deadline anyway - not quite the same as a creator's-veto period, but it doesn't feel conceptually out of place to say "for third-party-created contracts, the creator has a grace period during which he's allowed to claim his channel, then cancel the contract." So the smart contract might need an extra thing that allows that sort of cancellation, but that doesn't sound like a terrible idea. Let's try that.
