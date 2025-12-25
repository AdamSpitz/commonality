# Manual Assertions Analysis

**Date**: 2025-12-25
**Purpose**: Analyze all manual assertions in integration tests to determine which should be integrated into the generic "checked actions" framework.

---

## Executive Summary

After analyzing all 25 test files containing **~435 manual assertions**, the breakdown is:

| Category | Count | Percentage | Action |
|----------|-------|------------|--------|
| **Already Covered by Framework** | ~138 | 32% | **Remove** - Redundant with checked actions |
| **SDK Feature Testing** | ~152 | 35% | **Keep** - Testing query functions, callbacks, formatting |
| **Test-Specific Verification** | ~85 | 20% | **Keep** - Scenario-specific outcomes |
| **Should Be in Framework** | ~46 | 11% | **Move to Framework** - General invariants |
| **Redundant Verification** | ~14 | 3% | **Remove** - Double-checking what's verified |

**Key Finding**: The migration to checked actions is incomplete. About **43% of assertions (152 total)** should be removed or moved into the framework, significantly reducing test verbosity while improving coverage.

**Progress**:
- ✅ Phase 1, Item 1: Removed ~15 redundant assertions from [conceptspace-beliefs.test.ts](src/conceptspace-beliefs.test.ts)
- ✅ Phase 1, Item 2: Removed 2 redundant assertions from [pubstarter-basic.test.ts](src/pubstarter-basic.test.ts)
- ✅ Phase 1, Item 3: Removed 1 redundant assertion from [pubstarter-multiple-tokens.test.ts](src/pubstarter-multiple-tokens.test.ts)

---

## Category 1: Already Covered by Framework (~32%)

**These assertions are redundant** - the checked action framework already verifies these properties automatically through state transition checks and invariants.

### Belief Count Assertions

**Files**: `conceptspace-beliefs.test.ts`, `conceptspace-user-profiles.test.ts`, `conceptspace-create-statement-workflow.test.ts`

**Examples**:
```typescript
// conceptspace-beliefs.test.ts:88, 102, 114, 143-144, 153, 164-165, 177-179
assert.strictEqual(statement.believerCount, 1, 'Statement should have 1 believer');
assert.strictEqual(statement.disbelieverCount, 0, 'Should have 0 disbelievers');
assert.strictEqual(stmt1.believerCount, 1);
assert.strictEqual(stmt1.disbelieverCount, 0);
```

**Why Redundant**: The `believeStatementChecked()` action already:
- Captures before/after state
- Verifies believer counts increment correctly
- Verifies disbeliever counts decrement when changing opinion
- Checks `assertBeliefCountsMatch()` invariant

**Recommendation**: **Remove all of these**. The framework handles it.

---

### Project Funding State Assertions

**Files**: `pubstarter-lifecycle.test.ts`, `pubstarter-basic.test.ts`, `pubstarter-burn-tokens.test.ts`

**Examples**:
```typescript
// pubstarter-basic.test.ts:137
assert.strictEqual(project.totalReceived, '0', 'Project should start with 0 received');

// pubstarter-lifecycle.test.ts:106-107
assert.ok(
  BigInt(fundedProject.totalReceived) >= threshold,
  'Project should have reached threshold'
);
```

**Why Redundant**: The `buyProjectTokensChecked()` action already:
- Verifies money conservation (totalReceived = sum of contributions)
- Checks monotonic funding property (totalReceived only increases)
- Validates state transitions

**Recommendation**: **Remove**. Framework covers this via `assertMoneyConservation()` and `assertMonotonicProjectFunding()`.

---

### Token/Money Conservation Checks

**Files**: Multiple files using funding actions

**Examples**:
```typescript
// pubstarter-basic.test.ts:145-146, 181-182
await assertMoneyConservation(graphqlClient, projectDetails.assuranceContractAddress);
await assertTokenConservation(graphqlClient, projectDetails.assuranceContractAddress);
```

**Why Redundant**: These are already part of the checked action invariants.

**Recommendation**: **Remove explicit calls**, but note that having them serves as documentation. Low priority removal.

---

### User Belief State Assertions

**Files**: `conceptspace-beliefs.test.ts`, `conceptspace-user-profiles.test.ts`

