#!/bin/bash

# Script to stop the indexer started by start-indexer.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/../integration-tests/test-logs/indexer.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found at $PID_FILE"
    echo "Indexer may not be running or was started manually."
    echo "You can try to stop it manually with: pkill -f 'ponder dev'"
    exit 1
fi

PID=$(cat "$PID_FILE")

if ps -p $PID > /dev/null 2>&1; then
    echo "Stopping indexer (PID: $PID)..."
    kill $PID
    sleep 2

    if ps -p $PID > /dev/null 2>&1; then
        echo "Process still running, sending SIGKILL..."
        kill -9 $PID
    fi

    echo "✓ Indexer stopped"
    rm "$PID_FILE"
else
    echo "Process $PID is not running"
    rm "$PID_FILE"
fi

# Also try to kill any remaining ponder dev processes (in case there are multiple)
if pgrep -f "ponder dev" > /dev/null; then
    echo "Stopping any remaining ponder dev processes..."
    pkill -f "ponder dev"
    sleep 1
    if pgrep -f "ponder dev" > /dev/null; then
        pkill -9 -f "ponder dev"
    fi
    echo "✓ All ponder processes stopped"
fi
