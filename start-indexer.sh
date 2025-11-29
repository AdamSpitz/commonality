#!/bin/bash

# Script to start the Ponder indexer
# This runs the indexer in the background and logs its output

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INDEXER_DIR="$SCRIPT_DIR/indexer"
LOG_DIR="$SCRIPT_DIR/integration-tests/test-logs"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log file
INDEXER_LOG="$LOG_DIR/indexer.log"

echo "=== Starting Ponder Indexer ==="
echo ""

# Clean up old log file
rm -f "$INDEXER_LOG"

# Check if indexer is already running
if pgrep -f "ponder dev" > /dev/null; then
    echo "⚠️  Warning: Indexer appears to be already running"
    echo "You may want to stop it first with: ./stop-indexer.sh"
    echo ""
fi

# Start indexer in background
echo "Starting Ponder indexer in background..."
cd "$INDEXER_DIR"
npm run dev:no-ui > "$INDEXER_LOG" 2>&1 &
INDEXER_PID=$!

# Save PID immediately so cleanup can find it even if we fail later
echo $INDEXER_PID > "$LOG_DIR/indexer.pid"

echo "✓ Indexer started (PID: $INDEXER_PID)"
echo "  Log: $INDEXER_LOG"
echo ""

# Wait a moment to see if it starts successfully
echo "Waiting for indexer to initialize..."
sleep 3

# Check if the process is still running
if ! ps -p $INDEXER_PID > /dev/null 2>&1; then
    echo "✗ Indexer failed to start!"
    echo ""
    echo "=== Indexer log ==="
    cat "$INDEXER_LOG"
    echo ""
    exit 1
fi

echo "✓ Indexer is running!"
echo ""

# Check if the GraphQL endpoint is becoming available
echo "Checking if GraphQL endpoint is available..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    # Try to connect to the GraphQL endpoint
    if curl -s -X POST \
        -H "Content-Type: application/json" \
        --data '{"query":"{ _meta { block { number } } }"}' \
        http://localhost:42069/graphql > /dev/null 2>&1; then
        echo "✓ GraphQL endpoint is ready!"
        break
    fi

    attempt=$((attempt + 1))
    echo "  Attempt $attempt/$max_attempts..."
    sleep 1
done

if [ $attempt -eq $max_attempts ]; then
    echo "⚠️  GraphQL endpoint not ready after 30 seconds, but indexer is still running"
    echo "  Check the log file for more details: $INDEXER_LOG"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Indexer is running in the background (PID: $INDEXER_PID)"
echo "GraphQL endpoint: http://localhost:42069/graphql"
echo "To stop it later, run: ./stop-indexer.sh"
echo ""
echo "Next steps:"
echo "  Run tests: cd integration-tests && npm test"
echo ""
