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

exec npm run "$PONDER_SCRIPT"
