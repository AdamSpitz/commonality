#!/bin/bash

# Exits nonzero if local dev prerequisites are missing.

missing=0

if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed."
    missing=1
elif ! docker info &> /dev/null 2>&1; then
    echo "Error: Docker daemon is not running. Start Docker and try again."
    missing=1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo "Error: Docker Compose is not installed."
    missing=1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "Error: node_modules not found. Run 'npm install' first."
    missing=1
fi

exit $missing
