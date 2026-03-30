# Channel Claiming

Rules for who can create assurance contracts for a creator's content, and how creators take ownership of their channel.

## The problem

We want *others* to be able to fund a creator's work even if the creator doesn't know anything about this system yet. That's the viral "someone offered money for your tweet" moment. But since we only allow one contract per content item (enforced by the [content registry](content-registry.md)) and there are prices and thresholds attached, there's a real opportunity cost if someone else creates a contract with terms the creator doesn't like.

That's fine — that opportunity cost is a great incentive for creators to learn about the system and start using it themselves. But we need clear rules.

## The proposal: open until claimed

**Before the creator has claimed their channel**, anyone can create assurance contracts for that creator's content. But for an **unclaimed** channel, the payout recipient is not an arbitrary creator address chosen by the third party; it is the channel escrow for that channel ID (see below). That keeps the "someone funded your content" viral loop while avoiding accidental or malicious misdirection of funds.

**Once the creator claims their channel**, only the creator can create new contracts for their content. Claiming is an on-chain action: the creator calls a function on a channel registry contract, proving ownership of their platform identity (or simply asserting it — see identity verification below).

### What "claiming" means

A channel is identified by a creator's platform identity (e.g., `twitter:@username`). Claiming it means:

1. An Ethereum address is now the canonical owner of that channel.
2. Only that address can create new assurance contracts containing content items from that channel.
3. Existing contracts (created before the claim) are unaffected — they continue to operate, and the creator can still claim proceeds from them.

### What happens to pre-claim contracts

Contracts created by third parties before the creator claimed continue as normal:
- If they succeed, the funds go to the channel escrow keyed by that channel ID.
- If they fail, the content items are freed (per [content-registry.md](content-registry.md)) and the creator can re-register them on their own terms.
- If the creator later claims the channel, they still can't rewrite the economics of those pre-claim contracts, but they may get a bounded veto window (described below) before those contracts finish.
- Aside from that veto window, the creator can't cancel or modify pre-claim contracts — they're already deployed. This is intentional: the third party took a risk setting up the contract, and the tokens already sold shouldn't be invalidated.

### Identity verification

Channel claiming uses **ENS-based social verification**. The creator proves they own a channel by linking their platform identity to their Ethereum address through ENS text records and ENS's profile verification system.

The flow:

1. The creator sets their platform handle in their ENS profile (e.g., the `com.twitter` text record for Twitter/X).
2. ENS's [profile verification system](https://support.ens.domains/en/articles/9626402-profile-verification) confirms the link between the ENS name and the platform account.
3. The creator calls `claimChannel("twitter:@username")` from the address that owns that ENS name.
4. The channel registry contract (or an off-chain verifier it trusts) checks that the ENS records and verification status match.

This is non-negotiable — no self-attestation, no first-claim-wins. The rest of the world already views anything crypto-related with suspicion; channel claiming must be clearly legitimate from day one.

The existing code in `sdk/src/utils/twitter.ts` already resolves ENS names to Twitter handles via the `com.twitter` text record and has a placeholder for checking ENS verification status. That same infrastructure serves channel claiming.

The channel registry contract should use a pluggable verifier interface so that the verification method can be upgraded without redeployment (e.g., to support additional platforms beyond Twitter/X).

### Creator onboarding requirements

The hard part here is not the cryptography; it's converting a skeptical, non-crypto-native creator from "someone sent me a weird link" to "I successfully claimed this channel." The spec should treat that as a first-class product surface, not an afterthought.

The required flow:

1. The creator opens a landing page for their specific channel and sees the plain-English state before doing anything wallet-related: which content items are being funded, how much money is already in escrow, whether any pre-claim contracts are still active, and whether a veto window will open upon claim.
2. The page offers two paths: connect an existing wallet, or create a wallet in-app. For first-time creators, the in-app path should be the default. Key export/recovery still matters, but it should come after the creator understands what they're claiming.
3. The claim wizard then guides the creator through the minimum required identity steps: obtain or connect an ENS name, set the relevant text record (for example `com.twitter`), complete ENS profile verification, and finally call `claimChannel(...)`.
4. Gas and one-time setup costs should be sponsored by the platform for first-time claimants if at all feasible. This is user acquisition cost, not a meaningful anti-spam defense; the real anti-abuse control is the ENS-backed identity proof.
5. There is no weaker provisional claim mode. Until ENS verification succeeds and the on-chain claim is submitted, the creator has no control over future contracts and cannot withdraw escrowed funds. Progress can be saved off-chain for UX purposes, but it confers no authority.

This implies a product requirement for the "unclaimed funded content" page described in [indexer.md](indexer.md): it is not just an informational page; it is the guided claim funnel.

### Payout target for unclaimed channels

If a third party creates a contract for a creator who isn't on the platform yet, where do successful funds go?

**Channel escrow contract.** Funds go to a holding contract keyed by channel ID. When the creator claims the channel, they can withdraw from the escrow. This cleanly separates the "who gets paid" question from the assurance contract itself — no need to modify assurance contract semantics to support changing recipients.

For the MVP, this should be the only payout mode for unclaimed channels. Requiring third parties to guess or supply a creator wallet address is unnecessary friction and introduces an avoidable failure mode. Once a channel is claimed, newly created contracts can pay the claimed owner address directly.

The escrow contract is simple: it holds funds mapped to channel IDs, and releases them to whoever successfully claims that channel (via the identity verification described above).

## Incentives

The rules create a natural adoption funnel:

1. **Fan creates a contract** for a creator they admire. Sets reasonable prices and threshold.
2. **Creator gets notified** (via the [notification indexer](indexer.md)) that someone is offering money for their content.
3. **Creator claims their channel** to take control of future contracts.
4. **Creator now has incentive to learn the system** — they're already getting funded, and claiming gives them control over terms.

If the fan set bad terms:
  - The contract might fail (not enough buyers at that price). That's fine — [failed contracts free their content items](content-registry.md), and the creator can try again with better terms.
  - Or the contract might succeed but bring in less money than might have been possible. That's fine too - it's better than nothing, and it's a good incentive for the creator to take control himself.

## Anti-abuse measures

### Third-party creation fee

Third-party contract creation requires a minimum donation (e.g., "you must buy at least $X worth of tokens in the contract you're creating"). Without this, a single troll could lock up content items across every creator on the platform for nearly free. Failed-contract freeing limits the damage to a temporary nuisance, but the creation fee makes it expensive enough to not be worth trying.

This fee only applies to third-party creations. Once a creator has claimed their channel, they can create contracts for their own content without a minimum.

### Creator veto for pre-claim contracts

When a creator claims their channel, they get a grace period to veto any existing third-party contracts for their content. Vetoing a contract triggers an early failure and refund to token holders.

This protects creators from being stuck with contracts that have bad terms (wrong prices, unreasonable thresholds, etc.) while still allowing the "someone offered money for your content" viral moment. The grace period is bounded — after it expires, remaining pre-claim contracts proceed as normal.

The mechanism: third-party-created contracts carry a flag marking them as pre-claim. When a `ChannelClaimed` event fires, a grace window opens during which the new channel owner can call a `vetoContract()` function on any flagged contract, triggering the standard failure/refund flow. This is conceptually similar to the existing deadline mechanism — just an additional early-termination condition.
