# Property-Based Testing Migration

This document tracks the migration of integration tests to the property-based testing framework described in [generative-test-prep.md](generative-test-prep.md).

## Quick Start

To use the framework in your tests:

1. Import the checked action wrappers:
```typescript
import { believeStatementChecked } from './belief-actions-checked.js';
import { buyProjectTokensChecked } from './funding-actions-checked.js';
// etc.
```

2. Replace direct SDK calls with checked wrappers:
```typescript
// Before:
const hash = await buyProjectTokens(clients, contract, params);
await waitForSync(graphqlClient, blockNumber);
await assertMoneyConservation(graphqlClient, projectAddress);

// After:
await buyProjectTokensChecked(clients, contract, graphqlClient, params);
```

The checked wrappers automatically verify state transition properties and invariants.

## Available Action Wrappers

**Beliefs:** `believeStatementChecked`, `disbelieveStatementChecked`, `clearOpinionChecked`
**Implications:** `attestImplicationChecked`
**Funding:** `buyProjectTokensChecked`, `refundProjectTokensChecked`, `withdrawProjectFundsChecked`, `burnTokensChecked`
**Delegation:** `depositETHChecked`, `delegateNoteChecked`, `revokeNoteChecked`, `spendDelegatedNoteChecked`
**Marketplace:** `createSaleListingChecked`, `fulfillSaleListingChecked`

## Implemented Invariants

See [src/invariants.ts](src/invariants.ts) for all implemented invariants:
- Money conservation
- Token conservation
- Belief count consistency
- Delegation chain integrity
- Trade data consistency
- And more...

## Migration Status

(this might be out of date; don't trust it)

### Fully Migrated Tests
- conceptspace-beliefs.test.ts
- conceptspace-implications.test.ts
- conceptspace-indirect-support.test.ts
- pubstarter-basic.test.ts
- pubstarter-lifecycle.test.ts
- pubstarter-burn-tokens.test.ts
- delegation-permissions.test.ts
- marketplace-secondary.test.ts
- end-to-end-workflows.test.ts
- fundingportal-indirect-alignment.test.ts

### Partially Migrated Tests
- pubstarter-multiple-tokens.test.ts
- delegation-basic.test.ts
- delegation-spending.test.ts
- conceptspace-create-statement-workflow.test.ts

### Not Yet Migrated
- hello-world.test.ts (simple smoke test - low priority)
- pubstarter-filtering-sorting.test.ts
- pubstarter-edge-cases.test.ts
- conceptspace-multiple-attesters.test.ts
- conceptspace-user-profiles.test.ts
- conceptspace-discovery.test.ts
- fundingportal-alignment.test.ts
- fundingportal-leaderboards.test.ts
- fundingportal-aggregated-metrics.test.ts
- mutable-refs.test.ts

## Next Steps

1. Complete migration of partially-migrated tests
2. Migrate remaining high-value tests (those with complex assertions)
3. Add missing invariants as needed
4. Prepare for generative testing (Phase 3 in original plan)
