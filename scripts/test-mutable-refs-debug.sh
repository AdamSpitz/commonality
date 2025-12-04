#!/bin/bash

# Simple debug script to test if MutableRefUpdater events are being indexed

echo "=== Testing Mutable Refs Indexing ==="
echo ""

# Check .env
echo "Checking .env file..."
grep "MUTABLE_REF_UPDATER" .env
echo ""

# Check ponder config
echo "Checking ponder config..."
grep -A 5 "MUTABLE_REF_UPDATER" indexer/ponder.config.ts | head -10
echo ""

# Start node and deploy (if not already running)
if ! nc -z localhost 8545 2>/dev/null; then
    echo "Starting Hardhat node and deploying contracts..."
    ./scripts/start-node-and-deploy.sh
    sleep 2
fi

# Start indexer (if not already running)
if ! nc -z localhost 42069 2>/dev/null; then
    echo "Starting indexer..."
    ./scripts/start-indexer.sh
    sleep 5
fi

echo "Testing GraphQL query directly..."
curl -X POST http://localhost:42069/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ mutableRefs(owner: \"0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266\", name: \"test\") { owner name value } }"}' \
  | jq .

echo ""
echo "Done!"
