#!/bin/bash

# Service-restart smoke: restart the local stack without wiping data and verify a
# representative indexed event remains visible afterward.

set -euo pipefail

if [ "${COMMONALITY_VERIFIER_ALLOW_RESTART:-}" != "1" ]; then
  echo "Refusing to restart local services. Set COMMONALITY_VERIFIER_ALLOW_RESTART=1 to run stack.restart-consistency." >&2
  exit 2
fi

cd "$(dirname "$0")/../../.."

before_events=$(curl --silent --show-error --fail http://localhost:42069/api/events?limit=1)
if ! echo "$before_events" | grep -q '"items":\[{' ; then
  echo "No indexed event was visible before restart; run stack.fresh-seeded or seed local data first." >&2
  exit 3
fi

./scripts/services.sh --stop
./scripts/services.sh --start

after_events=$(curl --silent --show-error --fail http://localhost:42069/api/events?limit=1)
if ! echo "$after_events" | grep -q '"items":\[{' ; then
  echo "No indexed event was visible after restart." >&2
  exit 1
fi

curl --silent --show-error --fail http://localhost:8545 >/dev/null
curl --silent --show-error --fail http://localhost:3001/health >/dev/null
curl --silent --show-error --fail http://localhost:8088/health >/dev/null
curl --silent --show-error --fail -X POST -H "Content-Type: application/json" --data '{"query":"{ _meta { block { number } } }"}' http://localhost:42069/graphql >/dev/null
./scripts/services.sh --url

if [ -n "${COMMONALITY_VERIFIER_HEALTH_EVIDENCE_FILE:-}" ]; then
  mkdir -p "$(dirname "$COMMONALITY_VERIFIER_HEALTH_EVIDENCE_FILE")"
  printf '%s\n' '{"checks":[{"name":"pre-restart-indexed-events","status":"pass","summary":"An indexed event was visible before restart."},{"name":"post-restart-indexed-events","status":"pass","summary":"An indexed event remained visible after restart."},{"name":"rpc","status":"pass","summary":"Local Hardhat RPC answered after restart."},{"name":"platform-api","status":"pass","summary":"Platform API health endpoint answered after restart."},{"name":"ipfs","status":"pass","summary":"Local IPFS gateway health endpoint answered after restart."},{"name":"indexer-graphql","status":"pass","summary":"Indexer GraphQL _meta query answered after restart."},{"name":"services-url","status":"pass","summary":"Service URL summary command completed."}]}' > "$COMMONALITY_VERIFIER_HEALTH_EVIDENCE_FILE"
fi

echo "Restart consistency smoke passed. Mutated state: stopped and restarted local services without wiping data; verified indexed events and core endpoints survived restart."
