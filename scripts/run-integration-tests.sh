#!/bin/bash

# Script to run integration tests using Docker Compose
#
# Docker Compose handles the service orchestration via depends_on + healthchecks:
# - indexer depends on hardhat-node (healthy) + ipfs (healthy) + hardhat-deploy (completed)
# - hardhat-deploy depends on hardhat-node (healthy)
# Tests run on the host machine against Dockerized services
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

# Clean up any existing containers and volumes
docker-compose down -v 2>/dev/null || true

# Start all services with forced rebuild to ensure we test against latest code
# Docker's layer caching makes this fast when nothing has changed
docker-compose up -d --build

# Run tests on host machine
cd integration-tests
if [ -n "$1" ]; then
    npm test -- "$1"
    EXIT_CODE=$?
else
    npm test
    EXIT_CODE=$?
fi

# Clean up
cd "$SCRIPT_DIR/.."
docker-compose down -v

exit $EXIT_CODE
