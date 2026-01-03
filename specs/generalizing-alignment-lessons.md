# Lessons Learned: Generalizing ProjectAlignment Attestations

## Overview

This document captures lessons learned from generalizing the ProjectAlignment contract from project-specific attestations to general alignment attestations. The task involved:
- Adding a `topicStatementId` field for indexer filtering
- Changing `projectAddress` (address) to `target` (bytes32) to support any target type
- Updating the entire stack: contract, tests, indexer, SDK, and integration tests

## Why This Was Tricky

### 1. The Dual Query System Problem

**The Issue:** The codebase has TWO different query systems that coexist:
- `sdk/src/queries/` - Direct Ponder indexer queries (older system)
- `sdk/src/graphql-queries/` - GraphQL-based queries through a local executor (newer system)

**What Went Wrong:** Initial implementation completely rewrote `sdk/src/graphql-queries/funding-portals.ts`, removing complex query functions (`getTotalFundingForCause`, `getAllAlignedProjectsForCause`, etc.) that integration tests depended on. This broke the build immediately.

**The Fix:** Don't rewrite files - just modify what needs changing. Re-export missing functions from the old query system until they can be properly migrated.

### 2. Case Sensitivity with bytes32 Padding

**The Issue:** The `viem.pad()` function preserves address case (checksum format), but initial implementation tried manual padding with `.toLowerCase()`.

**What Went Wrong:**
- Contract events emit checksummed addresses in the target field
- Manual lowercasing in queries but not in indexer handler
- Query mismatches because stored data didn't match query format

**The Fix:**
1. Use `viem.pad()` consistently - never manually pad addresses
2. Normalize to lowercase **immediately** when storing in the indexer
3. Normalize to lowercase **when querying** to ensure matches

```typescript
// In indexer handler:
const normalizedTarget = target.toLowerCase() as `0x${string}`;

// In query function:
const target = pad(projectAddress as `0x${string}`, { size: 32 }).toLowerCase();
```

### 3. Ponder's Composite Primary Key Querying

**The Issue:** Ponder's auto-generated GraphQL doesn't support querying composite keys directly.

**What Went Wrong:** Initial implementation tried:
```graphql
projectAlignment(attester: $attester, target: $target, statementId: $statementId)
```

This doesn't work for composite primary keys in Ponder.

**The Fix:** Use `where` clauses for composite keys:
```graphql
projectAlignments(where: {
  attester: $attester
  target: $target
  statementId: $statementId
})
```

### 4. Schema Migration Without Database Reset

**The Issue:** Changed the primary key from `(attester, projectAddress, statementId)` to `(attester, target, statementId)` but the indexer database had stale data with the old schema.

**What Went Wrong:** Integration tests were running against an existing database with the old schema structure, causing mysterious query failures even after code was "correct."

**The Critical Missing Step:** Should have deleted the indexer database after changing the schema.

## Recommended Approach for Future Schema Changes

### Step 1: Start with a Clean Slate
```bash
# Delete the indexer database to force schema regeneration
rm -rf indexer/.ponder
```

### Step 2: Update Contract First
- Modify the Solidity contract
- Run hardhat tests immediately to verify contract works in isolation
- Don't proceed until all hardhat tests pass

```bash
cd hardhat && npx hardhat test test/ProjectAlignment.test.js
```

### Step 3: Update ABIs and Rebuild
```bash
cd hardhat && npx hardhat compile
# The ABI is auto-generated in artifacts/
# Copy to indexer manually or use an export script
```

### Step 4: Update Indexer Schema AND Handler Together
- Modify `indexer/schemas/fundingportal.schema.ts`
- Modify `indexer/src/fundingportal/index.ts`
- Keep these changes minimal and focused
- **Test the indexer in isolation** before touching SDK

**Key Pattern:** When changing field types (e.g., address → bytes32):
1. Add the new field to the schema
2. Keep the old field for backward compatibility (derived from new field)
3. Normalize values consistently (lowercase for case-insensitive matching)

Example:
```typescript
export const projectAlignments = onchainTable(
  "fundingportal_project_alignments",
  (t) => ({
    attester: t.hex().notNull(),
    target: t.hex().notNull(),  // New field
    projectAddress: t.hex().notNull(), // Derived for backward compatibility
    statementId: t.hex().notNull(),
    topicStatementId: t.hex().notNull(),
    // ... timestamps
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.attester, table.target, table.statementId],
    }),
    // Keep old indexes for backward compatibility
    projectIdx: index().on(table.projectAddress, table.attester),
  })
);
```

### Step 5: Update SDK Actions (Write Path)
- Update `sdk/src/actions/funding-portals-actions.ts`
- These are straightforward - just change function signatures
- Add helper functions for conversions (e.g., `addressToBytes32`)
- Make new parameters optional with sensible defaults for backward compatibility

**Key Pattern:** Use viem utilities consistently:
```typescript
import { pad } from 'viem';

export function addressToBytes32(address: Address): `0x${string}` {
  return pad(address, { size: 32 });
}
```

