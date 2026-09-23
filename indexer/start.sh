#!/bin/sh

set -eu

# Docker Compose resolves env files before services start, so local dev still
# benefits from re-sourcing the mounted project .env when it exists. Render
# does not mount this file, so production simply uses platform-provided env.
if [ -f /workspace/.env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|'#'*) continue ;;
      export\ *) line=${line#export } ;;
    esac

    key=${line%%=*}
    value=${line#*=}
    case "$key" in
      ''|*[!A-Za-z0-9_]*|[0-9]*) ;;
      *) export "$key=$value" ;;
    esac
  done < /workspace/.env
fi

PONDER_SCRIPT="${PONDER_SCRIPT:-dev:no-ui}"
# INDEXER_CONTRACTS=conceptspace uses ponder.conceptspace.config.ts so funding
# ABI modules are not loaded. The default shared feed is unchanged.
PONDER_SCRIPT="$(node /app/selectPonderScript.mjs "$PONDER_SCRIPT" "${INDEXER_CONTRACTS:-all}")"
FLAG_PATH="${INDEXER_RPC_BUDGET_FLAG_PATH:-/tmp/commonality-rpc-monthly-capacity}"

if [ -d /data ] && [ -w /data ]; then
  BACKOFF_PATH="${INDEXER_RPC_BUDGET_BACKOFF_PATH:-/data/rpc-monthly-capacity-backoff-seconds}"
else
  BACKOFF_PATH="${INDEXER_RPC_BUDGET_BACKOFF_PATH:-/tmp/rpc-monthly-capacity-backoff-seconds}"
fi

MIN_BACKOFF=60
MAX_BACKOFF=21600

read_backoff() {
  if [ -f "$BACKOFF_PATH" ]; then
    cat "$BACKOFF_PATH"
  else
    echo "$MIN_BACKOFF"
  fi
}

write_backoff() {
  echo "$1" > "$BACKOFF_PATH"
}

# Hosted `ponder start` crash-loops on Alchemy monthly-capacity 429s (even
# eth_chainId). Keep the container alive with a stub /graphql and wait; do not
# bump DATABASE_SCHEMA or switch to sepolia.base.org.
if [ "$PONDER_SCRIPT" = "start" ]; then
  while true; do
    rm -f "$FLAG_PATH"
    set +e
    npm run "$PONDER_SCRIPT"
    code=$?
    set -e
    if [ -f "$FLAG_PATH" ]; then
      backoff=$(read_backoff)
      case "$backoff" in
        ''|*[!0-9]*) backoff=$MIN_BACKOFF ;;
      esac
      if [ "$backoff" -lt "$MIN_BACKOFF" ]; then backoff=$MIN_BACKOFF; fi
      if [ "$backoff" -gt "$MAX_BACKOFF" ]; then backoff=$MAX_BACKOFF; fi
      node /app/pausedHealthServer.mjs --seconds "$backoff" --port "${PORT:-42069}"
      next=$((backoff * 2))
      if [ "$next" -gt "$MAX_BACKOFF" ]; then next=$MAX_BACKOFF; fi
      write_backoff "$next"
      continue
    fi
    rm -f "$BACKOFF_PATH"
    exit "$code"
  done
fi

exec npm run "$PONDER_SCRIPT"
