# Smart Contract Audit Findings - 2026-05-06

Scope reviewed: `hardhat/contracts/**/*.sol` with focus on value-bearing and authority-bearing contracts (`content-funding`, `individual-projects`, `marketplace`, `delegation`, and attestation registries). This was a manual review, not a formal verification engagement.

## Summary

| Severity | Count |
| --- | ---: |
| Critical | 0 |
| High | 1 |
| Medium | 2 |
| Low | 2 |
| Informational | 1 |

## Findings

### H-01: Third-party creator contracts can bypass creator veto by succeeding before veto

**Affected code:**
- `hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol:239-243`, `297-318`, `349-359`, `389-399`
- `hardhat/contracts/individual-projects/CancellableCondition.sol:60-64`
- `hardhat/contracts/content-funding/ChannelRegistry.sol:311-333`

**Impact:** A third party can permanently lock content IDs into an unwanted successful contract before the actual creator has a practical chance to veto it.

**Details:** Third-party contracts for verified-but-not-creator-controlled channels are wrapped in `CancellableCondition`, and the factory only checks that `threshold > initialPurchaseValue` so the contract cannot succeed during creation. However, after creation, anyone can immediately buy the remaining amount needed to cross the threshold. Once the base `ValueThresholdCondition` has succeeded, `CancellableCondition.cancel()` reverts with `ConditionAlreadySucceeded()`, so `ChannelRegistry.vetoContract()` can no longer cancel or release the content IDs.

A minimal attack is:
1. Creator has verified a channel but has not called `takeChannelControl()`.
2. Attacker calls `createThirdPartyContract()` with `threshold = initialPurchaseValue + 1`.
3. Attacker immediately buys one more unit from the primary market.
4. The contract succeeds; later creator veto is impossible.

For unclaimed channels, the same pattern can complete before the real creator ever verifies the channel.

**Recommendation:** Ensure third-party contracts cannot become irrevocably successful before a creator veto opportunity has elapsed. Possible designs:
- make third-party `hasSucceeded()` false until creator-control plus veto-window expiry (USER'S NOTE: yes, that sounds right; make sure the UI and the docs explain this clearly);
- allow creator veto to cancel third-party contracts during the veto window even if the funding threshold was met, before withdrawal/content finalization;
- require explicit creator acceptance for verified channels; or
- prevent purchases that would cross the success threshold until the veto path is no longer available.

### M-01: Third parties can squat content IDs with very long deadlines and tiny purchases

**Affected code:**
- `hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol:239-243`, `297-318`, `349-379`, `413-431`

**Impact:** An attacker can cheaply reserve arbitrary content IDs for unclaimed channels, potentially blocking the legitimate creator's future contract until they verify and veto, or until an attacker-chosen deadline passes.

**Details:** `createThirdPartyContract()` allows unclaimed-channel contracts if `initialPurchaseValue >= thirdPartyMinPurchase`. There is no upper bound on `params.deadline`, and content IDs are registered immediately. If the attacker sets a deadline far in the future and keeps the contract below threshold, `releaseContentOnFailure()` cannot release the IDs until the deadline passes. For unclaimed channels, no creator can veto until they complete channel verification and take control.

The default `thirdPartyMinPurchase` is `1`, so this can be extremely cheap if deployment configuration is missed or the payment token has small units.

**Recommendation:** Add bounded third-party deadlines/durations, set a meaningful economic bond/minimum purchase for production, and consider a stale-unclaimed-channel release path or owner-governed dispute path for obvious squatting. If third-party funding is meant to be permissionless, make the anti-squatting economics explicit in deployment docs and tests. (USER'S NOTE: Yes to the bounded deadlines (one week, maybe? what did we choose for the creator's veto period?), yes to the meaningful minimum rather than just 1, yes to documenting this.)

### M-02: DelegatableNotes can consume multiple roots' funds while allocating scarce ERC1155 outputs to only one chain

**Affected code:**
- `hardhat/contracts/delegation/DelegatableNotes.sol:680-689`, `728-735`

**Impact:** A delegate can spend value from several delegated notes but, because of integer rounding, allocate the purchased ERC1155 tokens disproportionately or entirely to the last input chain.

**Details:** Payment notes are consumed proportionally, then ERC1155 output notes are distributed using integer division with all remainder assigned to the last chain. If two notes from different roots each pay half for a single ERC1155 token, the first note spends funds but receives no output note; the last note receives the entire token. The caller controls note ordering, so a delegate can decide which root gets the indivisible asset while using funds from other roots.

**Recommendation:** For indivisible outputs, either require a single payment note/chain per purchased token, require token counts to be divisible by the contributing shares, refund spends that cannot receive output, or implement a clearly documented deterministic allocation policy that roots have explicitly authorized. (USER'S NOTE: I need to talk this through with you some more.)

### L-01: Alignment revocation event omits `topicStatementId`

**Affected code:**
- `hardhat/contracts/alignment-attestations/AlignmentAttestations.sol:45-49`, `111-118`

**Impact:** Event-only indexers can mis-fold revocations when the same `(attester, subjectId, statementId)` is attested under multiple topics.

**Details:** Storage keys include `topicStatementId`, and `removeAttestation()` takes it as an argument, but `AlignmentRevoked` only emits `(attester, subjectId, statementId)`. Since this project intentionally uses a thin event cache with client-side folding, events need to carry enough information to reconstruct state. A revocation under one topic is ambiguous off-chain if the same alignment exists under multiple topics.

**Recommendation:** Add `topicStatementId` to the revocation event, preferably indexed if topic filtering matters. Consider a migration/new event name if existing consumers depend on the current ABI. (USER'S NOTE: yes, go ahead. No need for migration - we have no users yet. As for indexing: if it's indexed in the creation event, index it in the revoking event too.)

### L-02: Channel verification accepts zero or non-caller claimants

**Affected code:**
- `hardhat/contracts/content-funding/ChannelRegistry.sol:252-278`

**Impact:** A bad verifier signature can permanently put a channel into `Verified` with an unusable owner, or a third party can submit someone else's proof.

**Details:** `verifyChannel()` does not require `claimant != address(0)` and does not require `msg.sender == claimant`. The EIP-712 verifier is the main trust boundary, so this is not directly exploitable without a bad/off-target signature. However, a zero-address claimant would make later `takeChannelControl()` and escrow withdrawal impossible, and accepting third-party submission makes claim proofs easier to grief/front-run operationally.

**Recommendation:** Add `claimant != address(0)`. Consider requiring `msg.sender == claimant` unless there is an intentional relayer/meta-transaction use case; if relayers are desired, document that property and keep only the zero-address guard. (USER'S NOTE: Yes to the zero check. And would OpenZeppelin's _msgSender() thing work for this, allowing us to do meta-transactions or whatever in the future?)

### I-01: Token compatibility assumptions are security-critical

**Affected code:** value-bearing ERC-20 paths across `AssuranceContract`, `ERC1155PrimaryMarket`, `ERC1155SecondaryMarket`, `ChannelEscrow`, `CreatorAssuranceContractFactory`, and `DelegatableNotes`.

The contracts consistently document an assumption of standard, non-fee-on-transfer, non-rebasing ERC-20 settlement tokens. This is important: fee-on-transfer or rebasing tokens can break escrow/accounting invariants (for example, buy orders or notes may be credited for more value than the contract actually received). This is acceptable if deployments strictly use vetted settlement tokens, but deployment tooling should enforce/record that choice. (USER'S NOTE: Fine. This is part of why we're only using USDC to start with. In the future if we open it up to more tokens we'll make sure to be careful about this. Make sure this is documented clearly, but I'm not too worried about it.)