### Step 6: Find and Update ALL Query Functions (Read Path)
```bash
# Find all query functions that use the old fields
grep -r "projectAddress" sdk/src --include="*.ts" | grep -v node_modules
grep -r "ProjectAlignment" sdk/src --include="*.ts" | grep -v node_modules
```

- Update each query function incrementally
- **Don't delete or rewrite entire files** - just modify what's needed
- Check BOTH query systems (`queries/` and `graphql-queries/`)
- Update GraphQL type definitions AND resolvers

**Key Pattern for GraphQL Queries:**
```typescript
// Use where clauses for composite keys
const result = await executeQuery<{ projectAlignments: { items: ProjectAlignment[] } }>(
  executor,
  `
    query GetProjectAlignment($attester: String!, $target: String!, $statementId: String!) {
      projectAlignments(
        where: {
          attester: $attester
          target: $target
          statementId: $statementId
        }
      ) {
        items {
          attester
          target
          projectAddress
          statementId
          topicStatementId
        }
      }
    }
  `,
  { attester, target: target.toLowerCase(), statementId }
);

return result.projectAlignments.items[0] || null;
```

### Step 7: Run Tests Incrementally
```bash
# Test contract changes
npm run hardhat:test

# Delete indexer DB for fresh schema
rm -rf indexer/.ponder

# Test specific alignment tests first
cd integration-tests && npx mocha src/fundingportal/fundingportal-alignment.test.ts

# Then run all integration tests
npm run integration-tests

# Finally run everything
npm run test
```

## Critical Checklist

Before claiming a schema change is complete:

- [ ] Contract updated and all hardhat tests pass
- [ ] Indexer database deleted (`rm -rf indexer/.ponder`)
- [ ] Indexer schema updated with new fields
- [ ] Indexer event handler updated with normalization
- [ ] All SDK action functions updated
- [ ] All query functions in BOTH systems updated
- [ ] GraphQL type definitions updated
- [ ] GraphQL resolvers updated
- [ ] Backward compatibility maintained where possible
- [ ] Integration tests run against fresh database

## Key Principles

1. **Normalize Early, Normalize Consistently**
   - Lowercase bytes32 values when storing
   - Lowercase bytes32 values when querying
   - Use viem utilities for all conversions

2. **Maintain Backward Compatibility**
   - Keep derived fields (e.g., `projectAddress` derived from `target`)
   - Make new parameters optional with defaults
   - Keep old indexes alongside new ones

3. **Test Incrementally**
   - Contract tests first (fast feedback)
   - Delete stale databases before integration tests
   - Run targeted tests before full suite

4. **Don't Rewrite, Modify**
   - Resist the urge to clean up/refactor during schema changes
   - Just make the minimal changes needed
   - Leave refactoring for a separate PR

5. **Understand the Query Layer**
   - Know which query system you're using
   - Update both if both exist
   - Understand Ponder's GraphQL query syntax for composite keys

## Common Pitfalls to Avoid

❌ Manually padding addresses with string concatenation
✅ Use `viem.pad()` consistently

❌ Rewriting entire query files
✅ Make minimal surgical changes

❌ Forgetting to lowercase normalized values
✅ Normalize immediately and consistently

❌ Using direct field access for composite keys in Ponder GraphQL
✅ Use `where` clauses

❌ Running tests against stale database after schema changes
✅ Delete indexer database before testing

❌ Changing too many things at once
✅ Update one layer at a time, test, then move to next layer

## Example: Address to bytes32 Conversion Pattern

When converting an address field to bytes32:

```typescript
// SDK Action (Write)
import { pad } from 'viem';

const target = pad(projectAddress, { size: 32 });
// Pass to contract: [target, statementId, topicStatementId]

// Indexer Handler (Store)
const normalizedTarget = target.toLowerCase() as `0x${string}`;
const projectAddress = ('0x' + target.slice(-40).toLowerCase()) as `0x${string}`;

await context.db.insert(projectAlignments).values({
  attester,
  target: normalizedTarget,
  projectAddress, // Backward compatibility
  statementId,
  topicStatementId,
  // ...
});

// Query Function (Read)
import { pad } from 'viem';

const target = pad(projectAddress as `0x${string}`, { size: 32 }).toLowerCase();

const result = await executeQuery(
  executor,
  `query($attester: String!, $target: String!, $statementId: String!) {
    projectAlignments(where: { attester: $attester, target: $target, statementId: $statementId }) {
      items { ... }
    }
  }`,
  { attester, target, statementId }
);
```

## Summary

The key to successfully generalizing a schema:
1. **Clean database** before testing schema changes
2. **Normalize consistently** (lowercase bytes32)
3. **Use viem utilities** for all conversions
4. **Test incrementally** (contract → indexer → SDK → integration)
5. **Maintain backward compatibility** where possible
6. **Don't rewrite** - make minimal surgical changes

Following these principles should make similar schema changes much smoother.
