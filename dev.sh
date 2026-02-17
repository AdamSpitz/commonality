#!/bin/bash

# Script for local development with persistent state
#
# Usage:
#   ./dev.sh              # Start services (preserves existing data)
#   ./dev.sh --fresh      # Start with fresh data (wipes ./data)
#   ./dev.sh --stop       # Stop services without wiping data
#   ./dev.sh --wipe       # Wipe data directory only (doesn't start services)
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

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --fresh    Start with fresh data (wipes $DATA_DIR)"
    echo "  --stop     Stop services without wiping data"
    echo "  --wipe     Wipe data directory only (doesn't start)"
    echo "  --help     Show this help message"
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
        echo "For now, manually remove the directory and try again:"
        echo "  sudo rm -rf $DATA_DIR"
        echo ""
        echo "Or, if you have sudo privileges without password, press Enter to try again..."
        read -r
        sudo rm -rf "$DATA_DIR" || exit 1
    fi
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

case "${1:-}" in
    --fresh)
        wipe_data
        start_services
        ;;
    --stop)
        stop_services
        ;;
    --wipe)
        wipe_data
        ;;
    --help|-h)
        show_usage
        ;;
    "")
        start_services
        ;;
    *)
        echo "Error: Unknown option: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
