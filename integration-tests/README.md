# Integration Tests

This directory contains integration tests that span multiple Commonality subsystems.

## Overview

Integration tests validate that different components of the Commonality system work correctly together:

- **Blockchain (Hardhat)**: Smart contracts and on-chain state
- **Indexer (Ponder)**: Event indexing and GraphQL API
- **Future**: UI, implication attester AI, etc.

## Test Approaches

We have two complementary testing approaches:

### 1. Scenario-Based Tests (`scenarioTests.js`)

**Purpose:** Test specific, well-defined user scenarios to validate core functionality.

**Characteristics:**
- Focused, concise tests for specific features
- Predictable, deterministic test cases
- Easy to understand and debug
- Fast execution (tests only what's needed)

**Use cases:**
- Validating basic belief expression
- Testing belief state transitions
- Verifying multiple users can support a statement
- Testing batch operations
- Validating implication relationships

**Quick start:**
```bash
# From the project root
npm run integration-tests

# Or from integration-tests directory
npm test
npm run test:scenarios
```

### 2. Generative Tests (`testIndexer.js`)

**Purpose:** Stress-test the system with randomized data and complex interactions.

**Characteristics:**
- Uses randomized data generation
- Tests with many users and interactions
- Helps find edge cases and race conditions
- Longer execution time
- Based on the generative testing framework in `hardhat/generative-tests/`

**Use cases:**
- Finding unexpected edge cases
- Stress testing with realistic data volumes
- Validating system behavior under load
- Testing complex interaction patterns

**Quick start:**
```bash
# From the project root
npm run integration-tests:generative:small    # 10 users, 3 rounds (~2-3 min)
npm run integration-tests:generative:medium   # 30 users, 5 rounds (~5-10 min)
npm run integration-tests:generative:large    # 50 users, 10 rounds (~10-15 min)

# Or from integration-tests directory
npm run test:generative
```

**Full documentation:** See [INDEXER_TESTING_GUIDE.md](./INDEXER_TESTING_GUIDE.md)

## Directory Structure

```
integration-tests/
├── README.md                    # This file
├── INDEXER_TESTING_GUIDE.md     # Detailed guide for generative tests
├── testHelpers.js               # Shared helper utilities for all tests
├── scenarioTests.js             # Scenario-based integration tests (NEW!)
├── testIndexer.js               # Generative integration tests
├── package.json                 # Test dependencies and scripts
└── .gitignore                   # Ignore generated files
```

## Key Components

### `testHelpers.js` - Test Helper Library

Provides reusable building blocks for tests:

**Contract Management:**
- `deployContracts()` - Deploy all core contracts
- Contract interaction helpers for beliefs, implications, projects, delegation

**User Management:**
- `createUsers(count)` - Create test users
- `getUser(index)` - Get a specific user

**Statement Helpers:**
- `createStatementCID(content)` - Create mock statement CIDs
- `createStatements(contents)` - Bulk statement creation

**Belief Actions:**
- `userBelieves(user, statementCID)` - Express belief
- `userDisbelieves(user, statementCID)` - Express disbelief
- `userRemovesOpinion(user, statementCID)` - Remove opinion
- `userSetsBeliefsInBatch(...)` - Batch belief setting

**Implication Actions:**
- `createImplication(attester, from, to, strength)` - Create implication
- `removeImplication(attester, from, to)` - Remove implication

**Project Actions:**
- `createProject(creator, metadata, threshold, deadline, tokenTypes)`
- `contributeToProject(projectAddress, contributor, tokenId, amount)`
- `attestProjectAlignment(attester, projectAddress, statementCID)`

**Delegation Actions:**
- `createDelegatableNote(owner, amount, intendedStatementCID)`
- `delegateNote(noteId, delegator, delegatee, commission)`

**Indexer Management:**
- `startIndexer()` - Start the Ponder indexer
- `stopIndexer()` - Stop the indexer
- `waitForIndexerSync()` - Wait for indexer to catch up

**GraphQL Queries:**
- `queryGraphQL(query, variables)` - Raw GraphQL query
- `getBeliefs()` - Get all beliefs
- `getBeliefsForStatement(cid)` - Get beliefs for a specific statement
- `getStatements()` - Get all statements
- `getStatement(cid)` - Get a specific statement
- `getImplications()` - Get all implications
- `getUsers()` - Get all users

**Utility Functions:**
- `getCurrentBlock()` - Get current block number
- `mineBlocks(count)` - Mine blocks
- `advanceTime(seconds)` - Advance blockchain time

## Writing New Tests

The `testHelpers.js` library makes it easy to write concise, readable tests. Here's an example:

```javascript
import { TestHelpers } from './testHelpers.js';

async function myNewTest() {
  const helpers = new TestHelpers();

  // Deploy contracts and create users
  await helpers.deployContracts();
  await helpers.createUsers(5);

  // Create a statement
  const statementCID = helpers.createStatementCID({
    title: 'My test statement',
    description: 'Testing the indexer'
  });

  // Users express beliefs
  await helpers.userBelieves(helpers.getUser(0), statementCID);
  await helpers.userBelieves(helpers.getUser(1), statementCID);

  // Start indexer and wait for sync
  await helpers.startIndexer();
  await helpers.waitForIndexerSync();

  // Query the indexer
  const statement = await helpers.getStatement(statementCID);
  console.log(`Believers: ${statement.believerCount}`);

  // Cleanup
  await helpers.stopIndexer();
}
```

## Running Tests

### Prerequisites

1. **Dependencies installed** in all relevant directories:
   ```bash
   cd hardhat && npm install
   cd indexer && npm install
   cd integration-tests && npm install
   ```

2. **Contracts compiled**:
   ```bash
   cd hardhat && npm run build
   ```

### Running Tests (Automated - Recommended)

**The easiest way to run tests** is to use the automated test runner script:

```bash
# From the project root
./run-integration-tests.sh
```

This script automatically:
1. Starts a Hardhat node in the background
2. Runs the integration tests (which start/stop the indexer as needed)
3. Cleans up all processes when complete

### Running Tests (Manual - Advanced)

If you prefer to manage processes manually or want to observe each component:

**Terminal 1 - Start Hardhat node:**
```bash
cd hardhat
npx hardhat node
```

**Terminal 2 - Run tests:**
```bash
# From the project root
npm run integration-tests
```

The tests will automatically start and stop the Ponder indexer as needed.

### Test Commands

**Scenario tests (default, fast):**
```bash
./run-integration-tests.sh                     # Automated (recommended)
npm run integration-tests                       # Manual (requires Hardhat node running)
```

**Generative tests (stress testing):**
```bash
npm run integration-tests:generative:small      # 10 users, 3 rounds (~2-3 min)
npm run integration-tests:generative:medium     # 30 users, 5 rounds (~5-10 min)
npm run integration-tests:generative:large      # 50 users, 10 rounds (~10-15 min)
```

**Note:** Generative tests currently require manual setup (start Hardhat node first)

## How It Works

### Process Architecture

The integration tests coordinate three processes:

1. **Hardhat Node (Port 8545)** - Local Ethereum blockchain
   - Must be running before tests start
   - Can be started manually or automatically via `run-integration-tests.sh`

2. **Ponder Indexer (Port 42069)** - Event indexer with GraphQL API
   - **Automatically managed by tests** (starts/stops as needed)
   - You don't need to run this manually

3. **Test Runner** - Executes test scenarios
   - Deploys contracts to Hardhat
   - Performs blockchain actions
   - Queries indexer via GraphQL

### Scenario-Based Test Workflow:

1. **Setup**: Deploy contracts and create test users on Hardhat node
2. **Actions**: Execute specific user actions (e.g., express beliefs, create implications)
3. **Indexer Startup**: Automatically start the Ponder indexer in a subprocess
4. **Sync Waiting**: Wait for indexer to catch up to the blockchain
5. **Validation**: Query the indexer's GraphQL API and assert expected results
6. **Reporting**: Show pass/fail results for each scenario
7. **Cleanup**: Automatically stop the indexer

### Generative Test Workflow:

1. **Data Generation**: Uses the generative testing system from `hardhat/generative-tests/` to create realistic blockchain data with many users and randomized actions
2. **Deployment**: Deploys contracts to a local Hardhat node and executes transactions
3. **Indexer Startup**: Spawns the Ponder indexer in a subprocess
4. **Sync Waiting**: Polls the indexer's status API until it catches up to the latest block
5. **Validation**: Queries the indexer's GraphQL API and validates correctness
6. **Reporting**: Shows passed/failed/warning counts with details
7. **Cleanup**: Stop the indexer

## Understanding Test Output

### Healthy Scenario Test Run

```
=== Scenario: Basic Belief Expression ===
✓ Basic Belief: User belief correctly indexed

=== Scenario: Belief State Changes ===
✓ Belief State Changes: All state transitions tracked correctly

=== Scenario: Multiple Users Support ===
✓ Multiple Beliefs: Correctly counted 3 believers and 1 disbeliever

============================================================
TEST RESULTS SUMMARY
============================================================

✓ Passed: 6
  • Basic Belief: User belief correctly indexed
  • Belief State Changes: All state transitions tracked correctly
  • Multiple Beliefs: Correctly counted 3 believers and 1 disbeliever
  • Batch Beliefs: All batch beliefs recorded correctly
  • Implication: Implication S1->S2 recorded with strength 100
  • User Counts: User belief counts correct (3 beliefs, 2 disbeliefs)

⚠ Warnings: 0

✗ Failed: 0

Pass Rate: 100.0% (6/6)
============================================================
```

### Healthy Generative Test Run

```
=== Test Results Summary ===

✓ Passed: 5
  • Statements Indexing: Successfully indexed 63 statements (43 with content)
  • Users Indexing: Successfully indexed 10 users
  • Beliefs Indexing: Successfully indexed 127 beliefs
  • Implications Indexing: Successfully indexed 18 implications

⚠ Warnings: 1
  • Indirect Supporters: Custom API endpoint not yet implemented (skipping test)

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
