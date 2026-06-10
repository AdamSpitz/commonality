#!/usr/bin/env bash
#
# Combines deployments/<network>.env + deployments/wallets.env + .env.secrets
# + network defaults into the .env files that each service reads.
#
# Usage:
#   ./scripts/setup-env.sh [network]
#
# network: localhost (default), base-sepolia, mainnet

set -euo pipefail

NETWORK="${1:-localhost}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

SECRETS_FILE="$ROOT/.env.secrets"
DEPLOYMENT_FILE="$ROOT/deployments/${NETWORK}.env"
WALLETS_FILE="$ROOT/deployments/wallets.env"

if [ ! -f "$SECRETS_FILE" ] && [ "$NETWORK" != "localhost" ]; then
  echo "Error: $SECRETS_FILE not found."
  echo "Copy .env.secrets.example to .env.secrets and fill in your values."
  exit 1
fi

if [ ! -f "$DEPLOYMENT_FILE" ]; then
  echo "Error: $DEPLOYMENT_FILE not found."
  echo "Deploy contracts first: cd hardhat && npx hardhat run scripts/deploy.js --network $NETWORK"
  exit 1
fi

if [ ! -f "$WALLETS_FILE" ] && [ "$NETWORK" != "localhost" ]; then
  echo "Error: $WALLETS_FILE not found."
  echo "Generate deployment wallets first: node scripts/generate-wallets.mjs"
  exit 1
fi

# --- Load env files into associative array. Later files override earlier files. ---
declare -A VARS

load_env_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  while IFS= read -r line; do
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    key="${line%%=*}"
    value="${line#*=}"
    VARS["$key"]="$value"
  done < "$file"
}

load_env_file "$DEPLOYMENT_FILE"
load_env_file "$WALLETS_FILE"
load_env_file "$SECRETS_FILE"

DOMAIN_SLUGS=(commonality lazygiving alignment tally content-funding civility common-sense-majority conceptspace)
DOMAIN_URL_VARS=(VITE_COMMONALITY_URL VITE_LAZYGIVING_URL VITE_ALIGNMENT_URL VITE_TALLY_URL VITE_CONTENT_FUNDING_URL VITE_CIVILITY_URL VITE_COMMON_SENSE_MAJORITY_URL VITE_CONCEPTSPACE_URL)

set_if_missing() {
  local key="$1"
  local value="$2"
  if [ -z "${VARS[$key]+x}" ] || [ -z "${VARS[$key]}" ]; then
    VARS[$key]="$value"
  fi
}

ui_domain_origin() {
  local slug="$1"
  local root_domain="$2"
  local environment_label="$3"
  local scheme="${4:-https}"
  local host="$slug"
  if [ -n "$environment_label" ]; then
    host="$host.$environment_label"
  fi
  printf '%s://%s.%s' "$scheme" "$host" "$root_domain"
}

populate_ui_domain_urls() {
  local root_domain="${VARS[UI_PUBLIC_ROOT_DOMAIN]:-}"
  [ -n "$root_domain" ] || return 0

  local environment_label="${VARS[UI_PUBLIC_ENVIRONMENT_LABEL]:-${VARS[COMMONALITY_ENVIRONMENT]:-}}"
  [ "$environment_label" = "mainnet" ] && environment_label=""
  [ "$environment_label" = "local" ] && return 0

  local scheme="${VARS[UI_PUBLIC_URL_SCHEME]:-https}"
  local i origin cors_origins=""
  for i in "${!DOMAIN_SLUGS[@]}"; do
    origin="$(ui_domain_origin "${DOMAIN_SLUGS[$i]}" "$root_domain" "$environment_label" "$scheme")"
    set_if_missing "${DOMAIN_URL_VARS[$i]}" "$origin"
    cors_origins="${cors_origins:+$cors_origins,}$origin"
  done

  set_if_missing VITE_NONINFLAMMATORY_URL "${VARS[VITE_CIVILITY_URL]}"
  set_if_missing VITE_CSM_URL "${VARS[VITE_COMMON_SENSE_MAJORITY_URL]}"
  set_if_missing CLAIM_PAGE_BASE_URL "${VARS[VITE_CONTENT_FUNDING_URL]}/#/claim"

  IFS=',' read -r -a extra_roots <<< "${VARS[UI_CORS_EXTRA_ROOT_DOMAINS]:-}"
  local extra_root trimmed_extra_root
  for extra_root in "${extra_roots[@]}"; do
    trimmed_extra_root="${extra_root//[[:space:]]/}"
    [ -n "$trimmed_extra_root" ] || continue
    for i in "${!DOMAIN_SLUGS[@]}"; do
      origin="$(ui_domain_origin "${DOMAIN_SLUGS[$i]}" "$trimmed_extra_root" "$environment_label" "$scheme")"
      cors_origins="${cors_origins:+$cors_origins,}$origin"
    done
  done
  set_if_missing CORS_ALLOWED_ORIGINS "$cors_origins"
}

