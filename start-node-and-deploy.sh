#!/bin/bash

# Script to start a hardhat node and deploy contracts
# This runs the node in the background and waits for it to be ready before deploying

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARDHAT_DIR="$SCRIPT_DIR/hardhat"
LOG_DIR="$SCRIPT_DIR/integration-tests/test-logs"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log files
NODE_LOG="$LOG_DIR/hardhat-node.log"
DEPLOY_LOG="$LOG_DIR/deploy.log"

echo "=== Starting Hardhat Node and Deploying Contracts ==="
echo ""

# Clean up old log files
rm -f "$NODE_LOG" "$DEPLOY_LOG"

# Check if port 8545 is already in use
if lsof -i :8545 > /dev/null 2>&1; then
    echo "✗ Port 8545 is already in use!"
    echo ""
    echo "Checking for existing Hardhat node processes..."
    
    # Try to find and kill existing hardhat node processes
    EXISTING_PIDS=$(pgrep -f "hardhat node" || true)
    if [ -n "$EXISTING_PIDS" ]; then
        echo "Found existing Hardhat node processes: $EXISTING_PIDS"
        echo "Killing them..."
        echo "$EXISTING_PIDS" | xargs kill 2>/dev/null || true
        sleep 2
        
        # Check again if port is still in use
        if lsof -i :8545 > /dev/null 2>&1; then
            echo "✗ Port 8545 is still in use after killing processes."
            echo "Please manually stop the process using this port and try again."
            echo "You can find the process with: lsof -i :8545"
            exit 1
        else
            echo "✓ Successfully cleared port 8545"
        fi
    else
        echo "No Hardhat node processes found, but port 8545 is in use by another process."
        echo "Please manually stop the process using this port and try again."
        echo "You can find the process with: lsof -i :8545"
        exit 1
    fi
    echo ""
fi

# Function to check if hardhat node is ready
wait_for_hardhat() {
    echo "Waiting for Hardhat node to be ready..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        # Try to connect to the node using curl
        if curl -s -X POST \
            -H "Content-Type: application/json" \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            http://localhost:8545 > /dev/null 2>&1; then
            echo "✓ Hardhat node is ready!"
            return 0
        fi

        attempt=$((attempt + 1))
        echo "  Attempt $attempt/$max_attempts..."
        sleep 1
    done

    echo "✗ Hardhat node failed to start within 30 seconds"
    return 1
}

# Start hardhat node in background
echo "Starting Hardhat node in background..."
cd "$HARDHAT_DIR"
npx hardhat node > "$NODE_LOG" 2>&1 &
HARDHAT_PID=$!
echo "✓ Hardhat node started (PID: $HARDHAT_PID)"
echo "  Log: $NODE_LOG"
echo ""

# Wait for node to be ready
if ! wait_for_hardhat; then
    echo ""
    echo "=== Last 20 lines of node log ==="
    tail -n 20 "$NODE_LOG"
    echo ""
    
    # Check if the error is due to port already in use
    if grep -q "EADDRINUSE\|address already in use" "$NODE_LOG"; then
        echo "✗ Node failed to start because port 8545 is already in use!"
        echo ""
        echo "This might happen if:"
        echo "  1. Another Hardhat node is already running"
        echo "  2. Another process is using port 8545"
        echo ""
        echo "To fix this:"
        echo "  - Stop any existing Hardhat nodes: ./stop-hardhat-node.sh"
        echo "  - Or find what's using the port: lsof -i :8545"
        echo "  - Then kill the process: kill <PID>"
    else
        echo "✗ Hardhat node failed to start for unknown reasons"
    fi
    
    echo ""
    echo "Killing hardhat node..."
    kill $HARDHAT_PID 2>/dev/null || true
    exit 1
fi

# Verify the process is still running after becoming ready
if ! ps -p $HARDHAT_PID > /dev/null 2>&1; then
    echo "✗ Hardhat node process died after becoming ready!"
    echo ""
    echo "=== Last 20 lines of node log ==="
    tail -n 20 "$NODE_LOG"
    echo ""
    exit 1
fi

# Final verification: ensure node is still responsive
echo "Performing final health check..."
if ! curl -s -X POST \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8545 > /dev/null 2>&1; then
    echo "✗ Hardhat node is no longer responsive!"
    echo ""
    echo "=== Last 20 lines of node log ==="
    tail -n 20 "$NODE_LOG"
    echo ""
    echo "Killing hardhat node..."
    kill $HARDHAT_PID 2>/dev/null || true
    exit 1
fi

echo "✓ Hardhat node is running and responsive (PID: $HARDHAT_PID)"
echo ""

# Deploy contracts
echo "Deploying contracts..."
npm run deploy-local > "$DEPLOY_LOG" 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Deployment successful!"
    echo "  Log: $DEPLOY_LOG"
else
    echo "✗ Deployment failed!"
    echo ""
    echo "=== Deployment log ==="
    cat "$DEPLOY_LOG"
    echo ""
    echo "Killing hardhat node..."
    kill $HARDHAT_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Hardhat node is running in the background (PID: $HARDHAT_PID)"
echo "To stop it later, run: kill $HARDHAT_PID"
echo ""
echo "Next steps:"
echo "  1. Start the indexer: cd indexer && npm run dev:no-ui"
echo "  2. Run tests: cd integration-tests && npm test"
echo ""

# Save PID to file for easy cleanup
echo $HARDHAT_PID > "$LOG_DIR/hardhat-node.pid"
echo "Node PID saved to: $LOG_DIR/hardhat-node.pid"
