#!/bin/bash

# Script to orchestrate the full integration test setup
# This script:
# 1. Starts the Hardhat node and deploys contracts (using Docker)
# 2. Starts the Ponder indexer (using Docker)
# 3. Runs the integration tests
# 4. Cleans up Docker containers
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

# Function to cleanup Docker containers
cleanup_processes() {
    log_message ""
    log_message "=== Cleaning Up Docker Containers ==="

    # Stop all Docker containers
    cd "$SCRIPT_DIR/.."
    docker-compose down >> "$ORCHESTRATION_LOG" 2>&1 || true
    log_message "✓ Docker containers stopped"
}

# Set up cleanup on script exit
trap cleanup_processes EXIT INT TERM

# Step 1: Start Hardhat node, IPFS, and deploy contracts (using Docker)
log_message "=== Step 1: Starting Hardhat Node, IPFS, and Deploying Contracts (Docker) ==="
log_message ""

# Change to project root for docker-compose
cd "$SCRIPT_DIR/.."

# Stop any existing containers first
log_message "Ensuring clean state..."
docker-compose down >> "$ORCHESTRATION_LOG" 2>&1 || true

# Start hardhat node and IPFS in background
log_message "Starting Hardhat node and IPFS containers..."
if ! docker-compose up -d hardhat-node ipfs >> "$ORCHESTRATION_LOG" 2>&1; then
    log_message "✗ Failed to start containers!"
    log_message ""
    log_message "=== Docker logs ==="
    docker-compose logs hardhat-node ipfs | tail -n 20
    exit 1
fi

# Wait for node to be healthy
log_message "Waiting for Hardhat node to be ready..."
WAIT_COUNT=0
MAX_WAIT=30
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if docker-compose ps hardhat-node | grep -q "healthy"; then
        break
    fi
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $((WAIT_COUNT % 5)) -eq 0 ]; then
        log_message "  Still waiting... ($WAIT_COUNT/$MAX_WAIT)"
    fi
done

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    log_message "✗ Hardhat node failed to become healthy!"
    log_message ""
    log_message "=== Docker logs ==="
    docker-compose logs hardhat-node | tail -n 20
    exit 1
fi

log_message "✓ Hardhat node is ready"

# Wait for IPFS to be healthy
log_message "Waiting for IPFS node to be ready..."
WAIT_COUNT=0
MAX_WAIT=30
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if docker-compose ps ipfs | grep -q "healthy"; then
        break
    fi
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $((WAIT_COUNT % 5)) -eq 0 ]; then
        log_message "  Still waiting... ($WAIT_COUNT/$MAX_WAIT)"
    fi
done

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    log_message "✗ IPFS node failed to become healthy!"
    log_message ""
    log_message "=== Docker logs ==="
    docker-compose logs ipfs | tail -n 20
    exit 1
fi

log_message "✓ IPFS node is ready"

# Deploy contracts
log_message "Deploying contracts..."
if ! docker-compose run --rm hardhat-deploy >> "$ORCHESTRATION_LOG" 2>&1; then
    log_message "✗ Failed to deploy contracts!"
    log_message ""
    log_message "=== Last 20 lines of orchestration log ==="
    tail -n 20 "$ORCHESTRATION_LOG"
    exit 1
fi

log_message "✓ Hardhat node and IPFS started, contracts deployed successfully"
log_message ""

# Step 2: Start indexer (Docker)
log_message "=== Step 2: Starting Ponder Indexer (Docker) ==="
log_message ""

# Start indexer container
log_message "Starting indexer container..."
if ! docker-compose up -d indexer >> "$ORCHESTRATION_LOG" 2>&1; then
    log_message "✗ Failed to start indexer container!"
    log_message ""
    log_message "=== Docker logs ==="
    docker-compose logs indexer | tail -n 20
    exit 1
fi

# Wait for indexer to be healthy
log_message "Waiting for indexer to be ready..."
WAIT_COUNT=0
MAX_WAIT=60
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if docker-compose ps indexer | grep -q "healthy"; then
        break
    fi
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $((WAIT_COUNT % 10)) -eq 0 ]; then
        log_message "  Still waiting... ($WAIT_COUNT/$MAX_WAIT)"
    fi
done

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    log_message "✗ Indexer failed to become healthy!"
    log_message ""
    log_message "=== Docker logs ==="
    docker-compose logs indexer | tail -n 30
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
log_message "  ✓ Hardhat node started and contracts deployed (Docker)"
log_message "  ✓ IPFS node started (Docker)"
log_message "  ✓ Ponder indexer started and synced (Docker)"
log_message "  ✓ All integration tests passed"
log_message "  ✓ Docker containers cleaned up"
log_message ""
log_message "Log files available:"
log_message "  Full orchestration log: $ORCHESTRATION_LOG"
log_message ""
log_message "To view Docker logs:"
log_message "  docker-compose logs hardhat-node"
log_message "  docker-compose logs ipfs"
log_message "  docker-compose logs indexer"

exit 0
