#!/usr/bin/env bash
#
# Build all UI domains for testnet, pin each to IPFS via Pinata, and publish
# the resulting CIDs under their stable IPNS names. After this script runs
# successfully, both `*.testnet.commonality.eth.limo` (via ENS contenthash) and
# `*.testnet.commonality.works` (via DNSLink) resolve to the new build — with
# no on-chain transaction and no DNS change.
#
# Prerequisites (one-time setup; see workflow/deployment.md):
#   - ENS subdomain tree created under testnet.commonality.eth
#   - For each UI domain: IPNS key generated, ENS contenthash and DNSLink
#     TXT record both pointing at /ipns/<that-key>
#   - .env.secrets contains IPNS_PRIVATE_KEY_TESTNET_<DOMAIN> for each
#
# Per-deploy operation. Free.
#
# Usage:
#   ./scripts/deploy-testnet.sh
#   DOMAINS="alignment pubstarter" ./scripts/deploy-testnet.sh   # subset

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Keep this list in sync with the case statement in deploy-ui.sh and the
# VITE_*_URL list in workflow/deployment.md.
DEFAULT_DOMAINS="commonality pubstarter alignment tally content-funding noninflammatory csm conceptspace"
DOMAINS="${DOMAINS:-$DEFAULT_DOMAINS}"

NETWORK="base-sepolia"

echo "Deploying testnet UI bundles for: $DOMAINS"
echo ""

# Map domain → uppercased, hyphens-to-underscores env-var fragment.
env_var_for_domain() {
  echo "IPNS_PRIVATE_KEY_TESTNET_$(echo "$1" | tr 'a-z-' 'A-Z_')"
}

# First pass: fail fast if any IPNS key is missing.
SECRETS_FILE="$ROOT/.env.secrets"
MISSING=()
for d in $DOMAINS; do
  var=$(env_var_for_domain "$d")
  if ! grep -qE "^${var}=" "$SECRETS_FILE" 2>/dev/null; then
    MISSING+=("$var")
  fi
done
if [ ${#MISSING[@]} -gt 0 ]; then
  echo "Error: missing IPNS keys in .env.secrets:"
  for v in "${MISSING[@]}"; do echo "  $v"; done
  echo ""
  echo "Generate each with: ./scripts/setup-ipns-key.sh"
  exit 1
fi

# Second pass: build, pin, publish.
declare -a SUMMARY
for d in $DOMAINS; do
  echo "═══════════════════════════════════════════════════════════════"
  echo "  $d"
  echo "═══════════════════════════════════════════════════════════════"

  CID=$("$ROOT/scripts/deploy-ui.sh" "$NETWORK" "$d" | tee /dev/stderr | grep -E '^\s*CID:' | awk '{print $2}')
  if [ -z "$CID" ]; then
    echo "Error: could not parse CID from deploy-ui.sh output for $d"
    exit 1
  fi

  var=$(env_var_for_domain "$d")
  "$ROOT/scripts/publish-ipns.sh" "$var" "$CID"

  SUMMARY+=("$d → $CID")
  echo ""
done

echo "═══════════════════════════════════════════════════════════════"
echo "  Done. Deployed bundles:"
echo "═══════════════════════════════════════════════════════════════"
for line in "${SUMMARY[@]}"; do echo "  $line"; done
echo ""
echo "Note: IPFS gateway caches may serve the previous CID for a few minutes."
