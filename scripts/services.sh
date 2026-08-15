#!/bin/bash

# Manage docker-compose services (hardhat, IPFS, indexer, platform API, etc.)
#
# Usage:
#   ./scripts/services.sh --start   # Start services (preserves existing data)
#   ./scripts/services.sh --stop    # Stop services (preserves existing data)
#   ./scripts/services.sh --status  # Show whether services are running
#   ./scripts/services.sh --url     # Print the stable local UI URLs for all domains
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
    echo "  --url     Print the stable local UI URLs for all domains"
    echo "  --check   Fail-fast: env / on-chain / SPA config sync (see check-local-config-sync.sh)"
    echo "  --help    Show this help message"
    echo ""
    echo "Data is stored in $DATA_DIR/. Use scripts/data.sh to manage it."
    echo ""
    echo "CauseStarter is a core domain (IPFS gateway + dedicated SPA on :8090)."
    echo "  Gateway: http://causestarter.localhost:8088/#/"
    echo "  App:     http://localhost:8090/  (cause-assist on :3002)"
    echo "  Rebuild: ./scripts/deploy-causestarter.sh"
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
    for domain in commonality lazyGiving alignment tally content-funding civility common-sense-majority conceptspace causestarter; do
        local stable_file="$UI_IPFS_ARTIFACT_DIR/$domain/stable-url.txt"
        local spa_file="$UI_IPFS_ARTIFACT_DIR/$domain/spa-url.txt"
        if [ -f "$stable_file" ]; then
            printf "  %-22s %s\n" "$domain" "$(cat "$stable_file")"
            found=true
        elif [ -f "$spa_file" ]; then
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

    for domain in commonality lazyGiving alignment tally content-funding civility common-sense-majority conceptspace causestarter; do
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

wait_for_ui_ipfs_publisher() {
    local domain="$1"
    local service_name="ui-ipfs-publisher-${domain}"
    local container_name="commonality-${service_name}"

    while true; do
        local status
        status=$(docker inspect "$container_name" --format '{{.State.Status}}' 2>/dev/null || true)

        case "$status" in
            created|running|restarting|"")
                sleep 2
                ;;
            exited)
                local exit_code
                exit_code=$(docker inspect "$container_name" --format '{{.State.ExitCode}}')
                if [ "$exit_code" -ne 0 ]; then
                    echo "Error: UI IPFS publish failed for domain: $domain"
                    echo "Showing recent logs from $container_name:"
                    docker_compose logs --tail=200 "$service_name" || true
                    exit 1
                fi
                echo "  $domain: published"
                return 0
                ;;
            *)
                echo "Warning: unexpected $container_name state: $status"
                sleep 2
                ;;
        esac
    done
}

publish_ui_domains_to_ipfs() {
    echo "Publishing domain UI builds to IPFS one at a time..."

    # Building all domain SPAs concurrently can exhaust Docker Desktop memory and
    # kill Vite with exit code 137. Build/publish sequentially for reliability.
    for domain in commonality lazyGiving alignment tally content-funding civility common-sense-majority conceptspace causestarter; do
        echo "  $domain: building and publishing..."
        docker_compose up -d --no-deps --force-recreate "ui-ipfs-publisher-${domain}"
        wait_for_ui_ipfs_publisher "$domain"
    done

    wait_for_spa_gateway

    echo ""
    echo "All domains published to IPFS. Stable local UI URLs:"
    print_spa_urls
}

wait_for_local_ui_gateway() {
    echo "Waiting for the stable local UI gateway..."
    local max_attempts=30
    local attempt=1

    while [ "$attempt" -le "$max_attempts" ]; do
        if curl --silent --show-error --fail "http://localhost:8088/health" >/dev/null; then
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done

    echo "Error: stable local UI gateway did not become reachable at http://localhost:8088/health" >&2
    return 1
}

load_env_file_if_present() {
    local file="$1"
    if [ ! -f "$file" ]; then
        return 0
    fi
    # shellcheck disable=SC1090
    set -a
    # shellcheck disable=SC1091
    . "$file"
    set +a
}

