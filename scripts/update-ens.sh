#!/usr/bin/env bash
#
# Update an ENS name's contenthash to point to an IPFS CID.
#
# Usage:
#   ./scripts/update-ens.sh <ens-name> <cid> [--network sepolia|mainnet]
#
# Default network: mainnet
# Requires ENS_OWNER_PRIVATE_KEY in .env.secrets

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# --- Parse arguments ---
ENS_NAME=""
CID=""
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
      elif [ -z "$CID" ]; then
        CID="$1"
      else
        echo "Error: unexpected argument: $1"
        exit 1
      fi
      shift
      ;;
  esac
done

if [ -z "$ENS_NAME" ] || [ -z "$CID" ]; then
  echo "Usage: $0 <ens-name> <cid> [--network sepolia|mainnet]"
  echo ""
  echo "Example:"
  echo "  $0 commonality.eth QmXyz..."
  echo "  $0 commonality.eth QmXyz... --network sepolia"
  exit 1
fi

# --- Load secrets ---
SECRETS_FILE="$ROOT/.env.secrets"
if [ ! -f "$SECRETS_FILE" ]; then
  echo "Error: $SECRETS_FILE not found."
  echo "Copy .env.secrets.example to .env.secrets and fill in your values."
  exit 1
fi

ENS_OWNER_PRIVATE_KEY=$(grep -E '^ENS_OWNER_PRIVATE_KEY=' "$SECRETS_FILE" | tail -1 | cut -d= -f2-)
if [ -z "$ENS_OWNER_PRIVATE_KEY" ]; then
  echo "Error: ENS_OWNER_PRIVATE_KEY not set in $SECRETS_FILE"
  exit 1
fi

# --- Determine RPC URL ---
case "$NETWORK" in
  mainnet)
    RPC_URL=$(grep -E '^MAINNET_RPC_URL=' "$SECRETS_FILE" | tail -1 | cut -d= -f2- || true)
    RPC_URL="${RPC_URL:-https://eth.llamarpc.com}"
    ;;
  sepolia)
    RPC_URL=$(grep -E '^SEPOLIA_RPC_URL=' "$SECRETS_FILE" | tail -1 | cut -d= -f2- || true)
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
echo "  CID:     $CID"
echo "  Network: $NETWORK"
echo "  RPC:     $RPC_URL"
echo ""

ENS_NAME="$ENS_NAME" \
IPFS_CID="$CID" \
ENS_OWNER_PRIVATE_KEY="$ENS_OWNER_PRIVATE_KEY" \
RPC_URL="$RPC_URL" \
NETWORK="$NETWORK" \
  node "$ROOT/scripts/lib/update-ens-contenthash.js"
