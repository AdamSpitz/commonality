#!/usr/bin/env bash
#
# Deploy smart contracts to a network.
#
# Usage:
#   ./scripts/deploy-contracts.sh base-sepolia
#   ./scripts/deploy-contracts.sh localhost
#
# Required secrets (read automatically from operator secrets file and operator-addresses.env):
#   DEPLOYER_PRIVATE_KEY      — pays gas
#   CONTRACT_ADMIN_ADDRESS    — receives ownership of admin-controlled contracts
#
# After a non-local deploy, run ./scripts/accept-admin-ownership.sh <network>
# to complete the Ownable2Step transfer.
#
# See workflow/security-recoverability.md for key management guidance.

set -euo pipefail
NETWORK="${1:-}"
if [ -z "$NETWORK" ]; then
  echo "Usage: $0 <network>  (e.g. base-sepolia, localhost)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/hardhat"
npx hardhat run scripts/deploy.js --network "$NETWORK"
