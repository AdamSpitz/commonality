# Smart Contract Audit Findings - 2026-05-07

Scope reviewed: `hardhat/contracts/**/*.sol`, with emphasis on value-bearing and authority-bearing contracts: content funding, assurance contracts, ERC1155 markets, delegation notes, channel verification/escrow, and attestation registries.

This was a manual security review, not a formal verification engagement. I did not run a full dynamic test campaign or automated analyzer in this pass.

## Summary

| Severity | Count |
| --- | ---: |
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 2 |
| Informational | 2 |

## Findings

### M-01: Unclaimed-channel third-party contracts can still squat content IDs indefinitely by fully funding at creation

**Affected code:**
- `hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol:315-340`
- `hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol:371-383`
- `hardhat/contracts/individual-projects/ValueThresholdCondition.sol:50-58`

**Impact:** A third party can cheaply reserve content IDs for an unclaimed channel until the real creator verifies the channel and actively vetoes. The configured `thirdPartyMaxDuration` does not bound this case.

**Details:** The factory now prevents verified-channel third-party contracts from being successful at creation with:

```solidity
if (channel.verified && params.threshold <= initialPurchaseValue) {
    revert ThresholdMustExceedInitialPurchase();
}
```

But the same check is not applied to unclaimed channels. For an unclaimed channel, an attacker can set `threshold <= initialPurchaseValue` (including `threshold == 0`) and make the base `ValueThresholdCondition` permanently successful as soon as the initial purchase is processed. The `CancellableCondition` success gate correctly prevents withdrawal until creator-control plus veto-window expiry, but `hasFailed()` will never become true once the base threshold has been met. Therefore `releaseContentOnFailure()` cannot release the registered content IDs after the nominal deadline.

This weakens the anti-squatting intent of `thirdPartyMaxDuration`: deadlines only release underfunded third-party contracts, not already-funded ones. A legitimate creator can recover by verifying, taking control, and vetoing during the veto window, but until then the IDs are locked.

**Recommendation:** Apply the `threshold > initialPurchaseValue` invariant to all third-party contracts, not only verified-channel contracts, or add another expiry/release path for unclaimed third-party contracts whose creator has not taken control. Also reject `threshold == 0` for content-funding contracts unless zero-threshold projects are explicitly desired.

### L-01: Content-funding factory allows zero threshold and expired/near-expired deadlines for creator contracts

**Affected code:**
- `hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol:247-253`
- `hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol:315-340`
- `hardhat/contracts/individual-projects/ValueThresholdCondition.sol:42-58`

**Impact:** Misconfigured creator-initiated content-funding contracts can succeed immediately (`threshold == 0`) or behave unexpectedly around deadlines. This is mostly a project-creator footgun, but the equivalent `ProjectFactory` path already rejects zero thresholds and past deadlines.

**Details:** `ProjectFactory.createERC1155AndMarketplaceAndAssuranceContract()` validates `threshold != 0` and `deadline > block.timestamp`, but `CreatorAssuranceContractFactory` does not perform equivalent validation. For creator-initiated contracts, a zero threshold makes the assurance contract immediately successful before any purchase. For third-party contracts, the missing lower-bound deadline validation compounds M-01 when the initial purchase already meets the threshold.

**Recommendation:** Add shared validation in `CreatorAssuranceContractFactory` requiring `params.threshold > 0` and `params.deadline > block.timestamp` for both creator and third-party creation, unless there is a documented product reason to allow immediately successful projects.

### L-02: ChannelEscrow accepts deposits for arbitrary/invalid channel IDs

**Affected code:**
- `hardhat/contracts/content-funding/ChannelEscrow.sol:91-95`

**Impact:** Users or integrators can accidentally send funds to channel IDs that may never be verified, making funds practically unrecoverable. The core factory path rejects `bytes32(0)` channel IDs, so this is primarily a direct-call/integration safety issue.

**Details:** `ChannelEscrow.deposit()` only checks `amount != 0`; it does not reject `channelId == bytes32(0)` or otherwise require the channel to be known/claimable. Direct deposits to invalid identifiers can only be withdrawn if the registry later verifies the exact channel ID.

**Recommendation:** Reject `bytes32(0)` at minimum. Consider whether public arbitrary deposits are desirable; if not, restrict deposits to trusted creator assurance contracts/factories or add a depositor refund path for unverified channels.

### I-01: Deployment ownership wiring is security-critical

**Affected code:**
- `hardhat/contracts/content-funding/ContentRegistry.sol` (`onlyOwner` register/release)
- `hardhat/contracts/content-funding/ChannelRegistry.sol` (`setFactory`, `setVerifier`)
- `hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol` (`setThirdPartyMinPurchase`, `setDelegatableNotes`)
- `hardhat/contracts/delegation/DelegatableNotes.sol` (`setPrimaryMarketAuthorizer`, `setPrimaryMarketAuthorization`)

**Details:** The content-funding flow depends on correct post-deployment wiring: the content registry owner should be the creator factory, the channel registry factory should be the creator factory, the trusted verifier should be correct, third-party minimum purchase should be economically meaningful, and optional `DelegatableNotes` authorization should only trust intended factories. These are not contract bugs by themselves, but misconfiguration can break creation, prevent veto release, or authorize unintended primary markets.

**Recommendation:** Keep deployment scripts and runbooks explicit about these invariants, and add deployment checks that assert the final addresses/owners/authorizers match the intended topology before publishing a deployment.

### I-02: Settlement-token assumptions remain part of the trusted boundary

**Affected code:**
- `hardhat/contracts/individual-projects/AssuranceContract.sol`
- `hardhat/contracts/individual-projects/ERC1155PrimaryMarket.sol`
- `hardhat/contracts/marketplace/ERC1155SecondaryMarket.sol`
- `hardhat/contracts/content-funding/ChannelEscrow.sol`
- `hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol`
- `hardhat/contracts/delegation/DelegatableNotes.sol`

**Details:** The value-bearing flows assume standard ERC-20 behavior: no fees on transfer, no rebasing, no callbacks, and conventional allowance semantics. The code documents this assumption and uses `SafeERC20`, but accounting is still based on requested transfer amounts, not observed balance deltas.

**Recommendation:** Continue limiting production deployment to vetted settlement tokens such as the intended USDC deployment. Re-audit escrow, notes, and marketplace accounting before broadening token support.

## Notes on previously reported issues

The prior audit file in git history reported several issues that appear to have been addressed in the current code: third-party success is now gated by creator control plus veto-window expiry; third-party deadlines are bounded; alignment revocations include `topicStatementId`; channel verification rejects zero claimants; and delegated-note purchase splitting now requires integral output/payment shares. The unclaimed-channel fully-funded squatting variant above remains.
