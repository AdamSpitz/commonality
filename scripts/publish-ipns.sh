#!/usr/bin/env bash
#
# Publish a new IPNS revision pointing at the given IPFS CID, using a key
# previously generated with setup-ipns-key.sh and stored in .env.secrets.
#
# Usage:
#   ./scripts/publish-ipns.sh <env-var-name> <cid>
#
# Example:
#   ./scripts/publish-ipns.sh IPNS_PRIVATE_KEY_TESTNET_ALIGNMENT bafybeib...
#
# Per-deploy operation. Free, no gas, no on-chain transaction.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ENV_VAR="${1:-}"
CID="${2:-}"

if [ -z "$ENV_VAR" ] || [ -z "$CID" ]; then
  echo "Usage: $0 <env-var-name> <cid>"
  echo "Example: $0 IPNS_PRIVATE_KEY_TESTNET_ALIGNMENT bafybeib..."
  exit 1
fi

SECRETS_FILE="$ROOT/.env.secrets"
if [ ! -f "$SECRETS_FILE" ]; then
  echo "Error: $SECRETS_FILE not found."
  exit 1
fi

PRIVATE_KEY=$(grep -E "^${ENV_VAR}=" "$SECRETS_FILE" | tail -1 | cut -d= -f2-)
if [ -z "$PRIVATE_KEY" ]; then
  echo "Error: ${ENV_VAR} not set in ${SECRETS_FILE}."
  echo "Run ./scripts/setup-ipns-key.sh to generate one."
  exit 1
fi

IPNS_PRIVATE_KEY="$PRIVATE_KEY" IPFS_CID="$CID" \
  node "$ROOT/scripts/lib/publish-ipns.js"
