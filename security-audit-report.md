# Smart Contract Security Audit Report
## Commonality Project

**Date:** 2025-11-19
**Auditor:** Claude (AI Assistant)
**Scope:** All contracts in `hardhat/contracts/`

---

## Executive Summary

This audit covers 15 smart contracts implementing a decentralized funding and governance platform. The system includes delegation mechanisms, marketplace functionality, assurance contracts, and governance features.

**Overall Risk Assessment:** MEDIUM-HIGH

**Critical Issues:** 3
**High Severity:** 5
**Medium Severity:** 7
**Low Severity:** 4
**Informational:** 6

⚠️ **IMPORTANT:** This is an AI-generated preliminary audit. A professional security audit by experienced auditors is ESSENTIAL before deploying to mainnet.

---

## Critical Findings

### C-1: Reentrancy Vulnerability in Commission Claims
**Contract:** `DelegatableNotes.sol`
**Location:** Lines 1043-1070 (`claimCommission`)

**Severity:** CRITICAL

**Description:**
The `claimCommission` function uses `.transfer()` for ETH transfers, which is generally reentrancy-safe due to the 2300 gas stipend. However, for ERC1155 tokens, it calls `safeTransferFrom` which can trigger arbitrary code in the receiver's `onERC1155Received` hook.

**Vulnerable Code:**
```solidity
function claimCommission(...) external nonReentrant {
    uint256 amount = accruedCommissions[owner][token][tokenType][tokenId];
    require(amount > 0, "No commission to claim");

    // Delete before external call (checks-effects-interactions)
    delete accruedCommissions[owner][token][tokenType][tokenId];

    // ...
    // ERC1155
    IERC1155(token).safeTransferFrom(address(this), owner, tokenId, amount, "");
}
```

**Impact:**
While the `nonReentrant` modifier protects against same-function reentrancy, the ERC1155 transfer could potentially allow:
1. Cross-function reentrancy attacks
2. Malicious tokens could block commission claims
3. Gas griefing attacks via expensive `onERC1155Received` hooks

**Recommendation:**
- Add additional reentrancy guards for cross-function calls
- Consider a pull-pattern withdrawal system
- Validate ERC1155 contracts before allowing them in the system

---

### C-2: Integer Overflow Risk in Commission Calculations
**Contract:** `DelegatableNotes.sol`
**Location:** Lines 993-1006, 1017-1035

**Severity:** CRITICAL

**Description:**
Commission calculations use multiplication before division, which could overflow:

```solidity
uint256 commissionAmount = (amount * commissions[i]) / BASIS_POINTS;
```

For large amounts (e.g., 10^30 wei) multiplied by basis points (up to 5000), this could overflow `uint256`.

**Impact:**
- Commission calculations could silently overflow and wrap around
- Delegates could lose rightful commissions
- Arithmetic errors in proportional distribution

**Recommendation:**
```solidity
// Use SafeMath or check for overflow
uint256 commissionAmount = (amount / BASIS_POINTS) * commissions[i];
// Or use explicit overflow checks in Solidity 0.8+
```

---

### C-3: Unchecked External Call Return Values
**Contract:** `ERC1155Marketplace.sol`
**Location:** Lines 128, 219, 234

**Severity:** CRITICAL

**Description:**
The contract uses `.transfer()` for ETH transfers without checking success:

```solidity
payable(seller).transfer(totalCost);  // Line 128
payable(seller).transfer(totalCost);  // Line 219
payable(buyer).transfer(refund);      // Line 234
```

If the recipient is a contract that fails in its fallback function, the entire transaction reverts. While this may be intentional, it creates DoS vulnerabilities.

**Impact:**
- A malicious seller/buyer could create a contract that always reverts
- This would permanently lock funds or listings
- DoS attack vector for marketplace functionality

**Recommendation:**
```solidity
// Use .call() with proper checks
(bool success, ) = payable(seller).call{value: totalCost}("");
require(success, "Transfer failed");

// Or implement a withdrawal pattern
```

---

## High Severity Findings

### H-1: Circular Delegation Check Can Be Bypassed
**Contract:** `DelegatableNotes.sol`
**Location:** Lines 975-984

**Severity:** HIGH

**Description:**
The `_revertIfCircularDelegation` function only checks the delegation chain upward from the current note. However, it doesn't prevent creating a circle through a split chain operation.

**Attack Scenario:**
1. Alice creates note N1, delegates to Bob creating N2
2. Bob splits the chain
3. Bob could potentially delegate back to Alice in complex scenarios

**Impact:**
- Circular delegation chains could be created
- Revocation logic could fail
- Infinite loops in chain traversal