# --- Aliases (deployment files use one name; integration tests use another) ---
VARS[PROJECT_ALIGNMENT_CONTRACT_ADDRESS]="${VARS[PROJECT_ALIGNMENT_CONTRACT_ADDRESS]:-${VARS[ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS]}}"

# --- Network-specific defaults ---
case "$NETWORK" in
  localhost)
    VARS[COMMONALITY_ENVIRONMENT]="local"
    VARS[CHAIN_ID]="31337"
    VARS[ETHEREUM_RPC_URL]="${VARS[ETHEREUM_RPC_URL]:-http://localhost:8545}"
    VARS[IPFS_API]="${VARS[IPFS_API]:-http://localhost:5001}"
    VARS[IPFS_GATEWAY]="${VARS[IPFS_GATEWAY]:-http://localhost:8080/ipfs}"
    VARS[VITE_GRAPHQL_URL]="${VARS[VITE_GRAPHQL_URL]:-http://localhost:42069/graphql}"
    VARS[EVENT_CACHE_URL]="${VARS[EVENT_CACHE_URL]:-http://localhost:42069}"
    VARS[PLATFORM_API_URL]="${VARS[PLATFORM_API_URL]:-http://localhost:3001}"
    ;;
  base-sepolia)
    VARS[COMMONALITY_ENVIRONMENT]="testnet"
    VARS[CHAIN_ID]="84532"
    VARS[BASE_SEPOLIA_RPC_URL]="${VARS[BASE_SEPOLIA_RPC_URL]:-https://sepolia.base.org}"
    VARS[ETHEREUM_RPC_URL]="${VARS[ETHEREUM_RPC_URL]:-${VARS[BASE_SEPOLIA_RPC_URL]}}"
    VARS[IPFS_API]="${VARS[IPFS_API]:-https://ipfs.io/api/v0}"
    VARS[IPFS_GATEWAY]="${VARS[IPFS_GATEWAY]:-https://ipfs.io/ipfs}"
    VARS[EVENT_CACHE_URL]="${VARS[EVENT_CACHE_URL]:-https://commonality-indexer.onrender.com}"
    VARS[PLATFORM_API_URL]="${VARS[PLATFORM_API_URL]:-https://commonality-platform-api.onrender.com}"
    ;;
  mainnet)
    VARS[COMMONALITY_ENVIRONMENT]="mainnet"
    VARS[CHAIN_ID]="1"
    VARS[MAINNET_RPC_URL]="${VARS[MAINNET_RPC_URL]:-https://eth.llamarpc.com}"
    VARS[ETHEREUM_RPC_URL]="${VARS[ETHEREUM_RPC_URL]:-${VARS[MAINNET_RPC_URL]}}"
    VARS[IPFS_API]="${VARS[IPFS_API]:-https://ipfs.io/api/v0}"
    VARS[IPFS_GATEWAY]="${VARS[IPFS_GATEWAY]:-https://ipfs.io/ipfs}"
    ;;
  *)
    echo "Unknown network: $NETWORK (expected: localhost, base-sepolia, mainnet)"
    exit 1
    ;;
esac

populate_ui_domain_urls

