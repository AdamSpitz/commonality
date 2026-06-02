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

curl --silent --show-error --fail http://localhost:8545 >/dev/null
curl --silent --show-error --fail http://localhost:3001/health >/dev/null
curl --silent --show-error --fail http://localhost:8088/health >/dev/null
curl --silent --show-error --fail -X POST -H "Content-Type: application/json" --data '{"query":"{ _meta { block { number } } }"}' http://localhost:42069/graphql >/dev/null
curl --silent --show-error --fail http://localhost:42069/api/events?limit=1 >/dev/null
./scripts/services.sh --url

echo "Fresh seeded stack smoke passed. Mutated state: stopped services, wiped ./data (or COMMONALITY_DATA_DIR), restarted services, seeded tiny fake data with hardhat accounts, republished local IPFS domain UI artifacts."
