#!/bin/bash

# Script to start the GraphQL server for integration tests
# This script starts the unified GraphQL server that wraps the indexer

set -e  # Exit on error
set -o pipefail  # Propagate pipe failures

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/integration-tests/test-logs"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log file for GraphQL server
GRAPHQL_LOG="$LOG_DIR/graphql-server.log"

echo "=== Starting GraphQL Server ==="
echo "GraphQL server will be available at: http://localhost:4000/graphql"
echo "Log file: $GRAPHQL_LOG"
echo ""

# Clean up old log file
rm -f "$GRAPHQL_LOG"

# Function to cleanup background processes
cleanup_graphql_server() {
    echo ""
    echo "=== Stopping GraphQL Server ==="
    
    # Stop GraphQL server by PID file first
    if [ -f "$LOG_DIR/graphql-server.pid" ]; then
        GRAPHQL_PID=$(cat "$LOG_DIR/graphql-server.pid")
        if ps -p $GRAPHQL_PID > /dev/null 2>&1; then
            echo "Stopping GraphQL server (PID: $GRAPHQL_PID)..."
            kill $GRAPHQL_PID 2>/dev/null || true
            sleep 1
        fi
        rm -f "$LOG_DIR/graphql-server.pid"
    fi
    
    # Kill any remaining GraphQL server processes
    if pgrep -f "node.*graphql-server" > /dev/null; then
        echo "Stopping any remaining GraphQL server processes..."
        pkill -f "node.*graphql-server" 2>/dev/null || true
        sleep 1
        # Force kill if still running
        if pgrep -f "node.*graphql-server" > /dev/null; then
            pkill -9 -f "node.*graphql-server" 2>/dev/null || true
        fi
    fi
    
    echo "✓ GraphQL server stopped"
}

# Set up cleanup on script exit
trap cleanup_graphql_server EXIT INT TERM

# Change to SDK directory and start GraphQL server
cd "$SCRIPT_DIR/sdk"

echo "Starting GraphQL server..."
# Start the GraphQL server in background and save PID
node -e "
import { startGraphQLServer } from './dist/graphql-server/server.js';

startGraphQLServer().catch(error => {
  console.error('Failed to start GraphQL server:', error);
  process.exit(1);
});
" > "$GRAPHQL_LOG" 2>&1 &

# Save PID
GRAPHQL_PID=$!
echo $GRAPHQL_PID > "$LOG_DIR/graphql-server.pid"

echo "✓ GraphQL server started with PID: $GRAPHQL_PID"

# Wait a moment for server to start
sleep 2

# Check if server is responding
if curl -s http://localhost:4000/graphql > /dev/null 2>&1; then
    echo "✓ GraphQL server is responding"
else
    echo "✗ GraphQL server failed to start"
    echo "Check log: $GRAPHQL_LOG"
    exit 1
fi

echo ""
echo "GraphQL server is running at: http://localhost:4000/graphql"
echo "Use Ctrl+C to stop the server"

# Wait for interrupt
wait