map_causestarter_contract_env() {
    # Map root .env / hardhat deploy names onto VITE_* keys for CauseStarter runtime config.
    export VITE_BELIEFS_CONTRACT_ADDRESS="${VITE_BELIEFS_CONTRACT_ADDRESS:-${BELIEFS_CONTRACT_ADDRESS:-}}"
    export VITE_IMPLICATIONS_CONTRACT_ADDRESS="${VITE_IMPLICATIONS_CONTRACT_ADDRESS:-${IMPLICATIONS_CONTRACT_ADDRESS:-}}"
    export VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS="${VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS:-${MUTABLE_REF_UPDATER_CONTRACT_ADDRESS:-${MUTABLE_REF_UPDATER_ADDRESS:-}}}"
    export VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS="${VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS:-${DELEGATABLE_NOTES_CONTRACT_ADDRESS:-${DELEGATABLE_NOTES_ADDRESS:-}}}"
    export VITE_NOTE_INTENT_CONTRACT_ADDRESS="${VITE_NOTE_INTENT_CONTRACT_ADDRESS:-${NOTE_INTENT_ADDRESS:-}}"
    export VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS="${VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS:-${ASSURANCE_CONTRACT_FACTORY_ADDRESS:-}}"
    export VITE_ERC1155_FACTORY_ADDRESS="${VITE_ERC1155_FACTORY_ADDRESS:-${ERC1155_FACTORY_ADDRESS:-}}"
    export VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS="${VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS:-${ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS:-${ALIGNMENT_ATTESTATIONS_ADDRESS:-}}}"
    export VITE_TRUST_REGISTRY_CONTRACT_ADDRESS="${VITE_TRUST_REGISTRY_CONTRACT_ADDRESS:-${TRUST_REGISTRY_ADDRESS:-}}"
    export VITE_DEFAULT_ALIGNMENT_TRUST_ROOT="${VITE_DEFAULT_ALIGNMENT_TRUST_ROOT:-0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f}"
    export VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS="${VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS:-${NUDGE_PUBLICATIONS_CONTRACT_ADDRESS:-}}"
    export VITE_PUBLISHED_DATA_CONTRACT_ADDRESS="${VITE_PUBLISHED_DATA_CONTRACT_ADDRESS:-${PUBLISHED_DATA_CONTRACT_ADDRESS:-}}"
    export VITE_PROJECT_FACTORY_CONTRACT_ADDRESS="${VITE_PROJECT_FACTORY_CONTRACT_ADDRESS:-${PROJECT_FACTORY_ADDRESS:-}}"
    export VITE_PAYMENT_TOKEN_ADDRESS="${VITE_PAYMENT_TOKEN_ADDRESS:-${PAYMENT_TOKEN_ADDRESS:-}}"
    export VITE_CONTENT_REGISTRY_ADDRESS="${VITE_CONTENT_REGISTRY_ADDRESS:-${CONTENT_REGISTRY_ADDRESS:-}}"
    export VITE_CHANNEL_REGISTRY_ADDRESS="${VITE_CHANNEL_REGISTRY_ADDRESS:-${CHANNEL_REGISTRY_ADDRESS:-}}"
    export VITE_CHANNEL_ESCROW_ADDRESS="${VITE_CHANNEL_ESCROW_ADDRESS:-${CHANNEL_ESCROW_ADDRESS:-}}"
    export VITE_CREATOR_CONTRACT_FACTORY_ADDRESS="${VITE_CREATOR_CONTRACT_FACTORY_ADDRESS:-${CREATOR_CONTRACT_FACTORY_ADDRESS:-}}"
    export VITE_CHAIN_ID="${VITE_CHAIN_ID:-${CHAIN_ID:-31337}}"
    export VITE_ETH_RPC_URL="${VITE_ETH_RPC_URL:-${ETH_RPC_URL:-http://127.0.0.1:8545}}"
    export VITE_PLATFORM_API_URL="${VITE_PLATFORM_API_URL:-http://localhost:3001}"
    export COMMONALITY_ENVIRONMENT="${COMMONALITY_ENVIRONMENT:-local}"
    export VITE_EVENT_CACHE_URL="${VITE_EVENT_CACHE_URL:-}"
}

