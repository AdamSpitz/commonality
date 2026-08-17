#!/usr/bin/env bash
# Serve the Christian / secular-conservative example mediator on :3011 so
# CauseStarter can fetch featured anchors for the seeded Christianity cause.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
if [ -f .env.secrets ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.secrets
  set +a
fi

export PORT="${PORT:-3011}"
export BRIDGE_CREATOR_MEDIATOR_CONFIG_PATH="${BRIDGE_CREATOR_MEDIATOR_CONFIG_PATH:-$ROOT/services/bridge-creator/config/christian-secular-conservative.example.json}"
export CHRISTIAN_BRIDGE_MEDIATOR_PRIVATE_KEY="${CHRISTIAN_BRIDGE_MEDIATOR_PRIVATE_KEY:-0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97}"
export ETHEREUM_RPC_URL="${ETHEREUM_RPC_URL:-http://127.0.0.1:8545}"
export INDEXER_URL="${INDEXER_URL:-http://127.0.0.1:42069}"
export IPFS_API="${IPFS_API:-http://127.0.0.1:5001}"
export IPFS_GATEWAY="${IPFS_GATEWAY:-http://127.0.0.1:8080}"
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-sk-not-needed-for-featured-anchors}"
export NUDGE_PUBLICATIONS_CONTRACT_ADDRESS="${NUDGE_PUBLICATIONS_CONTRACT_ADDRESS:-${NUDGE_PUBLICATIONS_ADDRESS:-0x0000000000000000000000000000000000000001}}"
export BRIDGE_CREATOR_TICK_INTERVAL_MS="${BRIDGE_CREATOR_TICK_INTERVAL_MS:-86400000}"
export BRIDGE_CREATOR_PUBLIC_BASE_URL="${BRIDGE_CREATOR_PUBLIC_BASE_URL:-http://127.0.0.1:${PORT}}"

echo "Starting Christian mediator on http://127.0.0.1:${PORT}"
exec npm start --workspace=@commonality/bridge-creator
