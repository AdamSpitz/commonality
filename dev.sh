#!/bin/bash

# Script for local development with persistent state
#
# Usage:
#   ./dev.sh              # Show this help message
#   ./dev.sh --start      # Start services (preserves existing data)
#   ./dev.sh --fresh      # Start with fresh data (wipes ./data)
#   ./dev.sh --stop       # Stop services without wiping data
#   ./dev.sh --wipe       # Wipe data directory only (doesn't start services)
#   ./dev.sh --seed       # Start services and populate with fake data
#   ./dev.sh --seed=small # Start services with small dataset (10 users, 3 rounds)
#   ./dev.sh --seed=medium # Start services with medium dataset (50 users, 5 rounds)
#   ./dev.sh --seed --use-hardhat-accounts  # Use hardhat accounts for first 20 users
#
# Data is stored in ./data/ by default:
#   ./data/
#     ├── hardhat/         # Blockchain chain data
#     ├── ipfs/            # IPFS node data
#     └── ponder/          # Indexer sync state
#
# To customize the data directory:
#   export COMMONALITY_DATA_DIR=/custom/path ./dev.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DATA_DIR="${COMMONALITY_DATA_DIR:-./data}"

size="small"
extra_args=""
parts=()

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --start       Start services (preserves existing data)"
    echo "  --fresh       Start with fresh data (wipes $DATA_DIR)"
    echo "  --stop        Stop services without wiping data"
    echo "  --wipe        Wipe data directory only (doesn't start)"
    echo "  --seed        Start services and populate with fake data (default: 10 users, 3 rounds)"
    echo "  --seed=small Start services with small dataset (10 users, 3 rounds)"
    echo "  --seed=medium Start services with medium dataset (50 users, 5 rounds)"
    echo "  --use-hardhat-accounts  Use hardhat accounts instead of random wallets (for first 20 users)"
    echo "  --help        Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  COMMONALITY_DATA_DIR    Set data directory (default: ./data)"
}

wipe_data() {
    echo "Wiping data directory: $DATA_DIR"
    
    # First, stop any running containers to release file handles
    docker-compose down 2>/dev/null || true
    
    # Try to remove the directory
    if ! rm -rf "$DATA_DIR" 2>/dev/null; then
        echo "Warning: Could not remove $DATA_DIR (permission denied)"
        echo ""
        echo "This can happen because docker runs as root and creates files owned by root."
        echo "To avoid this issue in the future, you can configure docker to run as your user:"
        echo "  https://docs.docker.com/engine/install/linux-postinstall/"
        echo ""
        echo "Trying to continue anyway..."
    fi
    
    # Create fresh directory
    mkdir -p "$DATA_DIR"
    echo "Data wiped."
}

start_services() {
    echo "Starting services with data directory: $DATA_DIR"
    docker-compose up -d
    echo ""
    echo "Services started. Use 'docker-compose logs -f' to view logs."
    echo "Press Ctrl+C to stop viewing logs (services will keep running)."
    echo ""
    echo "To stop services: docker-compose down"
    echo "To wipe data:    rm -rf $DATA_DIR"
}

stop_services() {
    echo "Stopping services..."
    docker-compose down
    echo "Services stopped (data preserved in $DATA_DIR)."
}

seed_data() {
    local size="${1:-small}"
    local extra_args="${2:-}"
    
    echo "Starting services with fake data (size: $size)..."
    
    # Start services (don't wipe - might have permission issues)
    docker-compose up -d
    
    # Wait for indexer to be healthy
    echo ""
    echo "Waiting for indexer to be ready..."
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -X POST -H "Content-Type: application/json" \
            --data '{"query":"{ _meta { block { number } } }"}' \
            http://localhost:42069/graphql > /dev/null 2>&1; then
            echo "Indexer is ready!"
            break
        fi
        attempt=$((attempt + 1))
        if [ $((attempt % 10)) -eq 0 ]; then
            echo "  Still waiting... ($attempt/$max_attempts)"
        fi
        sleep 1
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo "Error: Indexer did not become ready in time"
        docker-compose logs indexer | tail -20
        exit 1
    fi
    
    # Give it a moment to stabilize
    sleep 2
    
    # Run the simulation
    echo ""
    echo "Running fake data generation..."
    echo "================================"
    
    cd "$SCRIPT_DIR/fake-data-generation"
    
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
    
    case "$size" in
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
    
    echo ""
    echo "================================"
    echo "Fake data generation complete!"
    echo ""
    echo "The indexer is now catching up with the new blockchain data."
    echo "This may take a moment depending on the amount of data."
    echo ""
    echo "Services are running. Use 'docker-compose logs -f' to view logs."
    echo "To stop services: docker-compose down"
}

case "${1:-}" in
    --fresh)
        wipe_data
        start_services
        ;;
    --start)
        start_services
        ;;
    --stop)
        stop_services
        ;;
    --wipe)
        wipe_data
        ;;
    --seed|--seed=*)
        # Extract the size argument (e.g., --seed=small -> small)
        # and any extra arguments (e.g., --use-hardhat-accounts)
        size="small"
        extra_args=""
        
        if [[ "$1" == --seed=* ]]; then
            # Split by space to get size and any extra args
            # e.g., --seed=small --use-hardhat-accounts
            parts=(${1#*=})
            size="${parts[0]}"
            shift
        fi
        
        # Collect any remaining arguments that start with --
        while [[ "$1" == --* ]]; do
            extra_args="$extra_args $1"
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
