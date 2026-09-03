#!/usr/bin/env bash
#
# Fully automated GitHub secrets setup.
# Extracts secrets from local files and sets them via gh CLI.
#
# Usage:
#   ./scripts/setup-github-secrets-auto.sh
#
# This WILL modify your GitHub repository secrets. Review the output first!

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/secrets.sh
source "$ROOT/scripts/lib/secrets.sh"

echo "🔐 Setting up GitHub Actions secrets..."
echo ""

# Check prerequisites
if ! command -v gh &>/dev/null; then
  echo "❌ GitHub CLI (gh) not found. Install: https://cli.github.com/"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "❌ Not authenticated with GitHub. Run: gh auth login"
  exit 1
fi

SECRETS_FILE="$(commonality_service_secrets_file)"
OPERATOR_FILE="$(commonality_operator_secrets_file)"
OPERATOR_ADDRESSES="$ROOT/deployments/operator-addresses.env"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "❌ Service secrets not found: $SECRETS_FILE"
  echo "   Run: node scripts/generate-wallets.mjs"
  exit 1
fi

if [ ! -f "$OPERATOR_FILE" ]; then
  echo "❌ Operator secrets not found: $OPERATOR_FILE"
  echo "   Run: node scripts/generate-wallets.mjs"
  exit 1
fi

if [ ! -f "$OPERATOR_ADDRESSES" ]; then
  echo "❌ Operator addresses not found: $OPERATOR_ADDRESSES"
  echo "   Deploy contracts first or check deployments/ directory"
  exit 1
fi

echo "✅ Found all required files"
echo ""

# Helper to get value from multiple files
get_value() {
  commonality_env_value "$1" "$OPERATOR_FILE" "$SECRETS_FILE" "$OPERATOR_ADDRESSES"
}

# Set a secret if it has a value
set_secret() {
  local key="$1"
  local value
  value=$(get_value "$key")
  
  if [ -z "$value" ]; then
    echo "⚠️  Skipping $key (not found)"
    return 1
  fi
  
  echo "  Setting $key..."
  echo "$value" | gh secret set "$key"
  echo "  ✅ $key set"
}

echo "Setting contract deployment secrets..."
set_secret DEPLOYER_PRIVATE_KEY || true
set_secret BASE_SEPOLIA_RPC_URL || true
set_secret CONTRACT_ADMIN_ADDRESS || true

echo ""
echo "Setting UI deployment secrets..."
set_secret PINATA_JWT || true

echo ""
echo "Setting IPNS keys..."
set_secret IPNS_PRIVATE_KEY_TESTNET_COMMONALITY || true
set_secret IPNS_PRIVATE_KEY_TESTNET_LAZYGIVING || true
set_secret IPNS_PRIVATE_KEY_TESTNET_ALIGNMENT || true
set_secret IPNS_PRIVATE_KEY_TESTNET_TALLY || true
set_secret IPNS_PRIVATE_KEY_TESTNET_CONTENT_FUNDING || true
set_secret IPNS_PRIVATE_KEY_TESTNET_CIVILITY || true
set_secret IPNS_PRIVATE_KEY_TESTNET_COMMON_SENSE_MAJORITY || true
set_secret IPNS_PRIVATE_KEY_TESTNET_CONCEPTSPACE || true

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ All available secrets have been set!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Verify Render is watching master branch"
echo "  2. Make a small change and merge to master to test"
echo "  3. Watch: https://github.com/AdamSpitz/commonality/actions"
echo ""
