# Generative Testing Suite

This directory contains scripts for generative testing of the Commonality smart contracts. The goal is to validate the system through automated simulation with randomly generated users and actions.

## Overview

The generative testing suite consists of:

1. **Universe Configuration** (`universe.json`) - Defines domains (politics, crypto, religion, music, climate, technology) and statement templates
2. **User Generator** (`generateUsers.js`) - Creates random users with Ethereum addresses, interests, engagement levels, and wealth distribution
3. **Statement Generator** (`generateStatements.js`) - Generates statements from the universe configuration
4. **Attester Generator** (`generateAttesters.js`) - Creates implication attesters with different evaluation strategies (neutral, strict, lenient, biased, malicious)
5. **OpenRouter Integration** (`openrouter.js`) - LLM-based implication evaluation using OpenRouter API
6. **LLM Attester** (`llmAttester.js`) - Integrates attesters with LLM evaluation for intelligent implication testing
7. **Simulation Runner** (`runSimulation.js`) - Main test orchestrator that deploys contracts and executes random user actions
8. **Utilities** (`utils.js`) - Helper functions for the test suite

## Important: Hardhat dependency

Although this directory lives at the project root, the simulation scripts (`runSimulation.js`, `fundingAndDelegationActions.js`) import the Hardhat runtime environment (`import hre from 'hardhat'`) to deploy and interact with smart contracts. This means **scripts must be run from the `hardhat/` directory** so that Hardhat can find its config file (`hardhat.config.cjs`) and compiled contract artifacts. You can also use the `npm run gen:*` scripts defined in `hardhat/package.json`.

## Quick Start

### Generate test data and run simulation:

```bash
# From the hardhat directory (needed for hardhat runtime - see note above)
cd /home/adam/Projects/commonality/hardhat

# Run the simulation (will auto-generate data if needed)
node ../fake-data-generation/runSimulation.js [numUsers] [numRounds]

# Example: 50 users, 5 rounds
node ../fake-data-generation/runSimulation.js 50 5
```

### Generate data separately:

```bash
# Generate users (run from hardhat/ directory)
node ../fake-data-generation/generateUsers.js 50

# Generate statements
node ../fake-data-generation/generateStatements.js

# Generate attesters
node ../fake-data-generation/generateAttesters.js 15
```

## Generated Files

After running the simulation, you'll find:

- `users.json` - Generated user profiles with addresses and private keys
- `statements.json` - Generated statements from the universe
- `attesters.json` - Generated implication attesters with evaluation strategies
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

### Attester Types

Implication attesters are specialized accounts that evaluate whether statement S1 implies statement S2:

- **NEUTRAL** (30%) - Balanced evaluation with 0.8 threshold requiring clear logical connection
- **STRICT** (20%) - Very high 0.95 threshold, only obvious logical entailments
- **LENIENT** (20%) - Permissive 0.6 threshold, allows loose connections
- **POLITICAL_LEFT** (10%) - Left-leaning political lens for evaluation
- **POLITICAL_RIGHT** (10%) - Right-leaning political lens for evaluation
- **MALICIOUS** (10%) - Random evaluations for testing system robustness

Each attester has:
- **Ethereum address and private key** - For signing attestations
- **Evaluation threshold** - Confidence score required to attest implication
- **Bias** - Some attesters have political or other biases affecting evaluation
- **Statistics tracking** - Counts of attestations made

### Simulation Actions

The simulation performs these actions:

### Belief & Implication Actions
- `setBelief` - User expresses belief/disbelief in a statement (35% weight)
- `setBeliefsInBatch` - User signs multiple statements at once (15% weight)
- `attestImplication` - Attester publishes S1→S2 relationship (10% weight)
- `attestAlignment` - Attest that a subject (e.g., project) aligns with a statement (10% weight)

### Funding Actions
- `createProject` - Create a new Pubstarter project with ERC1155 tokens (5% weight)
- `purchaseFromPrimaryMarket` - Buy tokens from project's primary market (8% weight)
- `createSecondaryMarketListing` - List tokens on secondary marketplace (5% weight)

### Delegation Actions
- `depositToNote` - Deposit ETH to create a delegatable note (6% weight)
- `delegateNote` - Delegate note ownership to another user (4% weight)
- `revokeDelegation` - Revoke a delegation and reclaim note ownership (2% weight)

## Metrics Collected

- **Gas usage** - mean, median, p95, max per action type
- **Action counts** - how many of each action type were performed
- **Errors** - any failures during execution
- **Block numbers** - timeline of actions

## LLM-Based Implication Evaluation (OpenRouter)

The generative testing suite now supports intelligent implication evaluation using Large Language Models via the OpenRouter API. This allows attesters to use actual reasoning rather than random decisions.

### Features

- **LLM Evaluation**: Uses Claude 3.5 Haiku (or other models) to evaluate whether S1 implies S2
- **Attester Integration**: Different attester types apply their thresholds and biases to LLM results
- **Batch Processing**: Evaluate multiple implication pairs efficiently
- **Cost Estimation**: Built-in tools to estimate API costs before running large batches

### Configuration

Set your OpenRouter API key as an environment variable:

```bash
export OPENROUTER_API_KEY=sk-or-your-key-here
export OPENROUTER_MODEL=anthropic/claude-3.5-haiku  # Optional, defaults to haiku
```

Get an API key at: https://openrouter.ai/keys

### Testing the Integration

Run the test script to verify everything is working:

