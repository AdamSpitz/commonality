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


# Clean up old log file
rm -f "$ORCHESTRATION_LOG"

# Function to log messages both to console and log file
log_message() {
    echo "$1"
    echo "$1" >> "$ORCHESTRATION_LOG"
}

# Function to wait for a Docker service to be healthy
wait_for_healthy() {
    local service_name="$1"
    local max_wait="${2:-30}"
    local check_interval="${3:-5}"

    log_message "Waiting for $service_name to be ready..."
    local wait_count=0
    while [ $wait_count -lt $max_wait ]; do
        if docker-compose ps "$service_name" | grep -q "healthy"; then
            break
        fi
        sleep 1
        wait_count=$((wait_count + 1))
        if [ $((wait_count % check_interval)) -eq 0 ]; then
            log_message "  Still waiting... ($wait_count/$max_wait)"
        fi
    done

    if [ $wait_count -eq $max_wait ]; then
        log_message "✗ $service_name failed to become healthy!"
        log_message ""
        log_message "=== Docker logs ==="
        docker-compose logs "$service_name" | tail -n 20
        return 1
    fi

    log_message "✓ $service_name is ready"
    return 0
}

# Function to cleanup Docker containers
cleanup_processes() {
    log_message "Cleaning up..."
    cd "$SCRIPT_DIR/.."
    docker-compose down >> "$ORCHESTRATION_LOG" 2>&1 || true
}

# Set up cleanup on script exit
trap cleanup_processes EXIT INT TERM

# Step 1: Start Hardhat node, IPFS, and deploy contracts (using Docker)

# Change to project root for docker-compose
cd "$SCRIPT_DIR/.."

# Stop any existing containers first
docker-compose down >> "$ORCHESTRATION_LOG" 2>&1 || true

# Start hardhat node and IPFS in background

if ! docker-compose up -d hardhat-node ipfs >> "$ORCHESTRATION_LOG" 2>&1; then
    log_message "✗ Failed to start containers!"
    docker-compose logs hardhat-node ipfs | tail -n 20
    exit 1
fi

# Wait for node to be healthy
if ! wait_for_healthy "hardhat-node" 30 5; then
    exit 1
fi

# Wait for IPFS to be healthy
if ! wait_for_healthy "ipfs" 30 5; then
    exit 1
fi

# Deploy contracts
log_message "Deploying contracts..."
if ! docker-compose run --rm hardhat-deploy >> "$ORCHESTRATION_LOG" 2>&1; then
    log_message "✗ Failed to deploy contracts!"
    tail -n 20 "$ORCHESTRATION_LOG"
    exit 1
fi

log_message "✓ Contracts deployed"

# Step 2: Start indexer (Docker)
log_message "Starting indexer..."
if ! docker-compose up -d indexer >> "$ORCHESTRATION_LOG" 2>&1; then
    log_message "✗ Failed to start indexer!"
    docker-compose logs indexer | tail -n 20
    exit 1
fi

# Wait for indexer to be healthy
if ! wait_for_healthy "indexer" 60 10; then
    exit 1
fi

# Step 3: Run integration tests

cd "$SCRIPT_DIR/../integration-tests"
if [ -n "$TEST_PATTERN" ]; then
    log_message "Running tests: $TEST_PATTERN"
    if ! pnpm test -- "$TEST_PATTERN" 2>&1 | tee -a "$ORCHESTRATION_LOG"; then
        log_message "✗ Tests failed!"
        exit 1
    fi
else
    log_message "Running tests..."
    if ! pnpm test 2>&1 | tee -a "$ORCHESTRATION_LOG"; then
        log_message "✗ Tests failed!"
        exit 1
    fi
fi

log_message "✓ Tests passed"

exit 0
