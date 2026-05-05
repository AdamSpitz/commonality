#!/bin/bash

# Manage docker-compose services (hardhat, IPFS, indexer, platform API, etc.)
#
# Usage:
#   ./scripts/services.sh --start   # Start services (preserves existing data)
#   ./scripts/services.sh --stop    # Stop services (preserves existing data)
#   ./scripts/services.sh --status  # Show whether services are running
#   ./scripts/services.sh --url     # Print the current SPA URLs for all domains
#
# Note: This script isn't much more than a thin wrapper around
# docker-compose; it's fine to just use docker-compose directly
# if you're comfortable with that. We might be better off just
# documenting the docker-compose commands instead of having this
# script at all.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${COMMONALITY_DATA_DIR:-./data}"
UI_IPFS_ARTIFACT_DIR="./data/ui-ipfs"
cd "$SCRIPT_DIR/.."

# Export UID/GID so docker-compose can run containers as the current user.
# UID is a bash built-in and isn't exported by default; GID has no built-in at all.
export UID
export GID=$(id -g)

docker_compose() {
    if command -v docker-compose >/dev/null 2>&1; then
        docker-compose "$@"
    else
        docker compose "$@"
    fi
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --start   Start services (preserves existing data)"
    echo "  --stop    Stop services (preserves existing data)"
    echo "  --status  Show whether services are running"
    echo "  --url     Print the current SPA URLs for all domains"
    echo "  --help    Show this help message"
    echo ""
    echo "Data is stored in $DATA_DIR/. Use scripts/data.sh to manage it."
}

resolve_path_allow_missing() {
    local path="$1"
    local dir
    local base

    dir="$(dirname "$path")"
    base="$(basename "$path")"

    echo "$(cd "$dir" && pwd)/$base"
}

ponder_data_exists() {
    [ -d "$DATA_DIR/ponder" ] && [ -n "$(find "$DATA_DIR/ponder" -mindepth 1 -print -quit 2>/dev/null)" ]
}

clear_stale_ponder_for_fresh_chain() {
    if [ ! -f "$DATA_DIR/hardhat/state.json" ] && ponder_data_exists; then
        echo "Warning: found existing Ponder indexer data but no saved local chain state."
        echo "This usually means the chain was reset without clearing the indexer DB; clearing $DATA_DIR/ponder to avoid a blank/stale UI."
        rm -rf "$DATA_DIR/ponder"
    fi
}

check_existing_containers() {
    local abs_data_dir
    abs_data_dir="$(resolve_path_allow_missing "$DATA_DIR")"

    # If any managed containers are unhealthy, stop and tell the user rather
    # than letting compose fail with a cryptic dependency error.
    local unhealthy
    unhealthy=$(docker_compose ps --format '{{.Name}} {{.Health}}' 2>/dev/null \
        | awk '$2 == "unhealthy" {print $1}' || true)
    if [ -n "$unhealthy" ]; then
        echo "Error: the following containers are running but unhealthy:"
        echo "$unhealthy" | sed 's/^/  /'
        echo ""
        echo "This usually means a previous run left containers in a bad state"
        echo "(e.g. the data directory was wiped while containers were still running)."
        echo "Run './scripts/services.sh --stop' first, then try again."
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
            echo "Run './scripts/services.sh --stop' first, then try again."
            exit 1
        fi
    fi
}

print_spa_urls() {
    local found=false
    for domain in commonality pubstarter alignment delegation tally content-funding noninflammatory csm conceptspace; do
        local spa_file="$UI_IPFS_ARTIFACT_DIR/$domain/spa-url.txt"
        if [ -f "$spa_file" ]; then
            printf "  %-22s %s\n" "$domain" "$(cat "$spa_file")"
            found=true
        fi
    done

    if ! $found; then
        echo "Error: no SPA URL artifacts found in $UI_IPFS_ARTIFACT_DIR/." >&2
        echo "Run './scripts/services.sh --start' first." >&2
        return 1
    fi
}

wait_for_spa_gateway() {
    echo "Waiting for the local IPFS gateway to serve all domain SPAs..."
    local max_attempts=30

    for domain in commonality pubstarter alignment delegation tally content-funding noninflammatory csm conceptspace; do
        local spa_file="$UI_IPFS_ARTIFACT_DIR/$domain/spa-url.txt"
        [ -f "$spa_file" ] || continue

        local spa_url entrypoint_url attempt
        spa_url=$(cat "$spa_file")
        entrypoint_url="${spa_url%#*}index.html"
        attempt=1

        while [ "$attempt" -le "$max_attempts" ]; do
            if curl --silent --show-error --fail "$entrypoint_url" >/dev/null; then
                break
            fi
            sleep 1
            attempt=$((attempt + 1))
        done

        if [ "$attempt" -gt "$max_attempts" ]; then
            echo "Error: $domain SPA was published but never became reachable at $entrypoint_url" >&2
            return 1
        fi
    done
}