**Recommendation:**
- Add global tracking of active delegation relationships
- Implement depth limits on delegation chains
- Add comprehensive tests for circular delegation scenarios

---

### H-2: Proportional Distribution Rounding Errors
**Contract:** `DelegatableNotes.sol`
**Location:** Lines 698-734, 790-841

**Severity:** HIGH

**Description:**
Proportional distribution uses integer division which can lead to rounding errors:

```solidity
paymentFromThisNote = (requiredPayment * noteAmount) / totalAvailable;
```

For small amounts or specific ratios, rounding could accumulate and cause:
1. Dust amounts left over
2. Inability to fully utilize notes
3. Unfair distribution among delegation chains

**Example:**
- Total: 10 wei across 3 notes (3, 3, 4 wei)
- Payment needed: 7 wei
- Proportional: (7*3/10) = 2.1 → 2, (7*3/10) = 2.1 → 2, (7*4/10) = 2.8 → 3
- Sum: 2+2+3 = 7 ✓ (works due to remainder logic)
- But with different numbers, could lose wei

**Impact:**
- Loss of small amounts over time
- Failed transactions due to insufficient amounts
- Unfair distribution of tokens

**Recommendation:**
- Document rounding behavior clearly
- Consider using higher precision arithmetic
- Add minimum amount thresholds

---

### H-3: Missing Access Control in AssuranceContract Withdrawal
**Contract:** `AssuranceContract.sol`
**Location:** Lines 41-46

**Severity:** HIGH

**Description:**
The `withdraw()` function allows ANYONE to trigger withdrawal of funds to the recipient once the threshold is met:

```solidity
function withdraw() external {
    requireAssuranceContractHasSucceeded();
    uint256 value = address(this).balance;
    payable(_recipient).transfer(value);
    emit AssuranceContractWithdrawal(_recipient, value);
}
```

**Impact:**
- Front-running attacks: Anyone can call this right after threshold is met
- MEV extraction opportunities
- Loss of control over withdrawal timing
- Gas griefing: Someone could repeatedly call this

**Recommendation:**
```solidity
function withdraw() external {
    require(msg.sender == _recipient, "Only recipient can withdraw");
    requireAssuranceContractHasSucceeded();
    // ...
}
```

---

### H-4: No Slippage Protection in Purchases
**Contract:** `DelegatableNotes.sol`
**Location:** Lines 855-905, 919-973

**Severity:** HIGH

**Description:**
Purchase functions accept `paymentAmount` but don't validate it against current market prices. A transaction could execute at a worse price than expected if front-run.

**Impact:**
- Users could pay more than intended
- Front-running attacks
- Price manipulation

**Recommendation:**
- Add maximum price parameters
- Implement deadline parameters
- Add explicit slippage tolerance checks

---

### H-5: Seller Function Parameter Confusion
**Contract:** `ERC1155Seller.sol`
**Location:** Lines 95-114

**Severity:** HIGH

**Description:**
The `sellERC1155` function has a parameter named `buyer` which is misleading - it's actually the seller returning tokens:

```solidity
function sellERC1155(
    address buyer,  // ← Misleading name, should be 'seller'
    address erc1155Addr,
    uint256[] calldata ids,
    uint256[] calldata counts,
    bytes calldata data
) external nonReentrant {
    // ...
    IERC1155(erc1155Addr).safeBatchTransferFrom(
        buyer,  // ← Actually the seller here
        address(this),
        // ...
    );
}
```

**Impact:**
- Code confusion and maintenance errors
- Potential for incorrect integration by developers
- Security vulnerabilities in dependent code

**Recommendation:**
```solidity
function sellERC1155(
    address seller,  // Correct naming
    // ...
)
```

---

## Medium Severity Findings

### M-1: Missing Zero Address Validation
**Contracts:** Multiple
**Locations:** Various

**Severity:** MEDIUM

**Description:**
Several functions don't validate against zero addresses:

1. `DelegatableNotes.deposit()` - doesn't validate depositor
2. `Pubstarter.createERC1155AndMarketplaceAndAssuranceContract()` - doesn't validate recipient
3. Multiple delegation functions

**Impact:**
- Tokens could be lost to zero address
- Invalid state creation

**Recommendation:**
Add consistent zero address checks:
```solidity
require(address != address(0), "Zero address not allowed");
```

---

### M-2: Unbounded Delegation Chain Length
**Contract:** `DelegatableNotes.sol`
**Location:** Chain traversal functions

**Severity:** MEDIUM

