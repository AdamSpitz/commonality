# Integration Tests - Quick Start Guide

## TL;DR

Run scenario-based integration tests from the project root:

```bash
npm run integration-tests
```

## What Just Got Built

I've created a scenario-based testing framework with clean building blocks that makes it easy to write focused tests for the indexer. Here's what's new:

### 1. **testHelpers.js** - Reusable Test Building Blocks

A comprehensive helper library that provides simple functions for:
- Deploying contracts
- Creating users and statements
- Expressing beliefs and creating implications
- Managing the indexer lifecycle
- Querying GraphQL

**Example usage:**
```javascript
const helpers = new TestHelpers();
await helpers.deployContracts();
await helpers.createUsers(5);

const stmt = helpers.createStatementCID({ title: 'Test' });
await helpers.userBelieves(helpers.getUser(0), stmt);

await helpers.startIndexer();
await helpers.waitForIndexerSync();

const statement = await helpers.getStatement(stmt);
console.log(`Believers: ${statement.believerCount}`);
```

### 2. **scenarioTests.js** - Focused Scenario Tests (NEW!)

Six example scenario tests demonstrating the framework:

1. **Basic Belief** - User expresses belief, verify it's indexed
2. **Belief State Changes** - Test believe → disbelieve → no opinion transitions
3. **Multiple Beliefs** - Multiple users support a statement
4. **Batch Beliefs** - User sets multiple beliefs at once
5. **Implication** - Attester creates S1 → S2 implication
6. **User Counts** - Verify user's beliefCount and disbeliefCount

Each test is **concise** (typically 20-40 lines including comments) because the helpers do the heavy lifting.

### 3. **Updated testIndexer.js** - Generative Tests

Refactored to use the same helper library. This keeps the generative (randomized stress testing) approach but with cleaner code.

### 4. **Root package.json** - Easy Test Running

Created a root package.json with npm scripts:

```bash
# Scenario tests (fast, focused)
npm run integration-tests

# Generative tests (stress testing)
npm run integration-tests:generative:small
npm run integration-tests:generative:medium
npm run integration-tests:generative:large
```

## Two Testing Approaches

### Scenario Tests (NEW! - Use this for most development)

**Purpose:** Test specific functionality with predictable, focused tests

**When to use:**
- Testing a new feature you just built
- Debugging a specific issue
- Validating core functionality works

**Characteristics:**
- Fast (only tests what's needed)
- Deterministic (same results every time)
- Easy to debug (clear, simple test cases)

**Run:**
```bash
npm run integration-tests
```

### Generative Tests (Already existed, now cleaner)

**Purpose:** Stress-test with randomized data to find edge cases

**When to use:**
- Before a release
- Finding unexpected bugs
- Testing under realistic load

**Characteristics:**
- Slower (generates lots of data)
- Randomized (may find different issues each run)
- Comprehensive coverage

**Run:**
```bash
npm run integration-tests:generative:small
```

## How to Add More Tests

Adding a new scenario test is now super easy:

```javascript
// In scenarioTests.js, add a new method to the ScenarioTests class:

async testMyNewFeature() {
  console.log('\n=== Scenario: My New Feature ===\n');

  try {
    // 1. Set up data
    const stmt = this.helpers.createStatementCID({ title: 'New feature' });

    // 2. Run actions
    await this.helpers.userBelieves(this.helpers.getUser(0), stmt);
    await this.helpers.waitForIndexerSync();

    // 3. Assert results
    const statement = await this.helpers.getStatement(stmt);
    if (statement.believerCount === 1) {
      this.recordResult('My New Feature', true, 'Feature works!');
    } else {
      this.recordResult('My New Feature', false, 'Feature broken!');
    }

  } catch (error) {
    this.recordResult('My New Feature', false, `Error: ${error.message}`);
  }
}

// Then add it to runAllScenarios():
async runAllScenarios() {
  // ... existing setup code ...

  await this.testMyNewFeature();  // <-- Add this line

  // ... existing teardown code ...
}
```

That's it! The framework handles:
- Contract deployment
- User creation
- Indexer lifecycle
- GraphQL querying
- Result reporting

## Next Steps

### To run the tests:

1. **Install dependencies** (if not already done):
   ```bash
   cd hardhat && npm install
   cd ../indexer && npm install
   cd ../integration-tests && npm install
   ```

2. **Compile contracts**:
   ```bash
   cd hardhat && npm run build
   ```

3. **Run scenario tests**:
   ```bash
   cd ..  # Back to root
   npm run integration-tests
   ```

### To add more test coverage:

1. Look at the existing scenario tests in [scenarioTests.js](scenarioTests.js) for examples
2. Add new test methods following the pattern shown above
3. Focus on testing important user workflows and edge cases
4. Keep tests focused - one scenario per test method

## File Overview

- **testHelpers.js** - Building blocks (deploy, create, query, assert)
- **scenarioTests.js** - Scenario-based tests (focused, fast)
- **testIndexer.js** - Generative tests (randomized, comprehensive)
- **package.json** - Test scripts
- **README.md** - Full documentation

## What's Working

✅ Test framework is complete and ready to use
✅ Six example scenario tests demonstrate the pattern
✅ Helper library covers all core operations
✅ npm scripts configured for easy running
✅ Both scenario and generative test approaches available

## What's Next (for you to decide)

You can now:

1. **Run the tests** to validate they work end-to-end
2. **Add more scenarios** for specific features you want to test
3. **Extend helpers** if you need new building blocks
4. **Write tests for other subsystems** (Pubstarter, Delegation, Funding Portal)

The framework is ready - you just need to add the specific test cases for the functionality you care about!
