#!/usr/bin/env bash

# Quick diagnostic script to check test status

echo "=== Checking Hardhat Node ==="
if curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545 2>/dev/null; then
  echo ""
else
  echo "Hardhat node is NOT running"
fi

echo ""
echo "=== Checking Indexer GraphQL API ==="
if curl -s -X POST -H "Content-Type: application/json" \
  --data '{"query":"{ _meta { status block { number } } }"}' \
  http://localhost:42069/graphql 2>/dev/null; then
  echo ""
else
  echo "Indexer is NOT running"
fi

echo ""
echo "=== Processes on relevant ports ==="
echo "Port 8545 (Hardhat):"
lsof -i:8545 2>/dev/null || echo "  (none)"

echo ""
echo "Port 42069 (Indexer):"
lsof -i:42069 2>/dev/null || echo "  (none)"
