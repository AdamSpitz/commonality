#!/usr/bin/env bash
#
# Build all testnet UI domains as independent IPFS bundles, pin each bundle,
# assemble them into one path-hosted IPFS directory, and pin that root bundle.
#
# The resulting root bundle is intended for names like:
#   https://commonality.eth.limo/testnet/alignment/#/
#
# It deliberately keeps individual app CIDs in the release metadata so any app
# can still be pointed at a separate top-level/subdomain name later.
#
# Usage:
#   ./scripts/deploy-testnet-uber-ui.sh
#   UBER_PUBLIC_BASE_URL=https://commonality.eth.limo ./scripts/deploy-testnet-uber-ui.sh
#
# Requires PINATA_JWT in the operator secrets file.
# If IPNS_PRIVATE_KEY_TESTNET_UBER_UI is present, also publishes the root CID
# to that IPNS name for commonality.eth's one-time IPNS contenthash target.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/secrets.sh
source "$ROOT/scripts/lib/secrets.sh"
NETWORK="base-sepolia"
ENVIRONMENT_PATH="${UBER_ENVIRONMENT_PATH:-testnet}"
PUBLIC_BASE_URL="${UBER_PUBLIC_BASE_URL:-}"
SECRETS_FILE="$(commonality_operator_secrets_file)"
RELEASE_FILE="$ROOT/deployments/testnet-ui-uber-release.json"
ASSEMBLY_ROOT="$ROOT/tmp/testnet-ui-uber"

commonality_require_secret_file "$SECRETS_FILE" "operator secrets file" || exit 1

PINATA_JWT=$(commonality_env_value PINATA_JWT "$SECRETS_FILE")
if [ -z "$PINATA_JWT" ]; then
  echo "Error: PINATA_JWT not set in $SECRETS_FILE"
  echo "Get a JWT from https://app.pinata.cloud/developers/api-keys"
  exit 1
fi

mapfile -t DOMAIN_ROWS < <(cd "$ROOT" && node -e "const m=require('./deployments/testnet-names.json'); for (const d of m.domains) console.log([d.slug, d.slug === 'lazygiving' ? 'lazyGiving' : d.slug].join('|'))")

url_base_for_slug() {
  local slug="$1"
  if [ -n "$PUBLIC_BASE_URL" ]; then
    local trimmed="${PUBLIC_BASE_URL%/}"
    printf '%s/%s/%s/#/' "$trimmed" "$ENVIRONMENT_PATH" "$slug"
  else
    printf '../%s/#/' "$slug"
  fi
}

export_path_hosted_urls() {
  export VITE_COMMONALITY_URL="$(url_base_for_slug commonality)"
  export VITE_LAZYGIVING_URL="$(url_base_for_slug lazygiving)"
  export VITE_ALIGNMENT_URL="$(url_base_for_slug alignment)"
  export VITE_TALLY_URL="$(url_base_for_slug tally)"
  export VITE_CONTENT_FUNDING_URL="$(url_base_for_slug content-funding)"
  export VITE_CIVILITY_URL="$(url_base_for_slug civility)"
  export VITE_COMMON_SENSE_MAJORITY_URL="$(url_base_for_slug common-sense-majority)"
  export VITE_CONCEPTSPACE_URL="$(url_base_for_slug conceptspace)"
}

upload_directory_to_pinata() {
  local upload_root="$1"
  local pin_name="$2"
  local response http_code body cid file rel
  local -a curl_args

  curl_args=(-F "pinataMetadata={\"name\":\"$pin_name\"};type=application/json")
  while IFS= read -r -d '' file; do
    rel="${file#$upload_root/}"
    curl_args+=(-F "file=@${file};filename=${pin_name}/${rel}")
  done < <(find "$upload_root" -type f -print0 | sort -z)

  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $PINATA_JWT" \
    "${curl_args[@]}" \
    "https://api.pinata.cloud/pinning/pinFileToIPFS")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" != "200" ]; then
    echo "Error: Pinata upload failed for $pin_name (HTTP $http_code)" >&2
    echo "$body" >&2
    exit 1
  fi

  cid=$(node -e "console.log(JSON.parse(process.argv[1]).IpfsHash)" "$body")
  if [ -z "$cid" ]; then
    echo "Error: Could not parse CID from Pinata response for $pin_name" >&2
    echo "$body" >&2
    exit 1
  fi

  printf '%s' "$cid"
}