# ============================================================
# 1. Root .env — used by docker-compose, hardhat, indexer
# ============================================================
echo "# Auto-generated by scripts/setup-env.sh for network: $NETWORK" > "$ROOT/.env"
echo "# Do not edit — re-run the script to regenerate." >> "$ROOT/.env"
echo "" >> "$ROOT/.env"

ROOT_VARS=(
  COMMONALITY_ENVIRONMENT CHAIN_ID
  UI_PUBLIC_ROOT_DOMAIN UI_PUBLIC_ENVIRONMENT_LABEL UI_PUBLIC_URL_SCHEME UI_CORS_EXTRA_ROOT_DOMAINS
  DEPLOYER_PRIVATE_KEY ENS_OWNER_PRIVATE_KEY
  IMPLICATION_ATTESTER_PRIVATE_KEY CONTENT_ATTESTER_PRIVATE_KEY BEAT_AGENT_PRIVATE_KEY VERIFIER_PRIVATE_KEY
  IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY BRIDGE_CREATOR_PRIVATE_KEY EXPLORER_CURATOR_PRIVATE_KEY
  IMPLICATION_ATTESTER_TRUSTED_FINDER_KEY IMPLICATION_FINDER_ATTESTER_FINDER_KEY
  CONTENT_ATTESTER_TRUSTED_FINDER_KEY CONTENT_FINDER_ATTESTER_FINDER_KEY BEAT_AGENT_TRUSTED_FINDER_KEY BEAT_AGENT_FINDER_KEY
  DEPLOYER_ADDRESS ENS_OWNER_ADDRESS IMPLICATION_ATTESTER_ADDRESS CONTENT_ATTESTER_ADDRESS BEAT_AGENT_ADDRESS
  CHANNEL_VERIFIER_TRUSTED_SIGNER_ADDRESS VERIFIER_ADDRESS
  IMPLICATION_GRAPH_NUDGER_ADDRESS BRIDGE_CREATOR_ADDRESS EXPLORER_CURATOR_ADDRESS
  IMPLICATION_ATTESTER_PAYMENT_ADDRESS CONTENT_ATTESTER_PAYMENT_ADDRESS BEAT_AGENT_PAYMENT_ADDRESS
  VITE_DEFAULT_TRUSTED_ATTESTERS VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS VITE_DEFAULT_TRUSTED_BEAT_AGENTS
  VITE_NONINFLAMMATORY_TOPIC_CID VITE_DEFAULT_NUDGERS VITE_CSM_MEDIATOR_NUDGER
  OPENROUTER_API_KEY OPENROUTER_MODEL VITE_WALLETCONNECT_PROJECT_ID PINATA_JWT
  ALIGNMENT_TOPIC_STATEMENT_CID CONTENT_ATTESTER_NAME CONTENT_ATTESTER_PROMPT_TEMPLATE CONTENT_ATTESTER_PROMPT_TEMPLATE_FILE
  BEAT_AGENT_ENABLED BEAT_AGENT_BEAT_ID BEAT_AGENT_NAME BEAT_AGENT_PURPOSES BEAT_AGENT_BEAT_DEFINITION_JSON BEAT_AGENT_BEAT_DEFINITION_FILE
  BEAT_AGENT_PROMPT_TEMPLATE BEAT_AGENT_PROMPT_TEMPLATE_FILE BEAT_AGENT_INGESTION_STATE_FILE BEAT_AGENT_MEMORY_FILE
  BEAT_AGENT_EVALUATION_LOG_FILE BEAT_AGENT_METRICS_LOG_FILE BEAT_AGENT_WORKER_POLL_INTERVAL_MS BEAT_AGENT_LLM_EXTRACTION_ENABLED
  BEAT_AGENT_FINDER_ENABLED BEAT_AGENT_FINDER_STATE_FILE BEAT_AGENT_FINDER_ATTESTER_URL BEAT_AGENT_BEAT_KEYWORDS
  BEAT_AGENT_PLATFORM_API_URL BEAT_AGENT_MINIMUM_CONFIDENCE BEAT_AGENT_ESTIMATED_INPUT_TOKENS BEAT_AGENT_ESTIMATED_OUTPUT_TOKENS
  X_API_BEARER_TOKEN
  CORS_ALLOWED_ORIGINS CLAIM_PAGE_BASE_URL PLATFORM_API_URL VITE_ENABLE_CHANNEL_METADATA_LOOKUP
  BASE_SEPOLIA_RPC_URL MAINNET_RPC_URL ETHEREUM_RPC_URL
  BELIEFS_CONTRACT_ADDRESS IMPLICATIONS_CONTRACT_ADDRESS
  TRUST_REGISTRY_ADDRESS NUDGE_PUBLICATIONS_CONTRACT_ADDRESS
  ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS ALIGNMENT_ATTESTATIONS_ADDRESS
  PROJECT_ALIGNMENT_CONTRACT_ADDRESS
  DELEGATABLE_NOTES_CONTRACT_ADDRESS DELEGATABLE_NOTES_ADDRESS
  MUTABLE_REF_UPDATER_CONTRACT_ADDRESS MUTABLE_REF_UPDATER_ADDRESS
  ASSURANCE_CONTRACT_FACTORY_ADDRESS ERC1155_FACTORY_ADDRESS
  MARKETPLACE_FACTORY_ADDRESS ETH_THRESHOLD_CONDITION_FACTORY_ADDRESS
  NOTE_INTENT_ADDRESS PAYMENT_TOKEN_ADDRESS PAYMENT_TOKEN_SYMBOL PAYMENT_TOKEN_DECIMALS PROJECT_FACTORY_ADDRESS
  CHANNEL_VERIFIER_ADDRESS CONTENT_REGISTRY_ADDRESS CHANNEL_REGISTRY_ADDRESS
  CHANNEL_ESCROW_ADDRESS CREATOR_CONTRACT_FACTORY_ADDRESS
  START_BLOCK CONTENT_FUNDING_START_BLOCK
  IPFS_API IPFS_GATEWAY
  EVENT_CACHE_URL
  VITE_COMMONALITY_URL VITE_LAZYGIVING_URL VITE_ALIGNMENT_URL VITE_TALLY_URL
  VITE_CONTENT_FUNDING_URL VITE_CIVILITY_URL VITE_COMMON_SENSE_MAJORITY_URL VITE_NONINFLAMMATORY_URL VITE_CSM_URL VITE_CONCEPTSPACE_URL
  NUM_USERS NUM_ROUNDS
)

