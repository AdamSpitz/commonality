# DelegatableNotes Test Plan

This document outlines comprehensive manual and automated tests for the DelegatableNotes contract.

## Quick Manual Testing Guide

You can test the contract manually using Hardhat console:

```bash
npx hardhat console --network localhost
```

### Setup
```javascript
const [alice, bob, charlie] = await ethers.getSigners();
const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
const notes = await DelegatableNotes.deploy();
await notes.waitForDeployment();
const statementId = ethers.encodeBytes32String("test-statement");
```

## Test Categories

### 1. Basic Deposits and Withdrawals

#### Test 1.1: ETH Deposit
```javascript
// Deposit 1 ETH
const tx = await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });
await tx.wait();

// Verify note was created
const note = await notes.notes(1);
console.log("Note owner:", note.owner);
console.log("Note amount:", ethers.formatEther(note.amount));
console.log("Commission:", note.commissionBasisPoints.toString());

// Expected: owner=alice, amount=1.0, commission=0
```

#### Test 1.2: ETH Reclaim
```javascript
// Reclaim the ETH
const balanceBefore = await ethers.provider.getBalance(alice.address);
const tx = await notes.connect(alice).reclaimFunds(1);
const receipt = await tx.wait();
const balanceAfter = await ethers.provider.getBalance(alice.address);

// Expected: Alice gets her 1 ETH back (minus gas)
console.log("Balance increased by ~1 ETH:", ethers.formatEther(balanceAfter - balanceBefore));
```

### 2. Basic Delegation

#### Test 2.1: Full Delegation with Zero Commission
```javascript
// Alice deposits 1 ETH
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });

// Alice delegates to Bob with 0% commission
const tx = await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1.0"), 0);
await tx.wait();

// Verify delegation
const parentNote = await notes.notes(1);
const childNote = await notes.notes(2);

console.log("Parent delegated:", parentNote.delegated); // Expected: true
console.log("Child owner:", childNote.owner === bob.address); // Expected: true
console.log("Child commission:", childNote.commissionBasisPoints.toString()); // Expected: 0
```

#### Test 2.2: Full Delegation with Commission
```javascript
// Alice deposits 1 ETH
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });

// Alice delegates to Bob with 10% commission (1000 basis points)
await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1.0"), 1000);

const childNote = await notes.notes(2);
console.log("Child commission:", childNote.commissionBasisPoints.toString()); // Expected: 1000
```

#### Test 2.3: Subdelegation with Commission Passthrough
```javascript
// Alice → Bob (10%) → Charlie (5%)
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });
await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1.0"), 1000); // 10%
await notes.connect(bob).delegate(2, charlie.address, ethers.parseEther("1.0"), 500); // 5%

const charlieNote = await notes.notes(3);
console.log("Charlie's commission:", charlieNote.commissionBasisPoints.toString()); // Expected: 500

// Try to exceed parent's commission - should fail
try {
  await notes.connect(bob).delegate(2, charlie.address, ethers.parseEther("1.0"), 1500); // 15% > 10%
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly reverted:", e.message.includes("Commission exceeds parent's allowance"));
}
```

#### Test 2.4: Partial Delegation (Chain Splitting)
```javascript
// Alice deposits 10 ETH
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("10.0") });

// Alice delegates 3 ETH to Bob
const result = await notes.connect(alice).delegate.staticCall(1, bob.address, ethers.parseEther("3.0"), 500);
console.log("Split note ID:", result[0].toString());
console.log("Remainder note ID:", result[1].toString());

await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("3.0"), 500);

// Check both chains were created
const splitNote = await notes.notes(result[0]);
const remainderNote = await notes.notes(result[1]);

console.log("Split amount:", ethers.formatEther(splitNote.amount)); // Expected: 3.0
console.log("Remainder amount:", ethers.formatEther(remainderNote.amount)); // Expected: 7.0
console.log("Both owned by Alice:", splitNote.owner === alice.address && remainderNote.owner === alice.address);
```

### 3. Commission Validation

#### Test 3.1: Maximum Commission (50%)
```javascript
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });

// 50% should work
await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1.0"), 5000);
const note = await notes.notes(2);
console.log("50% commission set:", note.commissionBasisPoints.toString() === "5000");
```

#### Test 3.2: Reject Over-50% Commission
```javascript
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });

// 50.01% should fail
try {
  await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1.0"), 5001);
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly reverted:", e.message.includes("Commission too high"));
}
```