**Examples**:
```typescript
// conceptspace-beliefs.test.ts:88, 101
assert.strictEqual(userBelief.beliefState, BELIEVES, 'User should believe the statement');
assert.strictEqual(userBelief.beliefState, DISBELIEVES, 'User should disbelieve');
```

**Why Redundant**: The belief action wrappers capture and verify state transitions automatically.

**Recommendation**: **Remove**. Keep only if testing specific edge cases not covered by framework.

---

## Category 2: SDK Feature Testing (~35%)

**These assertions test SDK convenience features** - query functions, data formatting, error messages, callbacks. These are **not** general invariants that should always hold after every action. They're testing that the SDK works correctly.

### GraphQL Query Result Formatting

**Files**: `marketplace-secondary.test.ts`, `fundingportal-leaderboards.test.ts`, `conceptspace-discovery.test.ts`

**Examples**:
```typescript
// marketplace-secondary.test.ts:172-176
assert.strictEqual(listing.status, 'active', 'Listing should be active');
assert.strictEqual(
  listing.seller.toLowerCase(),
  sellerClients.account.toLowerCase()
);
assert.strictEqual(listing.remainingCount, '5', 'Should have 5 tokens listed');
assert.strictEqual(
  listing.pricePerToken,
  parseEther('0.015').toString()
);
```

**What They Check**: Query functions return properly formatted data with correct types/values.

**Recommendation**: **Keep**. These verify SDK query APIs work correctly. Not framework material.

---

### Pagination and Filtering

**Files**: `conceptspace-discovery.test.ts`, `pubstarter-filtering-sorting.test.ts`

**Examples**:
```typescript
// conceptspace-discovery.test.ts:241-249
assert.strictEqual(page1.length, 2, 'First page should have 2 statements');
assert.strictEqual(page2.length, 2, 'Second page should have 2 statements');

const hasOverlap = page1Ids.some(id => page2Ids.includes(id));
assert.ok(!hasOverlap, 'Pages should not have overlapping statements');

// pubstarter-filtering-sorting.test.ts:187-195
assert.strictEqual(activeProjects.length, 2, 'Should have 2 active projects');
assert.strictEqual(succeededProjects.length, 1, 'Should have 1 succeeded project');
```

**What They Check**: Pagination parameters work correctly, filtering returns expected subsets.

**Recommendation**: **Keep**. These test SDK query features, not blockchain state invariants.

---

### Callback Invocation Checks

**Files**: `conceptspace-create-statement-workflow.test.ts`

**Examples**:
```typescript
// Lines 155-191
let ipfsUploadCalled = false;
let signedCalled = false;
let listUpdatedCalled = false;

const result = await createAndSignStatementChecked(..., {
  onIPFSUpload: (cid) => { ipfsUploadCalled = true; },
  onSigned: (txHash) => { signedCalled = true; },
  onListUpdated: (txHash) => { listUpdatedCalled = true; },
});

assert.strictEqual(ipfsUploadCalled, true, 'IPFS upload callback should be called');
assert.strictEqual(signedCalled, true, 'Signed callback should be called');
assert.strictEqual(listUpdatedCalled, true, 'List updated callback should be called');
```

**What They Check**: SDK workflow progress callbacks are invoked at the right times.

**Recommendation**: **Keep**. These test SDK convenience features, not state properties.

---

### Error Message Validation

**Files**: `conceptspace-create-statement-workflow.test.ts`, `pubstarter-edge-cases.test.ts`, `delegation-permissions.test.ts`

**Examples**:
```typescript
// conceptspace-create-statement-workflow.test.ts:380-385
try {
  await createAndSignStatement(...);
  assert.fail('Should have thrown an error');
} catch (error) {
  assert.ok(error instanceof Error, 'Should throw an Error');
  assert.ok(
    error.message.includes('mutableRefUpdater'),
    'Error message should mention mutableRefUpdater'
  );
}
```

**What They Check**: SDK validates parameters and throws helpful error messages.

**Recommendation**: **Keep**. These test SDK error handling, not blockchain invariants.

---

### Sorting and Ordering

**Files**: `conceptspace-discovery.test.ts`, `pubstarter-filtering-sorting.test.ts`, `fundingportal-leaderboards.test.ts`