for key in "${ROOT_VARS[@]}"; do
  [ -n "${VARS[$key]+x}" ] && echo "${key}=${VARS[$key]}" >> "$ROOT/.env"
done

echo "  wrote $ROOT/.env"

# ============================================================
# 2. integration-tests/.env.local — same as root .env
# ============================================================
cp "$ROOT/.env" "$ROOT/integration-tests/.env.local"
echo "  wrote $ROOT/integration-tests/.env.local"

# ============================================================
# 3. ui/.env — VITE_-prefixed vars + contract addresses
# ============================================================
{
  echo "# Auto-generated by scripts/setup-env.sh for network: $NETWORK"
  echo "# Do not edit — re-run the script to regenerate."
  echo ""
  echo "COMMONALITY_ENVIRONMENT=${VARS[COMMONALITY_ENVIRONMENT]:-local}"
  echo "VITE_CHAIN_ID=${VARS[CHAIN_ID]:-}"
  echo "VITE_WALLETCONNECT_PROJECT_ID=${VARS[VITE_WALLETCONNECT_PROJECT_ID]:-}"
  echo "VITE_GRAPHQL_URL=${VARS[VITE_GRAPHQL_URL]:-}"
  echo "VITE_EVENT_CACHE_URL=${VARS[EVENT_CACHE_URL]:-}"
  echo "VITE_ETH_RPC_URL=${VARS[ETHEREUM_RPC_URL]:-}"
  echo "VITE_BELIEFS_CONTRACT_ADDRESS=${VARS[BELIEFS_CONTRACT_ADDRESS]:-}"
  echo "VITE_IMPLICATIONS_CONTRACT_ADDRESS=${VARS[IMPLICATIONS_CONTRACT_ADDRESS]:-}"
  echo "VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS=${VARS[MUTABLE_REF_UPDATER_CONTRACT_ADDRESS]:-}"
  echo "VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS=${VARS[DELEGATABLE_NOTES_CONTRACT_ADDRESS]:-}"
  echo "VITE_NOTE_INTENT_CONTRACT_ADDRESS=${VARS[NOTE_INTENT_ADDRESS]:-}"
  echo "VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS=${VARS[ASSURANCE_CONTRACT_FACTORY_ADDRESS]:-}"
  echo "VITE_ERC1155_FACTORY_ADDRESS=${VARS[ERC1155_FACTORY_ADDRESS]:-}"
  echo "VITE_MARKETPLACE_FACTORY_ADDRESS=${VARS[MARKETPLACE_FACTORY_ADDRESS]:-}"
  echo "VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS=${VARS[ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS]:-}"
  echo "VITE_TRUST_REGISTRY_CONTRACT_ADDRESS=${VARS[TRUST_REGISTRY_ADDRESS]:-}"
  echo "VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS=${VARS[NUDGE_PUBLICATIONS_CONTRACT_ADDRESS]:-}"
  echo "VITE_IPFS_GATEWAY=${VARS[IPFS_GATEWAY]:-}"
  echo "VITE_IPFS_API=${VARS[IPFS_API]:-}"
  echo "VITE_PROJECT_FACTORY_CONTRACT_ADDRESS=${VARS[PROJECT_FACTORY_ADDRESS]:-}"
  echo "VITE_PAYMENT_TOKEN_ADDRESS=${VARS[PAYMENT_TOKEN_ADDRESS]:-}"
  echo "VITE_PAYMENT_TOKEN_SYMBOL=${VARS[PAYMENT_TOKEN_SYMBOL]:-}"
  echo "VITE_PAYMENT_TOKEN_DECIMALS=${VARS[PAYMENT_TOKEN_DECIMALS]:-}"
  echo "VITE_CONTENT_REGISTRY_ADDRESS=${VARS[CONTENT_REGISTRY_ADDRESS]:-}"
  echo "VITE_CHANNEL_REGISTRY_ADDRESS=${VARS[CHANNEL_REGISTRY_ADDRESS]:-}"
  echo "VITE_CHANNEL_VERIFIER_ADDRESS=${VARS[CHANNEL_VERIFIER_ADDRESS]:-}"
  echo "VITE_CHANNEL_ESCROW_ADDRESS=${VARS[CHANNEL_ESCROW_ADDRESS]:-}"
  echo "VITE_CREATOR_CONTRACT_FACTORY_ADDRESS=${VARS[CREATOR_CONTRACT_FACTORY_ADDRESS]:-}"
  echo "VITE_PLATFORM_API_URL=${VARS[PLATFORM_API_URL]:-}"
  echo "VITE_ENABLE_CHANNEL_METADATA_LOOKUP=${VARS[VITE_ENABLE_CHANNEL_METADATA_LOOKUP]:-}"
  echo "VITE_DEFAULT_TRUSTED_ATTESTERS=${VARS[VITE_DEFAULT_TRUSTED_ATTESTERS]:-}"
  echo "VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS=${VARS[VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS]:-}"
  echo "VITE_DEFAULT_TRUSTED_BEAT_AGENTS=${VARS[VITE_DEFAULT_TRUSTED_BEAT_AGENTS]:-}"
  echo "VITE_NONINFLAMMATORY_TOPIC_CID=${VARS[VITE_NONINFLAMMATORY_TOPIC_CID]:-${VARS[ALIGNMENT_TOPIC_STATEMENT_CID]:-}}"
  echo "VITE_DEFAULT_NUDGERS=${VARS[VITE_DEFAULT_NUDGERS]:-}"
  echo "VITE_CSM_MEDIATOR_NUDGER=${VARS[VITE_CSM_MEDIATOR_NUDGER]:-}"
  echo "VITE_COMMONALITY_URL=${VARS[VITE_COMMONALITY_URL]:-}"
  echo "VITE_LAZYGIVING_URL=${VARS[VITE_LAZYGIVING_URL]:-}"
  echo "VITE_ALIGNMENT_URL=${VARS[VITE_ALIGNMENT_URL]:-}"
  echo "VITE_TALLY_URL=${VARS[VITE_TALLY_URL]:-}"
  echo "VITE_CONTENT_FUNDING_URL=${VARS[VITE_CONTENT_FUNDING_URL]:-}"
  echo "VITE_CIVILITY_URL=${VARS[VITE_CIVILITY_URL]:-${VARS[VITE_NONINFLAMMATORY_URL]:-}}"
  echo "VITE_COMMON_SENSE_MAJORITY_URL=${VARS[VITE_COMMON_SENSE_MAJORITY_URL]:-${VARS[VITE_CSM_URL]:-}}"
  echo "VITE_NONINFLAMMATORY_URL=${VARS[VITE_NONINFLAMMATORY_URL]:-${VARS[VITE_CIVILITY_URL]:-}}"
  echo "VITE_CSM_URL=${VARS[VITE_CSM_URL]:-${VARS[VITE_COMMON_SENSE_MAJORITY_URL]:-}}"
  echo "VITE_CONCEPTSPACE_URL=${VARS[VITE_CONCEPTSPACE_URL]:-}"
} > "$ROOT/ui/.env"

