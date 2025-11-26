# Integration Tests

This directory contains integration tests that span multiple Commonality subsystems.

## Overview

Integration tests validate that different components of the Commonality system work correctly together:

- **Blockchain (Hardhat)**: Smart contracts and on-chain state
- **Indexer (Ponder)**: Event indexing and GraphQL API
- **Future**: UI, implication attester AI, etc.

## Current Tests

### Indexer Integration Tests

Tests that verify the Ponder indexer correctly processes blockchain events and makes data queryable.

**What it tests:**
- Statements indexing (with IPFS content)
- Users indexing (with belief counts)
- Beliefs indexing (direct supporters)
- Implications indexing (implication graph)
- Indirect supporters calculation

**Quick start:**
```bash
cd integration-tests
npm install
npm run test:small
```

**Full documentation:** See [INDEXER_TESTING_GUIDE.md](./INDEXER_TESTING_GUIDE.md)

## Directory Structure

```
integration-tests/
├── README.md                    # This file
├── INDEXER_TESTING_GUIDE.md     # Detailed guide for indexer tests
├── testIndexer.js               # Indexer integration test runner
├── package.json                 # Test dependencies and scripts
└── .gitignore                   # Ignore generated files
```

## Running Tests

### Prerequisites

1. **Dependencies installed** in all relevant directories:
   ```bash
   cd ../hardhat && npm install
   cd ../indexer && npm install
   cd ../integration-tests && npm install
   ```

2. **Contracts compiled**:
   ```bash
   cd ../hardhat && npm run build
   ```

### Test Commands

```bash
# Small test (10 users, 3 rounds, ~2-3 minutes)
npm run test:small

# Medium test (30 users, 5 rounds, ~5-10 minutes)
npm run test:medium

# Large test (50 users, 10 rounds, ~10-15 minutes)
npm run test:large

# Custom test
node testIndexer.js <numUsers> <numRounds>
```

## How It Works

The integration test workflow:

1. **Data Generation**: Uses the generative testing system from `hardhat/generative-tests/` to create realistic blockchain data
2. **Deployment**: Deploys contracts to a local Hardhat node and executes transactions
3. **Indexer Startup**: Spawns the Ponder indexer in a subprocess
4. **Sync Waiting**: Polls the indexer's status API until it catches up to the latest block
5. **Validation**: Queries the indexer's GraphQL API and validates correctness
6. **Reporting**: Shows passed/failed/warning counts with details

## Understanding Test Output

### Healthy Test Run

```
=== Test Results Summary ===

✓ Passed: 5
  • Statements Indexing: Successfully indexed 63 statements (43 with content)
  • Users Indexing: Successfully indexed 10 users
  • Beliefs Indexing: Successfully indexed 127 beliefs
  • Implications Indexing: Successfully indexed 18 implications
  • Indirect Supporters: Successfully calculated indirect supporters

⚠ Warnings: 0

✗ Failed: 0
```

### Common Warnings

- **IPFS content not fetched**: Expected for mock CIDs (test uses keccak256 hashes, not real IPFS)
- **No implications found**: May happen with small tests (implications are probabilistic)
- **Custom API not available**: Some endpoints might not be implemented yet

### When Tests Fail

If tests fail, check:
1. **Indexer logs**: Look for errors in `[Indexer]` output
2. **Contract addresses**: Verify they match between deployment and indexer config
3. **Database state**: Try deleting `indexer/.ponder/` and rerunning
4. **GraphQL schema**: Ensure test queries match the actual Ponder schema

## Adding New Integration Tests

To add a new integration test:

1. **Create test file**: `testFoo.js` in this directory
2. **Import dependencies**: Import from `../hardhat/`, `../indexer/`, etc.
3. **Add npm script**: Update `package.json` to add `test:foo` script
4. **Document**: Add section to this README

Example structure:
```javascript
import { SimulationRunner } from '../hardhat/generative-tests/runSimulation.js';

class FooIntegrationTest {
  async run() {
    // 1. Set up test environment
    // 2. Run actions across multiple components
    // 3. Validate cross-component behavior
    // 4. Report results
  }
}
```

## Future Integration Tests

Planned additions:

- **UI Integration Tests**: Test UI + indexer GraphQL queries
- **Implication Attester Tests**: Test AI + blockchain integration
- **End-to-End Tests**: User flows across entire stack
- **Performance Tests**: Load testing with many concurrent users
- **Federation Tests**: Validate Funding Portal federates correctly to other subsystems

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd hardhat && npm install
          cd ../indexer && npm install
          cd ../integration-tests && npm install

      - name: Compile contracts
        run: cd hardhat && npm run build

      - name: Run integration tests
        run: cd integration-tests && npm run test:small
```

## Troubleshooting

See [INDEXER_TESTING_GUIDE.md](./INDEXER_TESTING_GUIDE.md#troubleshooting-checklist) for detailed troubleshooting steps.

Common issues:
- Port conflicts (default: 42069 for indexer, 8545 for Hardhat)
- Missing dependencies
- Stale database state
- GraphQL schema mismatches

## Related Documentation

- [Hardhat Generative Tests](../hardhat/generative-tests/README.md) - Blockchain data generation
- [Indexer Documentation](../indexer/README.md) - Ponder indexer setup
- [Specs](../specs/README.md) - System architecture and design

## Contributing

When adding new tests:
1. Follow the existing patterns
2. Add comprehensive documentation
3. Include both positive and negative test cases
4. Make tests deterministic (use fixed seeds where applicable)
5. Keep test runtime reasonable (< 10 minutes for default runs)