wait_for_ui_ipfs_publish() {
    echo "Waiting for all domain UI builds to publish to IPFS..."

    local -a pending=(commonality pubstarter alignment delegation tally content-funding noninflammatory csm conceptspace)

    while [ "${#pending[@]}" -gt 0 ]; do
        local -a still_pending=()
        for domain in "${pending[@]}"; do
            local container_name="commonality-ui-ipfs-publisher-${domain}"
            local status
            status=$(docker inspect "$container_name" --format '{{.State.Status}}' 2>/dev/null || true)

            case "$status" in
                created|running|restarting)
                    still_pending+=("$domain")
                    ;;
                exited)
                    local exit_code
                    exit_code=$(docker inspect "$container_name" --format '{{.State.ExitCode}}')
                    if [ "$exit_code" -ne 0 ]; then
                        echo "Error: UI IPFS publish failed for domain: $domain"
                        echo "Showing recent logs from $container_name:"
                        docker_compose logs --tail=200 "ui-ipfs-publisher-${domain}" || true
                        exit 1
                    fi
                    echo "  $domain: published"
                    ;;
                "")
                    still_pending+=("$domain")
                    ;;
                *)
                    echo "Warning: unexpected $container_name state: $status"
                    still_pending+=("$domain")
                    ;;
            esac
        done

        pending=("${still_pending[@]}")
        if [ "${#pending[@]}" -gt 0 ]; then
            sleep 2
        fi
    done

    wait_for_spa_gateway

    echo ""
    echo "All domains published to IPFS:"
    print_spa_urls
}

start_services() {
    local -a compose_services=(
        hardhat-node
        hardhat-deploy
        ipfs
        indexer
        platform-api-service
        ui-ipfs-publisher-commonality
        ui-ipfs-publisher-pubstarter
        ui-ipfs-publisher-alignment
        ui-ipfs-publisher-delegation
        ui-ipfs-publisher-tally
        ui-ipfs-publisher-content-funding
        ui-ipfs-publisher-noninflammatory
        ui-ipfs-publisher-csm
        ui-ipfs-publisher-conceptspace
    )
    local -a buildable_services=(
        hardhat-deploy
        indexer
        platform-api-service
        ui-ipfs-publisher-commonality
        ui-ipfs-publisher-pubstarter
        ui-ipfs-publisher-alignment
        ui-ipfs-publisher-delegation
        ui-ipfs-publisher-tally
        ui-ipfs-publisher-content-funding
        ui-ipfs-publisher-noninflammatory
        ui-ipfs-publisher-csm
        ui-ipfs-publisher-conceptspace
    )
    local -a services_to_build=()

    "$SCRIPT_DIR/check-prerequisites.sh"
    check_existing_containers
    clear_stale_ponder_for_fresh_chain
    echo "Starting services with data directory: $DATA_DIR"
    # Pre-create data directories owned by the current user so containers
    # don't create them as root.
    mkdir -p "$DATA_DIR/hardhat" "$DATA_DIR/ipfs" "$DATA_DIR/ponder" \
        "$UI_IPFS_ARTIFACT_DIR/commonality" \
        "$UI_IPFS_ARTIFACT_DIR/pubstarter" \
        "$UI_IPFS_ARTIFACT_DIR/alignment" \
        "$UI_IPFS_ARTIFACT_DIR/delegation" \
        "$UI_IPFS_ARTIFACT_DIR/tally" \
        "$UI_IPFS_ARTIFACT_DIR/content-funding" \
        "$UI_IPFS_ARTIFACT_DIR/noninflammatory" \
        "$UI_IPFS_ARTIFACT_DIR/csm" \
        "$UI_IPFS_ARTIFACT_DIR/conceptspace"
    # The UI publisher bind-mounts these files so it reads contract addresses
    # written by hardhat-deploy at runtime instead of stale values baked into
    # the Docker image. Ensure clean checkouts have files to mount.
    mkdir -p ui
    touch .env ui/.env
    services_to_build=()
    while IFS= read -r line; do
        services_to_build+=("$line")
    done < <(node "$SCRIPT_DIR/docker-build-plan.mjs" list "${buildable_services[@]}")
    if [ "${#services_to_build[@]}" -gt 0 ]; then
        echo "Rebuilding Docker images whose declared inputs changed:"
        printf '  %s\n' "${services_to_build[@]}"
        docker_compose build "${services_to_build[@]}"
        node "$SCRIPT_DIR/docker-build-plan.mjs" record "${services_to_build[@]}"
    else
        echo "Reusing existing Docker images; no declared build inputs changed."
    fi
    docker_compose up -d --remove-orphans "${compose_services[@]}"
    wait_for_ui_ipfs_publish
    echo ""
    echo "Services started. Use 'docker compose logs -f' to view logs."
    echo "Platform API service health: http://localhost:3001/health"
}

stop_services() {
    echo "Stopping services..."
    docker_compose down --remove-orphans
    echo "Services stopped (data preserved in $DATA_DIR)."
}

show_status() {
    docker_compose ps
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
    --url)
        print_spa_urls
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
