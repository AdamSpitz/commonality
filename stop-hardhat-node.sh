#!/bin/bash

# Script to stop the hardhat node started by start-node-and-deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/integration-tests/test-logs/hardhat-node.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found at $PID_FILE"
    echo "Hardhat node may not be running or was started manually."
    exit 1
fi

PID=$(cat "$PID_FILE")

if ps -p $PID > /dev/null 2>&1; then
    echo "Stopping Hardhat node (PID: $PID)..."
    kill $PID
    sleep 1

    if ps -p $PID > /dev/null 2>&1; then
        echo "Process still running, sending SIGKILL..."
        kill -9 $PID
    fi

    echo "✓ Hardhat node stopped"
    rm "$PID_FILE"
else
    echo "Process $PID is not running"
    rm "$PID_FILE"
fi
