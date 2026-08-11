#!/bin/sh
set -eu
if [ -n "${DEPLOYMENT_ENV_FILE:-}" ]; then
  if [ ! -r "$DEPLOYMENT_ENV_FILE" ]; then
    echo "Deployment env file is not readable: $DEPLOYMENT_ENV_FILE" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  . "$DEPLOYMENT_ENV_FILE"
  set +a
fi
if [ -z "${START_BLOCK:-}" ] && [ -n "${PUBLISHED_DATA_START_BLOCK:-}" ]; then
  export START_BLOCK="$PUBLISHED_DATA_START_BLOCK"
fi
exec "$@"
