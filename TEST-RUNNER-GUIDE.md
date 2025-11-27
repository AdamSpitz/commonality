# Integration Test Runner Guide

## Problem Summary

You were trying to run the integration tests with the workflow:
1. Terminal 1: `npx hardhat node` (from hardhat directory)
2. Terminal 2: `npm run integration-tests` (from root directory)

**The issue:** It wasn't clear what was happening or whether it was working. The tests would timeout without clear error messages.

## Root Causes Identified

1. **Missing Hardhat Node**: The tests require a Hardhat node to be running first, but this wasn't automated
2. **RPC URL Mismatch**: The test helper was setting `PONDER_RPC_URL_84532` but the indexer config uses chain ID `31337`
3. **Excessive Logging**: The indexer outputs a lot of status information that clutters the test output
4. **Unclear Process Management**: It wasn't obvious that you needed 2 terminals and what each was doing

## Solutions Implemented

### 1. Automated Test Runner Script

Created `./run-integration-tests.sh` that:
- Automatically starts Hardhat node in the background
- Waits for Hardhat to be ready
- Runs the integration tests (which start/stop the indexer automatically)
- Cleans up all processes when done

**Usage:**
```bash
./run-integration-tests.sh
```

### 2. Fixed RPC URL Configuration

Fixed the environment variable from `PONDER_RPC_URL_84532` to `PONDER_RPC_URL_31337` to match the Hardhat chain ID.

### 3. Reduced Indexer Logging Noise

Modified the test helper to only log important indexer messages (INFO, WARN, ERROR) instead of all output.

### 4. Clear Documentation

Updated [integration-tests/README.md](integration-tests/README.md) with:
- Clear process architecture explanation
- Two ways to run tests (automated vs manual)
- What each process does and which ports they use

## How to Run Tests

### Option 1: Automated (Recommended)

```bash
./run-integration-tests.sh
```

This handles everything for you.

### Option 2: Manual (For Debugging)

**Terminal 1 - Hardhat Node:**
```bash
cd hardhat
npx hardhat node
```

**Terminal 2 - Integration Tests:**
```bash
npm run integration-tests
```

The tests will automatically start and stop the Ponder indexer (port 42069).

## Process Architecture

The integration tests coordinate **3 processes**:

1. **Hardhat Node** (Port 8545)
   - Local Ethereum blockchain
   - Must be running before tests start
   - Automated by `run-integration-tests.sh` OR manual in Terminal 1

2. **Ponder Indexer** (Port 42069)
   - Event indexer with GraphQL API
   - **Automatically managed by tests** (starts/stops as needed)
   - You don't need to run this manually

3. **Test Runner**
   - Deploys contracts to Hardhat
   - Performs blockchain actions
   - Queries indexer via GraphQL
   - Reports results

## Test Workflow

1. Hardhat node starts (or is already running)
2. Test runner deploys contracts to Hardhat
3. Test runner starts the Ponder indexer as a subprocess
4. Test runner performs blockchain actions (e.g., set beliefs)
5. Test runner waits for indexer to sync
6. Test runner queries indexer GraphQL API
7. Test runner validates results and reports pass/fail
8. Test runner stops the indexer

## Diagnostic Tools

### Check Test Status

```bash
./check-test-status.sh
```

Shows:
- Whether Hardhat is running (and current block number)
- Whether indexer is running (and sync status)
- Which processes are using the relevant ports

### View Hardhat Logs

```bash
tail -f /tmp/hardhat-node.log
```

(Only when using automated runner)

## Troubleshooting

### Tests Timeout

**Symptom:** Tests run for a long time and eventually timeout

**Possible causes:**
1. Hardhat node not running → Use automated runner or start manually
2. Indexer stuck syncing → Check indexer logs for errors
3. GraphQL query errors → Check that Ponder schema matches test queries

### Port Already in Use

**Symptom:** "Port 8545 already in use" or "Port 42069 already in use"

**Solution:**
```bash
# Kill processes on those ports
lsof -ti:8545 | xargs kill -9
lsof -ti:42069 | xargs kill -9
```

### Indexer Won't Start

**Symptom:** "[Indexer Error]" messages

**Possible causes:**
1. Contract addresses not set → Check `integration-test-helpers.js` sets env vars correctly
2. RPC connection failed → Verify Hardhat node is running on port 8545
3. Database issues → Try deleting `indexer/.ponder/` directory

## File Summary

### New Files

- `run-integration-tests.sh` - Automated test runner (starts Hardhat + runs tests)
- `run-integration-tests-manual.sh` - Shows manual setup instructions
- `check-test-status.sh` - Diagnostic script to check system status
- `TEST-RUNNER-GUIDE.md` - This file

### Modified Files

- `hardhat/integration-test-helpers.js` - Fixed RPC URL and reduced logging noise
- `integration-tests/README.md` - Added clear documentation about process architecture and how to run tests

## Next Steps

1. **Test the automated runner**: Run `./run-integration-tests.sh` and observe the output
2. **Check for errors**: If tests fail, use diagnostic tools to understand why
3. **Iterate**: The test infrastructure is now in place, so you can focus on adding more test scenarios

## Notes

- The indexer may take 10-30 seconds to start up and sync (this is normal)
- If you see lots of `eth_getBlockByNumber` calls in Hardhat logs, that's the indexer syncing
- Tests should complete in < 2 minutes for the scenario tests
- Generative tests take longer (2-15 minutes depending on size)
