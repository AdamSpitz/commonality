# Generative Testing Suite

This directory contains scripts for generative testing of the Commonality smart contracts. The goal is to validate the system through automated simulation with randomly generated users and actions.

## Overview

The generative testing suite consists of:

1. **Universe Configuration** (`universe.json`) - Defines domains (politics, crypto, religion, music, climate, technology) and statement templates
2. **User Generator** (`generateUsers.js`) - Creates random users with Ethereum addresses, interests, engagement levels, and wealth distribution
3. **Statement Generator** (`generateStatements.js`) - Generates statements from the universe configuration
4. **Simulation Runner** (`runSimulation.js`) - Main test orchestrator that deploys contracts and executes random user actions
5. **Utilities** (`utils.js`) - Helper functions for the test suite

## Quick Start

### Generate test data and run simulation:

```bash
# From the hardhat directory
cd /home/adam/Projects/commonality/hardhat

# Run the simulation (will auto-generate data if needed)
node generative-tests/runSimulation.js [numUsers] [numRounds]

# Example: 50 users, 5 rounds
node generative-tests/runSimulation.js 50 5
```

### Generate data separately:

```bash
# Generate users
node generative-tests/generateUsers.js 50

# Generate statements
node generative-tests/generateStatements.js
```

## Generated Files

After running the simulation, you'll find:

- `users.json` - Generated user profiles with addresses and private keys
- `statements.json` - Generated statements from the universe
- `actions.json` - Log of all actions performed during simulation
- `metrics.json` - Gas usage statistics and performance metrics

## Configuration

### User Properties

Users are generated with:
- **Ethereum address and private key** - For blockchain transactions
- **Engagement level** - LURKER (40%), CASUAL (35%), ACTIVE (20%), POWER_USER (5%)
- **Wealth** - Power law distribution (1% whales, 9% large holders, 90% small holders)
- **Interests** - 1-4 domains they care about with specific positions
- **Trust network** - 0-5 other users they might delegate to

### Simulation Actions

The simulation performs these actions:
- `setBelief` - User expresses belief/disbelief in a statement (50% weight)
- `setBeliefsInBatch` - User signs multiple statements at once (20% weight)
- `attestImplication` - Attester publishes S1→S2 relationship (15% weight)
- `attestProjectAlignment` - Attest that a project aligns with a statement (15% weight)

## Metrics Collected

- **Gas usage** - mean, median, p95, max per action type
- **Action counts** - how many of each action type were performed
- **Errors** - any failures during execution
- **Block numbers** - timeline of actions

## Indexer Integration Tests

The test suite now includes comprehensive indexer testing capabilities:

### Running Indexer Tests

```bash
# From the hardhat directory
cd /home/adam/Projects/commonality/hardhat

# Run small indexer test (10 users, 3 rounds)
npm run test:indexer:small

# Run medium indexer test (30 users, 5 rounds)
npm run test:indexer:medium

# Run custom test
node generative-tests/testIndexer.js [numUsers] [numRounds]
```

Also see INDEXER_TESTING_GUIDE.md (in this directory).

### What the Indexer Tests Do

1. **Generate and Deploy Data**: Runs the simulation to create blockchain transactions
2. **Start Indexer**: Launches the Ponder indexer in a separate process
3. **Wait for Sync**: Monitors the indexer's sync status using Ponder's `/status` endpoint and GraphQL `_meta` field
4. **Validate Data**: Queries the indexed data and compares it with blockchain state

### Test Coverage

The indexer tests validate:

- ✓ **Statements Indexing**: Verifies statements are created and IPFS content is fetched
- ✓ **Users Indexing**: Checks user records with belief/disbelief counts
- ✓ **Beliefs Indexing**: Validates all belief events are indexed correctly
- ✓ **Implications Indexing**: Verifies implication attestations are tracked
- ✓ **Indirect Supporters**: Tests the calculation of indirect support via implications
- ✓ **Block Number Tracking**: Ensures indexer keeps up with blockchain state

### How Sync Waiting Works

The test uses Ponder's built-in sync status APIs:

1. **Primary Method**: Queries the `/status` HTTP endpoint
2. **Fallback Method**: Uses GraphQL `_meta { block { number } }` query
3. **Polling**: Checks every 1 second until target block is reached
4. **Timeout**: Fails if sync doesn't complete within 60 seconds

### Output

The test produces:

- **Console Output**: Real-time progress and results
- **Test Summary**: Passed/failed/warning counts with details
- **Exit Code**: 0 for success, 1 for failures

Example output:

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

## Future Enhancements

This is a basic version. The full generative testing plan includes:

- **OpenRouter integration** - Use LLMs to evaluate implications instead of random
- **More contract types** - Add AssuranceContract, DelegatableNotes, SecondaryMarket
- **Funding actions** - Create projects, purchase tokens, trade on secondary market
- **Delegation actions** - Create notes, delegate, spend, split/merge
- **Attack scenarios** - Sybil attacks, malicious attesters, spam
- **Invariant checking** - Validate contract state consistency
- **Scale testing** - Run with 1000+ users
- **Visualization** - Generate graphs of the belief network and funding flows
- **Deep data validation** - Compare every blockchain event with indexed records
- **Performance benchmarks** - Measure indexer throughput and query response times

## Notes

- Currently uses mock statement IDs (keccak256 hashes) instead of real IPFS CIDs
- Implication attestations are random rather than LLM-evaluated
- Project addresses are randomly generated for testing
- All tests run on Hardhat's local network (deterministic for reproducibility)

## Example Output

```
=== Initializing Simulation ===

Deploying contracts...
  Beliefs: 0x5FbDB2315678afecb367f032d93F642f64180aa3
  Implications: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  ProjectAlignment: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

Generating users...
Generated 50 users
Engagement distribution:
  LURKER: 20 (40.0%)
  CASUAL: 18 (36.0%)
  ACTIVE: 10 (20.0%)
  POWER_USER: 2 (4.0%)
Average wealth: 2.34 ETH

Generating statements...
Generated 63 statements
  Simple: 43
  Coalitions: 10
  Commonality: 10

Funding user accounts...
  Funded 50 users

=== Initialization Complete ===

=== Running Simulation ===

--- Round 1/5 ---
  Completed 247 total actions

--- Round 2/5 ---
  Completed 494 total actions

...

=== Simulation Complete ===

Results Summary:
  Total actions: 1235
  Action breakdown:
    setBelief: 617
    setBeliefsInBatch: 247
    attestImplication: 185
    attestProjectAlignment: 186

  Gas usage:
    setBelief: mean=45231, p95=45876, max=46123
    setBeliefsInBatch: mean=78456, p95=92341, max=108234
    attestImplication: mean=56789, p95=57234, max=58123
    attestProjectAlignment: mean=52341, p95=53123, max=54234
```
