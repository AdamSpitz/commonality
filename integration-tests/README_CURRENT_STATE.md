# Integration Tests - Current State

## ✅ What Works

The integration test framework is now properly configured and ready to use:

1. **Test files are in the right location** - Moved to [hardhat](hardhat/) directory to resolve module imports:
   - `hardhat/integration-test-helpers.js` - Reusable test utilities
   - `hardhat/integration-test-scenarios.js` - Scenario-based tests
   - `hardhat/integration-test-generative.js` - Generative stress tests

2. **npm scripts work correctly**:
   ```bash
   npm run integration-tests                      # Runs scenario tests
   npm run integration-tests:generative:small     # Runs generative tests
   ```

3. **Contracts deploy successfully**:
   - Beliefs
   - Implications
   - ProjectAlignment
   - DelegatableNotes

4. **Indexer starts successfully** and attempts to connect to the blockchain

## ⚠️ What Needs to Be Done

To run the tests end-to-end, you need:

### 1. Start a Hardhat Node

The tests expect a local Hardhat node running on `http://localhost:8545`:

```bash
# In one terminal:
cd hardhat
npx hardhat node
```

### 2. Make sure the indexer is configured

The indexer needs to be set up to connect to the local Hardhat node. Check [../indexer/README.md](../indexer/README.md) for setup instructions.

### 3. Run the tests

```bash
# In another terminal:
npm run integration-tests
```

## 📋 File Locations

The integration test files have been moved from `integration-tests/` to `hardhat/` for proper module resolution:

- `hardhat/integration-test-helpers.js` (was `integration-tests/testHelpers.js`)
- `hardhat/integration-test-scenarios.js` (was `integration-tests/scenarioTests.js`)
- `hardhat/integration-test-generative.js` (was `integration-tests/testIndexer.js`)

The `integration-tests/` directory now only contains documentation:
- `README.md` - Comprehensive guide
- `QUICK_START.md` - Quick reference
- `INDEXER_TESTING_GUIDE.md` - Guide for generative tests
- This file

## 🔧 Technical Details

### Why Files Were Moved

The test files import `hardhat` using ESM imports (`import hre from 'hardhat'`). When files are outside the hardhat directory, Node's module resolution looks for hardhat in the wrong `node_modules` directory, causing import errors.

By moving the files into the `hardhat/` directory, they can properly resolve the hardhat module since it's installed in `hardhat/node_modules/`.

### How the Tests Run

1. Root `package.json` defines npm scripts that:
2. Change to the `hardhat/` directory and run:
3. `npx hardhat run run-integration-tests.js` which:
4. Imports and executes the test file with proper hardhat context

### Contract Deployment Notes

The `integration-test-helpers.js` file deploys core contracts but **does not** deploy the project contracts (like `MultiERC1155_AssuranceContract`) because they require constructor arguments. When you write tests for project-related functionality, you'll need to:

1. Uncomment the project contract deployment code in `deployContracts()`
2. Provide the necessary constructor arguments
3. See the contract source files in `hardhat/contracts/individual-projects/` for details

## 🎯 Next Steps

1. **Start a Hardhat node** in one terminal
2. **Run the integration tests** in another terminal
3. **Add more scenario tests** for functionality you want to validate

The framework is ready - you just need the blockchain running!

## 📚 Documentation

- [README.md](README.md) - Full documentation
- [QUICK_START.md](QUICK_START.md) - Quick reference guide
- [INDEXER_TESTING_GUIDE.md](INDEXER_TESTING_GUIDE.md) - Generative test guide
- [../README.md](../README.md) - Top-level project README with documentation index