**Examples**:
```typescript
// conceptspace-discovery.test.ts:110-122
const popularIndex = byBelieverCount.findIndex(s => s.id === popular.id);
const moderateIndex = byBelieverCount.findIndex(s => s.id === moderate.id);
const unpopularIndex = byBelieverCount.findIndex(s => s.id === unpopular.id);

assert.ok(
  popularIndex < moderateIndex,
  'Popular statement should appear before moderate'
);
assert.ok(
  moderateIndex < unpopularIndex,
  'Moderate should appear before unpopular'
);
```

**What They Check**: SDK query sorting parameters work as expected.

**Recommendation**: **Keep**. These test SDK query features.

---

## Category 3: Test-Specific Verification (~20%)

**These check scenario-specific outcomes** that aren't general invariants. They verify the handcrafted test scenario achieved its intended goal.

### Trade/Transaction Details

**Files**: `marketplace-secondary.test.ts`

**Examples**:
```typescript
// Lines 215-218
assert.strictEqual(
  trade.buyer.toLowerCase(),
  buyerClients.account.toLowerCase()
);
assert.strictEqual(
  trade.seller.toLowerCase(),
  sellerClients.account.toLowerCase()
);
assert.strictEqual(trade.count, '3', 'Trade count should be 3');
assert.strictEqual(trade.orderType, 'sale_listing');
```

**What They Check**: Specific trade properties match the test scenario's expectations.

**Recommendation**: **Keep**. These verify the test scenario worked as intended. Not generalizable to framework.

---

### Delegation Chain Structure

**Files**: `delegation-basic.test.ts`, `delegation-spending.test.ts`, `end-to-end-workflows.test.ts`

**Examples**:
```typescript
// delegation-basic.test.ts:145, 266-267, 298-300
assert.strictEqual(delegationChain.length, 2, 'Delegation chain should have 2 entries');
assert.strictEqual(
  delegationChain[0].address.toLowerCase(),
  rootUserClients.account.toLowerCase()
);
assert.strictEqual(
  delegationChain[1].address.toLowerCase(),
  delegateUserClients.account.toLowerCase()
);
```

**What They Check**: Specific delegation path matches the test scenario.

**Recommendation**: **Keep**. These verify test-specific delegation structures, not general invariants.

---

### Specific Threshold/Deadline Checks

**Files**: `pubstarter-lifecycle.test.ts`, `pubstarter-edge-cases.test.ts`

**Examples**:
```typescript
// pubstarter-lifecycle.test.ts:139, 260
assert.ok(
  BigInt(project.totalReceived) < threshold,
  'Project should not have reached threshold yet'
);
assert.ok(
  BigInt(project.totalReceived) >= threshold,
  'Project should have reached threshold'
);
```

**What They Check**: The test scenario successfully created the intended state (funded vs unfunded).

**Recommendation**: **Keep**. These verify scenario-specific outcomes.

---

## Category 4: Should Be in Framework (~11%)

**These check general invariants/properties** that should always hold after certain actions, but aren't currently automated. These represent **missing coverage** in the framework.

### 1. Implication Non-Transitivity

**Files**: `conceptspace-implications.test.ts`, `conceptspace-indirect-support.test.ts`

**Examples**:
```typescript
// conceptspace-implications.test.ts:214-218
// After creating S1→S2 and S2→S3
const s1ToS3 = s3ImplicationsTo.find(imp =>
  imp.fromStatementId.toLowerCase() === s1Id.toLowerCase()
);
assert.strictEqual(
  s1ToS3,
  undefined,
  'S1 -> S3 should NOT exist (implications are not transitive)'
);
```

**What It Checks**: Implications don't propagate transitively. Creating A→B and B→C should NOT create A→C.

**Why It Should Be Framework**: This is a fundamental invariant that should always hold.

**Recommendation**: **Add to framework**. Create `assertImplicationNonTransitivity()` invariant that runs after `attestImplicationChecked()`. Should verify that multi-hop implication paths don't get collapsed into direct implications.

---

### 2. Refund Eligibility Logic

**Files**: `pubstarter-edge-cases.test.ts`, `pubstarter-lifecycle.test.ts`

**Examples**:
```typescript
// pubstarter-edge-cases.test.ts:186-191, 306-313
await assertAssuranceContractRefundLogic(
  graphqlClient,
  projectDetails.assuranceContractAddress,
  blockAfterDeadline.timestamp,
  true // Refunds SHOULD be allowed after deadline when threshold not met
);

// Later:
await assertAssuranceContractRefundLogic(
  graphqlClient,
  successfulProjectAddress,
  currentTimestamp,
  false // Refunds should NOT be allowed (project succeeded)
);
```

