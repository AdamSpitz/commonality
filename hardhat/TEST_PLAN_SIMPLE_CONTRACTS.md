# Test Plans for Simple Contracts

Quick test plans for Beliefs, Implications, and ProjectAlignment contracts.

## Beliefs Contract Tests

### Test B.1: Set Belief to BELIEVES
```javascript
const [alice] = await ethers.getSigners();
const Beliefs = await ethers.getContractFactory("Beliefs");
const beliefs = await Beliefs.deploy();

const statementId = ethers.encodeBytes32String("test-statement");

// Set belief to BELIEVES (1)
await beliefs.connect(alice).setBelief(statementId, 1);

// Verify
const belief = await beliefs.getBelief(alice.address, statementId);
console.log("Belief is BELIEVES:", belief === 1n); // Expected: true
```

### Test B.2: Set Belief to DISBELIEVES
```javascript
await beliefs.connect(alice).setBelief(statementId, 2);
const belief = await beliefs.getBelief(alice.address, statementId);
console.log("Belief is DISBELIEVES:", belief === 2n); // Expected: true
```

### Test B.3: Reset to NO_OPINION
```javascript
await beliefs.connect(alice).setBelief(statementId, 1);
await beliefs.connect(alice).setBelief(statementId, 0);
const belief = await beliefs.getBelief(alice.address, statementId);
console.log("Belief is NO_OPINION:", belief === 0n); // Expected: true
```

### Test B.4: Reject Invalid Belief State
```javascript
try {
  await beliefs.connect(alice).setBelief(statementId, 3);
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly reverted:", e.message.includes("Invalid belief state"));
}
```

### Test B.5: Batch Set Beliefs
```javascript
const stmt1 = ethers.encodeBytes32String("statement-1");
const stmt2 = ethers.encodeBytes32String("statement-2");
const stmt3 = ethers.encodeBytes32String("statement-3");

await beliefs.connect(alice).setBeliefsInBatch(
  [stmt1, stmt2, stmt3],
  [1, 2, 0] // believes, disbelieves, no opinion
);

console.log("Stmt1:", await beliefs.getBelief(alice.address, stmt1)); // Expected: 1
console.log("Stmt2:", await beliefs.getBelief(alice.address, stmt2)); // Expected: 2
console.log("Stmt3:", await beliefs.getBelief(alice.address, stmt3)); // Expected: 0
```

### Test B.6: Event Emission
```javascript
const tx = await beliefs.connect(alice).setBelief(statementId, 1);
const receipt = await tx.wait();

// Check DirectSupport event was emitted
const event = receipt.logs.find(log => {
  try {
    return beliefs.interface.parseLog(log).name === "DirectSupport";
  } catch (e) {
    return false;
  }
});

console.log("DirectSupport event emitted:", event !== undefined);
```

## Implications Contract Tests

### Test I.1: Attest Basic Implication
```javascript
const [attester] = await ethers.getSigners();
const Implications = await ethers.getContractFactory("Implications");
const implications = await Implications.deploy();

const stmt1 = ethers.encodeBytes32String("statement-1");
const stmt2 = ethers.encodeBytes32String("statement-2");

await implications.connect(attester).attestImplication(stmt1, stmt2);

// Verify attestation exists
const exists = await implications.hasAttestation(attester.address, stmt1, stmt2);
console.log("Attestation exists:", exists); // Expected: true
```

### Test I.2: Cannot Attest Self-Implication
```javascript
const stmt = ethers.encodeBytes32String("statement");

try {
  await implications.connect(attester).attestImplication(stmt, stmt);
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly reverted:", e.message.includes("cannot imply itself"));
}
```

### Test I.3: Cannot Use Zero Statement IDs
```javascript
const stmt = ethers.encodeBytes32String("statement");
const zero = ethers.ZeroHash;

try {
  await implications.connect(attester).attestImplication(zero, stmt);
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly reverted:", e.message.includes("Invalid statement ID"));
}

try {
  await implications.connect(attester).attestImplication(stmt, zero);
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly reverted:", e.message.includes("Invalid statement ID"));
}
```

### Test I.4: Batch Attestations
```javascript
const stmt1 = ethers.encodeBytes32String("statement-1");
const stmt2 = ethers.encodeBytes32String("statement-2");
const stmt3 = ethers.encodeBytes32String("statement-3");
const stmt4 = ethers.encodeBytes32String("statement-4");

await implications.connect(attester).attestImplicationsInBatch(
  [stmt1, stmt2],
  [stmt3, stmt4]
);

console.log("S1→S3:", await implications.hasAttestation(attester.address, stmt1, stmt3)); // true
console.log("S2→S4:", await implications.hasAttestation(attester.address, stmt2, stmt4)); // true
```

### Test I.5: Multiple Attesters Can Attest Same Implication
```javascript
const [attester1, attester2] = await ethers.getSigners();

const stmt1 = ethers.encodeBytes32String("statement-1");
const stmt2 = ethers.encodeBytes32String("statement-2");

await implications.connect(attester1).attestImplication(stmt1, stmt2);
await implications.connect(attester2).attestImplication(stmt1, stmt2);

console.log("Attester1 attested:", await implications.hasAttestation(attester1.address, stmt1, stmt2));
console.log("Attester2 attested:", await implications.hasAttestation(attester2.address, stmt1, stmt2));
```

### Test I.6: Idempotent Attestations
```javascript
const stmt1 = ethers.encodeBytes32String("statement-1");
const stmt2 = ethers.encodeBytes32String("statement-2");

// Attest twice - should work both times
await implications.connect(attester).attestImplication(stmt1, stmt2);
await implications.connect(attester).attestImplication(stmt1, stmt2);

const exists = await implications.hasAttestation(attester.address, stmt1, stmt2);
console.log("Still attested after duplicate:", exists); // Expected: true
```

