#!/usr/bin/env bash
#
# Update an ENS name's contenthash to point to an IPFS CID or an IPNS name.
#
# NOTE: ENS names are registered on Ethereum L1 (mainnet or Ethereum Sepolia),
# not on Base/Base Sepolia. The --network flag here refers to the Ethereum L1
# network where your ENS name is registered, regardless of which chain the app
# contracts are deployed to.
#
# For commonality the recommended pattern is "set once, update forever":
# point the contenthash at an IPNS name (k51...) once, then update the IPNS
# record per-deploy with publish-ipns.sh — no further ENS transactions needed.
#
# Usage:
#   ./scripts/update-ens.sh <ens-name> <target> [--network sepolia|mainnet]
#
# <target> may be:
#   - an IPFS CID (Qm... or bafy...)  → contenthash uses ipfs:// namespace
#   - an IPNS name (k51...)           → contenthash uses ipns:// namespace
#   - an explicit "ipfs://CID" or "ipns://NAME" URI
#
# Default network: mainnet
# Requires ENS_OWNER_PRIVATE_KEY in the operator secrets file

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/secrets.sh
source "$ROOT/scripts/lib/secrets.sh"

# --- Parse arguments ---
ENS_NAME=""
TARGET=""
NETWORK="mainnet"

while [ $# -gt 0 ]; do
  case "$1" in
    --network)
      NETWORK="$2"
      shift 2
      ;;
    *)
      if [ -z "$ENS_NAME" ]; then
        ENS_NAME="$1"
      elif [ -z "$TARGET" ]; then
        TARGET="$1"
      else
        echo "Error: unexpected argument: $1"
        exit 1
      fi
      shift
      ;;
  esac
done

if [ -z "$ENS_NAME" ] || [ -z "$TARGET" ]; then
  echo "Usage: $0 <ens-name> <target> [--network sepolia|mainnet]"
  echo ""
  echo "Examples:"
  echo "  $0 alignment.testnet.commonality.eth k51qzi5uqu5dh..."
  echo "  $0 alignment.testnet.commonality.eth ipns://k51qzi5uqu5dh..."
  echo "  $0 commonality.eth bafybeib..."
  exit 1
fi

# --- Load secrets ---
SERVICE_SECRETS_FILE="$(commonality_service_secrets_file "$ROOT")"
SECRETS_FILE="$(commonality_operator_secrets_file)"
commonality_require_secret_file "$SECRETS_FILE" "operator secrets file" || exit 1

ENS_OWNER_PRIVATE_KEY=$(commonality_env_value ENS_OWNER_PRIVATE_KEY "$SECRETS_FILE")
if [ -z "$ENS_OWNER_PRIVATE_KEY" ]; then
  echo "Error: ENS_OWNER_PRIVATE_KEY not set in $SECRETS_FILE"
  exit 1
fi

# --- Determine RPC URL ---
case "$NETWORK" in
  mainnet)
    RPC_URL=$(commonality_env_value MAINNET_RPC_URL "$SERVICE_SECRETS_FILE" "$SECRETS_FILE" || true)
    RPC_URL="${RPC_URL:-https://eth.llamarpc.com}"
    ;;
  sepolia)
    RPC_URL=$(commonality_env_value SEPOLIA_RPC_URL "$SERVICE_SECRETS_FILE" "$SECRETS_FILE" || true)
    RPC_URL="${RPC_URL:-https://rpc.sepolia.org}"
    ;;
  *)
    echo "Error: unsupported network: $NETWORK (expected: sepolia, mainnet)"
    exit 1
    ;;
esac

# --- Check dependencies ---
if ! node -e "await import('viem')" 2>/dev/null; then
  echo "Error: required Node.js dependencies not installed."
  echo "Run 'npm install' from the project root ($ROOT)"
  exit 1
fi

# --- Run the ENS update ---
echo "Updating ENS contenthash..."
echo "  Name:    $ENS_NAME"
echo "  Target:  $TARGET"
echo "  Network: $NETWORK"
echo "  RPC:     $RPC_URL"
echo ""

ENS_NAME="$ENS_NAME" \
TARGET="$TARGET" \
ENS_OWNER_PRIVATE_KEY="$ENS_OWNER_PRIVATE_KEY" \
RPC_URL="$RPC_URL" \
NETWORK="$NETWORK" \
  node "$ROOT/scripts/lib/update-ens-contenthash.js"
