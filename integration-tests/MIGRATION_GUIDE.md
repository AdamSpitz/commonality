# Migration Guide: Test Isolation Improvements

This guide explains how to update integration tests to use the new test isolation utilities.

## What Changed?

We've implemented two major improvements to test isolation:

### 1. Unique Account Derivation (1.1)
- **Problem**: Tests were reusing the same Hardhat accounts (ACCOUNT_0, ACCOUNT_1), causing nonce conflicts and state pollution between test files.
- **Solution**: Each test file now gets unique accounts based on a hash of the test suite name.

### 2. Improved `waitForSync()` (1.3)
- **Problem**: Tests used fixed polling intervals and had poor error messages when sync failed.
- **Solution**: New `waitForSync()` uses adaptive polling (faster initially, slower later) and provides detailed diagnostic information.

## How to Migrate Your Tests

### Step 1: Update Imports

**Before:**
```typescript
import { TEST_PRIVATE_KEYS, createTestClients } from '@commonality/sdk';
import { testLog } from './setup.js';

const PRIVATE_KEY_1 = TEST_PRIVATE_KEYS.ACCOUNT_0;
const PRIVATE_KEY_2 = TEST_PRIVATE_KEYS.ACCOUNT_1;
```

**After:**
```typescript
import { testLog, createIsolatedTestClients } from './setup.js';

const SUITE_NAME = 'my-test-suite'; // Use a unique name based on your test file
```

### Step 2: Replace `createTestClients()` with `createIsolatedTestClients()`

**Before:**
```typescript
const clients1 = createTestClients(PRIVATE_KEY_1, RPC_URL);
const clients2 = createTestClients(PRIVATE_KEY_2, RPC_URL);
```

**After:**
```typescript
const clients1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
const clients2 = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
```

### Step 3: Remove Private Key Constants

You no longer need to import or define `TEST_PRIVATE_KEYS` - the account derivation is handled automatically.

## Complete Example

### Before (old pattern):
```typescript
import { TEST_PRIVATE_KEYS, createTestClients } from '@commonality/sdk';
import { testLog } from './setup.js';

describe('My Test Suite', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const PRIVATE_KEY_1 = TEST_PRIVATE_KEYS.ACCOUNT_0;
  const PRIVATE_KEY_2 = TEST_PRIVATE_KEYS.ACCOUNT_1;

  it('should do something', async () => {
    const clients1 = createTestClients(PRIVATE_KEY_1, RPC_URL);
    const clients2 = createTestClients(PRIVATE_KEY_2, RPC_URL);
    // ... test logic
  });
});
```

### After (new pattern):
```typescript
import { testLog, createIsolatedTestClients } from './setup.js';

describe('My Test Suite', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const SUITE_NAME = 'my-test-suite';

  it('should do something', async () => {
    const clients1 = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const clients2 = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);
    // ... test logic
  });
});
```

## Choosing a Suite Name

