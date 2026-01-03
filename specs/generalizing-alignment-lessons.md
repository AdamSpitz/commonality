# Lessons Learned: Generalizing ProjectAlignment Attestations

## Overview

This document captures lessons learned from generalizing the ProjectAlignment contract from project-specific attestations to general alignment attestations. The task involved:
- Adding a `topicStatementId` field for indexer filtering
- Changing `projectAddress` (address) to `target` (bytes32) to support any target type
- Updating the entire stack: contract, tests, indexer, SDK, and integration tests

## Why This Task Is Deceptively Difficult

On the surface, this seems like a straightforward schema change: rename a field, change its type, add a new field. In a typical monolithic application with a single database and ORM, this would indeed be simple. However, this codebase has a unique architecture that makes schema changes exponentially more complex:

### 1. Multi-Layer Architecture with No Single Source of Truth

The data flows through 6+ disconnected layers:
- **Solidity Contract** → emits events with field structure
- **Hardhat Tests** → test contract in isolation
- **Indexer Schema** → defines database structure
- **Indexer Handler** → processes events and stores data
- **SDK Actions** → writes data to contract
- **SDK Queries** (2 systems!) → reads data from indexer
- **Integration Tests** → tests entire stack end-to-end

Each layer must be updated independently and must stay perfectly in sync. There's no compiler or type system that spans all layers.

### 2. Docker Containerization Amplifies Complexity

The indexer runs in Docker, which adds:
- **Build cache invalidation issues** - changes don't propagate without explicit rebuilds
- **Volume persistence** - databases persist across container restarts
- **Layer caching** - Docker aggressively caches intermediate layers
- **No hot reload** - must restart containers to pick up changes

### 3. No Established Normalization Pattern

The codebase doesn't have a consistent pattern for handling:
- Case sensitivity (checksum addresses vs lowercase)
- bytes32 padding and conversion
- When to normalize (at write time? read time? both?)

This meant every decision about normalization had to be made from scratch.

### 4. Async Indexing Without Sync Points

Integration tests make on-chain changes and immediately query the indexer, but:
- Events must be emitted from contract
- Indexer must process events
- Database must be updated
- GraphQL schema must regenerate
- Query must execute

There's no built-in way to wait for "indexer caught up to block N" before querying.

### 5. Limited Visibility Into Middle Layers

When tests fail, the error is just "alignment not found." There's no easy way to:
- See what the indexer received from the contract
- Check what was stored in the database
- Verify the GraphQL schema regenerated correctly
- Debug the query execution

---

## Why This Was Tricky (Attempt #1)

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

---

## What Went Wrong in Attempt #2

Attempt #2 followed the lessons from Attempt #1. The contract was updated correctly (all 242 hardhat tests passed), the indexer schema was updated, ABIs were synced, and SDK functions were updated. Yet 15 integration tests still failed with "Alignment should exist after attestation."

Here's what actually went wrong:

### The Normalization Inconsistency Trap

**The Problem:** The code went through multiple iterations of adding and removing `.toLowerCase()` calls:
1. First: "Use viem.pad(), it handles checksumming correctly"
2. Then: "Wait, queries don't match - lowercase everything in the indexer"
3. Then: "Queries still don't match - lowercase everything in queries too"
4. Then: "Maybe we shouldn't lowercase at all"
5. Finally: "No, lowercase EVERYTHING"

**What Actually Happened:** Each iteration only partially updated the normalization strategy. The indexer handler might have been lowercasing, but the query functions weren't, or vice versa. Or Docker was serving a cached version that didn't have the latest normalization code.

**The Real Issue:** Without visibility into what was actually stored in the database vs what was being queried, it was impossible to verify whether the normalization was the real problem or just a red herring.

### Docker Build Cache Hell

**The Problem:** The indexer runs in Docker. When code changes were made to the indexer handler, they didn't take effect because:

1. `docker-compose up` uses cached images by default
2. `docker-compose build` uses layer caching
3. `docker-compose build --no-cache` rebuilds everything but still uses volumes
4. The database lives in a Docker volume that persists across rebuilds

**What Actually Happened:**
- Made changes to `indexer/src/fundingportal/index.ts` (added normalization)
- Ran `docker-compose build` (thought this would pick up changes)
- Ran integration tests
- Tests still failed
- Made MORE changes thinking the first changes didn't work
- Reality: First changes never got deployed because Docker was using cached image

**The Diagnostic Failure:** Without running `docker-compose build --no-cache` AND `docker-compose down -v` (to delete volumes) after EVERY change, there was no way to know if code changes were actually being tested or if old code was still running.

### The Database Schema Migration Black Hole

**The Problem:** Changed the primary key from `(attester, projectAddress, statementId)` to `(attester, target, statementId)`.

