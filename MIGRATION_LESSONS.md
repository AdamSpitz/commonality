# Migration Lessons Learned

This document captures practical lessons from migrating the conceptspace subsystem away from wrapper functions to direct GraphQL usage. Future implementers can use this to migrate the remaining subsystems (pubstarter, delegation, funding-portals, mutable-refs).

## What We Did

Successfully migrated the **conceptspace** subsystem:
- Removed most wrapper functions from SDK exports
- Created test helper module with GraphQL query functions
- Updated all test files to use helpers instead of SDK wrappers
- Result: All 340 tests pass ✅

## Key Lessons

### 1. Create a Helper Module First

**Don't modify SDK exports immediately.** Instead:

1. Create `integration-tests/src/utils/graphql-helpers.ts` with the query functions
2. Test files can import from there instead of from SDK
3. Only update SDK exports after tests work

**Why this works:**
- Tests are isolated from SDK changes
- You can iterate on the helper without breaking SDK consumers
- Easier to debug (changes are localized)

### 2. Keep Complex Composite Functions

Not all "wrapper functions" should be removed. Keep functions that:
- Make multiple GraphQL queries
- Do client-side data processing
- Combine data from multiple sources
- Fetch from external sources (IPFS, etc.)

**Examples we kept:**
- `getStatementWithContent()` - fetches GraphQL + IPFS + computes metrics
- `getUserIndirectSupport()` - multiple queries + client-side filtering
- `getIndirectSupporterCount()` - optimized count query (different from getting list)

**Simple wrappers to remove:**
- `getStatement()` - just wraps a single GraphQL query
- `getUserBelief()` - just wraps a single GraphQL query
- `getImplicationsFrom()` - just wraps a single GraphQL query

### 3. Pattern for Finding All Usages

Use this grep pattern to find all imports:
```bash
grep -r "from.*@commonality/sdk" integration-tests/src --include="*.ts"
```

Then search for specific function usage:
```bash
grep -r "getStatement\|getUserBelief\|getImplicationsFrom" integration-tests/src
```

### 4. Handle Dynamic Imports Carefully

Some files use dynamic imports to avoid circular dependencies:
```typescript
// Found in invariants.ts
const { getImplicationsFrom } = await import('@commonality/sdk');
```

These need to be updated too:
```typescript
const { getImplicationsFrom } = await import('./graphql-helpers.js');
```

**Where to look:**
- `integration-tests/src/utils/invariants.ts`
- Action property files
- Any file that says "avoid circular dependencies"

### 5. SDK Export Strategy

Update `sdk/src/graphql-queries/index.ts` to export selectively:

**Before:**
```typescript
export * from './conceptspace.js';
```

**After:**
```typescript
// Only export complex composite functions
export {
  getIndirectSupporterCount,
  getStatementWithContent,
  getUserIndirectSupport
} from './conceptspace.js';
```

Keep all the type exports - tests still need those.

### 6. Testing Strategy

**Don't wait until the end to test!**

1. Run tests frequently: `npm test 2>&1 | grep -E "(passing|failing)"`
2. Fix import errors one file at a time
3. Watch for: `SyntaxError: The requested module '@commonality/sdk' does not provide an export named 'X'`
4. This tells you exactly which file and function need updating

### 7. Common Import Patterns

**Before (scattered imports):**
```typescript
import { uploadToIPFS, cidToBytes32 } from '@commonality/sdk';
import { createGraphQLClient, getStatement } from '@commonality/sdk';
import { BeliefsAbi } from '@commonality/sdk';
```

**After (consolidated):**
```typescript
import {
  uploadToIPFS,
  cidToBytes32,
  createGraphQLClient,
  BeliefsAbi,
} from '@commonality/sdk';
import { getStatement } from '../utils/graphql-helpers.js';
```

Consolidate SDK imports, separate out the helper imports.

### 8. GraphQL Helper Template

Use this template for each simple query function:

```typescript
/**
 * Get [description]
 */
export async function getFoo(
  executor: GraphQLExecutor,
  id: string
): Promise<Foo | null> {
  const result = await executeQuery<{ foo: Foo | null }>(
    executor,
    `
      query GetFoo($id: ID!) {
        foo(id: $id) {
          id
          field1
          field2
        }
      }
    `,
    { id }
  );
  return result.foo;
}
```