The suite name should be:
- **Unique** per test file
- **Descriptive** (typically based on the test file name)
- **Stable** (don't change it once tests are working)

Good examples:
- `'conceptspace-beliefs'` for `conceptspace-beliefs.test.ts`
- `'delegation-basic'` for `delegation-basic.test.ts`
- `'pubstarter-lifecycle'` for `pubstarter-lifecycle.test.ts`

## Benefits

After migration, your tests will:
1. ✅ Have isolated accounts per test file
2. ✅ Avoid nonce conflicts between test files
3. ✅ Sync faster with adaptive polling
4. ✅ Show better error messages when indexer sync fails
5. ✅ Be more maintainable (no manual account management)

## Migrated Test Files

- [x] [hello-world.test.ts](src/hello-world.test.ts) - Example migration complete

## Files To Migrate

The following test files still need to be updated:

- [ ] [conceptspace-beliefs.test.ts](src/conceptspace-beliefs.test.ts)
- [ ] [conceptspace-discovery.test.ts](src/conceptspace-discovery.test.ts)
- [ ] [conceptspace-implications.test.ts](src/conceptspace-implications.test.ts)
- [ ] [conceptspace-indirect-support.test.ts](src/conceptspace-indirect-support.test.ts)
- [ ] [conceptspace-multiple-attesters.test.ts](src/conceptspace-multiple-attesters.test.ts)
- [ ] [conceptspace-user-profiles.test.ts](src/conceptspace-user-profiles.test.ts)
- [ ] [conceptspace-create-statement-workflow.test.ts](src/conceptspace-create-statement-workflow.test.ts)
- [ ] [delegation-basic.test.ts](src/delegation-basic.test.ts)
- [ ] [delegation-permissions.test.ts](src/delegation-permissions.test.ts)
- [ ] [delegation-spending.test.ts](src/delegation-spending.test.ts)
- [ ] [fundingportal-alignment.test.ts](src/fundingportal-alignment.test.ts)
- [ ] [fundingportal-indirect-alignment.test.ts](src/fundingportal-indirect-alignment.test.ts)
- [ ] [fundingportal-leaderboards.test.ts](src/fundingportal-leaderboards.test.ts)
- [ ] [fundingportal-aggregated-metrics.test.ts](src/fundingportal-aggregated-metrics.test.ts)
- [ ] [marketplace-secondary.test.ts](src/marketplace-secondary.test.ts)
- [ ] [pubstarter-basic.test.ts](src/pubstarter-basic.test.ts)
- [ ] [pubstarter-multiple-tokens.test.ts](src/pubstarter-multiple-tokens.test.ts)
- [ ] [pubstarter-lifecycle.test.ts](src/pubstarter-lifecycle.test.ts)
- [ ] [pubstarter-burn-tokens.test.ts](src/pubstarter-burn-tokens.test.ts)
- [ ] [pubstarter-filtering-sorting.test.ts](src/pubstarter-filtering-sorting.test.ts)
- [ ] [pubstarter-edge-cases.test.ts](src/pubstarter-edge-cases.test.ts)
- [ ] [end-to-end-workflows.test.ts](src/end-to-end-workflows.test.ts)
- [ ] [mutable-refs.test.ts](src/mutable-refs.test.ts)

## Testing the Migration

After migrating a test file:

1. Run the specific test to verify it passes:
   ```bash
   npm test -- "src/your-test-file.test.ts"
   ```

2. Check that accounts are unique by enabling verbose logging:
   ```bash
   VERBOSE_TESTS=true npm test -- "src/your-test-file.test.ts"
   ```
   You should see different account addresses than before.

3. Run the full test suite to ensure no regressions:
   ```bash
   npm test
   ```

## Troubleshooting

### "Account index must be 0-4" Error
You're trying to use more than 5 accounts in a single test suite. Either:
- Reduce the number of accounts needed, or
- Split your test into multiple files with different suite names

### Tests Still Failing with Nonce Conflicts
Make sure each test file has a **unique** suite name. If two files use the same suite name, they'll get the same accounts.

### Slow Test Performance
The improved `waitForSync()` should actually speed up tests. If tests are slower:
- Check if the indexer is running properly
- Enable `VERBOSE_TESTS=true` to see sync timing diagnostics
- Ensure Docker containers are healthy

## Advanced Usage

### Manual Account Lookup
If you need to know an account address without creating clients:

```typescript
import { getTestAccountAddress } from './setup.js';

const address = getTestAccountAddress('my-suite', 0);
console.log(`Test account: ${address}`);
```

### Direct Private Key Access
For special cases where you need the private key directly:

```typescript
import { getTestPrivateKey } from './setup.js';

const privateKey = getTestPrivateKey('my-suite', 0);
```

## Questions?

If you encounter issues during migration:
1. Check the example in [hello-world.test.ts](src/hello-world.test.ts)
2. Review this guide carefully
3. Enable verbose logging to debug: `VERBOSE_TESTS=true npm test`