copy_api_docs_into_bundle() {
  local upload_root="$1"
  local target_docs="$upload_root/api-docs"
  local sdk_docs="$ROOT/sdk/docs/api"
  local hardhat_docs="$ROOT/hardhat/docs"

  mkdir -p "$target_docs"
  if [ -d "$sdk_docs" ]; then
    rm -rf "$target_docs/sdk"
    cp -R "$sdk_docs" "$target_docs/sdk"
  fi
  if [ -d "$hardhat_docs" ]; then
    rm -rf "$target_docs/contracts"
    cp -R "$hardhat_docs" "$target_docs/contracts"
  fi
}

json_app_entry() {
  local slug="$1"
  local build_domain="$2"
  local cid="$3"
  local path="$4"
  local url="$5"
  node -e "const [slug, buildDomain, cid, path, url] = process.argv.slice(1); console.log(JSON.stringify({slug, buildDomain, cid, path, url}))" "$slug" "$build_domain" "$cid" "$path" "$url"
}

echo "Setting up environment for $NETWORK..."
"$ROOT/scripts/setup-env.sh" "$NETWORK"

EVENT_CACHE_URL=$(grep -E '^VITE_EVENT_CACHE_URL=' "$ROOT/ui/.env" | tail -1 | cut -d= -f2-)
if [ -z "$EVENT_CACHE_URL" ]; then
  echo "Error: EVENT_CACHE_URL is not configured for $NETWORK."
  echo "Set EVENT_CACHE_URL in .env.secrets to the deployed indexer base URL, then rerun this script."
  exit 1
fi

export_path_hosted_urls

rm -rf "$ASSEMBLY_ROOT"
mkdir -p "$ASSEMBLY_ROOT/$ENVIRONMENT_PATH"

cat <<MSG

Building all UI domains for path-hosted IPFS deployment...
  environment path: /$ENVIRONMENT_PATH
  public base URL:  ${PUBLIC_BASE_URL:-'(relative cross-app links)'}
MSG

(cd "$ROOT/ui" && VITE_ROUTER_MODE=hash npm run build:ipfs:domains)

cat <<MSG

Generating API documentation once and copying it into each app bundle...
MSG
(cd "$ROOT" && npm run build:docs)

APP_ENTRIES=()
SUMMARY_LINES=()
for row in "${DOMAIN_ROWS[@]}"; do
  slug="${row%%|*}"
  build_domain="${row#*|}"
  upload_root="$ROOT/ui/dist/$build_domain"
  app_path="/$ENVIRONMENT_PATH/$slug"
  app_url="$(url_base_for_slug "$slug")"

  if [ ! -d "$upload_root" ]; then
    echo "Error: expected build output not found: $upload_root"
    exit 1
  fi

  copy_api_docs_into_bundle "$upload_root"

  echo "Uploading standalone app bundle: $slug ($build_domain)..."
  app_cid=$(upload_directory_to_pinata "$upload_root" "commonality-testnet-$slug-ui")
  echo "  CID: $app_cid"

  cp -R "$upload_root" "$ASSEMBLY_ROOT/$ENVIRONMENT_PATH/$slug"
  APP_ENTRIES+=("$(json_app_entry "$slug" "$build_domain" "$app_cid" "$app_path" "$app_url")")
  SUMMARY_LINES+=("$slug → $app_cid")
  echo ""
done

{
  echo '<!doctype html>'
  echo '<meta charset="utf-8">'
  echo '<title>Commonality UI bundle</title>'
  echo '<h1>Commonality UI bundle</h1>'
  echo "<p>Open <a href=\"./$ENVIRONMENT_PATH/commonality/#/\">Commonality</a>.</p>"
} > "$ASSEMBLY_ROOT/index.html"

