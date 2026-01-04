# Migration Example: Direct GraphQL Usage

This document demonstrates how to migrate from wrapper functions to direct GraphQL queries.

## Summary

The current architecture has duplication:
- **Wrapper functions** in `sdk/src/graphql-queries/*.ts` (~5,000 lines)
- **Resolvers** in `sdk/src/graphql-server/schema/resolvers/*.ts`
- **Direct queries** in `sdk/src/queries/*.ts` (used by resolvers)

The proposal: **Keep resolvers and direct queries, remove wrapper functions**. Have clients use GraphQL directly via `executeQuery()`.

## Code Examples

### Example 1: getUserBelief()

**BEFORE (Current Approach):**
```typescript
import { getUserBelief } from '@commonality/sdk';

const belief = await getUserBelief(
  graphqlClient,
  userAddress,
  statementId
);
```

**AFTER (Direct GraphQL):**
```typescript
import { executeQuery } from '@commonality/sdk';

const result = await executeQuery<{
  userBelief: { statementId: string; beliefState: number } | null;
}>(
  graphqlClient,
  `
    query GetUserBelief($userAddress: Address!, $statementId: ID!) {
      userBelief(userAddress: $userAddress, statementId: $statementId) {
        statementId
        beliefState
      }
    }
  `,
  { userAddress, statementId }
);

const belief = result.userBelief;
```

### Example 2: getStatement()

**BEFORE:**
```typescript
import { getStatement } from '@commonality/sdk';

const statement = await getStatement(graphqlClient, statementId);
```

**AFTER:**
```typescript
import { executeQuery } from '@commonality/sdk';

const result = await executeQuery<{
  statement: {
    id: string;
    believerCount: number;
    disbelieverCount: number;
    cid: string | null;
    statementType: string | null;
    title: string | null;
    excerpt: string | null;
    createdAt: string;
  } | null;
}>(
  graphqlClient,
  `
    query GetStatement($id: ID!) {
      statement(id: $id) {
        id
        believerCount
        disbelieverCount
        cid
        statementType
        title
        excerpt
        createdAt
      }
    }
  `,
  { id: statementId }
);

const statement = result.statement;
```

### Example 3: Complex Query - browseStatementsByMostSupporters()

**BEFORE:**
```typescript
import { browseStatementsByMostSupporters } from '@commonality/sdk';

const statements = await browseStatementsByMostSupporters(
  graphqlClient,
  { limit: 10, offset: 0 }
);
```

**AFTER:**
```typescript
import { executeQuery } from '@commonality/sdk';

const result = await executeQuery<{
  browseStatementsByMostSupporters: Array<{
    id: string;
    cid: string;
    statementType: string;
    title: string;
    excerpt: string;
    believerCount: number;
    disbelieverCount: number;
    createdAt: string;
  }>;
}>(
  graphqlClient,
  `
    query BrowseStatementsByMostSupporters($options: BrowseStatementsOptions) {
      browseStatementsByMostSupporters(options: $options) {
        id
        cid
        statementType
        title
        excerpt
        believerCount
        disbelieverCount
        createdAt
      }
    }
  `,
  { options: { limit: 10, offset: 0 } }
);

const statements = result.browseStatementsByMostSupporters;
```

## Test Migration Example

Here's how a test file would change:

**BEFORE:**
```typescript
import {
  createGraphQLClient,
  getStatement,
  getUserBelief,
} from '@commonality/sdk';

const graphqlClient = createGraphQLClient(GRAPHQL_URL);

// Query statement
const statement = await getStatement(graphqlClient, statementId);
assert.strictEqual(statement.believerCount, 1);

// Query user belief
const belief = await getUserBelief(graphqlClient, userAddress, statementId);
assert.strictEqual(belief.beliefState, 1);
```

**AFTER:**
```typescript
import {
  createGraphQLClient,
  executeQuery,
} from '@commonality/sdk';

const graphqlClient = createGraphQLClient(GRAPHQL_URL);

// Query statement
const statementResult = await executeQuery<{
  statement: { id: string; believerCount: number; ... } | null;
}>(
  graphqlClient,
  `query GetStatement($id: ID!) {
    statement(id: $id) { id believerCount disbelieverCount cid createdAt }
  }`,
  { id: statementId }
);
assert.strictEqual(statementResult.statement.believerCount, 1);

// Query user belief
const beliefResult = await executeQuery<{
  userBelief: { statementId: string; beliefState: number } | null;
}>(
  graphqlClient,
  `query GetUserBelief($userAddress: Address!, $statementId: ID!) {
    userBelief(userAddress: $userAddress, statementId: $statementId) {
      statementId
      beliefState
    }
  }`,
  { userAddress, statementId }
);
assert.strictEqual(beliefResult.userBelief.beliefState, 1);
```

## Benefits of Direct GraphQL

1. **Less Code Duplication**: Eliminates ~5,000 lines of wrapper functions
2. **Standard GraphQL**: Uses industry-standard patterns
3. **Better Tooling**: Can use GraphQL tools for:
   - Type generation from schema
   - Query validation
   - Auto-completion in IDEs
   - GraphQL playgrounds for exploration
4. **Explicit Queries**: You see exactly what data you're fetching
5. **Flexibility**: Easy to fetch exactly the fields you need (no more/no less)

## Tradeoffs

**Advantages:**
- Eliminates duplication
- More explicit about what data is fetched
- Standard GraphQL patterns
- Better tooling ecosystem

**Disadvantages:**
- More verbose calling code
- Need to know GraphQL syntax
- Harder to discover available queries (but GraphQL introspection helps)
- Need to maintain TypeScript types manually (or use codegen)

## Migration Strategy

If we proceed, the migration would:

1. Keep `sdk/src/graphql-server/` (schema and resolvers)
2. Keep `sdk/src/queries/` (direct indexer queries used by resolvers)
3. **Delete** `sdk/src/graphql-queries/` (wrapper functions)
4. Update SDK exports to remove wrapper functions
5. Update all test files to use `executeQuery()` directly
6. Update UI code (when implemented) to use direct GraphQL
7. Optionally: Add GraphQL codegen for type safety

## Files That Would Be Deleted

- `sdk/src/graphql-queries/conceptspace.ts` (694 lines)
- `sdk/src/graphql-queries/pubstarter.ts` (~645 lines)
- `sdk/src/graphql-queries/delegation.ts` (~115 lines)
- `sdk/src/graphql-queries/funding-portals.ts` (~605 lines)
- `sdk/src/graphql-queries/mutable-refs.ts` (~164 lines)
- `sdk/src/graphql-queries/index.ts` (re-exports)

**Total deletion: ~2,200+ lines**

## Files That Would Be Kept

- `sdk/src/graphql-server/schema/type-defs.ts` (385 lines) ✓
- `sdk/src/graphql-server/schema/resolvers/*.ts` (~1,500 lines) ✓
- `sdk/src/queries/*.ts` (~2,200 lines) ✓

## Testing Status

- ✅ Hardhat tests pass (238 tests)
- ⚠️  Integration tests have pre-existing failures (indexer sync issues, unrelated to this change) (actually, "docker-compose build --no-cache" fixed that)
- ✅ Created proof-of-concept showing direct GraphQL usage works
- ✅ Verified no breaking changes to hardhat tests

## Recommendation

Proceed with this migration to eliminate duplication while keeping the valuable abstraction layer (custom GraphQL schema).
