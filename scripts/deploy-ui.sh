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
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "$NETWORK" ]; then
  echo "Usage: $0 <network>"
  echo "  network: sepolia, mainnet"
  exit 1
fi

if [ "$NETWORK" = "localhost" ]; then
  echo "Error: IPFS deployment is not supported for localhost."
  echo "Use sepolia or mainnet."
  exit 1
fi

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

# --- Build the UI ---
echo ""
echo "Building UI..."
(cd "$ROOT/ui" && npm run build)

# --- Upload dist/ to Pinata ---
echo ""
echo "Uploading ui/dist/ to Pinata..."

CURL_ARGS=()
while IFS= read -r -d '' file; do
  rel="${file#$ROOT/ui/dist/}"
  CURL_ARGS+=(-F "file=@${file};filename=commonality-ui/${rel}")
done < <(find "$ROOT/ui/dist" -type f -print0)

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