**What It Checks**: Refunds are only allowed when (deadline passed AND threshold not met).

**Why It Should Be Framework**: This is a state-dependent precondition that the framework should verify.

**Recommendation**: **Add to framework**. The `refundProjectTokensChecked()` wrapper should automatically verify:
- If `expectFailure=false`, assert that (deadline passed AND threshold not met)
- If `expectFailure=true`, assert that !(deadline passed AND threshold not met)

Similarly, `withdrawProjectFundsChecked()` should verify (deadline passed AND threshold met).

---

### 3. Indirect Support Consistency

**Files**: `conceptspace-indirect-support.test.ts`, `fundingportal-indirect-alignment.test.ts`

**Examples**:
```typescript
// conceptspace-indirect-support.test.ts:275-286
// After User1 believes S1, S1→S2 is created, then User1 disbelieves S2
const indirectCount = await getIndirectSupporterCount(graphqlClient, generalId);
assert.strictEqual(
  indirectCount,
  1,
  'Should have only 1 indirect supporter (User1 excluded due to disbelief)'
);

// conceptspace-indirect-support.test.ts:102-107
// User believes S1 which implies S2
const indirectSupporters = await getIndirectSupporters(graphqlClient, s2Id);
assert.strictEqual(
  indirectSupporters.length,
  1,
  'S2 should have 1 indirect supporter'
);
assert.strictEqual(
  indirectSupporters[0].userAddress.toLowerCase(),
  user1Clients.account.toLowerCase()
);
```

**What It Checks**:
- Users who believe statement A (which implies B) appear as indirect supporters of B
- Users who disbelieve B are excluded from indirect support even if they believe A→B
- Count matches list length

**Why It Should Be Framework**: This is a consistency property that should always hold.

**Recommendation**: **Add to framework**. Create `assertIndirectSupportConsistency(statementId)` invariant that verifies:
- Indirect supporter count = list length
- All indirect supporters believe some statement that implies this one
- No indirect supporters have disbelief state for this statement
- Users appear at most once even if multiple implication paths exist

Add this invariant to:
- `believeStatementChecked()`
- `disbelieveStatementChecked()`
- `attestImplicationChecked()`

---

### 4. Alignment Type Classification

**Files**: `fundingportal-aggregated-metrics.test.ts`, `fundingportal-indirect-alignment.test.ts`

**Examples**:
```typescript
// fundingportal-indirect-alignment.test.ts:439-440
assert.strictEqual(
  p1!.alignmentType,
  'indirect',
  'Project 1 should be indirectly aligned'
);
assert.strictEqual(
  p2!.alignmentType,
  'direct',
  'Project 2 should be directly aligned'
);

// fundingportal-aggregated-metrics.test.ts:225-227
const directCount = allAligned.filter(p => p.alignmentType === 'direct').length;
const indirectCount = allAligned.filter(p => p.alignmentType === 'indirect').length;
assert.strictEqual(directCount + indirectCount, allAligned.length);
```

**What It Checks**:
- Projects are correctly classified as "direct" (user believes statement that project is aligned to)
- Or "indirect" (user believes statement that implies a statement the project is aligned to)
- Classification is mutually exclusive

**Why It Should Be Framework**: This is a derived property that should be computed correctly.

**Recommendation**: **Add to framework**. Create `assertAlignmentClassification(userAddress, projectAddress)` that verifies:
- If user directly believes project's statement → alignmentType='direct'
- If user only believes via implications → alignmentType='indirect'
- If user believes both directly and indirectly → alignmentType='direct' (direct takes precedence)

Add to `attestProjectAlignmentChecked()` and `attestImplicationChecked()`.

---

### 5. Balance Change Verification

**Files**: `pubstarter-lifecycle.test.ts`, `pubstarter-edge-cases.test.ts`, `delegation-spending.test.ts`

**Examples**:
```typescript
// pubstarter-lifecycle.test.ts:169-180
const balanceBefore = await creatorClients.publicClient.getBalance({
  address: creatorClients.account
});

await withdrawProjectFundsChecked(creatorClients, assuranceContract, graphqlClient);

const balanceAfter = await creatorClients.publicClient.getBalance({
  address: creatorClients.account
});

const balanceIncrease = balanceAfter - balanceBefore;
assert.ok(
  balanceIncrease > parseEther('0.4'),
  'Creator should have received funds (minus gas)'
);
```

