# Claimable beneficiaries (tech)

Product: [fund-now-claim-later.md](/specs/product/fund-now-claim-later.md). Today's content-only ancestor: [channel-claiming.md](content-funding/channel-claiming.md), [channel-escrow.md](content-funding/channel-escrow.md).

Status: current [focus](/focus.md). No users, no mainnet: **refactor the existing content-channel contracts onto this primitive** rather than wrapping them or keeping a parallel `ChannelRegistry` / `ChannelEscrow`. Names and ABIs may change.

## What to extract

Content "channels" currently mix:

1. A stable external identifier
2. A verifier for proving control of it
3. Escrow keyed to that identifier
4. **Content-only:** item occupancy (`ContentRegistry`), one-contract-per-item, creator veto, per-content token types

(1)–(3) are the claimable-beneficiary primitive. (4) stays in the content-funding factory / `ContentRegistry`. A website beneficiary must not grow unused content fields, and a tweet channel must not keep a *second* escrow once this exists.

```text
beneficiaryId = keccak256(namespace, canonicalIdentifier)
```

Examples: `("x","uid:44196397")`, `("youtube","channel:UC…")`, `("substack","example")`, `("dns","example.org")`.

A project (LazyGiving or creator assurance) names a `beneficiaryId`. If unverified, success pays `BeneficiaryEscrow`. If verified, success may pay the bound payout address directly. The namespace's verifier decides who may bind that address.

## Contract split

Replace `ChannelRegistry` + `ChannelEscrow` + `IChannelVerifier` / `ChannelClaimProof` with:

| Piece | Role |
|---|---|
| `BeneficiaryRegistry` | State per `beneficiaryId`: unclaimed / verified / beneficiary-controlled; bound payout address; proof-hash anchoring; nonce/deadline replay rules; owner-authorized payout rotation |
| `BeneficiaryEscrow` | ETH (later stablecoin) balances keyed by `beneficiaryId`; `withdraw` only to the registry's current payout address |
| `IBeneficiaryVerifier` | `verifyClaimProof(proof) returns (bool)` — one implementation per namespace (tweet, RSS, well-known HTTPS, later zkTLS / DNSSEC) |

Content-funding factory and `ContentRegistry` **call** the registry (may this address create a contract that includes this channel's items? is the channel beneficiary-controlled?) but do not live inside it. Veto stays on the content factory / registry.

There is no compatibility requirement to keep the old names. Prefer renaming in place (tests, SDK folds, UI copy) over a v2-beside-v1. [contract-versioning.md](/specs/tech/contract-versioning.md) still applies once anything is on mainnet; until then, just change the contracts.

**Per-namespace verifiers, not necessarily per-namespace registries.** Today's per-platform *deployment set* exists so Twitter verification cannot clobber YouTube IDs and so competing deployments stay isolated. `beneficiaryId` already namespaces identifiers. A single registry that dispatches `namespace → verifier` is enough for identity/escrow, and it is what LazyGiving needs so a project can pay `dns:example.org` without a second escrow deployment. **Content uniqueness** (one active contract per tweet) can remain a per-platform `ContentRegistry` if we still want competing content deployments; that is independent of beneficiary escrow.

The old "four-contract set per platform" then becomes: shared `BeneficiaryRegistry`+`Escrow` + per-platform `ContentRegistry`+factory. Revisit the [open four-vs-two question](content-funding/README.md#per-platform-deployment) in that light — registry+escrow want to be shared; content+factory want to stay per platform.

## Proof

Generalize `ChannelClaimProof`:

```text
namespace
canonicalIdentifier
claimant            // payout address to bind
nonce
deadline
proofHash           // hash of the durable public artifact (tweet URL, RSS URL, well-known URL, TXT)
verifierSignature   // MVP: trusted signer; later: zkTLS / DNSSEC verifier contract
```

DNS MVP artifacts (product chose HTTPS first, TXT alternate):

- `https://example.org/.well-known/commonality-claim.json`
- `_commonality.example.org` TXT

JSON / TXT body must include canonical domain, claimant address, chain id, registry address, nonce, expiry — so a copied file cannot be replayed against another deployment.

Platform API `/verify/challenge` + `/verify/confirm` grows a namespace switch (fetch well-known / TXT in addition to tweet / RSS). Same `proofHash` anchoring and `ChannelProofAnchored`-style event (rename to `BeneficiaryProofAnchored`).

## States

| State | Escrow | Who may create projects *about* this id |
|---|---|---|
| Unclaimed | Nobody withdraws | Anyone (third-party fee + not-affiliated framing) |
| Verified | Bound address withdraws | Anyone; new success may pay the address directly |
| Beneficiary-controlled | Bound address withdraws | Only the verified address |

Unclaimed → verified is `verifyClaim` (proof). Verified → controlled is a separate call. One-way, same as today.

Content veto and occupancy: not in this contract.

## Policy hooks the registry should allow (even if unused for tweets)

Namespace config (or per-id override) rather than hardcoded charity-only forks:

- **Claim waiting period** before first `withdraw` after a new proof (0 for social MVP; non-zero for `dns` / large balances).
- **Re-bind payout address** only with authorization from the current payout address; a namespace may additionally require a fresh identity proof. A fresh identity proof alone must not replace an established payout address.
- **Unclaimed timeout:** escrow is not a timeout clock. Timeouts live on the *project* (assurance deadline → contributor refund). Do not add "sweep to protocol" on the escrow.
- **Loss of control:** MVP recovery is intentionally absent. After the first claim, neither a later conflicting proof nor current domain control can redirect established funds without the current payout wallet. The UI may stop new activity for a disputed or stale identity, but neither the verifier nor an administrator chooses a replacement owner.

### MVP claim and rotation rules

The first valid claim proposes the initial payout address. For namespaces with a non-zero waiting period, escrow remains locked until that period has elapsed; the claim itself must be publicly visible during the wait. The first finalized claimant receives the balance accumulated while the identity was unclaimed. This cannot distinguish an original organization from a purchaser who acquired the domain before its first-ever claim, so the product must disclose that limitation rather than implying legal-entity continuity.

Once claimed, payout rotation requires the current payout address to authorize the replacement. Namespace policy may also require a fresh proof of identity control, but that proof is an additional check, never a substitute for the current wallet's authorization. A lost wallet or uncooperative domain transfer can leave the beneficiary stuck in the MVP. This is the deliberately conservative failure mode: unavailable functionality rather than misdirected money.

Do not implement claim generations yet. If later required, balances should be keyed by `(beneficiaryId, generation)`, and identity-only recovery should affect future deposits without inheriting earlier generations. That extension is demand-gated on real domain transfers, long-lived escrow, or materially large balances.

## Callers

- Creator assurance contracts: `deposit(beneficiaryId)` on success while unverified — same as today's `withdrawToEscrow`.
- Generic LazyGiving: payout target may be `BeneficiaryEscrow` + `beneficiaryId` instead of an EOA. That is the org-before-onboard path.
- Off-ramp / embedded wallet: unchanged; `claimant` is the embedded or provider deposit address.

## When implementing

This is the current [focus](/focus.md). Implementation order: rename/refactor `Channel*` in Hardhat, SDK, Ponder folds, and UI in one pass; add `dns` verifier + well-known check to platform-api; point LazyGiving project creation at a beneficiary picker. Do not leave a shim `ChannelRegistry` that only wraps `BeneficiaryRegistry` unless a deploy already has live escrow — there isn't one that matters.
