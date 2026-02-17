#!/bin/bash

# Script to run integration tests using Docker Compose
#
# Uses a separate data directory (/tmp/commonality-it) to ensure clean state
# for each test run. This data is wiped after tests complete.
#
# Docker Compose handles the service orchestration via depends_on + healthchecks:
# - indexer depends on hardhat-node (healthy) + ipfs (healthy) + hardhat-deploy (completed)
# - hardhat-deploy depends on hardhat-node (healthy)
# Tests run on the host machine against Dockerized services.
#
# Usage:
#   ./scripts/run-integration-tests.sh [TEST_PATTERN]
#
# Arguments:
#   TEST_PATTERN (optional): Glob pattern or file to run specific tests
#                           Examples:
#                             ./scripts/run-integration-tests.sh delegation
#                             ./scripts/run-integration-tests.sh "delegation*.test.ts"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Use separate data directory for integration tests (wiped after each run)
# This ensures clean state without affecting development data
export COMMONALITY_DATA_DIR="/tmp/commonality-it"

# Use ephemeral database for integration tests - fresh in-memory state each run
# This avoids issues with stale indexer state when hardhat restarts fresh
export PONDER_EPHEMERAL=true

# Stop any existing containers and clean up any old test data
# This ensures we start fresh with no stale container state
docker-compose down 2>/dev/null || true

# Use a docker container to clean up root-owned files in the data directory
# This is needed because docker runs as root and creates files we can't delete
# The sh -c wrapper is needed because glob expansion happens on host before docker runs
docker run --rm -v "$COMMONALITY_DATA_DIR:/data" alpine sh -c "rm -rf /data/*" 2>/dev/null || true

# Start all services with forced rebuild to ensure we test against latest code
# Docker's layer caching makes this fast when nothing has changed
# Pass PONDER_EPHEMERAL=true to ensure fresh in-memory database for each run
PONDER_EPHEMERAL=true docker-compose up -d --build

# Wait for indexer to be ready
echo "Waiting for indexer to start..."
sleep 10

# Run tests on host machine
cd integration-tests
if [ -n "$1" ]; then
    # Pass the test pattern directly to mocha (not as npm argument)
    npx mocha --grep "$1"
    EXIT_CODE=$?
else
    npm test
    EXIT_CODE=$?
fi

# Clean up test data - use docker to clean root-owned files from IPFS
cd "$SCRIPT_DIR/.."
docker run --rm -v "$COMMONALITY_DATA_DIR:/data" alpine sh -c "rm -rf /data/*" 2>/dev/null || true
docker-compose down

exit $EXIT_CODE