### Test I.7: Event Emission
```javascript
const stmt1 = ethers.encodeBytes32String("statement-1");
const stmt2 = ethers.encodeBytes32String("statement-2");

const tx = await implications.connect(attester).attestImplication(stmt1, stmt2);
const receipt = await tx.wait();

// Check ImplicationAttestation event
const event = receipt.logs.find(log => {
  try {
    return implications.interface.parseLog(log).name === "ImplicationAttestation";
  } catch (e) {
    return false;
  }
});

console.log("ImplicationAttestation event emitted:", event !== undefined);
```

## ProjectAlignment Contract Tests

### Test P.1: Attest Basic Alignment
```javascript
const [attester] = await ethers.getSigners();
const ProjectAlignment = await ethers.getContractFactory("ProjectAlignment");
const alignment = await ProjectAlignment.deploy();

const projectAddress = "0x1234567890123456789012345678901234567890"; // Dummy address
const statementId = ethers.encodeBytes32String("statement");

await alignment.connect(attester).attestAlignment(projectAddress, statementId);

// Verify attestation exists
const exists = await alignment.hasAttestation(attester.address, projectAddress, statementId);
console.log("Alignment attestation exists:", exists); // Expected: true
```

### Test P.2: Cannot Use Zero Project Address
```javascript
const statementId = ethers.encodeBytes32String("statement");

try {
  await alignment.connect(attester).attestAlignment(ethers.ZeroAddress, statementId);
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly reverted:", e.message.includes("Invalid project address"));
}
```

### Test P.3: Cannot Use Zero Statement ID
```javascript
const projectAddress = "0x1234567890123456789012345678901234567890";

try {
  await alignment.connect(attester).attestAlignment(projectAddress, ethers.ZeroHash);
  console.log("ERROR: Should have reverted!");
} catch (e) {
  console.log("Correctly reverted:", e.message.includes("Invalid statement ID"));
}
```

### Test P.4: Batch Attestations
```javascript
const project1 = "0x1111111111111111111111111111111111111111";
const project2 = "0x2222222222222222222222222222222222222222";
const stmt1 = ethers.encodeBytes32String("statement-1");
const stmt2 = ethers.encodeBytes32String("statement-2");

await alignment.connect(attester).attestAlignmentsInBatch(
  [project1, project2],
  [stmt1, stmt2]
);

console.log("P1→S1:", await alignment.hasAttestation(attester.address, project1, stmt1)); // true
console.log("P2→S2:", await alignment.hasAttestation(attester.address, project2, stmt2)); // true
```

### Test P.5: Multiple Attesters Can Attest Same Project
```javascript
const [attester1, attester2] = await ethers.getSigners();

const projectAddress = "0x1234567890123456789012345678901234567890";
const statementId = ethers.encodeBytes32String("statement");

await alignment.connect(attester1).attestAlignment(projectAddress, statementId);
await alignment.connect(attester2).attestAlignment(projectAddress, statementId);

console.log("Attester1 attested:", await alignment.hasAttestation(attester1.address, projectAddress, statementId));
console.log("Attester2 attested:", await alignment.hasAttestation(attester2.address, projectAddress, statementId));
```

### Test P.6: Idempotent Attestations
```javascript
const projectAddress = "0x1234567890123456789012345678901234567890";
const statementId = ethers.encodeBytes32String("statement");

// Attest twice
await alignment.connect(attester).attestAlignment(projectAddress, statementId);
await alignment.connect(attester).attestAlignment(projectAddress, statementId);

const exists = await alignment.hasAttestation(attester.address, projectAddress, statementId);
console.log("Still attested after duplicate:", exists); // Expected: true
```

### Test P.7: Event Emission
```javascript
const projectAddress = "0x1234567890123456789012345678901234567890";
const statementId = ethers.encodeBytes32String("statement");

const tx = await alignment.connect(attester).attestAlignment(projectAddress, statementId);
const receipt = await tx.wait();

// Check ProjectAlignmentAttestation event
const event = receipt.logs.find(log => {
  try {
    return alignment.interface.parseLog(log).name === "ProjectAlignmentAttestation";
  } catch (e) {
    return false;
  }
});

console.log("ProjectAlignmentAttestation event emitted:", event !== undefined);
```

## Running These Tests

### Option 1: Hardhat Console (Manual)
```bash
npx hardhat console --network hardhat
# Then paste the test code
```

### Option 2: Create Simple Test Script
Create `scripts/test-simple-contracts.js`:
```javascript
import hre from "hardhat";

async function main() {
  console.log("Testing Beliefs contract...");
  // Add test code here

  console.log("Testing Implications contract...");
  // Add test code here

  console.log("Testing ProjectAlignment contract...");
  // Add test code here
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run with:
```bash
npx hardhat run scripts/test-simple-contracts.js
```

## Test Summary

All three contracts (Beliefs, Implications, ProjectAlignment) follow similar patterns:

### Common Test Coverage
- ✅ Basic functionality (set/attest)
- ✅ Batch operations
- ✅ Input validation (zero addresses, invalid values)
- ✅ Idempotent operations
- ✅ Multiple users can interact independently
- ✅ Event emission
- ✅ Query functions work correctly

### Security Notes
- All three contracts are stateless mappers (no fund management)
- No reentrancy risk (no external calls except events)
- No access control needed (anyone can attest/set beliefs)
- Input validation is critical and tested

These contracts are much simpler than DelegatableNotes and present minimal security risk since they don't handle funds.