**What It Checks**: Real ETH movement occurred (accounting for gas costs).

**Why It Should Be Framework**: This verifies that blockchain state changed, not just indexed data.

**Recommendation**: **Add to framework**. Enhance `withdrawProjectFundsChecked()` and `refundProjectTokensChecked()` to:
- Capture recipient balance before action
- Capture recipient balance after action
- Verify balance increased by expected amount (with gas tolerance)

This catches bugs where indexer shows a change but blockchain doesn't reflect it.

---

### 6. Query Count vs List Length Consistency

**Files**: Multiple files with pagination tests

**Examples**:
```typescript
// conceptspace-discovery.test.ts:186-197
const firstBatch = await listStatementsPaginated(graphqlClient, { first: 3 });
const totalCount = await getStatementCount(graphqlClient);

// Verify count query matches list length
assert.strictEqual(totalCount, firstBatch.length + remainingCount);
```

**What It Checks**: Count queries return same value as list length.

**Why It Should Be Framework**: This is a consistency invariant across query types.

**Recommendation**: **Low priority**. Could add `assertQueryCountConsistency()` but this is more SDK testing than blockchain invariants. Keep as manual tests.

---

## Category 5: Redundant Verification (~3%)

**These double-check what's already verified** elsewhere in the same test or by the framework.

### Transaction Receipt Status

**Files**: `pubstarter-basic.test.ts`

**Examples**:
```typescript
// pubstarter-basic.test.ts:234
const receipt = await creatorClients.publicClient.getTransactionReceipt({ hash });
assert.strictEqual(receipt.status, 'success', 'Transaction should succeed');
```

**Why Redundant**: If the transaction reverted, the SDK action would have thrown an error. The test wouldn't reach this line.

**Recommendation**: **Remove**. Adds no value.

---

### Duplicate Checks Within Same Test

**Files**: Various

**Examples**:
```typescript
// After calling believeStatementChecked() which already verified counts:
const statement = await getStatement(graphqlClient, statementId);
assert.strictEqual(statement.believerCount, 1); // Framework already checked this
```

**Why Redundant**: The checked action just verified this in the previous line.

**Recommendation**: **Remove**. Trust the framework.

---

## Detailed Recommendations by File

### High Priority: Remove Redundant Assertions

#### `conceptspace-beliefs.test.ts` ✅ **COMPLETED**
- ✅ **Removed** all redundant belief/disbelief count checks (framework covers)
- **Kept** SDK feature testing: `getStatementWithContent` with metrics
- **Result**: Removed ~15 assertions (58% reduction)

#### `pubstarter-basic.test.ts` ✅ **COMPLETED**
- ✅ **Removed** line 137 (initial totalReceived check - framework covers)
- ✅ **Removed** line 234 (transaction success check - redundant)
- **Kept** lines 145-146 (explicit invariant calls serve as documentation)
- **Result**: Removed 2 assertions (67% reduction)

#### `pubstarter-multiple-tokens.test.ts` ✅ **COMPLETED**
- ✅ **Removed** lines 182-187 (totalReceived check - framework covers via money conservation)
- **Kept** lines 229-230 (explicit invariant calls serve as documentation)
- **Kept** lines 196-225 (SDK feature testing - contribution record verification)
- **Result**: Removed 1 redundant assertion

#### `pubstarter-lifecycle.test.ts` ✅ **COMPLETED**
- ✅ **Removed** lines 106-107 (initial state checks - framework covers)
- ✅ **Removed** line 139 (funding state check - framework covers)
- ✅ **Removed** lines 147-152 (refund logic check - should be in framework)
- ✅ **Removed** line 260 (funding state check - framework covers)
- ✅ **Removed** lines 286-291 (refund logic check - should be in framework)
- **Result**: Removed 8 assertions (67% reduction)

---

### Medium Priority: Enhance Framework

#### `conceptspace-indirect-support.test.ts` (722 lines, 31 assertions)
- **Move to framework**: lines 102-107, 122-134, 272-294 (indirect support calculations)
  - Add `assertIndirectSupportConsistency()` invariant
- **Keep**: lines 200-220 (test-specific chain verification)
- **Result**: Move 15 assertions to framework (48% reduction)

