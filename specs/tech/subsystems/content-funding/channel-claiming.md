# Channel Claiming

Rules for who can create assurance contracts for a creator's content, how creators verify their identity, and how they take ownership of their channel.

## The problem

We want *others* to be able to fund a creator's work even if the creator doesn't know anything about this system yet. That's the viral "someone offered money for your tweet" moment. But since we only allow one contract per content item (enforced by the [content registry](content-registry.md)) and there are prices and thresholds attached, there's a real opportunity cost if someone else creates a contract with terms the creator doesn't like.

That's fine — that opportunity cost is a great incentive for creators to learn about the system and start using it themselves. But we need clear rules.

## Channel states

A channel moves through three states. Each state determines who can create contracts, where funds go, and what the creator can do.

### State 1: Unclaimed

**No verified creator. Open to third-party contract creation.**

This is every channel's initial state. Anyone can create assurance contracts for the creator's content, subject to the [third-party creation fee](#third-party-creation-fee). Funds from successful contracts go to the **channel escrow** — a holding contract keyed by channel ID (see [payout target](#payout-target-channel-escrow) below). No one can withdraw yet.

This is what makes the viral loop work: a fan can fund a creator's content before the creator has ever heard of the system.

### State 2: Verified

**Verified creator address. Still open to third-party contract creation.**

The creator has proven ownership of their platform identity (see [identity verification](#identity-verification) below) and an Ethereum address is now associated with the channel. This enables two things:

1. The creator can **withdraw** from the channel escrow — both existing funds and any later escrow deposits from contracts that were created while the channel was still unclaimed.
2. The creator can **create contracts** for their own content (without the third-party creation fee).

But third parties can still create contracts too. The channel remains open. This is the right default: a creator who just verified their identity to claim some money shouldn't be forced into actively managing their channel. If fans want to keep creating contracts on their behalf, that's fine — and because the channel is already verified, successful newly created contracts can pay the creator address directly.

### State 3: Creator-controlled

**Verified creator address. Only the creator can create contracts.**

The creator has explicitly opted into channel control by calling a separate on-chain function. Now:

1. Only the verified creator address can create new assurance contracts containing content items from this channel.
2. Third-party contract creation is blocked.
3. The creator has full authority over pricing, thresholds, and which content items to include.

This is a separate action from verification, not bundled into it. A creator who verified just to withdraw funds doesn't get pushed into governance they didn't ask for.

This guarantee is enforced on-chain: content IDs embed the channel ID as a structural prefix (see [canonicalization.md](canonicalization.md)), so the factory verifies at creation time that every listed content item belongs to the claimed channel. A malicious actor cannot register Alice's content under Bob's creator-controlled channel — Alice's content IDs embed Alice's channel prefix, so the factory would revert.

### State transitions

```
  ┌─────────────┐    verify identity    ┌──────────┐    take control    ┌─────────────────────┐
  │  Unclaimed   │ ───────────────────→  │ Verified │ ────────────────→  │ Creator-controlled  │
  │              │                       │          │                    │                     │
  │ 3rd-party: ✓ │                       │ 3rd-party: ✓                  │ 3rd-party: ✗        │
  │ withdraw:  ✗ │                       │ withdraw:  ✓                  │ withdraw:  ✓        │
  └─────────────┘                       └──────────┘                    └─────────────────────┘
```

Both transitions are one-way. There's no reason to un-verify or relinquish control.

### What happens to pre-existing contracts

Contracts created by third parties before verification or before the creator takes control continue as normal:
- If they succeed, funds go to the channel escrow (and the creator can withdraw once verified).
- If they fail, the content items are freed (per [content-registry.md](content-registry.md)) and can be re-registered in new contracts.
- The creator can't rewrite the economics of pre-existing contracts — they're already deployed. The third party took a risk setting up the contract, and the tokens already sold shouldn't be invalidated.
- But when a creator takes control (state 3), they get a bounded [veto window](#creator-veto-for-pre-control-contracts) over existing third-party contracts.

## Payout target: channel escrow

If a third party creates a contract for a creator who isn't verified yet, where do successful funds go?

**Channel escrow contract.** Funds go to a holding contract keyed by channel ID. When the creator verifies their identity (transitions to state 2), they can withdraw from the escrow. This cleanly separates the "who gets paid" question from the assurance contract itself — no need to modify assurance contract semantics to support changing recipients.

For the MVP, this should be the only payout mode for unclaimed channels. Requiring third parties to guess or supply a creator wallet address is unnecessary friction and introduces an avoidable failure mode. Once a channel is verified, newly created contracts can pay the verified creator address directly — but the escrow remains available for any third-party contracts still in flight.

The escrow contract is simple: it holds funds mapped to channel IDs, and releases them to whoever successfully verifies that channel.

### Fiat off-ramp for non-crypto-native creators

Most creators encountering this system will not have an Ethereum wallet and will not want one. The default path should not require the creator to understand or manage keys.

**Embedded wallet.** When a creator signs in (via email, Google, or Twitter OAuth), the system provisions an **embedded wallet** through a service like Privy, Dynamic, or Web3Auth. Behind the scenes this creates an MPC or account-abstraction wallet — the creator never sees a seed phrase or knows they "have a wallet." The verification proof uses this wallet's address as the `claimant`. We are not a custodian; the embedded wallet provider handles key management and the associated regulatory burden.

The creator can upgrade to self-custody at any time by exporting the embedded wallet or transferring channel ownership to their own address.

**Integrated off-ramp.** Once the creator's embedded wallet has withdrawn ETH from the escrow, an integrated off-ramp provider (MoonPay, Transak, or similar) converts it to fiat. The creator clicks "withdraw," enters their bank details or PayPal, and the provider handles KYC/AML and the conversion. Fees are higher than a direct exchange withdrawal, but the creator never has to create an exchange account or understand crypto plumbing.

The end-to-end experience:

1. Creator opens claim page, sees "$340 waiting for you."
2. Signs in with Twitter (which also serves as identity verification — see [tweet-based verification](#mvp-tweet-based-verification) below).
3. Behind the scenes: embedded wallet created, verification proof signed, escrow withdrawal submitted.
4. Creator sees "$340 available to withdraw."
5. Clicks "withdraw," enters bank details, off-ramp provider handles conversion.
6. Money arrives in bank account in 1–3 business days.

The creator's mental model is "I signed in, I clicked withdraw, money showed up." The wallet, the on-chain transactions, the escrow — all invisible.

**Note on denomination.** Contracts currently use ETH, which means the creator bears price volatility between "contract succeeded" and "creator withdrew." Stablecoin-denominated contracts (USDC/DAI) would eliminate this and simplify the off-ramp (stablecoin off-ramps are a commodity service with lower fees and no slippage). This is a meaningful design change that affects the assurance contract infrastructure, not just the bridge — worth revisiting once the core contract mechanics are stable.

## Identity verification

A channel is identified by a creator's platform identity in canonical form (e.g., `twitter:uid:44196397` — see [canonicalization.md](canonicalization.md)). Verification means proving ownership of that platform identity and associating an Ethereum address with it.

Channel verification uses a **pluggable verifier interface**, but the proof format should be concrete enough that the off-chain and on-chain pieces cannot drift.

At the protocol level, a successful verification should be based on a short-lived authorization over a canonical channel ID:

```solidity
struct ChannelClaimProof {
    string channelId;        // canonical form, e.g. "twitter:uid:44196397"
    address claimant;        // address that will own the channel
    bytes32 nonce;           // backend-issued challenge nonce
    uint256 deadline;        // expiry for replay resistance
    bytes verifierSignature; // signature from trusted verifier
}
```

And the registry should expose a proof-carrying verification entrypoint, e.g.:

```solidity
function verifyChannel(ChannelClaimProof calldata proof) external;
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

Taking channel control (state 2 → state 3) is a separate on-chain call that only the verified address can make:

```solidity
function takeChannelControl(string calldata channelId) external;
```

This is a simple authorization check — only the address registered as the channel's verified owner can call it.

### MVP: tweet-based verification

The first verifier implementation uses **tweet-based proof of ownership**. The creator tweets a short challenge string, and a trusted backend confirms the tweet exists and came from the correct account before signing a `ChannelClaimProof`.

The creator's experience:

1. Open the claim page, browse your funded content and escrowed amounts (no wallet required).
2. Click "claim funds."
3. Optionally connect an existing wallet — otherwise the system creates and manages one on your behalf (see custodial bridge above).
4. Click "verify" — receive a pre-written tweet to post.
5. Tweet it.
6. Click "confirm" — the backend checks the tweet, signs the proof, and submits the verification transaction on the creator's behalf.

This is the same "tweet to verify" pattern used by Keybase, ENS profile verification, and countless other services. Every creator already knows how to tweet. The backend bears the gas cost — this is user acquisition spend, not anti-spam (the real anti-abuse control is that the tweet must come from the correct account).

**The verification tweet is a feature, not friction.** The challenge string should be human-readable and shareable — not a hex blob. Something like: *"Claiming my funded content on @commonality — supporters pooled $340 for my housing thread 🔗 [claim-page-url] #commonality-abc123"*. The unique suffix provides verification; the rest is a natural announcement that the creator's audience will see. This turns the verification step into a distribution moment: the creator is telling their followers that their content got funded, which recruits more funders into the system.

The backend verifier is a simple service:
- Accepts a `(twitterHandle, claimantAddress)` pair
- Resolves the handle to a stable numeric user ID via the Twitter API
- Returns a challenge nonce to be tweeted
- Checks the Twitter API for a recent tweet from that account containing the nonce
- If valid, signs a proof over `(channelId, claimantAddress, nonce, deadline)` where `channelId` uses the numeric ID (e.g., `twitter:uid:44196397`)
- The on-chain verifier checks the signature and nonce/deadline rules

No self-attestation, no first-claim-wins. The proof comes from the platform itself (the tweet exists on Twitter, posted by the account in question), verified by our backend, but packaged in a way that is explicit, replay-resistant, and relayer-friendly.

Note that the creator provides their handle, but the canonical channel ID uses the numeric user ID (resolved by the backend). This means handle renames don't break channel identity — see [canonicalization.md](canonicalization.md) for rationale.

### Future: ENS-based verification

A stronger verifier can use **ENS-based social verification**: the creator links their platform identity to their Ethereum address through ENS text records and ENS's [profile verification system](https://support.ens.domains/en/articles/9626402-profile-verification). This is fully on-chain and removes the trusted backend, but it requires the creator to acquire an ENS name and complete the ENS verification flow — significantly more friction.

The existing code in `sdk/src/utils/twitter.ts` already resolves ENS names to Twitter handles via the `com.twitter` text record and has a placeholder for checking ENS verification status. That infrastructure can serve an ENS-based verifier when the time comes.

ENS verification becomes worth adding when: (a) there are creators actively requesting trustless claiming, or (b) the trusted backend becomes a bottleneck or trust concern. Until then, tweet-based verification is simpler, faster, and more legible to non-crypto-native creators.

### Future: TLSNotary / zkTLS-based verification

ENS- and DID-based verification only help on platforms with a native on-chain/decentralized identity to anchor to. That leaves the legacy platforms that make up most creators — X, Substack, YouTube — without a trustless option. **TLSNotary / zkTLS** (e.g. Reclaim Protocol) fills exactly that gap: the creator proves the contents of an authenticated TLS session against the platform (e.g. "I am logged in and this account-settings page shows handle @foo"), producing a proof anyone can verify, with **no trusted backend doing the signing**. The same `IChannelVerifier` interface accepts it — the verifier implementation checks the zk/TLS proof instead of a backend signature.

Caveats to weigh before building: the schemes are still maturing; proof generation is heavy; some designs rely on a semi-trusted notary (though it never sees plaintext); and the per-platform page parsing is brittle and breaks when platforms change their markup. So it's the **generalized fallback for platforms lacking native crypto identity**, complementary to ENS/DID rather than a replacement.

### The trust trajectory (why we are not stuck with a central verifier)

The trusted backend in the MVP is a deliberate bootstrap, not a permanent dependency. There is a clear exit path, and it matters for the governance/timelock story around the `setVerifier` / `setTrustedVerifier` levers (tracked in [inbox.md](/inbox.md)) (those levers exist to allow this evolution; they are not meant to stay a load-bearing trust concentration forever):

1. **Today — publicly auditable, not blind trust.** The proof artifacts are public and permanent (the tweet, the Substack RSS post). The backend is *not* the source of truth; anyone can independently re-verify that a signed claim corresponds to a real public ownership proof, so a dishonest verifier is *detectable*. (Gap: the on-chain `verifyChannel` checks only the signature, not the underlying public proof, so detection is after-the-fact, not on-chain prevention.)
2. **Next — remove the backend where a native identity exists.** ENS-based (and DID-based for Bluesky/AT-Proto) verification is fully on-chain and needs no trusted signer.
3. **Next — remove the backend everywhere else.** TLSNotary/zkTLS extends trustless verification to legacy platforms with no native crypto identity.
4. **End state — decentralized choice of verifier.** Per-platform `ChannelRegistry` deployments where *anyone* can deploy a contract set and clients/UI decide which deployments to trust (see [Future: additional platforms](#future-additional-platforms)). Canonical ownership becomes per-deployment; trust lives at the client level rather than in one admin-appointed verifier.

Each step shrinks what the central verifier can do until the `setVerifier` lever stops being a meaningful trust concentration point. None of these is scheduled — they are gated on creator demand or the backend becoming a real trust/bottleneck concern — but the architecture (pluggable `IChannelVerifier`, per-platform deployments) is already built to accommodate them.

#### Near-term posture: cheap wins now, trustless verifier demand-gated (Jul 2026)

Adam's decision after weighing feasibility: **do not prioritize building an actual trustless verifier right now.** The reasoning is that the mainstream claim flow (tweet / Substack-RSS) stays backend-dependent regardless of what we ship, because the only path that generalizes to legacy platforms is zkTLS, which is still maturing (see [above](#future-tlsnotary--zktls-based-verification)). And a fully on-chain ENS verifier has two blockers that make it serve only a rounding-error of creators: (a) channel IDs are keyed by numeric UID (`twitter:uid:…`) while ENS stores the *handle*, with no on-chain handle→UID resolution; and (b) ENS text records live on Ethereum mainnet, so unless the `ChannelRegistry` is deployed on mainnet, the contract can't read them without CCIP-read (which reintroduces a semi-trusted gateway). The pluggable `IChannelVerifier` architecture is fully ready to accept a trustless verifier the day one is worth building — the block is on the verification tech, not our contracts.

So the near-term channel-claiming work — which shrinks the legal risk *without* removing the backend — is:

1. **Timelock + multisig the owner / `setTrustedVerifier` levers** (this is the owner-key triage the [legal re-rank](/specs/product/legal/README.md#re-rank-after-the-control-audit-jul-2026) pairs with the trustless-verifier assumption). Removes the "one key can silently swap the source of truth" objection.
2. **On-chain proof-hash anchoring for detectability.** Today `verifyChannel` checks only the backend signature, not the underlying public proof, so a dishonest verifier is detectable only off-chain and after the fact. Anchor a hash of the public proof (tweet / RSS post URL) on-chain so anyone can independently re-verify — converting "trust us" into "publicly auditable," which is most of the legal benefit at a fraction of the cost.
3. **Sanctions screening at the platform-identity level, at claim/display time.** The escrow accumulates funds for a *named person* before any wallet exists; screening must happen at platform-identity resolution, not just wallet creation. Previously unspecced; cheap to add.
4. **"Created by a fan; @creator is not affiliated" framing** on claim/display pages — addresses the unconsented-creator-publicity item in the re-rank.

An ENS-based verifier deployed on the same chain as ENS remains available as an optional proof-of-trajectory demonstration if we later want to formally unlock the legal re-rank, but it is a demonstration that the architecture supports trustlessness, not something the mainstream flow will use.

### MVP: Substack post-based verification

Substack has no official API, but Substack publications expose a public RSS feed at `<publication>.substack.com/feed`. This is enough for a post-based verification flow that mirrors the tweet-based approach.

The creator's experience:

1. Open the claim page, browse funded content and escrowed amounts.
2. Click "claim funds."
3. Optionally connect an existing wallet — otherwise the system creates one on their behalf.
4. Click "verify" — receive a pre-written short post to publish on their Substack.
5. Publish it (recommended: uncheck "send to email" to avoid notifying subscribers).
6. Click "confirm" — the backend checks the RSS feed, signs the proof, and submits the verification transaction.

The verification post follows the same philosophy as the verification tweet: **the post is a feature, not friction.** The template should be human-readable and shareable — something like: *"Claiming my funded content on commonality — supporters pooled $340 for my writing 🔗 [claim-page-url] #commonality-abc123"*. If the creator leaves it up (or even emails it to subscribers), it becomes a distribution moment. If they'd rather keep it quiet, they can publish without emailing and delete after verification — but the post remains in the RSS feed history and can be independently re-verified by anyone, which is important for the system's trustworthiness.

**Why posts rather than About-page edits:** A post is permanent and publicly verifiable — anyone can check the RSS feed or visit the post URL to confirm that the creator published the verification string. An About-page edit is ephemeral; once removed, the proof is gone, and verification becomes "trust us, we saw it." In a system built on minimizing trust, permanent verifiable proof is the right default.

The backend verifier:
- Accepts a `(publication, claimantAddress)` pair
- The publication subdomain is already the stable channel ID (no resolution needed — see [canonicalization.md](canonicalization.md))
- Returns a challenge nonce and post template
- Fetches `https://<publication>.substack.com/feed` and searches RSS entries for the nonce
- If found, signs a proof over `(channelId, claimantAddress, nonce, deadline)` where `channelId` is `substack:<publication>`
- The nonce TTL should be generous (e.g., 60 minutes) since RSS feed propagation can have a short delay

No API keys needed. No rate limits to worry about. The RSS feed is a simple HTTP GET returning XML.

### Future: additional platforms

Each platform gets its own ChannelRegistry deployment with a platform-appropriate verifier (see [per-platform deployment](README.md#per-platform-deployment)). A Bluesky ChannelRegistry might use DID-based proof. The `IChannelVerifier` interface stays the same, but each platform's ChannelRegistry is a separate contract with its own verifier implementation.

Anyone can deploy a new platform's contract set. The UI decides which deployments to trust.

## Creator onboarding

The user-facing source of truth for this story is [Get your content funded](/docs/end-user/content-funding/get-your-content-funded.md). Keep this section focused on the technical/product rules behind that experience; do not maintain a second full copy of the creator-facing copy here.

The hard part is not the cryptography; it's converting a skeptical, non-crypto-native creator from "someone sent me a weird link" to "I successfully claimed my funds." The claim page is a first-class product surface, not an afterthought.

### Lead with the money, hide the machinery

The above-the-fold message is: **"People pooled $X because they liked your work."** That's it. No mention of smart contracts, tokens, escrow, or attestations. Everything else is progressive disclosure — the creator can drill into which specific content items were funded, what the attesters said about them, and how the economics work, but none of that is required to understand "people want to pay you for your work."

### Don't gate on wallet creation

The landing page must be fully browsable without connecting or creating a wallet. The creator should be able to see exactly what's been funded, how much is waiting, and why — before being asked to do anything. The wallet moment comes when they click "claim these funds," not when they arrive.

### The onboarding flow maps to state transitions

The onboarding flow mirrors the channel states directly:

1. **Browse** (state 1 — unclaimed): Creator opens their landing page and sees plain-English state — which content was funded, how much is escrowed, why supporters funded it. No wallet required.
2. **Verify and withdraw** (state 1 → state 2): Creator clicks "claim funds," verifies their platform identity (see tweet-based verification above), and receives their escrowed funds. The channel is now verified.
3. **Take channel control** (state 2 → state 3, optional): At any point after verification, the creator can opt into full channel ownership — controlling who can create future contracts for their content. This is presented as a separate action, not bundled into the initial claim.

A creator can get paid without ever engaging with channel governance. If they come back later and want control, the path is there. If they don't, the open-to-third-parties rules continue to apply, and future fan-created contracts keep paying into the channel escrow (which the creator can now withdraw from).

### No weaker provisional claim

Until identity verification succeeds and the on-chain transaction is submitted (whether to a self-custody or system-managed wallet), the creator has no control over future contracts and cannot withdraw escrowed funds. Progress can be saved off-chain for UX purposes, but it confers no authority.

## Reaching creators

### Fan-driven outreach (MVP)

The fan who created the contract is the best person to notify the creator. They already follow the creator, they're motivated, and they won't get spam-flagged. The system's job is to make it trivially easy for them to do the outreach.

When a fan creates a contract for unclaimed content, the UI should:

1. Generate a **shareable claim link** for the creator's channel landing page.
2. Provide a **suggested message** the fan can copy-paste or adapt: *"Hey @creator, I funded your thread on housing policy — supporters have pooled $X for your work. Claim it here: [link]"*
3. Surface the share action prominently in the post-creation flow — this is not a buried "share" button, it's the natural next step after creating a contract.

This approach is the cheapest (no API dependencies), the most organic (comes from someone the creator recognizes), and the most honest (the fan is telling the creator what they did, not the system spamming them).

### Automated notification (future)

A server-side notification service can supplement fan-driven outreach for high-value unclaimed content. It would watch for `ContentItemRegistered` events, resolve the canonical ID to a platform identity, and reach out via available channels (Twitter reply/DM, public email for Substack/YouTube creators, in-app notification if they're already a user).

This should come after the fan-driven approach is proven, because automated outreach from an unknown system risks looking like spam. A message from a fan the creator recognizes is worth ten automated DMs.

## Incentives

The rules create a natural adoption funnel:

1. **Fan creates a contract** for a creator they admire. Sets reasonable prices and threshold.
2. **Creator gets notified** (via the [notification indexer](indexer.md)) that someone is offering money for their content.
3. **Creator verifies their identity** to withdraw funds.
4. **Creator optionally takes channel control** to manage future contracts on their own terms.

If the fan set bad terms:
  - The contract might fail (not enough buyers at that price). That's fine — [failed contracts free their content items](content-registry.md), and the creator can try again with better terms.
  - Or the contract might succeed but bring in less money than might have been possible. That's fine too — it's better than nothing, and it's a good incentive for the creator to take control himself.

## Anti-abuse measures

### Third-party creation fee

Third-party contract creation requires a minimum donation: the contract creator must buy at least $X worth of tokens in the contract they're creating, in the same transaction as creation. Without this, a single troll could lock up content items across every creator on the platform for nearly free. Failed-contract freeing limits the damage to a temporary nuisance, but the creation fee makes it expensive enough to not be worth trying.

This fee only applies to third-party creations. Once a creator has taken channel control (state 3), they can create contracts for their own content without a minimum.

### Creator veto for pre-control contracts

When a creator takes channel control (state 2 → state 3), they get a bounded grace period to veto any existing third-party contracts for their content. Vetoing a contract triggers early failure and refunds to token holders.

#### Why veto is necessary

The third-party creation fee prevents *spam* (locking up content items for free), but it doesn't prevent *underpricing*. And underpricing is the dangerous case — because underpriced contracts are easy to fund. If someone creates a contract valuing a creator's best work at a penny per token, that contract *succeeds* (cheap tokens sell fast), the content items are permanently locked to it in the registry, and the creator can never sell that content again through this system.

Overpriced contracts are self-correcting: they fail to attract buyers, the deadline passes, and the content items free up. Underpriced contracts are the opposite — they succeed quickly, and success is permanent.

The secondary market doesn't fix this for the creator. Secondary appreciation rewards early token holders, not the creator. The creator already got paid from the primary market at the insulting price.

Without veto, a creator's first experience with the system could be: *"This system lets strangers set the prices for my work? Some random person thought my best thread was worth a penny, and the system let them get away with it, and now I can never sell that content here again?"* That's a terrible onboarding moment, and it's a strong enough objection to kill creator adoption entirely.

The veto exists to make the third-party creation loop safe. Fans can still bootstrap contracts for creators who don't know the system exists — that's the viral loop. But the creator isn't permanently bound by terms they never agreed to. If they show up and don't like what they see, they can cancel and start fresh.

#### Why not a weaker alternative

An alternative is to make third-party contracts "provisional" — they don't permanently lock content items, and the creator can release items without cancelling the contract. This avoids the veto mechanism but creates two classes of contracts with different permanence semantics. The user-facing story becomes confusing: "these tokens still exist but they no longer represent unique content claims like all the other tokens do." The veto story is simpler to explain: "if the creator takes control, they might cancel this contract; if they do, you get a refund."

#### Mechanism

The veto uses the existing `CancellableCondition` contract — a thin wrapper around `IAssuranceCondition` that adds one terminal transition: "cancelled by authorized canceller." This contract already exists in the codebase and was designed for exactly this pattern.

**How it fits together:**

- Third-party-created contracts use a `CancellableCondition` wrapping the normal `EthThresholdCondition`. Creator-created contracts use the threshold condition directly (no cancellation possible).
- The **factory** records `(contractAddress → channelId, isThirdParty)` at creation time. It already knows both values.
- The **ChannelRegistry** — which already manages channel states and verified owners — gains a `vetoContract` function. This is channel governance, and the ChannelRegistry is the channel governance contract, so no separate veto-controller contract is needed.

```solidity
function vetoContract(address contractAddress) external;
```

The ChannelRegistry allows the veto only if all of the following are true:
  - the caller is the verified owner of the relevant channel
  - the channel is in state 3 (creator-controlled)
  - the target contract is marked as third-party-created for that channel (checked via the factory)
  - the veto window has not expired (`block.timestamp <= controlTakenAt + vetoWindow`)
  - the contract has not already succeeded

When the ChannelRegistry approves the veto, it calls `cancel()` on the contract's `CancellableCondition`. From there, normal assurance contract mechanics take over:

- `hasSucceeded()` returns `false` forever; `hasFailed()` returns `true` forever
- The assurance contract's "buying allowed" check rejects purchases (since the condition has failed)
- Token holders can refund immediately through the normal refund flow
- The content items are released from the [content registry](content-registry.md) and can be re-registered in new contracts

The veto window is bounded. After it expires, remaining pre-control contracts proceed as normal — the creator had their chance. This keeps the system predictable for token holders: if you buy tokens in a third-party contract, the creator might cancel it if they take control soon, but there's a known deadline after which your position is safe.

**The mental model:** veto is not a special side door in the assurance contract. It is one more way for the contract's condition to become permanently failed, using infrastructure (`CancellableCondition`) that already exists for this purpose, administered by the channel governance contract (`ChannelRegistry`).