**Description:**
No limit on delegation chain depth. A very long chain could:
1. Exceed gas limits in traversal operations
2. Make revocation prohibitively expensive
3. Enable DoS attacks

**Impact:**
- Gas exhaustion attacks
- Unusable notes due to gas costs
- Failed transactions

**Recommendation:**
```solidity
uint256 public constant MAX_DELEGATION_DEPTH = 10;

function _countChainLength(uint256 leafNoteId) private view returns (uint256) {
    uint256 chainLength = 0;
    uint256 currentNoteId = leafNoteId;

    while (currentNoteId != 0) {
        require(chainLength < MAX_DELEGATION_DEPTH, "Chain too long");
        chainLength++;
        currentNoteId = notes[currentNoteId].parentNoteId;
    }

    return chainLength;
}
```

---

### M-3: Price Modification Check Is Insufficient
**Contract:** `AssuranceContracts.sol` (MultiERC1155_AssuranceContract)
**Location:** Lines 43-54

**Severity:** MEDIUM

**Description:**
The price modification check allows setting to the same price repeatedly:

```solidity
require(
    currentPrice == 0 || currentPrice == price,
    "Cannot modify prices"
);
```

This emits duplicate events and wastes gas, though it doesn't create security issues.

**Impact:**
- Gas waste
- Event spam
- Confusion for indexers

**Recommendation:**
```solidity
require(currentPrice == 0, "Price already set");
_erc1155Prices[erc1155Addr][id] = price;
emit ERC1155Offered(erc1155Addr, id, price);
```

---

### M-4: No Event Emissions for Critical State Changes
**Contract:** `DelegatableNotes.sol`
**Location:** Multiple functions

**Severity:** MEDIUM

**Description:**
Several critical functions don't emit events:
- `_splitChain()` - only emits at end, not for each note
- Commission accrual (internal function)
- Chain recreation

**Impact:**
- Difficult to track state changes off-chain
- Poor auditability
- Indexing challenges

**Recommendation:**
Add comprehensive event emissions for all state changes.

---

### M-5: Timestamp Dependence in AssuranceContract
**Contract:** `AssuranceContract.sol`
**Location:** Line 68

**Severity:** MEDIUM

**Description:**
```solidity
require(block.timestamp >= _deadline, "Project fate still undecided");
```

Uses `block.timestamp` which can be manipulated by miners within ~15 seconds.

**Impact:**
- Miners could manipulate deadline by small amounts
- Unfair advantage in edge cases

**Recommendation:**
- Document the acceptable timestamp variance
- Use block numbers instead for critical deadlines
- Add safety margin to deadlines

---

### M-6: Missing Input Validation in Batch Functions
**Contracts:** `Beliefs.sol`, `Implications.sol`, `ProjectAlignment.sol`
**Locations:** Batch functions

**Severity:** MEDIUM

**Description:**
Batch functions don't validate array lengths aren't excessive:

```solidity
function setBeliefsInBatch(
    bytes32[] calldata statementIds,
    uint8[] calldata beliefStates
) external {
    require(
        statementIds.length == beliefStates.length,
        "Arrays must have same length"
    );

    for (uint256 i = 0; i < statementIds.length; i++) {
        // No check on total length
    }
}
```

**Impact:**
- Gas exhaustion if arrays too large
- DoS by consuming block gas limit

**Recommendation:**
```solidity
require(statementIds.length <= 100, "Batch too large");
```

---

### M-7: Deletion of Notes Doesn't Clear Delegated Flag on Parent
**Contract:** `DelegatableNotes.sol`
**Location:** `_splitChain()` function, line 471

**Severity:** MEDIUM

**Description:**
When splitting chains, original notes are deleted but there's potential for state inconsistency if delegation flags aren't properly managed.

**Impact:**
- Potential state inconsistencies
- Orphaned delegation references

**Recommendation:**
- Add comprehensive state cleanup
- Document note lifecycle clearly
- Add invariant checks in tests

---

## Low Severity Findings

### L-1: Floating Pragma Versions
**Contracts:** Multiple
**Severity:** LOW

**Description:**
Some contracts use floating pragma (e.g., `>=0.8.0 <0.9.0`) while others use `^0.8.0`.

**Recommendation:**
Use fixed pragma versions for deployed contracts:
```solidity
pragma solidity 0.8.20;  // Fixed version
```

---

### L-2: Missing NatSpec Documentation
**Contracts:** Multiple
**Severity:** LOW

**Description:**
Many internal functions lack NatSpec comments explaining their behavior, parameters, and return values.

**Recommendation:**
Add comprehensive NatSpec documentation for all public and external functions.

---

