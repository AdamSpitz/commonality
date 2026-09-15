#!/usr/bin/env bash
# Publish the encrypted test-data registry and runs to IPFS, then advance its
# dedicated testnet IPNS name. This never publishes the capability key.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/secrets.sh
source "$ROOT/scripts/lib/secrets.sh"

ARTIFACT_ROOT="$ROOT/fake-data-generation/output/test-data"
REGISTRY="$ARTIFACT_ROOT/registry.enc.json"
SECRETS_FILE="$(commonality_operator_secrets_file)"

if [ ! -f "$REGISTRY" ]; then
  echo "Error: no test-data registry exists. Run a fake-data seed first."
  exit 1
fi

commonality_require_secret_file "$SECRETS_FILE" "operator secrets file" || exit 1
PINATA_JWT="$(commonality_env_value PINATA_JWT "$SECRETS_FILE")"
if [ -z "$PINATA_JWT" ]; then
  echo "Error: PINATA_JWT is not set in $SECRETS_FILE."
  exit 1
fi
if [ -z "$(commonality_env_value IPNS_PRIVATE_KEY_TESTNET_TEST_DATA "$SECRETS_FILE")" ]; then
  echo "Error: IPNS_PRIVATE_KEY_TESTNET_TEST_DATA is not set in $SECRETS_FILE."
  echo "Generate it once with ./scripts/setup-ipns-key.sh and save the printed private key under that name."
  exit 1
fi

CURL_ARGS=()
while IFS= read -r -d '' file; do
  rel="${file#$ARTIFACT_ROOT/}"
  if [ "$rel" = ".admin-capability" ]; then
    continue
  fi
  CURL_ARGS+=(-F "file=@${file};filename=${rel}")
done < <(find "$ARTIFACT_ROOT" -type f -print0)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
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
IPNS_OUTPUT=$("$ROOT/scripts/publish-ipns.sh" IPNS_PRIVATE_KEY_TESTNET_TEST_DATA "$CID")
echo "$IPNS_OUTPUT"
IPNS_NAME=$(echo "$IPNS_OUTPUT" | awk '/^IPNS name:/ { print $3 }' | tail -1)

CAPABILITY=$(tr -d '\n' < "$ARTIFACT_ROOT/.admin-capability")
echo ""
echo "Published encrypted test-data artifacts."
echo "  CID: $CID"
echo "  Same-origin registry: /test-data/registry.enc.json (Worker maps this onto CID $CID)"
echo "  Direct IPFS check: https://gateway.pinata.cloud/ipfs/$CID/registry.enc.json"
echo "  Bookmark after the CauseStarter UI is republished:"
echo "  https://causestarter.testnet.commonality.works/#/admin/test-data?key=$CAPABILITY"
