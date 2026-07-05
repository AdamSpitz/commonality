#!/usr/bin/env bash
#
# Run the deployed-testnet verifier checks with the read-only opt-in enabled and
# the RPC URL sourced from the repo's own env, then refresh the rollup.
#
# The testnet checks are guarded behind env flags on purpose:
#   COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1   -> hit the deployed network at all (read-only)
#   COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS=1 -> spin up headless browser journeys (heavy)
#   COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION=1 -> submit a verifier-funded on-chain tx (SPENDS GAS)
#
# This wrapper turns on only the read-only path by default. The heavy/spendy
# checks stay opt-in via flags, so a routine run can't cost gas or hammer testnet.
#
# Usage:
#   ./scripts/verifier-testnet.sh              # read-only checks + rollup
#   ./scripts/verifier-testnet.sh --browser    # also run deployed browser journeys
#   ./scripts/verifier-testnet.sh --mutation   # also submit an on-chain attestation (spends gas)
#   ./scripts/verifier-testnet.sh --browser --mutation
#
# COMMONALITY_TESTNET_RPC_URL wins if already set; otherwise it falls back to
# BASE_SEPOLIA_RPC_URL from the repo .env. The verifier private key for the
# mutation check is read from the ambient environment (see .env.secrets).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

WITH_BROWSER=0
WITH_MUTATION=0
for arg in "$@"; do
	case "$arg" in
	--browser) WITH_BROWSER=1 ;;
	--mutation) WITH_MUTATION=1 ;;
	-h | --help)
		tail -n +2 "$0" | grep '^#' | sed 's/^# \{0,1\}//'
		exit 0
		;;
	*)
		echo "Unknown argument: $arg (try --help)" >&2
		exit 2
		;;
	esac
done

# --- RPC URL: prefer the dedicated var, else fall back to the repo .env. ---
if [ -z "${COMMONALITY_TESTNET_RPC_URL:-}" ]; then
	if [ -f "$ROOT/.env" ]; then
		COMMONALITY_TESTNET_RPC_URL="$(grep -E '^BASE_SEPOLIA_RPC_URL=' "$ROOT/.env" | tail -1 | cut -d= -f2-)"
	fi
fi
if [ -z "${COMMONALITY_TESTNET_RPC_URL:-}" ]; then
	echo "Error: no testnet RPC URL. Set COMMONALITY_TESTNET_RPC_URL or BASE_SEPOLIA_RPC_URL in .env." >&2
	exit 1
fi
export COMMONALITY_TESTNET_RPC_URL

# --- Read-only opt-in is always on for this wrapper. ---
export COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1

# Read-only leaves that only need SMOKE + RPC.
LEAVES=(
	testnet.dns
	testnet.http
	testnet.rpc
	testnet.indexer
	testnet.app-shell
	testnet.app-config
	testnet.contracts
	testnet.sponsored-gas
)

if [ "$WITH_BROWSER" = "1" ]; then
	export COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS=1
	LEAVES+=(testnet.website-journeys)
fi

if [ "$WITH_MUTATION" = "1" ]; then
	export COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION=1
	if [ -z "${COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY:-}" ]; then
		echo "Warning: --mutation set but COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY is not in the environment;" >&2
		echo "         testnet.onchain-to-indexer will error. Source it from .env.secrets first." >&2
	fi
	LEAVES+=(testnet.onchain-to-indexer)
fi

cd "$ROOT"

status=0
for check in "${LEAVES[@]}"; do
	printf '\n=== %s ===\n' "$check"
	if ! npx verifier-run "$check"; then
		status=1
	fi
done

# Refresh the rollup so the dashboard aggregates the freshly-written child results.
printf '\n=== testnet.environment (rollup) ===\n'
npx verifier-run testnet.environment || status=1

exit "$status"
