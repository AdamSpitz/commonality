#!/usr/bin/env bash
#
# Create the testnet ENS subdomain tree used by Commonality UI hosting.
#
# This script works for either commonality.eth or an ENS-imported DNS name such
# as commonality.works, as long as the ENS_OWNER_PRIVATE_KEY wallet controls the
# parent name in ENS. It detects whether each parent is wrapped and uses the ENS
# Name Wrapper when required.
#
# Usage:
#   ./scripts/create-ens-subdomains.sh --inspect
#   ./scripts/create-ens-subdomains.sh --yes
#   ./scripts/create-ens-subdomains.sh --root commonality.works --yes
#
# Requires ENS_OWNER_PRIVATE_KEY in .env.secrets. Uses MAINNET_RPC_URL if set.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! node -e "await import('viem')" 2>/dev/null; then
  echo "Error: viem not installed. Run 'npm install' from $ROOT"
  exit 1
fi

node "$ROOT/scripts/lib/create-ens-subdomains.js" "$@"
