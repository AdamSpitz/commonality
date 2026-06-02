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

echo "Restart consistency smoke passed. Mutated state: stopped and restarted local services without wiping data; verified indexed events and core endpoints survived restart."
