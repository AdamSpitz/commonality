#!/usr/bin/env bash
#
# Build all UI domains for testnet, pin each to IPFS via Pinata, and publish
# the resulting CIDs under their stable IPNS names. After this script runs
# successfully, `*.testnet.commonality.works` (via DNSLink) resolves to the
# new build — with no on-chain transaction and no DNS change.
#
# Note: `*.testnet.commonality.eth.limo` is intentionally not advertised here.
# As of 2026-06-01, eth.limo fails TLS certificate/handshake handling for our
# nested testnet ENS names such as alignment.testnet.commonality.eth.limo, even
# when the exact ENS subdomain has a resolver and a valid direct IPFS contenthash.
# See workflow/deployment.md before spending mainnet gas re-testing this.
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
#   DOMAINS="alignment lazygiving" ./scripts/deploy-testnet.sh   # subset

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Keep this list in deployments/testnet-names.json.
DEFAULT_DOMAINS=$(cd "$ROOT" && node -e "const m=require('./deployments/testnet-names.json'); console.log(m.domains.map(d => d.slug).join(' '))")
DOMAINS="${DOMAINS:-$DEFAULT_DOMAINS}"

NETWORK="base-sepolia"

echo "Deploying testnet UI bundles for: $DOMAINS"
echo ""

env_var_for_domain() {
  (cd "$ROOT" && node -e "const m=require('./deployments/testnet-names.json'); const d=m.domains.find(d => d.slug === process.argv[1] || d.legacySlug === process.argv[1]); if (!d) process.exit(1); console.log(d.envVar)" "$1")
}

deploy_slug_for_domain() {
  (cd "$ROOT" && node -e "const m=require('./deployments/testnet-names.json'); const input = process.argv[1]; const d=m.domains.find(d => d.slug === input || d.legacySlug === input); if (!d) process.exit(1); console.log(d.slug === 'lazygiving' ? 'lazyGiving' : d.slug)" "$1")
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

  deploy_slug=$(deploy_slug_for_domain "$d")
  CID=$("$ROOT/scripts/deploy-ui.sh" "$NETWORK" "$deploy_slug" | tee /dev/stderr | grep -E '^\s*CID:' | awk '{print $2}')
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