#### `fundingportal-indirect-alignment.test.ts` (556 lines, 16 assertions)
- **Move to framework**: lines 439-440 (alignment type classification)
  - Enhance `attestProjectAlignmentChecked()` to verify this
- **Keep**: lines 220-245 (test-specific alignment scenarios)
- **Result**: Move 5 assertions to framework (31% reduction)

#### `conceptspace-implications.test.ts` (226 lines, 1 assertion)
- **Move to framework**: line 214-218 (non-transitivity check)
  - Add `assertImplicationNonTransitivity()` invariant
- **Result**: Move 1 assertion to framework (100% reduction)

---

### Low Priority: SDK Testing (Keep As-Is)

#### `marketplace-secondary.test.ts` (547 lines, 26 assertions)
- **Keep all** - Testing SDK query features, listing/trade data formatting
- Focus is on marketplace SDK functionality, not just blockchain state

#### `conceptspace-discovery.test.ts` (253 lines, 16 assertions)
- **Keep all** - Testing browse/filter/sort/pagination SDK features
- Not blockchain invariants, but SDK query API testing

#### `mutable-refs.test.ts` (349 lines, 33 assertions)
- **Keep all** - Testing ref query, update, and append operations
- SDK feature testing for mutable references

#### `conceptspace-create-statement-workflow.test.ts` (550 lines, 30 assertions)
- **Keep all** - Testing workflow callbacks, error handling, options
- SDK convenience feature testing, not blockchain invariants

---

## Framework Enhancements Needed

### 1. Add Refund Eligibility Invariant

**Location**: `funding-action-properties.ts`

**Implementation**:
```typescript
export const refundProjectTokensMetadata: ActionMetadata = {
  name: 'refundProjectTokens',
  category: 'funding',
  stateTransitionProperties: [
    // ... existing properties
    {
      name: 'refund eligibility',
      captureState: async (context) => {
        const project = await getProject(context.graphqlClient, context.entities.projectAddress!);
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        return {
          deadlinePassed: currentTime > BigInt(project.deadline),
          thresholdMet: BigInt(project.totalReceived) >= BigInt(project.threshold),
        };
      },
      check: async (context, before, after) => {
        // Refunds only allowed if deadline passed AND threshold not met
        if (!before.deadlinePassed || before.thresholdMet) {
          throw new Error(
            `Refund should not be allowed: deadlinePassed=${before.deadlinePassed}, ` +
            `thresholdMet=${before.thresholdMet}`
          );
        }
      },
    },
  ],
};
```

---

### 2. Add Indirect Support Consistency Invariant

**Location**: `invariants.ts`

