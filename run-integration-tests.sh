#!/usr/bin/env bash

# Integration Test Runner
# This script manages all required processes for integration testing:
# 1. Hardhat node (blockchain)
# 2. Integration tests (which start the indexer internally)

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}Cleaning up...${NC}"

  if [ ! -z "$HARDHAT_PID" ]; then
    echo "Stopping Hardhat node (PID: $HARDHAT_PID)..."
    kill $HARDHAT_PID 2>/dev/null || true
    wait $HARDHAT_PID 2>/dev/null || true
  fi

  # Kill any remaining processes on the hardhat port
  lsof -ti:8545 | xargs kill -9 2>/dev/null || true

  # Kill any remaining processes on the indexer port
  lsof -ti:42069 | xargs kill -9 2>/dev/null || true

  echo -e "${GREEN}Cleanup complete${NC}"
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Integration Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if ports are already in use
if lsof -Pi :8545 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${YELLOW}WARNING: Port 8545 (Hardhat) is already in use${NC}"
  echo "Attempting to kill existing process..."
  lsof -ti:8545 | xargs kill -9 2>/dev/null || true
  sleep 2
fi

if lsof -Pi :42069 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${YELLOW}WARNING: Port 42069 (Indexer) is already in use${NC}"
  echo "Attempting to kill existing process..."
  lsof -ti:42069 | xargs kill -9 2>/dev/null || true
  sleep 2
fi

# Step 1: Start Hardhat node
echo -e "${BLUE}[1/2] Starting Hardhat node...${NC}"
cd hardhat
npx hardhat node > /tmp/hardhat-node.log 2>&1 &
HARDHAT_PID=$!
cd ..

echo "  Hardhat node started (PID: $HARDHAT_PID)"
echo "  Waiting for Hardhat to be ready..."

# Wait for Hardhat to be ready
for i in {1..30}; do
  if curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8545 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Hardhat node is ready${NC}"
    break
  fi

  if [ $i -eq 30 ]; then
    echo -e "${RED}ERROR: Hardhat node failed to start within 30 seconds${NC}"
    echo "Check logs: tail -f /tmp/hardhat-node.log"
    exit 1
  fi

  sleep 1
done

echo ""

# Step 2: Run integration tests (which will start the indexer internally)
echo -e "${BLUE}[2/2] Running integration tests...${NC}"
echo "  The tests will:"
echo "    - Deploy contracts to the local Hardhat node"
echo "    - Start the Ponder indexer (on port 42069)"
echo "    - Run test scenarios"
echo "    - Stop the indexer when complete"
echo ""

# Run the tests
npm run integration-tests

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All tests completed!${NC}"
echo -e "${GREEN}========================================${NC}"
