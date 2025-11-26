# Indexer Testing Guide

This guide explains how to test the Ponder indexer using the generative testing system.

## Prerequisites

1. **Node.js** (v18+) installed
2. **Dependencies installed** in both `hardhat/` and `indexer/` directories:
   ```bash
   cd integration-tests && npm install
   cd ../indexer && npm install
   ```

3. **Contracts compiled**:
   ```bash
   cd integration-tests && npm run build
   ```

## Testing Workflow

### Option 1: Quick Test (Recommended for Development)

Run a small test with 10 users and 3 rounds:

```bash
cd integration-tests
npm run test:small
```

This will:
- Deploy contracts to a local Hardhat node
- Generate 10 users and ~60 statements
- Execute ~150-200 blockchain transactions
- Start the indexer and wait for sync
- Validate indexed data
- Complete in ~2-3 minutes

### Option 2: Medium Test

Run a more comprehensive test with 30 users and 5 rounds:

```bash
cd integration-tests
npm run test:medium
```

This will:
- Generate 30 users
- Execute ~500-700 blockchain transactions
- Take ~5-10 minutes to complete

### Option 3: Custom Test

Run with custom parameters:

```bash
cd integration-tests
node testIndexer.js <numUsers> <numRounds>

# Example: 50 users, 10 rounds
node testIndexer.js 50 10
```

## Understanding the Output

### 1. Simulation Phase

```
=== Step 1: Running Simulation ===

Deploying contracts...
  Beliefs: 0x5FbDB2315678afecb367f032d93F642f64180aa3
  Implications: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  ProjectAlignment: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

Generating users...
Generated 10 users
...
```

This phase creates blockchain data that the indexer will process.

### 2. Indexer Startup

```
=== Step 2: Starting Indexer ===

[Indexer] Starting Ponder...
[Indexer] Listening on http://localhost:42069
```

The test spawns the indexer in a subprocess and monitors its logs.

### 3. Sync Waiting

```
=== Step 3: Waiting for Sync ===

Waiting for indexer to sync to block 245...
Indexer at block 100 / 245
Indexer at block 200 / 245
✓ Indexer synced to block 245
```

The test polls the indexer's status every second until it catches up.

### 4. Validation Tests

```
=== Step 4: Running Validation Tests ===

=== Testing Statements Indexing ===
Found 63 statements in indexer
  Statements with fetched content: 43/63
Statements by type:
  simple: 43
  coalition: 10
  commonality: 10

=== Testing Users Indexing ===
Found 10 users in indexer
  Total beliefs across users: 127
  Total disbeliefs across users: 13

...
```

Each test validates a different aspect of the indexer.

### 5. Results Summary

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

- **Passed**: Tests that completed successfully
- **Warnings**: Non-critical issues (e.g., features not implemented yet)
- **Failed**: Critical failures that indicate bugs

## Common Issues and Solutions

### Issue: Indexer fails to start

**Symptom**: Error "Failed to start indexer" or timeout

**Solutions**:
1. Make sure no other indexer is running on port 42069
2. Check that `indexer/` dependencies are installed
3. Verify environment variables in the test output
4. Try running the indexer manually first:
   ```bash
   cd indexer
   PONDER_RPC_URL_84532=http://localhost:8545 npm run dev
   ```

### Issue: Indexer syncs but tests fail

**Symptom**: Sync completes but queries return no data

**Possible causes**:
1. **Wrong contract addresses**: Check that the deployed addresses match what the indexer is watching
2. **Database schema mismatch**: Try deleting `.ponder/` directory and restarting
3. **GraphQL query syntax**: Check if Ponder's GraphQL schema has changed

### Issue: IPFS content not fetched

**Symptom**: `contentFetched: false` for many statements

**Expected behavior**: This is normal for the test environment since we use mock CIDs (keccak256 hashes) instead of real IPFS content. The indexer will attempt to fetch from IPFS but fail gracefully.

**To test real IPFS**: Modify the simulation to upload actual content to IPFS first.

### Issue: Tests are too slow

**Solutions**:
1. Reduce the number of users: `npm run test:small` (10 users)
2. Reduce the number of rounds
3. Run simulation and indexer separately (see Advanced Usage below)

## Advanced Usage

### Running Components Separately

For development, you might want more control over each component:

#### 1. Start Hardhat Node

In terminal 1:
```bash
cd integration-tests
npx hardhat node
```

