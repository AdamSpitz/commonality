#!/bin/bash

# Stop services, wipe data, and restart services.
#
# Usage:
#   ./scripts/stop-wipe-restart.sh
#   ./scripts/stop-wipe-restart.sh --seed
#   ./scripts/stop-wipe-restart.sh --seed=demo --use-hardhat-accounts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_usage() {
    echo "Usage: $0 [--seed[=SIZE] [SEED_OPTIONS...]]"
    echo ""
    echo "Stops services, wipes local dev data, and starts services again."
    echo "If --seed is provided, forwards it and any remaining arguments to scripts/data.sh after services start."
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 --seed"
    echo "  $0 --seed=demo --use-hardhat-accounts"
}

case "${1:-}" in
    --help|-h)
        show_usage
        exit 0
        ;;
    "")
        ;;
    --seed|--seed=*)
        ;;
    *)
        echo "Error: Unknown option: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac

seed_args=("$@")

echo "=== Stopping services ==="
"$SCRIPT_DIR/services.sh" --stop

echo ""
echo "=== Wiping data ==="
"$SCRIPT_DIR/data.sh" --wipe

echo ""
echo "=== Starting services ==="
"$SCRIPT_DIR/services.sh" --start

if [ "${#seed_args[@]}" -gt 0 ]; then
    echo ""
    echo "=== Seeding data ==="
    "$SCRIPT_DIR/data.sh" "${seed_args[@]}"
fi

echo ""
echo "Done. Services are running with a clean data directory."