start_services() {
    local -a core_services=(
        hardhat-node
        hardhat-deploy
        ipfs
        published-data-ipfs-mirror
        indexer
        platform-api-service
    )
    local -a buildable_services=(
        hardhat-deploy
        published-data-ipfs-mirror
        indexer
        platform-api-service
        ui-ipfs-publisher-commonality
        ui-ipfs-publisher-lazyGiving
        ui-ipfs-publisher-alignment
        ui-ipfs-publisher-tally
        ui-ipfs-publisher-content-funding
        ui-ipfs-publisher-civility
        ui-ipfs-publisher-common-sense-majority
        ui-ipfs-publisher-conceptspace
        ui-ipfs-publisher-causestarter
        cause-assist
        alignment-trust-bootstrap
        causestarter
    )
    local -a services_to_build=()

    "$SCRIPT_DIR/check-prerequisites.sh"
    check_existing_containers
    clear_stale_ponder_for_fresh_chain
    echo "Starting services with data directory: $DATA_DIR"
    # Pre-create data directories owned by the current user so containers
    # don't create them as root.
    mkdir -p "$DATA_DIR/hardhat" "$DATA_DIR/ipfs" "$DATA_DIR/published-data-ipfs-mirror" "$DATA_DIR/ponder" \
        "$DATA_DIR/alignment-trust-bootstrap" \
        "$UI_IPFS_ARTIFACT_DIR/commonality" \
        "$UI_IPFS_ARTIFACT_DIR/lazyGiving" \
        "$UI_IPFS_ARTIFACT_DIR/alignment" \
        "$UI_IPFS_ARTIFACT_DIR/tally" \
        "$UI_IPFS_ARTIFACT_DIR/content-funding" \
        "$UI_IPFS_ARTIFACT_DIR/civility" \
        "$UI_IPFS_ARTIFACT_DIR/common-sense-majority" \
        "$UI_IPFS_ARTIFACT_DIR/conceptspace" \
        "$UI_IPFS_ARTIFACT_DIR/causestarter"
    # The UI publisher bind-mounts these files so it reads contract addresses
    # written by hardhat-deploy at runtime instead of stale values baked into
    # the Docker image. Ensure clean checkouts have files to mount.
    mkdir -p ui causestarter
    # Create empty env files only when missing. `touch` on existing files updates
    # mtime and forces Vite (npm run causestarter:dev) to full-reload the SPA.
    [ -f .env ] || touch .env
    [ -f ui/.env ] || touch ui/.env
    [ -f causestarter/.env ] || touch causestarter/.env
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
    docker_compose up -d --remove-orphans "${core_services[@]}"
    publish_ui_domains_to_ipfs
    docker_compose up -d --no-deps --force-recreate ui-local-gateway
    wait_for_local_ui_gateway

    # CauseStarter SPA + cause-assist (core founder surface on :8090).
    # localhost.env matches hardhat-deploy --network localhost; live .env files win.
    load_env_file_if_present deployments/localhost.env
    load_env_file_if_present .env
    load_env_file_if_present ui/.env
    load_env_file_if_present causestarter/.env
    map_causestarter_contract_env
    docker_compose up -d --force-recreate cause-assist alignment-trust-bootstrap causestarter

    echo "Recording local Hardhat-account trust (CauseStarter starter network)..."
    if ! node "$SCRIPT_DIR/seed-local-alignment-trust.mjs"; then
        echo "Warning: could not seed local alignment trust. CauseStarter project lists may stay gated until you run:"
        echo "  node scripts/seed-local-alignment-trust.mjs"
    fi

    echo ""
    echo "Services started. Use 'docker compose logs -f' to view logs."
    echo "Platform API service health: http://localhost:3001/health"
    echo "CauseStarter: http://localhost:${CAUSESTARTER_PORT:-8090}/  (gateway: http://causestarter.localhost:8088/#/)"

    # Fail fast on env / on-chain / SPA config drift (PublishedData missing, stale ProjectFactory ABI, …).
    echo ""
    if ! "$SCRIPT_DIR/check-local-config-sync.sh"; then
        echo ""
        echo "Error: local config sync check failed after start."
        echo "Services are up, but contract addresses or ABIs are inconsistent — fix before using the stack."
        exit 1
    fi
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
    --check)
        exec "$SCRIPT_DIR/check-local-config-sync.sh"
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
