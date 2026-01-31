#!/bin/bash

# Script to run E2E tests with Docker backend
#
# This script is a convenience wrapper around `npm run test:e2e` that
# ensures the Docker services are properly managed. The actual Docker
# orchestration is handled by Playwright's globalSetup and globalTeardown.
#
# Usage:
#   ./ui/scripts/run-e2e-tests.sh [PLAYWRIGHT_ARGS]
#
# Arguments:
#   PLAYWRIGHT_ARGS (optional): Any arguments to pass to Playwright
#                               Examples:
#                                 ./ui/scripts/run-e2e-tests.sh browse-statements
#                                 ./ui/scripts/run-e2e-tests.sh --ui
#                                 ./ui/scripts/run-e2e-tests.sh --headed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "🧪 Running E2E tests with Docker backend..."
echo ""

# Run Playwright tests
# The global setup/teardown in playwright.config.ts handles Docker lifecycle
if [ -n "$1" ]; then
    npm run test:e2e -- "$@"
    EXIT_CODE=$?
else
    npm run test:e2e
    EXIT_CODE=$?
fi

exit $EXIT_CODE
