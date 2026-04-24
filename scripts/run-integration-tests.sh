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

# Export UID/GID so docker-compose runs containers as the current user.
# UID is a bash built-in and isn't exported by default; GID has no built-in at all.
export UID
export GID=$(id -g)

docker_compose() {
    if command -v docker-compose >/dev/null 2>&1; then
        docker-compose "$@"
    else
        docker compose "$@"
    fi
}

# Use ephemeral database for integration tests - fresh in-memory state each run
# This avoids issues with stale indexer state when hardhat restarts fresh
export PONDER_EPHEMERAL=true

# Stop any existing containers and clean up any old test data
# This ensures we start fresh with no stale container state
docker_compose down 2>/dev/null || true

# Wipe old test data. Files are user-owned so plain rm works; fall back to
# docker if there are stale root-owned files from a pre-fix run.
if ! rm -rf "$COMMONALITY_DATA_DIR" 2>/dev/null; then
    docker run --rm -v "/tmp:/tmp" alpine rm -rf "$COMMONALITY_DATA_DIR"
fi

# Pre-create data directories owned by the current user so containers
# don't create them as root.
mkdir -p "$COMMONALITY_DATA_DIR/hardhat" "$COMMONALITY_DATA_DIR/ipfs" "$COMMONALITY_DATA_DIR/ponder"

# Build the SDK to ensure integration tests use latest code
# The SDK is a workspace dependency used by integration-tests, so it must be built
# before tests run (tests run on host, not in Docker)
npm run build -- --filter=@commonality/sdk

# Start only the services the integration tests actually use.
# Avoid starting ui-ipfs-publisher here: it bind-mounts the repo and runs
# npm install/build against /workspace, which can race with the host-side
# test process by mutating node_modules mid-run.
BUILDABLE_SERVICES=(
    hardhat-deploy
    indexer
    platform-api-service
)

SERVICES_TO_BUILD=()
while IFS= read -r line; do
    SERVICES_TO_BUILD+=("$line")
done < <(node "$SCRIPT_DIR/docker-build-plan.mjs" list "${BUILDABLE_SERVICES[@]}")
if [ "${#SERVICES_TO_BUILD[@]}" -gt 0 ]; then
    echo "Rebuilding Docker images whose declared inputs changed:"
    printf '  %s\n' "${SERVICES_TO_BUILD[@]}"
    docker_compose build "${SERVICES_TO_BUILD[@]}"
    node "$SCRIPT_DIR/docker-build-plan.mjs" record "${SERVICES_TO_BUILD[@]}"
else
    echo "Reusing existing Docker images; no declared build inputs changed."
fi

PONDER_EPHEMERAL=true docker_compose up -d \
    hardhat-node \
    hardhat-deploy \
    ipfs \
    indexer \
    platform-api-service

# Wait for indexer to be ready by polling its GraphQL endpoint
echo "Waiting for indexer to start..."
for i in $(seq 1 90); do
    if curl -sf -X POST -H "Content-Type: application/json" \
        --data '{"query":"{ _meta { block { number } } }"}' \
        http://localhost:42069/graphql > /dev/null 2>&1; then
        echo "Indexer is ready!"
        break
    fi
    if [ "$i" -eq 90 ]; then
        echo "Timeout waiting for indexer to start"
        docker_compose logs indexer | tail -50
        exit 1
    fi
    sleep 2
done

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

cd "$SCRIPT_DIR/.."
docker_compose down
rm -rf "$COMMONALITY_DATA_DIR" 2>/dev/null || docker run --rm -v "/tmp:/tmp" alpine rm -rf "$COMMONALITY_DATA_DIR"

exit $EXIT_CODE