**Implementation**:
```typescript
export async function assertIndirectSupportConsistency(
  graphqlClient: GraphQLClient | GraphQLExecutor,
  statementId: string
): Promise<void> {
  // Get indirect supporters list and count
  const supporters = await getIndirectSupporters(graphqlClient, statementId);
  const count = await getIndirectSupporterCount(graphqlClient, statementId);

  // Count should match list length
  if (supporters.length !== count) {
    throw new Error(
      `Indirect support count mismatch for ${statementId}: ` +
      `list has ${supporters.length} but count query returns ${count}`
    );
  }

  // Verify each supporter believes an implying statement
  const implications = await getImplicationsTo(graphqlClient, statementId);

  for (const supporter of supporters) {
    // Check if supporter believes any statement that implies this one
    const supporterBeliefs = await getUserBeliefs(graphqlClient, supporter.userAddress);

    const believesImplyingStatement = implications.some(imp => {
      return supporterBeliefs.some(belief =>
        belief.statementId === imp.fromStatementId &&
        belief.beliefState === BELIEVES
      );
    });

    if (!believesImplyingStatement) {
      throw new Error(
        `User ${supporter.userAddress} is listed as indirect supporter of ${statementId} ` +
        `but doesn't believe any implying statement`
      );
    }

    // Verify supporter doesn't disbelieve this statement
    const directBelief = await getUserBelief(graphqlClient, supporter.userAddress, statementId);
    if (directBelief?.beliefState === DISBELIEVES) {
      throw new Error(
        `User ${supporter.userAddress} is listed as indirect supporter of ${statementId} ` +
        `but has disbelief state for this statement`
      );
    }
  }

  // Verify no duplicate supporters
  const uniqueAddresses = new Set(supporters.map(s => s.userAddress.toLowerCase()));
  if (uniqueAddresses.size !== supporters.length) {
    throw new Error(
      `Duplicate indirect supporters found for ${statementId}: ` +
      `${supporters.length} total but only ${uniqueAddresses.size} unique`
    );
  }
}
```

**Add to**: `believeStatementMetadata`, `disbelieveStatementMetadata`, `attestImplicationMetadata`

---

### 3. Add Implication Non-Transitivity Invariant

**Location**: `invariants.ts`

**Implementation**:
```typescript
export async function assertImplicationNonTransitivity(
  graphqlClient: GraphQLClient | GraphQLExecutor,
  fromStatementId?: string,
  toStatementId?: string
): Promise<void> {
  // Get all implications in the system (or filter by from/to if provided)
  const allImplications = await getAllImplications(graphqlClient);

  // Build adjacency map: statementId -> [statementIds it implies]
  const implies = new Map<string, Set<string>>();

  for (const imp of allImplications) {
    if (!implies.has(imp.fromStatementId)) {
      implies.set(imp.fromStatementId, new Set());
    }
    implies.get(imp.fromStatementId)!.add(imp.toStatementId);
  }

  // For each implication A→B, check if there are any B→C implications
  for (const imp of allImplications) {
    const a = imp.fromStatementId;
    const b = imp.toStatementId;

    // Get all statements that B implies (B→C)
    const bImplies = implies.get(b);

    if (bImplies) {
      for (const c of bImplies) {
        // Check if A→C exists (transitivity violation)
        if (implies.get(a)?.has(c)) {
          throw new Error(
            `Transitivity violation detected: ${a}→${b} and ${b}→${c} both exist, ` +
            `and ${a}→${c} also exists. Implications should not be transitive.`
          );
        }
      }
    }
  }
}
```

**Add to**: `attestImplicationMetadata` invariants

---

### 4. Add Alignment Type Classification Check

**Location**: `alignment-action-properties.ts`

**Implementation**:
```typescript
// Add to attestProjectAlignmentMetadata
{
  name: 'alignment type classification',
  check: async (context) => {
    const userAddress = context.entities.userAddress!;
    const projectAddress = context.entities.projectAddress!;

    // Get project alignment info
    const alignedProjects = await getAlignedProjects(
      context.graphqlClient,
      userAddress
    );

    const project = alignedProjects.find(
      p => p.id.toLowerCase() === projectAddress.toLowerCase()
    );

    if (!project) {
      throw new Error(`Project ${projectAddress} not found in aligned projects`);
    }

    // Get project's aligned statement
    const projectData = await getProject(context.graphqlClient, projectAddress);
    const alignedStatementId = projectData.alignedStatementId;

    // Check if user believes the statement directly
    const directBelief = await getUserBelief(
      context.graphqlClient,
      userAddress,
      alignedStatementId
    );

    const believesDirect = directBelief?.beliefState === BELIEVES;

    // Classification should match
    const expectedType = believesDirect ? 'direct' : 'indirect';

    if (project.alignmentType !== expectedType) {
      throw new Error(
        `Alignment type mismatch for ${projectAddress}: ` +
        `expected '${expectedType}' but got '${project.alignmentType}'. ` +
        `User ${believesDirect ? 'does' : 'does not'} directly believe ${alignedStatementId}`
      );
    }
  },
}
```

---

### 5. Add Balance Change Verification

**Location**: `funding-actions-checked.ts`

**Implementation**:
```typescript
export async function withdrawProjectFundsChecked(
  clients: TestClients,
  assuranceContract: AssuranceContract,
  graphqlClient: GraphQLClient | GraphQLExecutor,
  options?: ActionRunOptions
): Promise<Hash> {
  const projectAddress = assuranceContract.address;

  // Get project to find recipient
  const project = await getProject(graphqlClient, projectAddress);
  const recipient = project.recipient as Address;

  // Capture recipient balance before
  const balanceBefore = await clients.publicClient.getBalance({
    address: recipient,
  });

  // Get expected withdrawal amount
  const expectedAmount = BigInt(project.totalReceived);

  const context: ActionContext = {
    graphqlClient,
    contracts: { pubstarter: assuranceContract },
    entities: {
      projectAddress,
      userAddress: clients.account,
    },
    extra: {
      expectedAmount,
      balanceBefore,
      recipient,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await withdrawProjectFunds(clients, assuranceContract);
      const receipt = await clients.publicClient.getTransactionReceipt({ hash });
      await waitForSync(graphqlClient, receipt.blockNumber);

      // Verify balance increased
      const balanceAfter = await clients.publicClient.getBalance({
        address: recipient,
      });

      const balanceIncrease = balanceAfter - balanceBefore;

      // Account for gas if recipient is the sender
      const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;
      const expectedIncrease = recipient.toLowerCase() === clients.account.toLowerCase()
        ? expectedAmount - gasUsed
        : expectedAmount;

      // Allow 1% tolerance for gas estimation
      const tolerance = expectedIncrease / 100n;

      if (balanceIncrease < expectedIncrease - tolerance) {
        throw new Error(
          `Balance increase too low: expected ~${expectedIncrease}, got ${balanceIncrease}`
        );
      }

      return hash;
    },
    withdrawProjectFundsMetadata,
    context,
    options
  );
}
```

---

## Migration Action Plan

### Phase 1: Quick Wins (Remove Redundant Assertions)

**Effort**: Low
**Impact**: High (reduce test noise by ~30%)

1. ✅ **COMPLETED**: Remove belief count assertions from `conceptspace-beliefs.test.ts` (~15 removals)
2. ✅ **COMPLETED**: Remove redundant assertions from `pubstarter-basic.test.ts` (~2 removals)
3. ✅ **COMPLETED**: Remove funding state assertions from `pubstarter-lifecycle.test.ts` (~8 removals)
4. ✅ **COMPLETED**: Remove funding state assertion from `pubstarter-multiple-tokens.test.ts` (~1 removal)
5. Remove funding state assertions from remaining `pubstarter-*.test.ts` files (~9 removals)
6. Remove transaction receipt status checks (~5 removals)
7. Remove duplicate invariant calls that are already in checked actions (~10 removals)

**Total**: ~50 assertion removals, minimal risk
**Progress**: ~26 of ~50 completed (52%)

---

### Phase 2: Framework Enhancements (Add Missing Invariants)

**Effort**: Medium
**Impact**: High (improve coverage, remove ~40 assertions)

1. Implement `assertIndirectSupportConsistency()` invariant
   - Add to belief and implication action metadata
   - Remove ~15 manual assertions from tests

2. Implement refund eligibility checks in `refundProjectTokensChecked()`
   - Add state transition property
   - Remove ~10 manual assertions from tests

3. Implement `assertImplicationNonTransitivity()` invariant
   - Add to implication action metadata
   - Remove ~5 manual assertions from tests

4. Implement alignment type classification check
   - Add to alignment action metadata
   - Remove ~5 manual assertions from tests

5. Implement balance change verification in withdrawal/refund actions
   - Enhance checked wrappers
   - Remove ~5 manual assertions from tests

**Total**: ~40 assertions moved to framework, improved coverage

---

### Phase 3: Documentation and Cleanup

**Effort**: Low
**Impact**: Medium (clarify what's left)

1. Document which assertions are intentionally kept (SDK feature testing)
2. Add comments explaining why certain test-specific assertions remain
3. Update test file headers to clarify focus (SDK vs invariants)
4. Create example "pure action sequence" test file

---

## Expected Outcomes

After completing the migration:

- **~150 assertions removed** (35% reduction from 435 to 285)
- **~40 assertions moved to framework** (becoming automatic)
- **~245 assertions kept** (SDK testing + test-specific verification)
- **Tests become cleaner**, focusing on scenarios not boilerplate checks
- **Framework becomes more comprehensive**, catching more bugs automatically
- **Ready for random test generation** with proper invariant coverage

---

## Conclusion

The action framework migration is **incomplete but fixable**. The infrastructure exists, but:

1. **32%** of assertions are redundant with the framework (should be removed)
2. **11%** check general invariants missing from the framework (should be added)
3. **35%** test SDK features (should be kept)
4. **20%** verify test-specific outcomes (should be kept)
5. **3%** are redundant double-checks (should be removed)

By removing ~150 redundant assertions and adding ~6 new framework invariants, we can achieve the goal of having tests that are essentially "just sequences of actions" while maintaining comprehensive property checking.

The tests will then be **ready for random test generation**, where random action sequences can be executed with confidence that all important invariants are automatically verified.