**What Ponder Does:**
- On startup, Ponder checks if the database schema matches the code schema
- If it matches, it uses the existing database
- If it doesn't match in certain ways, it regenerates
- But it's not always clear what triggers regeneration

**What Actually Happened:**
1. Changed schema in code
2. Restarted indexer (maybe via Docker, maybe via `docker-compose restart`)
3. Indexer started successfully (no errors)
4. Tests queried the database
5. Queries failed because the database was still using the OLD schema

**Why This Happened:** The database file in `indexer/.ponder` or in the Docker volume had the old schema. Ponder didn't detect a conflict that required regeneration. New events were being indexed into the wrong schema structure.

**The Diagnostic Failure:** There was no clear signal that "database schema is stale." Ponder didn't error, tests didn't error until the query phase, and there was no way to inspect the actual database schema without manually connecting to the SQLite file.

### The Integration Test Timing Problem

**The Problem:** Integration tests do this:
```javascript
// Attest alignment
await attestProjectAlignment(...)
await mineBlock()  // Force block to be mined

// Immediately query
const alignment = await getProjectAlignment(...)
expect(alignment).to.not.be.null  // FAILS
```

**What Should Happen:**
1. Transaction mined
2. Event emitted
3. Indexer sees event
4. Indexer processes event
5. Database updated
6. Query executes
7. Test passes

**What Might Be Happening:**
- Steps 3-5 are asynchronous
- Test queries before indexer finishes processing
- Query returns null because data isn't in database yet
- Test fails

**The Diagnostic Failure:** There's no built-in way to say "wait until indexer has processed up to block N." Tests just have a small delay (`await new Promise(r => setTimeout(r, 1000))`) which might not be enough if the indexer is slow to start or process events.

### The ABI Sync Confusion

**The Problem:** The contract ABI lives in multiple places:
- `hardhat/artifacts/contracts/.../ProjectAlignment.json` (auto-generated by Hardhat)
- `indexer/abis/ProjectAlignment.json` (manually copied or auto-synced?)
- `sdk/src/abis/` (used by SDK actions)

**What Went Wrong:**
1. Updated contract
2. Ran `npx hardhat compile` (regenerated ABI in artifacts/)
3. Updated indexer config to point to new ABI
4. Tests still failed
5. Realized: Did we actually copy the new ABI to the indexer?

**The Diagnostic Failure:** There's no automatic validation that all ABI copies are in sync. The indexer could be using an old ABI that doesn't have `topicStatementId`, causing it to silently fail to index that field.

### Why We Couldn't Diagnose The Root Cause

After all these potential issues, we still don't know which one(s) actually caused the tests to fail. Here's why:

1. **No Logging in Indexer Handler:** Can't see what data the indexer received from events
2. **No Database Inspection Tool:** Can't easily check what's stored in the SQLite database
3. **No Schema Validator:** Can't verify the database schema matches the code schema
4. **No Normalization Validator:** Can't verify data is normalized consistently
5. **No Sync Point in Tests:** Can't wait for "indexer caught up to block N"
6. **Docker Opacity:** Can't easily tell if code changes are deployed vs cached

**The Real Problem:** The debugging process became "try changing X, rebuild everything, run tests, see if it works." With a 5-10 minute feedback loop per iteration, this is unsustainable.

### The Real Lessons From Attempt #2

1. **Feedback Loops Must Be Fast and Visible**
   - Can't debug what you can't see
   - Need logging in every layer
   - Need database inspection tools
   - Need schema validators

2. **Docker Requires Explicit Cache Busting**
   - `docker-compose build` is not enough
   - Must use `--no-cache` to truly rebuild
   - Must use `docker-compose down -v` to delete volumes
   - Must verify containers are actually using new code (check logs, timestamps)

3. **Schema Migrations Need Explicit Steps**
   - Delete database file before testing schema changes
   - Verify schema regenerated correctly
   - Don't trust that "no error" means "worked correctly"

4. **Normalization Must Be Decided Up Front**
   - Pick ONE strategy: lowercase everything, or preserve checksumming
   - Apply it EVERYWHERE: indexer, queries, tests
   - Add validators to ensure consistency

5. **Async Systems Need Sync Points**
   - Tests should wait for indexer to catch up
   - Add a "waitForBlock(n)" helper that polls indexer status
   - Don't rely on fixed delays

---

## Architectural Problems Revealed

This task revealed some deeper architectural issues:

### 1. No Type Safety Across Layers

Changes to the contract require manual updates to:
- Indexer schema (no auto-generation from contract)
- SDK types (no auto-generation from contract or indexer)
- Query functions (no type-checking against indexer schema)

**Ideal Solution:** Generate TypeScript types from the contract ABI, use them throughout the stack.

### 2. No Database Migration System

When schema changes, there's no migration system like Django/Rails/Prisma. Just "delete the database and start over."

**Problem:** This works for development but not for production.

