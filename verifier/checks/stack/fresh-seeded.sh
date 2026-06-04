#!/bin/bash

# Destructive release-candidate smoke: wipe local dev data, restart services,
# seed a tiny dataset, then verify the core local endpoints are reachable.

set -euo pipefail

if [ "${COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE:-}" != "1" ]; then
  echo "Refusing to wipe local dev data. Set COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE=1 to run stack.fresh-seeded." >&2
  exit 2
fi

cd "$(dirname "$0")/../../.."

./scripts/stop-wipe-restart.sh --seed=tiny --use-hardhat-accounts

# Probe each core endpoint and record real per-probe evidence rather than a
# hardcoded pass, so the structured-evidence layer (and a degraded-but-exit-0
# stack) cannot be trivially satisfied. See verifier/PLAN.md "Health evidence".
EVIDENCE_ITEMS=()
OVERALL_FAIL=0

json_escape() {
  # Escape backslashes and double quotes for embedding in a JSON string.
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  printf '%s' "$s"
}

probe() {
  local name="$1" pass_summary="$2" fail_summary="$3"
  shift 3
  if "$@" >/dev/null 2>&1; then
    EVIDENCE_ITEMS+=("{\"name\":\"$(json_escape "$name")\",\"status\":\"pass\",\"summary\":\"$(json_escape "$pass_summary")\"}")
  else
    EVIDENCE_ITEMS+=("{\"name\":\"$(json_escape "$name")\",\"status\":\"fail\",\"summary\":\"$(json_escape "$fail_summary")\"}")
    OVERALL_FAIL=1
  fi
}

probe rpc "Local Hardhat RPC answered." "Local Hardhat RPC did not answer." \
  curl --silent --show-error --fail http://localhost:8545
probe platform-api "Platform API health endpoint answered." "Platform API health endpoint did not answer." \
  curl --silent --show-error --fail http://localhost:3001/health
probe ipfs "Local IPFS gateway health endpoint answered." "Local IPFS gateway health endpoint did not answer." \
  curl --silent --show-error --fail http://localhost:8088/health
probe indexer-graphql "Indexer GraphQL _meta query answered." "Indexer GraphQL _meta query did not answer." \
  curl --silent --show-error --fail -X POST -H "Content-Type: application/json" --data '{"query":"{ _meta { block { number } } }"}' http://localhost:42069/graphql
probe indexer-events "Indexer events API answered." "Indexer events API did not answer." \
  curl --silent --show-error --fail http://localhost:42069/api/events?limit=1
probe services-url "Service URL summary command completed." "Service URL summary command failed." \
  ./scripts/services.sh --url

if [ -n "${COMMONALITY_VERIFIER_HEALTH_EVIDENCE_FILE:-}" ]; then
  mkdir -p "$(dirname "$COMMONALITY_VERIFIER_HEALTH_EVIDENCE_FILE")"
  IFS=,
  printf '{"checks":[%s]}\n' "${EVIDENCE_ITEMS[*]}" > "$COMMONALITY_VERIFIER_HEALTH_EVIDENCE_FILE"
  unset IFS
fi

if [ "$OVERALL_FAIL" -ne 0 ]; then
  echo "Fresh seeded stack smoke FAILED: one or more core endpoints did not respond. See structured health evidence." >&2
  exit 1
fi

echo "Fresh seeded stack smoke passed. Mutated state: stopped services, wiped ./data (or COMMONALITY_DATA_DIR), restarted services, seeded tiny fake data with hardhat accounts, republished local IPFS domain UI artifacts."
