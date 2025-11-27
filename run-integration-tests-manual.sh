#!/usr/bin/env bash

# Manual Integration Test Runner
# Use this if you want to manually manage the processes in separate terminals

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Manual Integration Test Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}To run integration tests manually, you need 2 terminals:${NC}"
echo ""
echo -e "${BLUE}Terminal 1 - Hardhat Node:${NC}"
echo "  cd hardhat"
echo "  npx hardhat node"
echo ""
echo -e "${BLUE}Terminal 2 - Integration Tests:${NC}"
echo "  npm run integration-tests"
echo ""
echo -e "${YELLOW}Note: The integration tests will automatically start and stop${NC}"
echo -e "${YELLOW}the Ponder indexer, so you don't need a third terminal.${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Or, use the automated runner:"
echo "  ./run-integration-tests.sh"
echo ""