### 4. Delegation Chain Management

#### Test 4.1: Get Full Chain
```javascript
// Create 3-level chain: Alice → Bob → Charlie
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });
await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1.0"), 1000);
await notes.connect(bob).delegate(2, charlie.address, ethers.parseEther("1.0"), 500);

const [noteIds, owners] = await notes.getChain(3);
console.log("Chain length:", noteIds.length); // Expected: 3
console.log("Owners (leaf→root):", owners); // Expected: [charlie, bob, alice]
```

#### Test 4.2: Get Depositor
```javascript
// Using chain from 4.1
const depositor = await notes.getDepositor(3);
console.log("Depositor is Alice:", depositor === alice.address); // Expected: true
```

#### Test 4.3: Revoke Delegation
```javascript
// Alice revokes Bob's delegation to Charlie
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });
await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1.0"), 1000);
await notes.connect(bob).delegate(2, charlie.address, ethers.parseEther("1.0"), 500);

// Alice revokes from the leaf (Charlie's note)
await notes.connect(alice).revoke(3);

const aliceNote = await notes.notes(1);
const bobNote = await notes.notes(2);
const charlieNote = await notes.notes(3);

console.log("Alice note undelegated:", !aliceNote.delegated); // Expected: true
console.log("Bob note deleted:", bobNote.owner === ethers.ZeroAddress); // Expected: true
console.log("Charlie note deleted:", charlieNote.owner === ethers.ZeroAddress); // Expected: true
```

#### Test 4.4: Prevent Circular Delegation
```javascript
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });
await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1.0"), 0);

// Bob tries to delegate back to Alice - should fail
try {
  await notes.connect(bob).delegate(2, alice.address, ethers.parseEther("1.0"), 0);
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly prevented circular delegation:", e.message.includes("Circular delegation"));
}
```

### 5. Commission Accrual and Claiming

**Note:** Testing commission accrual requires deploying ERC1155Seller or ERC1155Marketplace contracts and executing purchases. This is more complex - see Integration Tests section below.

#### Test 5.1: View Accrued Commission (Initially Zero)
```javascript
const commission = await notes.getAccruedCommission(
  alice.address,
  ethers.ZeroAddress, // ETH
  0, // TokenType.ERC20
  0  // tokenId (unused for ETH)
);
console.log("Initial commission is zero:", commission.toString() === "0"); // Expected: true
```

#### Test 5.2: Reject Claiming with No Commission
```javascript
try {
  await notes.connect(alice).claimCommission(ethers.ZeroAddress, 0, 0);
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly reverted:", e.message.includes("No commission to claim"));
}
```

### 6. Edge Cases

#### Test 6.1: Cannot Delegate to Zero Address
```javascript
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });

try {
  await notes.connect(alice).delegate(1, ethers.ZeroAddress, ethers.parseEther("1.0"), 0);
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly reverted:", e.message.includes("Cannot delegate to zero address"));
}
```

#### Test 6.2: Cannot Delegate Already Delegated Note
```javascript
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });
await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1.0"), 0);

try {
  await notes.connect(alice).delegate(1, charlie.address, ethers.parseEther("1.0"), 0);
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly reverted:", e.message.includes("Note already delegated"));
}
```

#### Test 6.3: Non-Owner Cannot Delegate
```javascript
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });

try {
  await notes.connect(bob).delegate(1, charlie.address, ethers.parseEther("1.0"), 0);
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly reverted:", e.message.includes("Not the note owner"));
}
```

#### Test 6.4: Cannot Reclaim Delegated Note
```javascript
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });
await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1.0"), 0);

try {
  await notes.connect(alice).reclaimFunds(1);
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly reverted:", e.message.includes("Cannot reclaim from delegated"));
}
```

## Integration Tests (Requires Full Setup)

These tests require deploying additional contracts:

### Setup for Integration Tests
```javascript
// Deploy ERC1155Seller
const Seller = await ethers.getContractFactory("ERC1155Seller");
const seller = await Seller.deploy();

// Deploy a project NFT contract
const Project = await ethers.getContractFactory("PremintingERC1155");
const project = await Project.deploy(
  alice.address,
  "https://example.com/{id}.json",
  "https://example.com/contract.json"
);

// Mint some project tokens
await project.mintBatch(await seller.getAddress(), [1, 2], [100, 50]);

// Set prices
await seller.connect(alice).setPrices(
  await project.getAddress(),
  [1, 2],
  [ethers.parseEther("0.1"), ethers.parseEther("0.2")]
);
```