echo "  wrote $ROOT/ui/.env"

# ============================================================
# 4. implication-attester/.env — attester-specific vars
# ============================================================
{
  echo "# Auto-generated by scripts/setup-env.sh for network: $NETWORK"
  echo "# Do not edit — re-run the script to regenerate."
  echo ""
  echo "ETHEREUM_RPC_URL=${VARS[ETHEREUM_RPC_URL]:-}"
  echo "ATTESTER_PRIVATE_KEY=${VARS[IMPLICATION_ATTESTER_PRIVATE_KEY]:-${VARS[ATTESTER_PRIVATE_KEY]:-}}"
  echo "IMPLICATIONS_CONTRACT_ADDRESS=${VARS[IMPLICATIONS_CONTRACT_ADDRESS]:-}"
  echo "OPENROUTER_API_KEY=${VARS[OPENROUTER_API_KEY]:-}"
  echo "OPENROUTER_MODEL=${VARS[OPENROUTER_MODEL]:-anthropic/claude-3.5-haiku}"
  echo "IPFS_API=${VARS[IPFS_API]:-}"
  echo "IPFS_GATEWAY=${VARS[IPFS_GATEWAY]:-}"
  echo "PORT=${VARS[PORT]:-3000}"
  echo "X402_PAYMENT_ADDRESS=${VARS[IMPLICATION_ATTESTER_PAYMENT_ADDRESS]:-${VARS[X402_PAYMENT_ADDRESS]:-}}"
  echo "SERVICE_MARGIN_PERCENT=${VARS[SERVICE_MARGIN_PERCENT]:-20}"
  echo "ETH_USD_PRICE=${VARS[ETH_USD_PRICE]:-3000}"
  echo "GAS_PRICE_MULTIPLIER=${VARS[GAS_PRICE_MULTIPLIER]:-1.2}"
  echo "ESTIMATED_INPUT_TOKENS=${VARS[ESTIMATED_INPUT_TOKENS]:-1000}"
  echo "ESTIMATED_OUTPUT_TOKENS=${VARS[ESTIMATED_OUTPUT_TOKENS]:-200}"
  echo "RATE_LIMIT_WINDOW_MS=${VARS[RATE_LIMIT_WINDOW_MS]:-60000}"
  echo "RATE_LIMIT_MAX_REQUESTS=${VARS[RATE_LIMIT_MAX_REQUESTS]:-10}"
} > "$ROOT/implication-attester/.env"

echo "  wrote $ROOT/implication-attester/.env"

echo ""
echo "Done! Environment configured for network: $NETWORK"