This keeps the node running with persistent state.

#### 2. Deploy and Run Simulation

In terminal 2:
```bash
cd integration-tests
npx hardhat run --network localhost generative-tests/runSimulation.js
```

Note the contract addresses from the output.

#### 3. Start Indexer Manually

In terminal 3:
```bash
cd indexer
export BELIEFS_CONTRACT_ADDRESS=0x5FbDB...
export IMPLICATIONS_CONTRACT_ADDRESS=0xe7f17...
export PROJECT_ALIGNMENT_ADDRESS=0x9fE46...
export PONDER_RPC_URL_84532=http://localhost:8545
export START_BLOCK=0
npm run dev
```

#### 4. Query Indexer Manually

```bash
# Check status
curl http://localhost:42069/status

# Query via GraphQL
curl -X POST http://localhost:42069/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ statements(limit: 10) { items { id title } } }"}'

# Query custom API
curl http://localhost:42069/conceptspace/api/statement-support/0x123...
```

### Debugging the Indexer

To see detailed indexer logs:

```bash
cd indexer
DEBUG=ponder:* npm run dev
```

### Inspecting Generated Data

After running the simulation, check the generated files:

```bash
cd integration-tests/generative-tests

# View generated users
cat users.json | jq '.[:3]'

# View generated statements
cat statements.json | jq '.[:5]'

# View action log
cat actions.json | jq '.[-10:]'

# View metrics
cat metrics.json | jq '.gasUsage'
```

### Running Tests in CI/CD

Example GitHub Actions workflow:

```yaml
name: Indexer Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd integration-tests && npm install
          cd ../indexer && npm install

      - name: Compile contracts
        run: cd integration-tests && npm run build

      - name: Run indexer tests
        run: cd integration-tests && npm run test:small
```

## Interpreting Test Results

### Healthy Test Run

A healthy test run should show:
- All contracts deployed successfully
- Users funded with ETH
- Hundreds of blockchain transactions executed
- Indexer syncs to latest block within 30 seconds
- All tests pass or show expected warnings
- Exit code 0

### What to Investigate

**Low action counts**: If you see very few actions (< 50), check:
- User generation: Are users being created?
- Engagement levels: Are users configured to perform actions?

**Zero implications**: This can be normal since implications are random. To test implications specifically:
1. Increase the number of rounds
2. Modify `runSimulation.js` to increase implication weight
3. Or implement actual LLM-based implication evaluation

**GraphQL query errors**: These indicate:
- Schema mismatch between test and indexer
- Breaking changes in Ponder API
- Need to update test queries

## Next Steps

Once basic indexer tests pass:

1. **Add more contracts**: Extend tests to cover DelegatableNotes, AssuranceContract, etc.
2. **Test federation**: Validate that Funding Portal correctly queries other subsystems
3. **Performance testing**: Measure indexer throughput with 1000+ users
4. **Data integrity**: Deep validation comparing every event with indexed records
5. **Stress testing**: Test indexer behavior under high transaction load

## Ponder-Specific Notes

### How Sync Status Works

Ponder provides two ways to check sync status:

1. **`/status` HTTP endpoint**: Returns JSON with indexing progress
2. **`_meta` GraphQL field**: Query `{ _meta { block { number } } }`

The test tries both methods for maximum compatibility across Ponder versions.

### Block Number Semantics

- Ponder processes blocks sequentially
- The "current block" is the latest block fully indexed
- Historical queries return data as of that block
- Real-time queries might be slightly behind chain head

### Indexer Database

Ponder uses SQLite by default (stored in `.ponder/` directory). To reset:

```bash
cd indexer
rm -rf .ponder/
npm run dev
```

## Troubleshooting Checklist

Before asking for help, verify:

- [ ] Hardhat and indexer dependencies are installed
- [ ] Contracts compile successfully (`npm run build`)
- [ ] No other process is using port 42069
- [ ] Hardhat node is accessible at `http://localhost:8545`
- [ ] Contract addresses in test output match indexer config
- [ ] `.ponder/` directory has been cleared if schema changed
- [ ] Node.js version is 18 or higher

## Resources

- [Ponder Documentation](https://ponder.sh/docs)
- [Ponder Status API](https://ponder.sh/docs/advanced/status)
- [Hardhat Network](https://hardhat.org/hardhat-network)
- [GraphQL](https://graphql.org/)
