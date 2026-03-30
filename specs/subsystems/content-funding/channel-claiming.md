# Channel Claiming

Rules for who can create assurance contracts for a creator's content, and how creators take ownership of their channel.

## The problem

We want *others* to be able to fund a creator's work even if the creator doesn't know anything about this system yet. That's the viral "someone offered money for your tweet" moment. But since we only allow one contract per content item (enforced by the [content registry](content-registry.md)) and there are prices and thresholds attached, there's a real opportunity cost if someone else creates a contract with terms the creator doesn't like.

That's fine — that opportunity cost is a great incentive for creators to learn about the system and start using it themselves. But we need clear rules.

## The proposal: open until claimed

**Before the creator has claimed their channel**, anyone can create assurance contracts for that creator's content. But for an **unclaimed** channel, the payout recipient is not an arbitrary creator address chosen by the third party; it is the channel escrow for that channel ID (see below). That keeps the "someone funded your content" viral loop while avoiding accidental or malicious misdirection of funds.

**Once the creator claims their channel**, only the creator can create new contracts for their content. Claiming is an on-chain action: the creator calls a function on a channel registry contract, proving ownership of their platform identity via a pluggable verifier.

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

Channel claiming uses a **pluggable verifier interface**, but the proof format should be concrete enough that the off-chain and on-chain pieces cannot drift.

At the protocol level, a successful claim should be based on a short-lived authorization over a canonical channel ID:

```solidity
struct ChannelClaimProof {
    string channelId;        // canonical form, e.g. "twitter:@username"
    address claimant;        // address that will own the channel
    bytes32 nonce;           // backend-issued challenge nonce
    uint256 deadline;        // expiry for replay resistance
    bytes verifierSignature; // signature from trusted verifier
}
```

And the registry should expose a proof-carrying claim entrypoint, e.g.:

```solidity
function claimChannel(ChannelClaimProof calldata proof) external;
```

The registry verifies:

- `channelId` is canonical
- `claimant` is the address that will become channel owner
- `nonce` has not already been used
- `deadline` has not passed
- `verifierSignature` is valid for the exact `(channelId, claimant, nonce, deadline)` payload

This keeps the contract-side rule crisp even if we later support multiple verification methods behind the same interface.

The verifier implementation can still be pluggable:

```solidity
interface IChannelVerifier {
    function verifyClaimProof(ChannelClaimProof calldata proof) external view returns (bool);
}
```

The channel registry contract delegates all verification to an `IChannelVerifier` implementation. This means the verification method can be upgraded or extended without redeploying the registry — swap the verifier address, and the same contract supports new platforms or stronger proof methods.

#### MVP: tweet-based verification

The first verifier implementation uses **tweet-based proof of ownership**. The creator tweets a short challenge string, and a trusted backend confirms the tweet exists and came from the correct account before signing a `ChannelClaimProof`.

The creator's experience:

1. Open the claim page, see your escrowed funds and funded content items.
2. Connect an existing wallet, or create one in-app.
3. Click "verify" — receive a message to tweet containing a short challenge string.
4. Tweet it.
5. Click "confirm" — the backend checks the tweet, signs the proof, and submits the claim transaction on the creator's behalf.

This is the same "tweet to verify" pattern used by Keybase, ENS profile verification, and countless other services. Every creator already knows how to tweet. The backend bears the gas cost — this is user acquisition spend, not anti-spam (the real anti-abuse control is that the tweet must come from the correct account).

The backend verifier is a simple service:
- Accepts a `(channelId, claimantAddress)` pair
- Returns a challenge nonce to be tweeted
- Checks the Twitter API for a recent tweet from `@username` containing that nonce
- If valid, signs a proof over `(channelId, claimantAddress, nonce, deadline)`
- The on-chain verifier checks the signature and nonce/deadline rules

No self-attestation, no first-claim-wins. The proof comes from the platform itself (the tweet exists on Twitter, posted by the account in question), verified by our backend, but packaged in a way that is explicit, replay-resistant, and relayer-friendly.

#### Future: ENS-based verification

A stronger verifier can use **ENS-based social verification**: the creator links their platform identity to their Ethereum address through ENS text records and ENS's [profile verification system](https://support.ens.domains/en/articles/9626402-profile-verification). This is fully on-chain and removes the trusted backend, but it requires the creator to acquire an ENS name and complete the ENS verification flow — significantly more friction.

The existing code in `sdk/src/utils/twitter.ts` already resolves ENS names to Twitter handles via the `com.twitter` text record and has a placeholder for checking ENS verification status. That infrastructure can serve an ENS-based verifier when the time comes.

ENS verification becomes worth adding when: (a) there are creators actively requesting trustless claiming, or (b) the trusted backend becomes a bottleneck or trust concern. Until then, tweet-based verification is simpler, faster, and more legible to non-crypto-native creators.

#### Future: additional platforms

The pluggable verifier interface naturally extends to other platforms. A YouTube verifier might check a video description or channel "about" section. A Substack verifier might check a post or bio. Each platform gets its own verification pattern, but the contract interface stays the same.

### Creator onboarding

The hard part is not the cryptography; it's converting a skeptical, non-crypto-native creator from "someone sent me a weird link" to "I successfully claimed this channel." The claim page is a first-class product surface, not an afterthought.

The required flow:

1. The creator opens a landing page for their specific channel and sees the plain-English state before doing anything wallet-related: which content items are being funded, how much money is already in escrow, and whether any pre-claim contracts are still active.
2. The page offers two paths: connect an existing wallet, or create a wallet in-app. For first-time creators, the in-app path should be the default. Key export/recovery still matters, but it should come after the creator understands what they're claiming.
3. The creator clicks "verify," tweets the verification message, and clicks "confirm." The backend handles everything else — tweet checking, attestation signing, on-chain claim transaction, gas.
4. There is no weaker provisional claim mode. Until verification succeeds and the on-chain claim is submitted, the creator has no control over future contracts and cannot withdraw escrowed funds. Progress can be saved off-chain for UX purposes, but it confers no authority.

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
