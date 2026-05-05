#!/bin/bash

# Stop services, wipe data, and restart services.
#
# Usage:
#   ./scripts/stop-wipe-restart.sh
#
# After this completes, run data.sh as usual:
#   ./scripts/data.sh --seed
#   ./scripts/data.sh --seed=medium --use-hardhat-accounts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Stopping services ==="
"$SCRIPT_DIR/services.sh" --stop

echo ""
echo "=== Wiping data ==="
"$SCRIPT_DIR/data.sh" --wipe

echo ""
echo "=== Starting services ==="
"$SCRIPT_DIR/services.sh" --start

echo ""
echo "Done. Services are running with a clean data directory."
