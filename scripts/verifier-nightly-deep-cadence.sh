#!/usr/bin/env bash
set -u

REPO_DIR="/home/adam/Projects/commonality"
LOG_DIR="$REPO_DIR/verifier/logs"
LOG_FILE="$LOG_DIR/nightly-deep-cadence.log"

mkdir -p "$LOG_DIR"

{
  echo "=== commonality verifier deep cadence started at $(date --iso-8601=seconds) ==="
  cd "$REPO_DIR" || exit 1
  export VERIFIER_WORKSPACE=verifier
  export PATH="$HOME/.nix-profile/bin:$HOME/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

  npm run verifier:deep-cadence
  status=$?

  if [ "$status" -eq 0 ]; then
    echo "=== commonality verifier deep cadence passed at $(date --iso-8601=seconds) ==="
  else
    echo "=== commonality verifier deep cadence FAILED with exit $status at $(date --iso-8601=seconds) ==="
  fi

  exit "$status"
} >> "$LOG_FILE" 2>&1
status=$?

if [ "$status" -ne 0 ]; then
  echo "Commonality verifier nightly deep cadence failed with exit $status. Recent log tail:" >&2
  tail -n 120 "$LOG_FILE" >&2
fi

exit "$status"
