#!/usr/bin/env bash

# Shared secret-file locations for scripts.
# Service secrets are the hot, app/runtime secrets in the repo-local gitignored
# file. Operator secrets are maintenance/deployment-only secrets kept outside
# the repo tree.

commonality_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

commonality_service_secrets_file() {
  local root="${1:-$(commonality_repo_root)}"
  printf '%s/.env.secrets' "$root"
}

commonality_operator_secrets_file() {
  printf '%s' "${COMMONALITY_OPERATOR_SECRETS_FILE:-$HOME/.secrets/commonality/operator.env}"
}

commonality_require_secret_file() {
  local file="$1"
  local description="$2"
  if [ ! -f "$file" ]; then
    echo "Error: $description not found: $file" >&2
    return 1
  fi
}

commonality_env_value() {
  local key="$1"
  shift
  local file
  for file in "$@"; do
    [ -f "$file" ] || continue
    grep -E "^${key}=" "$file" | tail -1 | cut -d= -f2-
  done | tail -1
}
