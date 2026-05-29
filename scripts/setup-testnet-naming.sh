#!/usr/bin/env bash
#
# Idempotent testnet naming setup for commonality.works/commonality.eth.
#
# This script creates/reuses IPNS keys, writes standard testnet UI URL env vars,
# optionally updates ENS contenthashes, and optionally configures Cloudflare
# DNSLink/CNAME records. Run with --help for modes.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! node -e "await import('w3name')" 2>/dev/null; then
  echo "Error: w3name not installed. Run 'npm install' from $ROOT"
  exit 1
fi

node "$ROOT/scripts/lib/setup-testnet-naming.js" "$@"
