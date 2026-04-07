#!/bin/bash

# Manage docker-compose services (hardhat, IPFS, indexer, platform API, etc.)
#
# Usage:
#   ./services.sh --start   # Start services (preserves existing data)
#   ./services.sh --stop    # Stop services (preserves existing data)
#   ./services.sh --status  # Show whether services are running
#
# Note: This script isn't much more than a thin wrapper around
# docker-compose; it's fine to just use docker-compose directly
# if you're comfortable with that. We might be better off just
# documenting the docker-compose commands instead of having this
# script at all.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${COMMONALITY_DATA_DIR:-./data}"
cd "$SCRIPT_DIR"

# Export UID/GID so docker-compose can run containers as the current user.
# UID is a bash built-in and isn't exported by default; GID has no built-in at all.
export UID
export GID=$(id -g)

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --start   Start services (preserves existing data)"
    echo "  --stop    Stop services (preserves existing data)"
    echo "  --status  Show whether services are running"
    echo "  --help    Show this help message"
    echo ""
    echo "Data is stored in $DATA_DIR/. Use data.sh to manage it."
}

check_existing_containers() {
    local abs_data_dir
    abs_data_dir="$(realpath "$DATA_DIR")"

    # If any managed containers are unhealthy, stop and tell the user rather
    # than letting compose fail with a cryptic dependency error.
    local unhealthy
    unhealthy=$(docker compose ps --format '{{.Name}} {{.Health}}' 2>/dev/null \
        | awk '$2 == "unhealthy" {print $1}' || true)
    if [ -n "$unhealthy" ]; then
        echo "Error: the following containers are running but unhealthy:"
        echo "$unhealthy" | sed 's/^/  /'
        echo ""
        echo "This usually means a previous run left containers in a bad state"
        echo "(e.g. the data directory was wiped while containers were still running)."
        echo "Run './services.sh --stop' first, then try again."
        exit 1
    fi

    # If the IPFS container is running but its repo is missing, docker compose
    # will not restart it (it's already 'running'), so ipfs init never fires
    # and the health check keeps failing.
    if docker inspect commonality-ipfs &>/dev/null 2>&1; then
        local ipfs_state
        ipfs_state=$(docker inspect commonality-ipfs --format '{{.State.Status}}' 2>/dev/null || true)
        if [ "$ipfs_state" = "running" ] && [ ! -f "$abs_data_dir/ipfs/config" ]; then
            echo "Error: the IPFS container is running but $abs_data_dir/ipfs/config does not exist."
            echo ""
            echo "The data directory may have been wiped while the container was still running."
            echo "Run './services.sh --stop' first, then try again."
            exit 1
        fi
    fi
}

start_services() {
    "$SCRIPT_DIR/scripts/check-prerequisites.sh"
    check_existing_containers
    echo "Starting services with data directory: $DATA_DIR"
    # Pre-create data directories owned by the current user so containers
    # don't create them as root.
    mkdir -p "$DATA_DIR/hardhat" "$DATA_DIR/ipfs" "$DATA_DIR/ponder"
    docker-compose up -d
    echo ""
    echo "Services started. Use 'docker-compose logs -f' to view logs."
    echo "Platform API service health: http://localhost:3001/health"
}

stop_services() {
    echo "Stopping services..."
    docker-compose down
    echo "Services stopped (data preserved in $DATA_DIR)."
}

show_status() {
    docker-compose ps
}

case "${1:-}" in
    --start)
        start_services
        ;;
    --stop)
        stop_services
        ;;
    --status)
        show_status
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
