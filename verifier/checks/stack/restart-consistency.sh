#!/bin/bash

# Service-restart smoke: restart the local stack without wiping data and verify a
# representative indexed event remains visible afterward.

set -euo pipefail

if [ "${COMMONALITY_VERIFIER_ALLOW_RESTART:-}" != "1" ]; then
  echo "Refusing to restart local services. Set COMMONALITY_VERIFIER_ALLOW_RESTART=1 to run stack.restart-consistency." >&2
  exit 2
fi

cd "$(dirname "$0")/../../.."

before_events=$(curl --silent --show-error --fail 'http://localhost:42069/api/events?limit=1')
if ! echo "$before_events" | grep -q '"items":[[:space:]]*\[[[:space:]]*{' ; then
  echo "No indexed event was visible before restart; run stack.fresh-seeded or seed local data first." >&2
  exit 3
fi

docker_compose() {
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    docker compose "$@"
  fi
}

export UID
export GID=$(id -g)

# Restart the already-deployed local stack without rerunning hardhat-deploy.
# `scripts/services.sh --stop && --start` recreates the deploy container, which
# deploys fresh contracts on the persisted chain and rewrites .env; the indexer
# then watches the new addresses rather than the seeded events we are trying to
# prove survived restart.
docker_compose stop ui-local-gateway indexer platform-api-service ipfs hardhat-node
docker_compose up -d --no-deps hardhat-node ipfs platform-api-service indexer ui-local-gateway

# Probe each core endpoint after restart and record real per-probe evidence
# rather than a hardcoded pass, so the structured-evidence layer (and a
# degraded-but-exit-0 stack) cannot be trivially satisfied. See PLAN.md.
EVIDENCE_ITEMS=("{\"name\":\"pre-restart-indexed-events\",\"status\":\"pass\",\"summary\":\"An indexed event was visible before restart.\"}")
OVERALL_FAIL=0

json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  printf '%s' "$s"
}

add_evidence() {
  local name="$1" status="$2" summary="$3"
  EVIDENCE_ITEMS+=("{\"name\":\"$(json_escape "$name")\",\"status\":\"$(json_escape "$status")\",\"summary\":\"$(json_escape "$summary")\"}")
  [ "$status" = "pass" ] || OVERALL_FAIL=1
}

probe() {
  local name="$1" pass_summary="$2" fail_summary="$3"
  shift 3
  if "$@" >/dev/null 2>&1; then
    add_evidence "$name" pass "$pass_summary"
  else
    add_evidence "$name" fail "$fail_summary"
  fi
}

wait_for_indexed_event() {
  local attempt=1
  local max_attempts=60
  local events

  while [ "$attempt" -le "$max_attempts" ]; do
    events=$(curl --silent --show-error --fail 'http://localhost:42069/api/events?limit=1' 2>/dev/null || true)
    if echo "$events" | grep -q '"items":[[:space:]]*\[[[:space:]]*{' ; then
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done

  return 1
}

if wait_for_indexed_event; then
  add_evidence post-restart-indexed-events pass "An indexed event remained visible after restart."
else
  add_evidence post-restart-indexed-events fail "No indexed event was visible after restart before timeout."
fi

probe rpc "Local Hardhat RPC answered after restart." "Local Hardhat RPC did not answer after restart." \
  curl --silent --show-error --fail -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545
probe platform-api "Platform API health endpoint answered after restart." "Platform API health endpoint did not answer after restart." \
  curl --silent --show-error --fail http://localhost:3001/health
probe ipfs "Local IPFS gateway health endpoint answered after restart." "Local IPFS gateway health endpoint did not answer after restart." \
  curl --silent --show-error --fail http://localhost:8088/health
probe indexer-graphql "Indexer GraphQL _meta query answered after restart." "Indexer GraphQL _meta query did not answer after restart." \
  curl --silent --show-error --fail -X POST -H "Content-Type: application/json" --data '{"query":"{ _meta { block { number } } }"}' http://localhost:42069/graphql
probe services-url "Service URL summary command completed." "Service URL summary command failed." \
  ./scripts/services.sh --url

if [ -n "${COMMONALITY_VERIFIER_HEALTH_EVIDENCE_FILE:-}" ]; then
  mkdir -p "$(dirname "$COMMONALITY_VERIFIER_HEALTH_EVIDENCE_FILE")"
  IFS=,
  printf '{"checks":[%s]}\n' "${EVIDENCE_ITEMS[*]}" > "$COMMONALITY_VERIFIER_HEALTH_EVIDENCE_FILE"
  unset IFS
fi

if [ "$OVERALL_FAIL" -ne 0 ]; then
  echo "Restart consistency smoke FAILED: indexed events or a core endpoint did not survive restart. See structured health evidence." >&2
  exit 1
fi

echo "Restart consistency smoke passed. Mutated state: stopped and restarted local services without wiping data; verified indexed events and core endpoints survived restart."
