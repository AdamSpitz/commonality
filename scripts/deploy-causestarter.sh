#!/usr/bin/env bash
#
# Build the CauseStarter Docker image and deploy the container locally.
#
# Usage:
#   ./scripts/deploy-causestarter.sh              # build + run on http://localhost:8090
#   ./scripts/deploy-causestarter.sh --build-only
#   ./scripts/deploy-causestarter.sh --stop
#
# Optional env:
#   CAUSESTARTER_PORT                 host port (default 8090)
#   CAUSESTARTER_IMAGE                image tag (default commonality-causestarter:dev)
#   COMMONALITY_ENVIRONMENT  local|testnet|mainnet (default local)
#   Contract address / URL vars are passed through to the runtime config.json.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CAUSESTARTER_PORT="${CAUSESTARTER_PORT:-8090}"
CAUSESTARTER_IMAGE="${CAUSESTARTER_IMAGE:-commonality-causestarter:dev}"
CONTAINER_NAME="${CAUSESTARTER_CONTAINER_NAME:-commonality-causestarter}"
MODE="${1:-}"

docker_compose() {
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    docker compose "$@"
  fi
}

load_env_file() {
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

map_contract_env() {
  # Map root .env / hardhat deploy names onto VITE_* keys expected by the SPA.
  export VITE_BELIEFS_CONTRACT_ADDRESS="${VITE_BELIEFS_CONTRACT_ADDRESS:-${BELIEFS_CONTRACT_ADDRESS:-}}"
  export VITE_IMPLICATIONS_CONTRACT_ADDRESS="${VITE_IMPLICATIONS_CONTRACT_ADDRESS:-${IMPLICATIONS_CONTRACT_ADDRESS:-}}"
  export VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS="${VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS:-${MUTABLE_REF_UPDATER_CONTRACT_ADDRESS:-${MUTABLE_REF_UPDATER_ADDRESS:-}}}"
  export VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS="${VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS:-${DELEGATABLE_NOTES_CONTRACT_ADDRESS:-${DELEGATABLE_NOTES_ADDRESS:-}}}"
  export VITE_NOTE_INTENT_CONTRACT_ADDRESS="${VITE_NOTE_INTENT_CONTRACT_ADDRESS:-${NOTE_INTENT_ADDRESS:-}}"
  export VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS="${VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS:-${ASSURANCE_CONTRACT_FACTORY_ADDRESS:-}}"
  export VITE_ERC1155_FACTORY_ADDRESS="${VITE_ERC1155_FACTORY_ADDRESS:-${ERC1155_FACTORY_ADDRESS:-}}"
  export VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS="${VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS:-${ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS:-${ALIGNMENT_ATTESTATIONS_ADDRESS:-}}}"
  export VITE_TRUST_REGISTRY_CONTRACT_ADDRESS="${VITE_TRUST_REGISTRY_CONTRACT_ADDRESS:-${TRUST_REGISTRY_ADDRESS:-}}"
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
  # Leave event cache empty so the SPA uses page origin and nginx proxies to indexer.
  export VITE_EVENT_CACHE_URL="${VITE_EVENT_CACHE_URL:-}"
}

require_local_contract_env() {
  # Fail fast when local deploy is missing addresses CauseStarter needs at runtime.
  # Skip for non-local chain ids (testnet/mainnet images may inject differently).
  local chain_id="${VITE_CHAIN_ID:-${CHAIN_ID:-31337}}"
  if [ "$chain_id" != "31337" ] && [ "${COMMONALITY_ENVIRONMENT:-local}" != "local" ]; then
    return 0
  fi

  local missing=()
  local key
  for key in \
    VITE_BELIEFS_CONTRACT_ADDRESS \
    VITE_PROJECT_FACTORY_CONTRACT_ADDRESS \
    VITE_PUBLISHED_DATA_CONTRACT_ADDRESS \
    VITE_PAYMENT_TOKEN_ADDRESS \
    VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS \
    VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS
  do
    if [ -z "${!key:-}" ]; then
      missing+=("$key")
    fi
  done

  if [ "${#missing[@]}" -gt 0 ]; then
    echo "Error: CauseStarter local deploy is missing required contract addresses:" >&2
    printf '  %s\n' "${missing[@]}" >&2
    echo "" >&2
    echo "Statement launch needs PublishedData; project tooling needs ProjectFactory." >&2
    echo "Fix:" >&2
    echo "  ./scripts/deploy-contracts.sh localhost" >&2
    echo "  # reloads deployments/localhost.env + .env + ui/.env" >&2
    echo "  ./scripts/check-local-config-sync.sh --env-only" >&2
    echo "  ./scripts/deploy-causestarter.sh" >&2
    exit 1
  fi
}

if [ "$MODE" = "--stop" ]; then
  echo "Stopping CauseStarter + cause-assist..."
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
  docker_compose stop causestarter cause-assist 2>/dev/null || true
  docker_compose rm -f cause-assist 2>/dev/null || true
  echo "Stopped."
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker daemon is not running. Start Docker Desktop and retry." >&2
  exit 1
fi

# localhost.env matches hardhat-deploy --network localhost; live .env files win.
load_env_file "$ROOT/deployments/localhost.env"
load_env_file "$ROOT/.env"
load_env_file "$ROOT/ui/.env"
load_env_file "$ROOT/causestarter/.env"
export CAUSE_ASSIST_SUGGEST_MODEL="${CAUSE_ASSIST_SUGGEST_MODEL:-grok-4.5}"
export CAUSE_ASSIST_SAFETY_MODEL="${CAUSE_ASSIST_SAFETY_MODEL:-grok-4.5}"
export CAUSE_ASSIST_API_BASE_URL="${CAUSE_ASSIST_API_BASE_URL:-https://api.x.ai/v1}"
# WalletConnect project id is baked into the JS bundle at vite build time.
if [ -z "${VITE_WALLETCONNECT_PROJECT_ID:-}" ]; then
  echo "Note: VITE_WALLETCONNECT_PROJECT_ID is unset."
  echo "  Injected browser wallets (MetaMask, etc.) still work."
  echo "  For WalletConnect QR / mobile wallets, set VITE_WALLETCONNECT_PROJECT_ID"
  echo "  (https://cloud.reown.com) in the environment or causestarter/.env, then rebuild."
fi
map_contract_env
require_local_contract_env

export UID
export GID
GID="$(id -g)"
export GID

ensure_local_indexer() {
  # Discover / live examples need the Ponder event cache. Start the minimal
  # local chain + indexer path when it is not already healthy.
  if curl --silent --show-error --fail --max-time 2 "http://localhost:42069/status" >/dev/null 2>&1; then
    echo "Indexer already healthy on http://localhost:42069"
    return 0
  fi

  echo "Indexer not reachable on :42069 — starting local chain + indexer..."
  mkdir -p "$ROOT/data/hardhat" "$ROOT/data/ipfs" "$ROOT/data/ponder" ui causestarter
  touch "$ROOT/.env" "$ROOT/ui/.env" "$ROOT/causestarter/.env"

  docker_compose up -d hardhat-node ipfs
  # Wait for hardhat RPC
  local attempt=1
  while [ "$attempt" -le 60 ]; do
    if curl --silent --show-error --fail --max-time 2 "http://127.0.0.1:8545" \
      -H 'content-type: application/json' \
      --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' >/dev/null 2>&1; then
      break
    fi
    sleep 1
    attempt=$((attempt + 1))
  done

  docker_compose up -d --no-deps hardhat-deploy || true
  # hardhat-deploy is one-shot; wait for completion
  attempt=1
  while [ "$attempt" -le 120 ]; do
    local status
    status=$(docker inspect commonality-hardhat-deploy --format '{{.State.Status}}' 2>/dev/null || echo missing)
    if [ "$status" = "exited" ]; then
      break
    fi
    if [ "$status" = "missing" ] && [ "$attempt" -gt 5 ]; then
      break
    fi
    sleep 1
    attempt=$((attempt + 1))
  done

  docker_compose up -d indexer

  attempt=1
  while [ "$attempt" -le 90 ]; do
    if curl --silent --show-error --fail --max-time 2 "http://localhost:42069/status" >/dev/null 2>&1; then
      echo "Indexer is healthy on http://localhost:42069"
      # Reload contract addresses written by hardhat-deploy into this shell
      load_env_file "$ROOT/.env"
      load_env_file "$ROOT/ui/.env"
      map_contract_env
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done

  echo "Warning: indexer did not become healthy in time. Discover may show empty/error until it is up." >&2
  echo "  Check: docker compose logs -f indexer" >&2
  return 0
}

# Domain SPAs that CauseStarter tool cards deep-link to via *.localhost:8088.
LOCAL_UI_DOMAINS=(
  commonality
  lazyGiving
  alignment
  tally
  content-funding
  civility
  common-sense-majority
  conceptspace
  causestarter
)

wait_for_one_shot_container() {
  local container_name="$1"
  local label="$2"
  local attempt=1
  local max_attempts="${3:-600}"
  local st=""
  local exit_code=""

  while [ "$attempt" -le "$max_attempts" ]; do
    st=$(docker inspect "$container_name" --format '{{.State.Status}}' 2>/dev/null || echo missing)
    if [ "$st" = "exited" ]; then
      exit_code=$(docker inspect "$container_name" --format '{{.State.ExitCode}}' 2>/dev/null || echo 1)
      if [ "$exit_code" != "0" ]; then
        echo "Error: $label failed (exit $exit_code)" >&2
        docker logs --tail=80 "$container_name" 2>/dev/null || true
        return 1
      fi
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done
  echo "Error: timed out waiting for $label" >&2
  return 1
}

ensure_local_tool_stack() {
  # Tool cards open domain SPAs at http://{domain}.localhost:8088/#/ via
  # ui-local-gateway + IPFS-published bundles. Also start platform-api for
  # content-funding / social tooling.
  local domain=""
  local cid_file=""
  local need_publish=0

  mkdir -p "$ROOT/data/ui-ipfs"
  for domain in "${LOCAL_UI_DOMAINS[@]}"; do
    mkdir -p "$ROOT/data/ui-ipfs/$domain"
  done
  touch "$ROOT/.env" "$ROOT/ui/.env" "$ROOT/causestarter/.env"

  if ! curl --silent --show-error --fail --max-time 2 "http://localhost:3001/health" >/dev/null 2>&1; then
    echo "Starting platform-api-service on :3001..."
    docker_compose up -d platform-api-service || true
  else
    echo "Platform API already healthy on http://localhost:3001"
  fi

  for domain in "${LOCAL_UI_DOMAINS[@]}"; do
    cid_file="$ROOT/data/ui-ipfs/$domain/cid.txt"
    if [ ! -s "$cid_file" ]; then
      need_publish=1
      break
    fi
  done

  if [ "$need_publish" -eq 1 ]; then
    echo "Publishing missing domain UI bundles to local IPFS (sequential)..."
    for domain in "${LOCAL_UI_DOMAINS[@]}"; do
      cid_file="$ROOT/data/ui-ipfs/$domain/cid.txt"
      if [ -s "$cid_file" ]; then
        echo "  $domain: already published ($(cat "$cid_file"))"
        continue
      fi
      echo "  $domain: building and publishing..."
      docker_compose up -d --no-deps --force-recreate "ui-ipfs-publisher-${domain}"
      if ! wait_for_one_shot_container "commonality-ui-ipfs-publisher-${domain}" "ui-ipfs-publisher-${domain}"; then
        echo "Warning: failed to publish $domain; tool link may 404 until fixed." >&2
        continue
      fi
      if [ -s "$cid_file" ]; then
        echo "  $domain: published ($(cat "$cid_file"))"
      else
        echo "Warning: $domain publisher exited without writing cid.txt" >&2
      fi
    done
  else
    echo "Domain UI IPFS artifacts already present under data/ui-ipfs/"
  fi

  if curl --silent --show-error --fail --max-time 2 "http://localhost:8088/health" >/dev/null 2>&1; then
    echo "Local UI gateway already healthy on http://localhost:8088"
  else
    echo "Starting local UI gateway on :8088..."
    docker_compose up -d --no-deps --force-recreate ui-local-gateway || true
    local attempt=1
    while [ "$attempt" -le 30 ]; do
      if curl --silent --show-error --fail --max-time 2 "http://localhost:8088/health" >/dev/null 2>&1; then
        echo "Local UI gateway is healthy on http://localhost:8088"
        break
      fi
      sleep 1
      attempt=$((attempt + 1))
    done
    if [ "$attempt" -gt 30 ]; then
      echo "Warning: ui-local-gateway did not become healthy. Tool links (*.localhost:8088) will fail." >&2
      echo "  Check: docker compose logs -f ui-local-gateway" >&2
    fi
  fi

  # Stable defaults used by CauseStarter runtime config.json tool cards.
  export VITE_COMMONALITY_URL="${VITE_COMMONALITY_URL:-http://commonality.localhost:8088/#/}"
  export VITE_LAZYGIVING_URL="${VITE_LAZYGIVING_URL:-http://lazygiving.localhost:8088/#/}"
  export VITE_ALIGNMENT_URL="${VITE_ALIGNMENT_URL:-http://alignment.localhost:8088/#/}"
  export VITE_TALLY_URL="${VITE_TALLY_URL:-http://tally.localhost:8088/#/}"
  export VITE_CONTENT_FUNDING_URL="${VITE_CONTENT_FUNDING_URL:-http://content-funding.localhost:8088/#/}"
  export VITE_CIVILITY_URL="${VITE_CIVILITY_URL:-http://civility.localhost:8088/#/}"
  export VITE_COMMON_SENSE_MAJORITY_URL="${VITE_COMMON_SENSE_MAJORITY_URL:-http://common-sense-majority.localhost:8088/#/}"
  export VITE_CONCEPTSPACE_URL="${VITE_CONCEPTSPACE_URL:-http://conceptspace.localhost:8088/#/}"
}

echo "Building CauseStarter + cause-assist images..."
docker_compose build cause-assist causestarter

if [ "$MODE" = "--build-only" ]; then
  echo "Build complete: $CAUSESTARTER_IMAGE (+ cause-assist)"
  exit 0
fi

ensure_local_indexer
ensure_local_tool_stack

echo "Deploying cause-assist and CauseStarter on http://localhost:${CAUSESTARTER_PORT}/"
docker_compose up -d --force-recreate cause-assist causestarter

echo "Waiting for health..."
max_attempts=40
attempt=1
while [ "$attempt" -le "$max_attempts" ]; do
  if curl --silent --show-error --fail "http://localhost:${CAUSESTARTER_PORT}/" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  attempt=$((attempt + 1))
done

if [ "$attempt" -gt "$max_attempts" ]; then
  echo "Error: CauseStarter did not become healthy on port ${CAUSESTARTER_PORT}" >&2
  docker_compose logs --tail=80 causestarter || true
  exit 1
fi

echo ""
echo "CauseStarter is deployed."
echo "  URL:     http://localhost:${CAUSESTARTER_PORT}/"
echo "  Image:   $CAUSESTARTER_IMAGE"
echo "  Tools:   http://localhost:8088/  (admin index for domain SPAs)"
echo "  Logs:    docker compose logs -f causestarter"
echo "  Stop:    ./scripts/deploy-causestarter.sh --stop"
echo ""
echo "Tool deep-links (open from CauseStarter or browser):"
echo "  Projects:       http://alignment.localhost:8088/#/"
echo "  Delegation:     http://lazygiving.localhost:8088/#/delegation/notes"
echo "  Content Funding:http://content-funding.localhost:8088/#/"

# Reload env (hardhat-deploy during ensure_local_indexer may have rewritten addresses)
# then verify runtime config.json matches deploy env + on-chain ABI.
load_env_file "$ROOT/deployments/localhost.env"
load_env_file "$ROOT/.env"
map_contract_env
if ! "$ROOT/scripts/check-local-config-sync.sh"; then
  echo "" >&2
  echo "Error: local config sync check failed after CauseStarter deploy." >&2
  exit 1
fi
