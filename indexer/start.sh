#!/bin/sh

set -eu

# Load the latest contract addresses written by hardhat-deploy.
# Docker Compose's env_file is resolved before services start, so sourcing the
# mounted project .env at runtime avoids stale addresses when deployment order changes.
if [ -f /workspace/.env ]; then
  set -a
  . /workspace/.env
  set +a
fi

exec npm run dev:no-ui
