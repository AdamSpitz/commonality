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
# INDEXER_CONTRACTS=conceptspace omits funding sources. There is no Ponder process.
if [ "${INDEXER_ENGINE:-}" = "ponder" ]; then
  echo "INDEXER_ENGINE=ponder has been removed; refusing to start the old per-block engine" >&2
  exit 1
fi
case "$PONDER_SCRIPT" in
  start|start:conceptspace) HOSTED=1 ;;
  *) HOSTED=0 ;;
esac
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

run_with_capacity_parking() {
  while true; do
    rm -f "$FLAG_PATH"
    set +e
    "$@"
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
}

# Hosted start used to crash-loop on Alchemy monthly-capacity 429s. Keep the
# container alive with a stub /health and wait. Do not open the old Ponder
# schema or switch to sepolia.base.org.
if [ "$HOSTED" = 1 ]; then
  # Fresh schema on the same Postgres. Never the old Ponder DATABASE_SCHEMA.
  export INDEXER_SPEND_GUARD=1
  # Quiet hourly ceilings are too small for the one-time replay. This extra
  # allowance applies only while the cursor is still behind, then turns off.
  export INDEXER_CATCHUP="${INDEXER_CATCHUP:-1}"
  export INDEXER_PROTOTYPE_DATABASE_URL="${INDEXER_PROTOTYPE_DATABASE_URL:-${DATABASE_URL:-}}"
  export INDEXER_PROTOTYPE_SCHEMA="${INDEXER_PROTOTYPE_SCHEMA:-raw_log}"
  if [ -n "${DATABASE_SCHEMA:-}" ] && [ "$INDEXER_PROTOTYPE_SCHEMA" = "$DATABASE_SCHEMA" ]; then
    echo "Refusing to open Ponder DATABASE_SCHEMA; hosted raw-log needs its own fresh schema" >&2
    exit 1
  fi
  # Render still sets the old 4s Ponder interval. Hosted raw-log defaults to 12s
  # unless INDEXER_POLL_INTERVAL_MS is set.
  export PONDER_POLL_INTERVAL_MS="${INDEXER_POLL_INTERVAL_MS:-12000}"
  export INDEXER_SNAPSHOT_PATH="${INDEXER_SNAPSHOT_PATH:-/tmp/raw-log-snapshot.json}"
  mkdir -p "$(dirname "$INDEXER_SNAPSHOT_PATH")"
  run_with_capacity_parking npm run prototype -- --hosted --local --serve "${PORT:-42069}" --host 0.0.0.0
fi

export INDEXER_SNAPSHOT_PATH="${INDEXER_SNAPSHOT_PATH:-/app/.ponder/raw-log-snapshot.json}"
mkdir -p "$(dirname "$INDEXER_SNAPSHOT_PATH")"
exec npm run prototype -- --local --serve "${PORT:-42069}" --host 0.0.0.0