**Key points:**
- Import `executeQuery` and `GraphQLExecutor` from `@commonality/sdk`
- Use TypeScript generics for type safety
- Include all fields the tests need
- Return the nested result field (e.g., `result.foo` not `result`)

### 9. Files You'll Need to Update (per subsystem)

For each subsystem (pubstarter, delegation, funding-portals, mutable-refs):

**In integration-tests:**
1. Add functions to `src/utils/graphql-helpers.ts`
2. Update test files in the subsystem directory
3. Update action property files in `src/actions/`
4. Update any workflow tests that use those functions
5. Check `src/utils/invariants.ts` for dynamic imports

**In SDK:**
1. Update `src/graphql-queries/index.ts` exports

### 10. Wrapper Functions: Unexport, Don't Delete (For Now)

**Strategy:** Remove functions from exports, but leave the code in place temporarily.

**Why not delete immediately:**
- Functions might call each other internally (e.g., `getStatementWithContent` calls `getStatement`)
- Safer to verify everything works before physical deletion
- The key win is **stopping exports** - callers can't use the duplication anymore

**What we did for conceptspace:**
1. ✅ Updated `sdk/src/graphql-queries/index.ts` to export only 3 complex functions
2. ✅ Added comment to `conceptspace.ts` explaining migration status
3. ⏸️ Left the simple wrapper function code in place (can delete later)

**Future cleanup:** Once all subsystems are migrated and stable, delete the unexported functions to save ~400 lines per file.

### 11. Expect Around 10-15 File Updates per Subsystem

Based on conceptspace migration:
- 1 helper file (graphql-helpers.ts)
- 5-7 test files
- 2-3 action property files
- 1-2 workflow test files
- 1 SDK export file
- 1 utils file (invariants.ts)

Total: ~11-15 files per subsystem

### 12. Watch for getUserBeliefs vs getUserBelief

Be careful with similar function names:
- `getUserBelief(user, statement)` - singular, gets one belief
- `getUserBeliefs(user)` - plural, gets all beliefs for a user

Tests use both. Don't mix them up!

### 13. Re-export Strategy for Complex Functions

For complex composite functions that you're keeping in the SDK:

```typescript
// In graphql-helpers.ts
/**
 * [Description]
 * Re-exported from SDK for convenience since it's a complex composite function.
 */
export { getUserIndirectSupport } from '@commonality/sdk';
```

This keeps the test imports clean while preserving the SDK function.

## Migration Checklist (Per Subsystem)

Use this checklist for pubstarter, delegation, funding-portals, mutable-refs:

- [ ] Add query functions to `integration-tests/src/utils/graphql-helpers.ts`
- [ ] Update test files in subsystem directory to import from helpers
- [ ] Update action property files to import from helpers
- [ ] Update workflow tests that use these functions
- [ ] Check `invariants.ts` for dynamic imports
- [ ] Update `sdk/src/graphql-queries/index.ts` to export selectively
- [ ] Run `npm test` and fix any import errors
- [ ] Verify all tests pass
- [ ] Update documentation

## Estimated Effort

Based on conceptspace (which took ~2 hours with careful testing):

- **Pubstarter:** ~1.5 hours (similar complexity)
- **Delegation:** ~1 hour (fewer queries)
- **Funding-portals:** ~1.5 hours (cross-subsystem queries)
- **Mutable-refs:** ~30 minutes (very few queries)

**Total:** ~4.5 hours for complete migration

## Success Criteria

For each subsystem:
- ✅ All tests pass (no regressions)
- ✅ Simple wrapper functions removed from SDK exports
- ✅ Complex composite functions kept in SDK
- ✅ Test files import from graphql-helpers
- ✅ No duplication in test code

## Final Notes

- **Go slow, test often** - don't batch too many changes
- **The pattern works** - we proved it with conceptspace
- **Trust the types** - TypeScript will catch most errors
- **Keep git history clean** - one subsystem per commit

Good luck with the remaining subsystems! The hard part (proving the approach) is done. The rest is just repeating the pattern.
