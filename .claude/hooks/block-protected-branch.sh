#!/usr/bin/env bash
# PreToolUse hook (Bash / Grok run_terminal_command): stop an agent from
# committing/pushing/merging directly on master or dev. This is the "graceful"
# layer — the .husky git hooks are the real enforcement (and fire for any tool).
#
# Exit 2 blocks the tool call and feeds stderr back to the model so it can
# self-correct by starting a feature branch.

set -euo pipefail

HOOK_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MATCHER="$HOOK_DIR/git-mutating-subcommand.py"

if [ "${1:-}" = --self-test ]; then
  exec python3 "$MATCHER" --self-test
fi

input=$(cat)

# Honor the same escape hatch as the git hooks (also recognized inside the matcher).
if ! printf '%s' "$input" | python3 "$MATCHER"; then
  exit 0
fi

branch=$(git -C "${CLAUDE_PROJECT_DIR:-.}" symbolic-ref --short HEAD 2>/dev/null || true)
case "$branch" in
  master|dev)
    echo "Blocked: '$branch' is a protected branch. Do not commit/push/merge directly onto it." >&2
    echo "Start a feature branch first (git switch -c feature/...), move the work there, and open a PR." >&2
    echo "master and dev only advance via a reviewed GitHub PR." >&2
    exit 2
    ;;
esac
exit 0
