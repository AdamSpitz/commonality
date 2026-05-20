#!/usr/bin/env bash
#
# Generate a new IPNS keypair via w3name. One-time setup, run once per UI
# subdomain. The printed IPNS name becomes the ENS contenthash target and the
# DNSLink TXT record value for that subdomain; the printed private key must be
# stored in .env.secrets under a descriptive name like
# IPNS_PRIVATE_KEY_TESTNET_ALIGNMENT.
#
# Usage:
#   ./scripts/setup-ipns-key.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! node -e "await import('w3name')" 2>/dev/null; then
  echo "Error: w3name not installed. Run 'npm install' from $ROOT"
  exit 1
fi

node "$ROOT/scripts/lib/setup-ipns-key.js"
