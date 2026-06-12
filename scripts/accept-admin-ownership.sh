#!/usr/bin/env bash
#
# Accept pending Ownable2Step admin ownership transfers after a contract deploy.
#
# Usage:
#   ./scripts/accept-admin-ownership.sh base-sepolia
#
# CONTRACT_ADMIN_PRIVATE_KEY is read automatically from the operator secrets
# file (default: ~/.secrets/commonality/operator.env). The admin account needs
# a small amount of network ETH for gas.
#
# See workflow/security-recoverability.md for key management guidance.

set -euo pipefail
NETWORK="${1:-}"
if [ -z "$NETWORK" ]; then
  echo "Usage: $0 <network>  (e.g. base-sepolia)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/hardhat"
npx hardhat run scripts/accept-admin-ownership.js --network "$NETWORK"
