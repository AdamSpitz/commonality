# Smart-contract security review report — 2026-07-22 — post retroactive-funding redesign

## Scope actually covered
Refresh of the smart-contract security judgment after the retroactive-funding (RF)
redesign, which reshaped assurance-contract behaviour: it removed the
secondary market and token-burn flows and added the reimbursement model
(`donateRetroactive`, `withdrawReimbursement`, `forgoReimbursement`,
`donateNormallyERC1155`) with the reimbursement-fold refund clamp. This report
covers access control, reentrancy, gas-griefing canaries, and the new
reimbursement accounting in `contracts/individual-projects/AssuranceContracts.sol`
and `ERC1155PrimaryMarket.sol`, cross-checked against Slither static analysis and
the Hardhat security-regression suite.

## Evidence I used the system / inspected the code or docs
- `verifier-run automated.hardhat-contracts` — pass, `418 passing`
  (run `2026-07-22T21-31-56.639Z-1c11e4be`). Includes the
  `Security Regression - Access Control`, `- Reentrancy Protection`, and
  `- Gas Griefing` suites.
- `verifier-run security.contract-invariants` — pass (assurance-contract progress
  and token-balance invariants).
- `verifier-run review.security.slither` — 14 findings, no High-impact; 1
  Medium-impact worth human review (see below).
- Line-by-line read of the new reimbursement entrypoints
  (`AssuranceContracts.sol:148-247`) and the primary-market buy/refund path
  (`ERC1155PrimaryMarket.sol:140-206`).

## Attempts to break it
- Traced the atomic "donate normally" path
  `donateNormallyERC1155` → `_buyERC1155` → `_forgoReimbursement`. The external
  ERC1155 `safeBatchTransferFrom` to the buyer (an `onERC1155Received` callback)
  fires **after** `recordPrimaryPurchase` has already inflated the buyer's
  `earlyContributions`/`totalEarlyContributions` but **before** the forgo reduces
  them. `donateNormallyERC1155` and `buyERC1155` carry `nonReentrant`, but
  `withdrawReimbursement`, `donateRetroactive`, and `forgoReimbursement` do
  **not**, so the callback can re-enter those.
- Considered a malicious buyer re-entering `withdrawReimbursement` during that
  callback to withdraw reimbursement computed on the temporarily inflated
  contribution basis. Two things bound the impact: (a) each reimbursement
  function follows checks-effects-interactions individually (state is written
  before the ERC-20 transfer); (b) the outer forgo's already-withdrawn guard
  (`AssuranceContracts.sol:216-223`,
  `newContribution * totalRetroReceived / newTotal < withdrawn` →
  `ForgoWouldStrandWithdrawnReimbursement`) appears to revert the whole atomic
  transaction if any withdrawal happened mid-callback, since the post-forgo basis
  can no longer cover the withdrawal. So the redesign is not obviously exploitable.
- Confirmed the reentrancy regression suite exercises re-entering the guarded
  `buyERC1155` (rejected) but does **not** exercise cross-function reentrancy from
  the `donateNormallyERC1155` mint callback into the unguarded reimbursement
  functions.

## Highest-severity finding
Slither Medium (`reentrancy-no-eth`) on
`MultiERC1155AssuranceContract.donateNormallyERC1155`
(`AssuranceContracts.sol:198-207`): cross-function reentrancy is possible because
the reimbursement functions lack `nonReentrant`. My analysis is that the atomic
forgo guard mitigates the concrete over-withdrawal path, so I did not find a
working exploit — but the safety currently rests on a subtle accounting
invariant rather than an explicit guard, and it is not covered by a regression
test. I am flagging a defense-in-depth hardening recommendation to
`inbox.md` (Ask tier — it touches the security-sensitive assurance contracts):
add `nonReentrant` to `withdrawReimbursement`, `donateRetroactive`, and
`forgoReimbursement`, and add a cross-function reentrancy regression test around
`donateNormallyERC1155`.

### Resolution (2026-07-27)
Adam approved the hardening. `nonReentrant` is now on `withdrawReimbursement`,
`donateRetroactive` and `forgoReimbursement`, and
`Security Regression - Reentrancy Protection` gained a
`reimbursement cross-function reentrancy via donateNormallyERC1155` suite. All
three tests were confirmed to fail with the modifiers removed, which also
settled the open question in this report empirically:

- The re-entrant `withdrawReimbursement` **did** succeed on the inflated basis;
  the atomic transaction then reverted on the outer forgo's
  `ForgoWouldStrandWithdrawnReimbursement`. So the report's reasoning was
  right — funds were never at risk — but the protection really was an
  incidental underflow check rather than a barrier.
- The re-entrant `forgoReimbursement` and `donateRetroactive` succeeded
  outright; the forgo guard never covered them at all. Neither is profitable
  (both give away the caller's own money), but both were unguarded state
  mutation from inside a callback.

Slither still reports the Medium after the fix. It is now a false positive: the
only functions it can name as reachable during the mint callback are `view`
(`reimbursableAmount`, `outstandingReimbursementTotal`, the public mapping
getters). `withdraw()` remains unguarded by design — it is recipient-only and
reads `totalRetroReceived`/`totalReimbursementsWithdrawn`, neither of which the
transient inflation touches. How to triage the lingering Slither finding is an
open item in [`inbox.md`](/inbox.md).

## Other findings
- Remaining Slither findings are Low/Informational/Optimization: missing
  zero-checks on constructor/setter addresses in content-funding token contracts,
  `shadowing-local` on `IChannelRegistry.setVerifier`, `missing-inheritance`
  suggestions, `assembly` use in the `CreatorGasTank` ERC-7579 decoder (expected —
  it is a hand-written calldata decoder), and `cache-array-length` loop
  micro-optimizations. None are security-blocking.
- This was a targeted review of the RF-changed surface plus static analysis, not
  an independent full-source line-by-line audit.

## Where I used insider knowledge or gave benefit of the doubt
I relied on the project's Hardhat security-regression suite and the
contract-invariants check as evidence for the unchanged surfaces, and reasoned
about the forgo guard from the code and its NatSpec rather than replaying an
adversarial transaction on-chain.

## Confidence: low / medium / high
medium

## Recommended follow-up tests or automation
- Add `nonReentrant` to `withdrawReimbursement`, `donateRetroactive`, and
  `forgoReimbursement` (defense in depth) — tracked in `inbox.md`.
- Add a `Security Regression - Reentrancy Protection` case that points a malicious
  ERC1155 receiver at `donateNormallyERC1155` and asserts the re-entrant
  reimbursement withdrawal is rejected, so the accounting-based defense is pinned
  by an explicit test rather than left implicit.