```bash
# From the hardhat directory (needed for hardhat runtime)
cd /home/adam/Projects/commonality/hardhat

# Run 3 test evaluations
node ../fake-data-generation/testOpenRouter.js 3

# Run more tests
node ../fake-data-generation/testOpenRouter.js 10
```

The test script will:
1. Validate your OpenRouter setup
2. Run single evaluations with different attester types
3. Run batch evaluations
4. Show cost estimates

### Using in Simulations

To use LLM-based evaluation in your simulation, modify the simulation runner to use the `llmAttester.js` module:

```javascript
import { evaluateImplicationWithAttester } from './llmAttester.js';

// Instead of random evaluation:
const result = await evaluateImplicationWithAttester(
  attester,
  statement1,
  statement2,
  process.env.OPENROUTER_API_KEY
);

if (result.implies) {
  // Publish attestation
}
```

### Cost Estimation

Estimate costs before running large batches:

```javascript
import { estimateEvaluationCost } from './llmAttester.js';

const estimate = estimateEvaluationCost(100); // 100 evaluations
console.log(`Estimated cost: $${estimate.totalCostUsd}`);
// Output: Estimated cost: $0.20
```

Typical costs (Claude 3.5 Haiku):
- Per evaluation: ~$0.002 USD
- 100 evaluations: ~$0.20 USD
- 1000 evaluations: ~$2.00 USD

### Pre-generated Attestations for Cost Savings

To avoid calling OpenRouter on every test run, you can pre-generate attestations once and save them:

```bash
# Generate pre-computed attestations (requires OPENROUTER_API_KEY)
cd /home/adam/Projects/commonality/hardhat
export OPENROUTER_API_KEY=sk-or-your-key-here

# Generate 50 pairs per domain (default)
npm run gen:attestations

# Or specify number of pairs per domain
npm run gen:attestations 100
```

This creates:
- `attestations.json` - Pre-computed implication attestations
- `attestations.metadata.json` - Generation metadata

**Running simulations:**
```bash
# Use pre-generated attestations (default)
npm run gen:simulate

# Use random attestions instead (no LLM)
npm run gen:simulate -- --no-pregenerated
```

The simulation will use pre-generated attestations when available, falling back to random decisions otherwise.

### API Reference

**`evaluateImplicationWithLLM(statement1, statement2, apiKey, model)`**
- Evaluates a single implication pair using LLM
- Returns: `{ implies, confidence, reasoning, model, usage }`

**`evaluateImplicationWithAttester(attester, statement1, statement2, apiKey)`**
- Evaluates with attester-specific thresholds and biases applied
- Returns: `{ implies, confidence, llmConfidence, reasoning, attesterId, ... }`

**`batchEvaluateImplications(pairs, apiKey, model, options)`**
- Batch evaluation with rate limiting
- Options: `{ delayMs, onProgress }`

**`batchAttesterEvaluations(attesters, pairs, apiKey, options)`**
- Evaluate multiple attesters across multiple pairs
- Options: `{ maxPairsPerAttester, delayBetweenCalls, onProgress }`

## Indexer Integration Tests

**Note:** Indexer integration tests have been moved to the top-level `integration-tests/` directory, since they test the integration between multiple subsystems (hardhat + indexer).

### Running Indexer Tests

```bash
# From the project root
cd /home/adam/Projects/commonality/integration-tests

# Install dependencies (first time only)
npm install

# Run small indexer test (10 users, 3 rounds)
npm run test:small

# Run medium indexer test (30 users, 5 rounds)
npm run test:medium

# Run custom test
node testIndexer.js [numUsers] [numRounds]
```

See `../integration-tests/README.md` and `../integration-tests/INDEXER_TESTING_GUIDE.md` for full documentation.

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

- [x] **Attester generation** - ✓ Completed: Generate implication attesters with different evaluation strategies
- [x] **OpenRouter integration** - ✓ Completed: Use LLMs via OpenRouter API to evaluate implications with intelligent reasoning
- [x] **Funding actions** - ✓ Completed: Create projects, purchase tokens from primary/secondary markets
- [x] **Delegation actions** - ✓ Completed: Create notes, delegate to users, revoke delegations
- [x] **Attack scenarios** - ✓ Completed: Sybil attacks, spam, malicious attester, commission exploitation
- [x] **Invariant checking** - ✓ Completed: Validate contract state consistency
- [x] **Pre-generated data** - ✓ Completed: Generate attestations once, reuse for deterministic test runs
- **Scale testing** - Run with 1000+ users
- **Visualization** - Generate graphs of the belief network and funding flows
- **Deep data validation** - Compare every blockchain event with indexed records
- **Performance benchmarks** - Measure indexer throughput and query response times

## Notes

- Currently uses mock statement IDs (keccak256 hashes) instead of real IPFS CIDs
- Implication attestations can now use LLM evaluation via OpenRouter (set OPENROUTER_API_KEY to enable)
- Project addresses are randomly generated for testing
- All tests run on Hardhat's local network (deterministic for reproducibility)

## Example Output

```
=== Initializing Simulation ===

Deploying contracts...
  Beliefs: 0x5FbDB2315678afecb367f032d93F642f64180aa3
  Implications: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  AlignmentAttestations: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

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
    attestAlignment: 186

  Gas usage:
    setBelief: mean=45231, p95=45876, max=46123
    setBeliefsInBatch: mean=78456, p95=92341, max=108234
    attestImplication: mean=56789, p95=57234, max=58123
    attestAlignment: mean=52341, p95=53123, max=54234
```