**Ideal Solution:** Add a proper migration system (or use Ponder's migration features if they exist).

### 3. Dual Query Systems

Having two query systems (`queries/` and `graphql-queries/`) means:
- Must update both for every schema change
- Easy to forget one
- No warning if they get out of sync

**Ideal Solution:** Pick one query system and deprecate the other.

### 4. Docker Development Experience

Docker is great for production but painful for development when:
- Hot reload doesn't work
- Build caching is too aggressive
- Volume persistence causes stale data
- Logs are hard to access

**Ideal Solution:** Use local development mode (non-Docker) for faster iteration, Docker only for integration tests and production.

---

## Updated Critical Checklist

Before claiming a schema change is complete:

- [ ] **Contract updated and all hardhat tests pass**
- [ ] **ABIs synced to ALL locations** (verify with `diff` command)
- [ ] **Docker images rebuilt with `--no-cache`**
  ```bash
  docker-compose down -v  # Delete volumes
  docker-compose build --no-cache
  ```
- [ ] **Indexer database deleted**
  ```bash
  rm -rf indexer/.ponder  # Local
  docker-compose down -v  # Docker volumes
  ```
- [ ] **Indexer schema updated with new fields**
- [ ] **Indexer event handler updated with normalization**
- [ ] **Normalization strategy documented and applied everywhere**
- [ ] **All SDK action functions updated**
- [ ] **All query functions in BOTH systems updated**
- [ ] **GraphQL type definitions updated**
- [ ] **GraphQL resolvers updated**
- [ ] **Integration tests have proper wait/sync logic**
- [ ] **Manual verification that data is being stored correctly** (check database directly)
- [ ] **Manual verification that queries are matching correctly** (check query results)

---

## Recommended Fix Strategy (For Attempt #3)

If rolling back and trying again, here's the recommended approach:

### Phase 1: Diagnostic Infrastructure (Do This FIRST)

Before making any changes, add diagnostic tools:

1. **Add logging to indexer handler**
   ```typescript
   console.log('Received event:', { attester, target, statementId, topicStatementId });
   console.log('Storing normalized:', {
     attester: normalizedAttester,
     target: normalizedTarget,
     statementId: normalizedStatementId
   });
   ```

2. **Add database inspection script**
   ```bash
   # Script to query SQLite database directly
   sqlite3 indexer/.ponder/ponder.db "SELECT * FROM fundingportal_project_alignments;"
   ```

3. **Add sync helper for integration tests**
   ```typescript
   async function waitForIndexerSync(blockNumber: number) {
     // Poll indexer until it's processed up to blockNumber
   }
   ```

4. **Add ABI sync validator**
   ```bash
   # Script to verify all ABIs are identical
   diff hardhat/artifacts/.../ProjectAlignment.json indexer/abis/ProjectAlignment.json
   ```

### Phase 2: Clean Slate

```bash
# Delete ALL cached state
rm -rf indexer/.ponder
docker-compose down -v
docker-compose build --no-cache
rm -rf hardhat/cache hardhat/artifacts
cd hardhat && npx hardhat clean
```

### Phase 3: Update Contract (With Verification)

1. Update Solidity contract
2. Run `npx hardhat test` - must pass
3. Run `npx hardhat compile`
4. Verify ABI was generated
5. Copy ABI to all required locations
6. Run ABI sync validator

### Phase 4: Update Indexer (With Verification)

1. Update schema
2. Update handler with logging
3. **Choose normalization strategy** - document it
4. Delete database
5. Build Docker with `--no-cache`
6. Start indexer
7. Check logs to verify startup
8. Manually trigger a test event
9. Check indexer logs to see event received
10. Check database to see data stored
11. Verify normalization was applied

### Phase 5: Update SDK (With Verification)

1. Update action functions
2. Update query functions in BOTH systems
3. Add normalization matching indexer strategy
4. Write unit tests for conversion helpers
5. Test queries against the manually-triggered event from Phase 4

### Phase 6: Update Integration Tests (With Sync Logic)

1. Add `waitForIndexerSync()` helper
2. Update tests to use new sync logic
3. Run ONE test first
4. Verify it passes
5. Check logs, database, queries
6. Only then run full suite

### Phase 7: Verify Everything

1. Run hardhat tests - should pass
2. Run integration tests - should pass
3. Check database manually - data should be there
4. Check queries manually - should return data
5. Check logs - should show events being processed
6. Run `npm run test` - should pass

### Phase 8: Document What Worked

Add to this file:
- Which normalization strategy was chosen
- What the sync points look like
- How to verify changes are deployed
- How to inspect the database

---

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

## Critical Checklist (Original - See Updated Version Above)

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

**Note:** See the "Updated Critical Checklist" section above for the expanded checklist that includes Docker cache busting and manual verification steps learned from Attempt #2.

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