### L-3: Magic Numbers in Code
**Contract:** `DelegatableNotes.sol`
**Severity:** LOW

**Description:**
Uses magic numbers like `10000` for basis points without clear documentation in some places.

**Recommendation:**
```solidity
uint256 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points
```
Already defined, but use consistently throughout.

---

### L-4: No Emergency Pause Mechanism
**Contracts:** All
**Severity:** LOW

**Description:**
No pause/emergency stop mechanism exists if vulnerabilities are discovered.

**Recommendation:**
Consider adding OpenZeppelin's `Pausable` for critical contracts, especially `DelegatableNotes`.

---

## Informational Findings

### I-1: Gas Optimization - Storage Reading
**Contract:** `DelegatableNotes.sol`
**Location:** Multiple

**Description:**
Repeatedly reading from storage is expensive. Cache storage variables in memory.

**Example:**
```solidity
// Current
for (uint256 i = 0; i < chainLength; i++) {
    noteIds[i] = currentId;
    owners[i] = notes[currentId].owner;  // Storage read each iteration
    currentId = notes[currentId].parentNoteId;  // Storage read each iteration
}

// Optimized
for (uint256 i = 0; i < chainLength; i++) {
    Note storage note = notes[currentId];  // Single storage pointer
    noteIds[i] = currentId;
    owners[i] = note.owner;
    currentId = note.parentNoteId;
}
```

---

### I-2: Inconsistent Error Messages
**Contracts:** Multiple

**Description:**
Error messages vary in style and verbosity.

**Recommendation:**
Standardize error messages across contracts for better UX.

---

### I-3: Comment Marked as "AAA"
**Contract:** `ERC1155Marketplace.sol`
**Location:** Line 28

**Description:**
```solidity
IERC1155 public _erc1155; // AAA could this be marked as immutable or something?
```

**Recommendation:**
Yes, this should be `immutable`:
```solidity
IERC1155 public immutable _erc1155;
```

---

### I-4: Unused Receive Function
**Contract:** `DelegatableNotes.sol`
**Location:** Line 125

**Description:**
```solidity
receive() external payable {}
```

No documentation on why this exists or when it's used.

**Recommendation:**
Document the purpose or remove if unnecessary.

---

### I-5: Consider Using Custom Errors (Solidity 0.8.4+)
**Contracts:** All

**Description:**
Custom errors are more gas-efficient than string revert messages.

**Example:**
```solidity
error NoteDoesNotExist(uint256 noteId);
error NotNoteOwner(uint256 noteId, address caller);

// Instead of:
require(owner != address(0), "Note does not exist");
require(owner == _msgSender(), "Not the note owner");

// Use:
if (owner == address(0)) revert NoteDoesNotExist(noteId);
if (owner != _msgSender()) revert NotNoteOwner(noteId, _msgSender());
```

---

### I-6: Missing Indexed Parameters in Events
**Contracts:** Multiple

**Description:**
Some events don't index important parameters, making filtering harder.

**Example:**
```solidity
event NoteCreated(
    uint256 indexed noteId,
    address indexed owner,
    uint256 amount,  // Could be indexed if filtering by amount is useful
    address token,
    TokenType tokenType,
    uint256 tokenId,
    uint256 parentNoteId  // Could be indexed
);
```

**Recommendation:**
Review events and index parameters that will be frequently filtered.

---

## Contract-Specific Analysis

### DelegatableNotes.sol - Most Complex Contract

**Strengths:**
- Good use of ReentrancyGuard
- Comprehensive delegation chain management
- Support for both ERC20 and ERC1155
- Commission system is well-designed

**Weaknesses:**
- Very complex logic increases attack surface
- Heavy gas costs for long delegation chains
- Potential for rounding errors in proportional distribution
- Circular delegation prevention could be stronger

**Specific Concerns:**

1. **Chain Splitting Logic (lines 402-476):**
   - Extremely complex
   - Difficult to audit
   - High gas costs
   - Potential for edge cases

2. **Proportional Distribution (lines 676-841):**
   - Complex rounding logic
   - Potential for dust amounts
   - Multiple loops over arrays

3. **Commission Accrual:**
   - 4-dimensional mapping is complex
   - Potential for gas griefing via expensive claims

---

### ERC1155Marketplace.sol

**Strengths:**
- Clean orderbook design
- Nonreentrant protection
- Straightforward logic

**Weaknesses:**
- Transfer failures cause DoS
- No listing/order expiration
- No fee mechanism
- Storage could grow unbounded

**Recommendations:**
- Add order expiration timestamps
- Implement order cleanup mechanism
- Consider using call() instead of transfer()
- Add platform fee mechanism if needed

