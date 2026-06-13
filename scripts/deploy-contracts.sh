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
# For non-local deployments, this also completes pending Ownable2Step admin
# transfers for the freshly deployed contracts. CONTRACT_ADMIN_PRIVATE_KEY is
# read from the operator secrets file by Hardhat.
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
npx hardhat run scripts/deploy-incremental.js --network "$NETWORK"

if [ "$NETWORK" != "localhost" ] && [ "$NETWORK" != "hardhat" ]; then
  if NEEDS_ADMIN_ACCEPTANCE="$ROOT/deployments/${NETWORK}.contracts-manifest.json" node -e "const fs=require('fs'); const p=process.env.NEEDS_ADMIN_ACCEPTANCE; process.exit(JSON.parse(fs.readFileSync(p, 'utf8')).needsAdminAcceptance ? 0 : 1)"; then
    echo
    echo "=== Accepting contract admin ownership transfers ==="
    npx hardhat run scripts/accept-admin-ownership.js --network "$NETWORK"
  else
    echo "No pending admin ownership transfers for this deployment."
  fi
fi
