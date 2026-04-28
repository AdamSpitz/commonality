#!/bin/bash

# Manage dev data (wipe, seed with fake data).
#
# Usage:
#   ./scripts/data.sh --wipe                    # Wipe data directory (stops services first)
#   ./scripts/data.sh --seed                    # Populate with fake data (services must be running)
#   ./scripts/data.sh --seed=tiny               # Tiny dataset (5 users, 1 round, capped statements/actions)
#   ./scripts/data.sh --seed=small              # Small dataset (10 users, 3 rounds)
#   ./scripts/data.sh --seed=medium             # Medium dataset (50 users, 5 rounds)
#   ./scripts/data.sh --seed --use-hardhat-accounts   # Use hardhat accounts for first 20 users
#   ./scripts/data.sh --seed --debug-ipfs             # Show CIDs and content uploaded to IPFS
#
# Data is stored in ./data/ by default:
#   ./data/
#     ├── hardhat/         # Blockchain chain data
#     ├── ipfs/            # IPFS node data
#     └── ponder/          # Indexer sync state
#
# To customize the data directory:
#   COMMONALITY_DATA_DIR=/custom/path ./scripts/data.sh --seed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${COMMONALITY_DATA_DIR:-./data}"
cd "$SCRIPT_DIR/.."

# Export UID/GID so docker-compose can run containers as the current user.
# UID is a bash built-in and isn't exported by default; GID has no built-in at all.
export UID
export GID=$(id -g)

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --wipe              Wipe data directory (stops services first)"
    echo "  --seed[=SIZE]       Populate with fake data (services must be running)"
    echo "                        SIZE: tiny, small (default), medium, large"
    echo "  --use-hardhat-accounts  Use hardhat accounts instead of random wallets (for first 20 users)"
    echo "  --debug-ipfs        Show CIDs and content being uploaded to IPFS"
    echo "  --help              Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  COMMONALITY_DATA_DIR    Set data directory (default: ./data)"
}

wipe_data() {
    echo "Wiping data directory: $DATA_DIR"

    # Stop containers first to release file handles
    docker-compose down 2>/dev/null || true

    # Try to remove the directory
    if ! rm -rf "$DATA_DIR" 2>/dev/null; then
        echo "Error: Could not remove $DATA_DIR (permission denied)."
        echo "You may have stale root-owned files from a previous run without UID/GID export."
        echo "Try: sudo rm -rf $DATA_DIR"
        exit 1
    fi

    # Pre-create data directories owned by the current user so containers
    # don't create them as root.
    mkdir -p "$DATA_DIR/hardhat" "$DATA_DIR/ipfs" "$DATA_DIR/ponder"
    echo "Data wiped. (Services were stopped — run ./scripts/services.sh --start to restart.)"
}

require_services_running() {
    if ! curl -s http://localhost:8545 > /dev/null 2>&1; then
        echo "Error: Services don't appear to be running (can't reach localhost:8545)."
        echo "Start them first: ./scripts/services.sh --start"
        exit 1
    fi
}

wait_for_indexer() {
    echo "Waiting for indexer to be ready..."
    local max_attempts=60
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -s -X POST -H "Content-Type: application/json" \
            --data '{"query":"{ _meta { block { number } } }"}' \
            http://localhost:42069/graphql > /dev/null 2>&1; then
            echo "Indexer is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        if [ $((attempt % 10)) -eq 0 ]; then
            echo "  Still waiting... ($attempt/$max_attempts)"
        fi
        sleep 1
    done

    echo "Error: Indexer did not become ready in time"
    docker-compose logs indexer | tail -20
    exit 1
}

seed_data() {
    local size="${1:-small}"
    local extra_args="${2:-}"

    "$SCRIPT_DIR/check-prerequisites.sh"
    require_services_running

    echo "Generating fake data (size: $size)..."

    wait_for_indexer

    # Give it a moment to stabilize
    sleep 2

    cd "$SCRIPT_DIR/../fake-data-generation"

    # Only install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi

    # If using hardhat accounts, generate users first
    if [[ "$extra_args" == *"--use-hardhat-accounts"* ]]; then
        echo "Generating users with hardhat accounts..."
        npm run gen:users -- $extra_args
    fi

    echo ""
    echo "Running fake data generation..."
    echo "================================"

    case "$size" in
        tiny)
            npm run gen:tiny -- $extra_args
            ;;
        small)
            npm run gen:small -- $extra_args
            ;;
        medium)
            npm run gen:medium -- $extra_args
            ;;
        large)
            npm run gen:large -- $extra_args
            ;;
        *)
            npm run gen:simulate -- $extra_args
            ;;
    esac

    echo "================================"
    echo "Done! The indexer is now catching up with the new blockchain data."
}

case "${1:-}" in
    --wipe)
        wipe_data
        ;;
    --seed|--seed=*)
        size="small"
        extra_args=""

        if [[ "$1" == --seed=* ]]; then
            parts=(${1#*=})
            size="${parts[0]}"
        fi
        shift

        # Collect remaining arguments
        while [[ "${1:-}" == --* ]]; do
            if [[ "$1" == "--debug-ipfs" ]]; then
                export DEBUG_IPFS=true
            else
                extra_args="$extra_args $1"
            fi
            shift
        done

        seed_data "$size" "$extra_args"
        ;;
    --help|-h|"")
        show_usage
        ;;
    *)
        echo "Error: Unknown option: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
