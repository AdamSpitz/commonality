#!/bin/bash

# Script to orchestrate the full integration test setup
# This script:
# 1. Starts the Hardhat node and deploys contracts
# 2. Starts the Ponder indexer
# 3. Runs the integration tests
# 4. Cleans up background processes
#
# Usage:
#   ./scripts/run-integration-tests.sh [TEST_PATTERN]
#
# Arguments:
#   TEST_PATTERN (optional): Glob pattern or file to run specific tests
#                           Examples:
#                             ./scripts/run-integration-tests.sh delegation
#                             ./scripts/run-integration-tests.sh "delegation*.test.ts"
#                             ./scripts/run-integration-tests.sh "src/delegation-basic.test.ts"

set -e  # Exit on error
set -o pipefail  # Propagate pipe failures

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/../integration-tests/test-logs"
TEST_PATTERN="${1:-}"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log file for this script
ORCHESTRATION_LOG="$LOG_DIR/integration-tests.log"

echo "=== Running Full Integration Test Suite ==="
echo "This script will:"
echo "  1. Start Hardhat node and deploy contracts"
echo "  2. Start Ponder indexer"
if [ -n "$TEST_PATTERN" ]; then
    echo "  3. Run integration tests (pattern: $TEST_PATTERN)"
else
    echo "  3. Run all integration tests"
fi
echo "  4. Clean up background processes"
echo ""
echo "All output will be logged to: $ORCHESTRATION_LOG"
echo ""

# Clean up old log file
rm -f "$ORCHESTRATION_LOG"

# Function to log messages both to console and log file
log_message() {
    echo "$1"
    echo "$1" >> "$ORCHESTRATION_LOG"
}

# Function to cleanup background processes
cleanup_processes() {
    log_message ""
    log_message "=== Cleaning Up Background Processes ==="

    # Stop indexer by PID file first, then by process pattern
    if [ -f "$LOG_DIR/indexer.pid" ]; then
        INDEXER_PID=$(cat "$LOG_DIR/indexer.pid")
        if ps -p $INDEXER_PID > /dev/null 2>&1; then
            log_message "Stopping indexer (PID: $INDEXER_PID)..."
            kill $INDEXER_PID 2>/dev/null || true
            sleep 1
        fi
        rm -f "$LOG_DIR/indexer.pid"
    fi

    # Kill any remaining ponder processes
    if pgrep -f "ponder dev" > /dev/null; then
        log_message "Stopping any remaining ponder processes..."
        pkill -f "ponder dev" 2>/dev/null || true
        sleep 1
        # Force kill if still running
        if pgrep -f "ponder dev" > /dev/null; then
            pkill -9 -f "ponder dev" 2>/dev/null || true
        fi
    fi
    log_message "✓ Indexer stopped"

    # Stop GraphQL server by PID file first, then by process pattern
    if [ -f "$LOG_DIR/graphql-server.pid" ]; then
        GRAPHQL_PID=$(cat "$LOG_DIR/graphql-server.pid")
        if ps -p $GRAPHQL_PID > /dev/null 2>&1; then
            log_message "Stopping GraphQL server (PID: $GRAPHQL_PID)..."
            kill $GRAPHQL_PID 2>/dev/null || true
            sleep 1
        fi
        rm -f "$LOG_DIR/graphql-server.pid"
    fi

    # Kill any remaining GraphQL server processes
    if pgrep -f "node.*graphql-server" > /dev/null; then
        log_message "Stopping any remaining GraphQL server processes..."
        pkill -f "node.*graphql-server" 2>/dev/null || true
        sleep 1
        # Force kill if still running
        if pgrep -f "node.*graphql-server" > /dev/null; then
            pkill -9 -f "node.*graphql-server" 2>/dev/null || true
        fi
    fi
    log_message "✓ GraphQL server stopped"

    # Stop hardhat node by PID file first, then by process pattern
    if [ -f "$LOG_DIR/hardhat-node.pid" ]; then
        HARDHAT_PID=$(cat "$LOG_DIR/hardhat-node.pid")
        if ps -p $HARDHAT_PID > /dev/null 2>&1; then
            log_message "Stopping Hardhat node (PID: $HARDHAT_PID)..."
            kill $HARDHAT_PID 2>/dev/null || true
            sleep 1
        fi
        rm -f "$LOG_DIR/hardhat-node.pid"
    fi

    # Kill any remaining hardhat node processes
    if pgrep -f "hardhat node" > /dev/null; then
        log_message "Stopping any remaining hardhat node processes..."
        pkill -f "hardhat node" 2>/dev/null || true
        sleep 1
        # Force kill if still running
        if pgrep -f "hardhat node" > /dev/null; then
            pkill -9 -f "hardhat node" 2>/dev/null || true
        fi
    fi
    log_message "✓ Hardhat node stopped"
}

# Set up cleanup on script exit
trap cleanup_processes EXIT INT TERM

# Step 1: Start Hardhat node and deploy contracts
log_message "=== Step 1: Starting Hardhat Node and Deploying Contracts ==="
log_message ""

if ! "$SCRIPT_DIR/start-node-and-deploy.sh" 2>&1 | tee -a "$ORCHESTRATION_LOG"; then
    log_message "✗ Failed to start Hardhat node and deploy contracts!"
    log_message ""
    log_message "=== Last 20 lines of orchestration log ==="
    tail -n 20 "$ORCHESTRATION_LOG"
    exit 1
fi

log_message "✓ Hardhat node started and contracts deployed successfully"
log_message ""

# Step 2: Start indexer
log_message "=== Step 2: Starting Ponder Indexer ==="
log_message ""

if ! "$SCRIPT_DIR/start-indexer.sh" 2>&1 | tee -a "$ORCHESTRATION_LOG"; then
    log_message "✗ Failed to start indexer!"
    log_message ""
    log_message "=== Last 20 lines of orchestration log ==="
    tail -n 20 "$ORCHESTRATION_LOG"
    exit 1
fi

log_message "✓ Indexer started successfully"
log_message ""

# Step 3: Run integration tests
log_message "=== Step 3: Running Integration Tests ==="
log_message ""

cd "$SCRIPT_DIR/../integration-tests"
if [ -n "$TEST_PATTERN" ]; then
    log_message "Running tests matching pattern: $TEST_PATTERN"
    if ! npm test -- "$TEST_PATTERN" 2>&1 | tee -a "$ORCHESTRATION_LOG"; then
        log_message "✗ Integration tests failed!"
        log_message ""
        log_message "=== Test output ==="
        tail -n 50 "$ORCHESTRATION_LOG"
        exit 1
    fi
else
    if ! npm test 2>&1 | tee -a "$ORCHESTRATION_LOG"; then
        log_message "✗ Integration tests failed!"
        log_message ""
        log_message "=== Test output ==="
        tail -n 50 "$ORCHESTRATION_LOG"
        exit 1
    fi
fi

log_message "✓ All integration tests passed!"
log_message ""

# Success message
log_message "=== Integration Test Suite Completed Successfully ==="
log_message ""
log_message "Summary:"
log_message "  ✓ Hardhat node started and contracts deployed"
log_message "  ✓ Ponder indexer started and synced"
log_message "  ✓ All integration tests passed"
log_message "  ✓ Background processes cleaned up"
log_message ""
log_message "Log files available:"
log_message "  Full orchestration log: $ORCHESTRATION_LOG"
log_message "  Hardhat node log: $LOG_DIR/hardhat-node.log"
log_message "  Deployment log: $LOG_DIR/deploy.log"
log_message "  Indexer log: $LOG_DIR/indexer.log"

exit 0
