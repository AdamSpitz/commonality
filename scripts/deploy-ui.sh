#!/usr/bin/env bash
#
# Build the UI for a target network and upload to Pinata IPFS.
#
# Usage:
#   ./scripts/deploy-ui.sh <network>
#
# network: sepolia, mainnet
#
# Requires PINATA_JWT in .env.secrets
# Output: prints the IPFS CID of the uploaded directory

set -euo pipefail

NETWORK="${1:-}"
DOMAIN="${2:-commonality}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "$NETWORK" ]; then
  echo "Usage: $0 <network> [domain]"
  echo "  network: sepolia, mainnet"
  echo "  domain: commonality, pubstarter, alignment, delegation, tally, content-funding, noninflammatory, csm, conceptspace"
  exit 1
fi

if [ "$NETWORK" = "localhost" ]; then
  echo "Error: IPFS deployment is not supported for localhost."
  echo "Use sepolia or mainnet."
  exit 1
fi

case "$DOMAIN" in
  commonality|pubstarter|alignment|delegation|tally|content-funding|noninflammatory|csm|conceptspace)
    ;;
  *)
    echo "Error: unknown UI domain '$DOMAIN'."
    echo "Expected one of: commonality, pubstarter, alignment, delegation, tally, content-funding, noninflammatory, csm, conceptspace."
    exit 1
    ;;
esac

# --- Load PINATA_JWT from .env.secrets ---
SECRETS_FILE="$ROOT/.env.secrets"
if [ ! -f "$SECRETS_FILE" ]; then
  echo "Error: $SECRETS_FILE not found."
  echo "Copy .env.secrets.example to .env.secrets and fill in your values."
  exit 1
fi

PINATA_JWT=$(grep -E '^PINATA_JWT=' "$SECRETS_FILE" | tail -1 | cut -d= -f2-)
if [ -z "$PINATA_JWT" ]; then
  echo "Error: PINATA_JWT not set in $SECRETS_FILE"
  echo "Get a JWT from https://app.pinata.cloud/developers/api-keys"
  exit 1
fi

# --- Set up environment for the target network ---
echo "Setting up environment for $NETWORK..."
"$ROOT/scripts/setup-env.sh" "$NETWORK"

# The IPFS bundle cannot rely on a dev-server proxy. The event cache URL is
# baked into the Vite build and must point at the deployed indexer.
EVENT_CACHE_URL=$(grep -E '^VITE_EVENT_CACHE_URL=' "$ROOT/ui/.env" | tail -1 | cut -d= -f2-)
if [ -z "$EVENT_CACHE_URL" ]; then
  echo "Error: EVENT_CACHE_URL is not configured for $NETWORK."
  echo "Set EVENT_CACHE_URL in .env.secrets to the deployed indexer base URL, then rerun this script."
  echo "Example: EVENT_CACHE_URL=https://commonality-indexer.onrender.com"
  exit 1
fi

# --- Build the UI ---
echo ""
echo "Building UI for domain: $DOMAIN..."
(cd "$ROOT/ui" && VITE_DOMAIN="$DOMAIN" VITE_ROUTER_MODE=hash npm run build:ipfs)

# --- Generate and copy API docs ---
echo ""
echo "Generating API documentation..."
npm run build:docs

UPLOAD_ROOT="$ROOT/ui/dist/$DOMAIN"
SDK_DOCS="$ROOT/sdk/docs/api"
HARDHAT_DOCS="$ROOT/hardhat/docs"
TARGET_DOCS="$UPLOAD_ROOT/api-docs"

mkdir -p "$TARGET_DOCS"

if [ -d "$SDK_DOCS" ]; then
  cp -r "$SDK_DOCS" "$TARGET_DOCS/sdk"
fi

if [ -d "$HARDHAT_DOCS" ]; then
  cp -r "$HARDHAT_DOCS" "$TARGET_DOCS/contracts"
fi

echo "API docs copied to $TARGET_DOCS"

# --- Upload dist/ to Pinata ---
echo ""
echo "Uploading ui/dist/$DOMAIN/ to Pinata..."

CURL_ARGS=()
while IFS= read -r -d '' file; do
  rel="${file#$UPLOAD_ROOT/}"
  CURL_ARGS+=(-F "file=@${file};filename=${DOMAIN}-ui/${rel}")
done < <(find "$UPLOAD_ROOT" -type f -print0)

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $PINATA_JWT" \
  "${CURL_ARGS[@]}" \
  "https://api.pinata.cloud/pinning/pinFileToIPFS")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "Error: Pinata upload failed (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi

CID=$(node -e "console.log(JSON.parse(process.argv[1]).IpfsHash)" "$BODY")

if [ -z "$CID" ]; then
  echo "Error: Could not parse CID from Pinata response"
  echo "$BODY"
  exit 1
fi

echo ""
echo "Upload complete!"
echo "  CID:     $CID"
echo "  Gateway: https://gateway.pinata.cloud/ipfs/$CID"
echo ""
echo "To update ENS contenthash:"
echo "  ./scripts/update-ens.sh <ens-name> $CID"