cat > "$ASSEMBLY_ROOT/$ENVIRONMENT_PATH/index.html" <<'HTML'
<!doctype html>
<meta charset="utf-8">
<title>Commonality testnet UI bundle</title>
<h1>Commonality testnet UI bundle</h1>
<ul>
  <li><a href="./commonality/#/">Commonality</a></li>
  <li><a href="./lazygiving/#/">LazyGiving</a></li>
  <li><a href="./alignment/#/">Alignment</a></li>
  <li><a href="./tally/#/">Tally</a></li>
  <li><a href="./content-funding/#/">Content Funding</a></li>
  <li><a href="./civility/#/">Civility</a></li>
  <li><a href="./common-sense-majority/#/">Common Sense Majority</a></li>
  <li><a href="./conceptspace/#/">Conceptspace</a></li>
</ul>
HTML

echo "Uploading uber root bundle..."
root_cid=$(upload_directory_to_pinata "$ASSEMBLY_ROOT" "commonality-testnet-uber-ui")

root_ipns_name=""
if grep -q '^IPNS_PRIVATE_KEY_TESTNET_UBER_UI=' "$SECRETS_FILE"; then
  echo "Publishing uber root CID to IPNS (IPNS_PRIVATE_KEY_TESTNET_UBER_UI)..."
  root_ipns_name=$("$ROOT/scripts/publish-ipns.sh" IPNS_PRIVATE_KEY_TESTNET_UBER_UI "$root_cid" | tee /dev/stderr | awk '/^IPNS name:/ { print $3 }' | tail -1)
  if [ -z "$root_ipns_name" ] && [ -f "$ROOT/deployments/testnet-ipns.env" ]; then
    root_ipns_name=$(grep -E '^IPNS_NAME_TESTNET_UBER_UI=' "$ROOT/deployments/testnet-ipns.env" | tail -1 | cut -d= -f2-)
  fi
else
  echo "Skipping IPNS publish: IPNS_PRIVATE_KEY_TESTNET_UBER_UI is not set."
  echo "Run ./scripts/setup-testnet-naming.sh to create it, then publish with:"
  echo "  ./scripts/publish-ipns.sh IPNS_PRIVATE_KEY_TESTNET_UBER_UI $root_cid"
fi

tmp_apps_json="$ROOT/tmp/testnet-ui-uber-apps.json"
printf '[%s]\n' "$(IFS=,; echo "${APP_ENTRIES[*]}")" > "$tmp_apps_json"
node "$ROOT/scripts/write-testnet-uber-release.mjs" \
  "$RELEASE_FILE" \
  "$ENVIRONMENT_PATH" \
  "$root_cid" \
  "$PUBLIC_BASE_URL" \
  "$tmp_apps_json" \
  "$root_ipns_name"
rm -f "$tmp_apps_json"

cat <<MSG

═══════════════════════════════════════════════════════════════
  Done. Standalone app bundles:
═══════════════════════════════════════════════════════════════
MSG
for line in "${SUMMARY_LINES[@]}"; do echo "  $line"; done
cat <<MSG

  Uber root CID: $root_cid
  Gateway:       https://gateway.pinata.cloud/ipfs/$root_cid/$ENVIRONMENT_PATH/commonality/#/
  Metadata:      $RELEASE_FILE
MSG
if [ -n "$root_ipns_name" ]; then
  cat <<MSG
  Root IPNS:     $root_ipns_name
  Intended URL:  https://commonality.eth.limo/$ENVIRONMENT_PATH/commonality/#/

If commonality.eth is not already pointed at this IPNS name, run once:
  ./scripts/setup-testnet-naming.sh --ens --uber --uber-only --yes

If eth.limo/public gateways do not resolve the w3name IPNS record, point
commonality.eth directly at this release CID instead:
  ./scripts/update-ens.sh commonality.eth $root_cid --network mainnet
MSG
else
  cat <<MSG

To use eth.limo without future ENS transactions, create the uber IPNS key and
point commonality.eth at it once:
  ./scripts/setup-testnet-naming.sh
  ./scripts/setup-testnet-naming.sh --ens --uber --uber-only --yes
MSG
fi