### Test I.1: Commission Accrual on Purchase
```javascript
// Create delegation chain with commissions
// Alice → Bob (10%) → Charlie (5%)
await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1.0") });
await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("1.0"), 1000); // 10%
await notes.connect(bob).delegate(2, charlie.address, ethers.parseEther("1.0"), 500); // 5%

// Charlie purchases NFTs using the delegated note
const noteId = 3;
await notes.connect(charlie).purchaseFromERC1155Seller(
  [noteId],
  await seller.getAddress(),
  await project.getAddress(),
  [1], // token IDs
  [1]  // counts
);

// Check Bob's accrued commission (should be 10% of 0.1 ETH = 0.01 ETH)
const bobCommission = await notes.getAccruedCommission(bob.address, ethers.ZeroAddress, 0, 0);
console.log("Bob's commission:", ethers.formatEther(bobCommission)); // Expected: ~0.01

// Check Charlie's accrued commission (should be 5% of 0.1 ETH = 0.005 ETH)
const charlieCommission = await notes.getAccruedCommission(charlie.address, ethers.ZeroAddress, 0, 0);
console.log("Charlie's commission:", ethers.formatEther(charlieCommission)); // Expected: ~0.005
```

### Test I.2: Claim Commission
```javascript
// Using accrued commissions from I.1

// Bob claims his commission
const bobBalanceBefore = await ethers.provider.getBalance(bob.address);
const tx = await notes.connect(bob).claimCommission(ethers.ZeroAddress, 0, 0);
await tx.wait();
const bobBalanceAfter = await ethers.provider.getBalance(bob.address);

console.log("Bob received ~0.01 ETH:", ethers.formatEther(bobBalanceAfter - bobBalanceBefore));

// Verify commission is now zero
const bobCommissionAfter = await notes.getAccruedCommission(bob.address, ethers.ZeroAddress, 0, 0);
console.log("Bob's commission cleared:", bobCommissionAfter.toString() === "0");
```

## Automated Test Summary

The following test scenarios should be covered in automated tests (when test framework is set up):

### Critical Path Tests
- ✅ ETH deposit and withdrawal
- ✅ ERC20 deposit and withdrawal
- ✅ Full delegation with and without commission
- ✅ Partial delegation (chain splitting)
- ✅ Multi-level subdelegation
- ✅ Commission validation (0%, 50%, >50%)
- ✅ Subdelegate commission limits
- ✅ Delegation revocation
- ✅ Circular delegation prevention

### Commission Tests
- ✅ Commission accrual on note spending
- ✅ Commission claiming (ETH, ERC20, ERC1155)
- ✅ Multiple commissions accumulating
- ✅ Commission preserved through chain splitting

### Edge Cases
- ✅ Zero-value operations
- ✅ Maximum values (50% commission)
- ✅ Access control (only owner can delegate/reclaim)
- ✅ State transitions (cannot delegate already-delegated note)
- ✅ Invalid inputs (zero address, insufficient amount)

### Helper Function Tests
- ✅ getDepositor()
- ✅ getChain()
- ✅ validateNotesCompatible()
- ✅ getAccruedCommission()

## Security Checklist

- ✅ Reentrancy protection (ReentrancyGuard on all external calls)
- ✅ Checks-effects-interactions pattern (state changes before external calls)
- ✅ Access control (onlyNoteOwner modifier)
- ✅ Integer overflow protection (Solidity 0.8+)
- ✅ Proper use of SafeERC20
- ✅ Commission limits (max 50%)
- ✅ Circular delegation prevention
- ⚠️ TODO: Gas optimization review
- ⚠️ TODO: Professional audit before mainnet

## Performance Notes

### Gas Considerations
- Chain splitting creates 2N new notes (where N = chain length)
- Revocation deletes all child notes in the chain
- Commission accrual loops through all chain members
- Consider gas limits for very long delegation chains (100+ levels)

### Recommendations
- Document recommended maximum chain depth (e.g., 10-20 levels)
- Add chain depth getter function if needed for UI warnings
- Monitor gas costs in production

## Next Steps

1. Set up proper test framework (Foundry recommended)
2. Implement all manual tests as automated tests
3. Add integration tests with ERC1155Seller/Marketplace
4. Gas optimization pass
5. Security audit
6. Deployment scripts for testnet
7. Frontend integration testing
