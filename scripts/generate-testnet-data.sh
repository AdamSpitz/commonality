#!/usr/bin/env bash
# Generate one deliberately bounded Base Sepolia demo run, reconcile it through
# transaction receipts, and publish its encrypted operator artifacts.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/secrets.sh
source "$ROOT/scripts/lib/secrets.sh"

if [ "${1:-}" != "--yes" ]; then
  echo "This writes a fresh, bounded batch to Base Sepolia and spends faucet ETH."
  echo "Usage: $0 --yes"
  exit 1
fi

OPERATOR_SECRETS_FILE="$(commonality_operator_secrets_file)"
commonality_require_secret_file "$OPERATOR_SECRETS_FILE" "operator secrets file" || exit 1
FUNDER_KEY="$(commonality_env_value DEPLOYER_PRIVATE_KEY "$OPERATOR_SECRETS_FILE")"
if [ -z "$FUNDER_KEY" ]; then
  echo "Error: DEPLOYER_PRIVATE_KEY is not configured in $OPERATOR_SECRETS_FILE."
  exit 1
fi

"$ROOT/scripts/setup-env.sh" base-sepolia
restore_local_profile() {
  "$ROOT/scripts/setup-env.sh" localhost >/dev/null
}
trap restore_local_profile EXIT

CHAIN_ID="$(grep -E '^CHAIN_ID=' "$ROOT/.env" | tail -1 | cut -d= -f2-)"
if [ "${CHAIN_ID:-}" != "84532" ]; then
  echo "Error: generated environment is not Base Sepolia."
  exit 1
fi

echo "Generating five disposable users with one capped action round..."
(cd "$ROOT/fake-data-generation" && \
  TEST_DATA_FUNDER_PRIVATE_KEY="$FUNDER_KEY" \
  GIT_COMMIT="$(git -C "$ROOT" rev-parse HEAD)" \
  npm exec tsx runSimulation.ts -- 5 1 --testnet-run --statement-limit=5 --max-actions-per-user=2 --skip-invariants)

"$ROOT/scripts/publish-test-data.sh"
