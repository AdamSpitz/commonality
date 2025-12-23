# Invariant Implementation Guidelines

This document provides guidelines for implementing invariant checks in the integration tests, as outlined in [generative-test-prep.md](generative-test-prep.md).

## Implementation Guidelines

When adding new invariant checks:

1. **Create the invariant function in [src/invariants.ts](src/invariants.ts)**
   - Use clear, descriptive names like `assertDelegationChainIntegrity()`
   - Add comprehensive JSDoc comments explaining what the invariant checks
   - Include the section number from [generative-test-prep.md](generative-test-prep.md) in the comment
   - Consider using `assertAggregatedCountConsistency()` for checking cached counts vs actual records

2. **Add calls to the invariant in relevant test files**
   - Call the invariant after actions that could violate it
   - Call it at the end of complex test scenarios
   - Don't overdo it - use judgment about when checks add value

3. **Consider performance**
   - Some invariants may be expensive (e.g., replaying all events)
   - Mark expensive checks clearly and use them sparingly
   - Consider making them opt-in via environment variables

## Usage in Generative Testing

Once we have a good library of invariant checks, they can be used in generative testing:

```typescript
// After generating and executing random actions
for (const statementId of allStatementIds) {
  await assertBeliefCountsMatch(graphqlClient, statementId);
}

for (const projectAddress of allProjectAddresses) {
  await assertTokenConservation(graphqlClient, projectAddress);
  await assertMoneyConservation(graphqlClient, projectAddress);
}

// etc.
```

This allows us to verify system correctness at scale, not just with handcrafted test scenarios.
