#!/bin/sh

set -eu

# Docker Compose resolves env files before services start, so local dev still
# benefits from re-sourcing the mounted project .env when it exists. Render
# does not mount this file, so production simply uses platform-provided env.
if [ -f /workspace/.env ]; then
  set -a
  . /workspace/.env
  set +a
fi

PONDER_SCRIPT="${PONDER_SCRIPT:-dev:no-ui}"

exec npm run "$PONDER_SCRIPT"
