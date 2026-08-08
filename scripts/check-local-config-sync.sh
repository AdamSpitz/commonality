#!/usr/bin/env bash
#
# Fail-fast local stack consistency checker (env files, on-chain bytecode, SPA config.json).
#
# Usage:
#   ./scripts/check-local-config-sync.sh
#   ./scripts/check-local-config-sync.sh --env-only
#   ./scripts/check-local-config-sync.sh --skip-runtime
#   ./scripts/check-local-config-sync.sh --skip-chain
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/scripts/check-local-config-sync.mjs" "$@"
