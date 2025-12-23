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

See [src/invariants.ts](src/invariants.ts) for all implemented invariants. The code itself serves as documentation for what's been implemented.