---

### Beliefs.sol & Implications.sol & ProjectAlignment.sol

**Strengths:**
- Simple and auditable
- Good event emissions
- Batch operations for gas savings

**Weaknesses:**
- No access control (fully permissionless - may be intended)
- No way to remove attestations
- Unbounded batch operations

**Recommendations:**
- Document that permissionless design is intentional
- Add batch size limits
- Consider adding attestation removal/revocation

---

### AssuranceContract.sol & Related

**Strengths:**
- Clean threshold mechanism
- Immutable parameters prevent manipulation
- Straightforward refund logic

**Weaknesses:**
- Withdrawal has no access control
- Uses .transfer() which could fail
- No partial withdrawals

**Recommendations:**
- Add recipient-only withdrawal
- Use call() instead of transfer()
- Consider partial withdrawal mechanism

---

## Testing Recommendations

### Critical Test Cases Needed:

1. **Reentrancy Tests:**
   - Test reentrancy on all external calls
   - Test cross-function reentrancy
   - Test with malicious ERC1155 contracts

2. **Delegation Chain Tests:**
   - Test maximum chain depth
   - Test circular delegation prevention
   - Test chain splitting with various amounts
   - Test revocation at different chain positions

3. **Commission Tests:**
   - Test commission calculation accuracy
   - Test proportional distribution correctness
   - Test commission claiming edge cases
   - Test overflow scenarios

4. **Integration Tests:**
   - Test full workflow end-to-end
   - Test marketplace integration
   - Test assurance contract success/failure paths
   - Test with multiple concurrent users

5. **Edge Case Tests:**
   - Zero amounts
   - Maximum amounts (near uint256 max)
   - Empty arrays
   - Single-element arrays
   - Very long delegation chains

6. **Gas Tests:**
   - Measure gas for maximum-length chains
   - Test gas exhaustion scenarios
   - Verify operations complete within block gas limit

---

## Recommendations Summary

### Immediate Actions (Before Any Deployment):

1. **Fix Critical Issues:**
   - Review all external calls for reentrancy
   - Add overflow protection in commission calculations
   - Fix transfer() usage in marketplace
   - Add access control to withdraw functions

2. **Add Missing Validations:**
   - Zero address checks
   - Array length limits
   - Amount validations
   - Chain depth limits

3. **Comprehensive Testing:**
   - Unit tests for all functions
   - Integration tests for full workflows
   - Fuzz testing for edge cases
   - Gas profiling for DoS vectors

### Before Mainnet:

1. **Professional Audit:**
   - Engage multiple professional auditing firms
   - Budget for 4-6 weeks of audit time
   - Plan for remediation period

2. **Bug Bounty:**
   - Launch bug bounty program on Immunefi or HackerOne
   - Start with testnet deployment
   - Gradual rollout to mainnet

3. **Documentation:**
   - Complete NatSpec for all functions
   - Architecture documentation
   - Known limitations and risks
   - User guides

4. **Deployment Strategy:**
   - Deploy to testnet first
   - Extended testing period (2-3 months)
   - Gradual rollout with limits
   - Emergency procedures documented

---

## Conclusion

The Commonality smart contract system is ambitious and well-architected in many ways. The delegation mechanism in `DelegatableNotes.sol` is particularly sophisticated. However, the complexity brings significant security concerns.

**Key Concerns:**
1. DelegatableNotes complexity creates large attack surface
2. Reentrancy risks in multiple contracts
3. Arithmetic overflow potential in critical calculations
4. DoS vectors through gas exhaustion
5. Missing access controls in some functions

**Estimated Security Readiness:** 60%

**Required Before Mainnet:**
- Professional audit: ESSENTIAL
- Comprehensive test suite: ESSENTIAL
- Bug bounty program: HIGHLY RECOMMENDED
- Deployment on testnet for extended period: ESSENTIAL

The code shows good security awareness (ReentrancyGuard, SafeERC20) but needs professional review before handling real value.

---

## Appendix: Tools Recommended

1. **Static Analysis:**
   - Slither
   - Mythril
   - Securify

2. **Formal Verification:**
   - Certora Prover
   - Runtime Verification

3. **Testing:**
   - Foundry (for fuzz testing)
   - Echidna (property-based testing)
   - Hardhat (already in use)

4. **Monitoring:**
   - OpenZeppelin Defender
   - Tenderly
   - Forta Network

---

**Disclaimer:** This audit was performed by an AI assistant and should NOT be considered a substitute for a professional security audit. Multiple professional auditing firms should review this code before any mainnet deployment.
