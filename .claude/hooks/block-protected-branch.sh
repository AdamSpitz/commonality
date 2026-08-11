#!/usr/bin/env bash
# Claude Code PreToolUse hook (Bash): stop an agent from committing/pushing
# directly on master or dev. This is the "graceful" layer — the .husky git
# hooks are the real enforcement (and fire for any tool, not just Claude).
#
# Exit 2 blocks the tool call and feeds stderr back to the model so it can
# self-correct by starting a feature branch.

input=$(cat)
cmd=$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)/\1/p')

# Only care about git commit / push / merge as real subcommands.
# Pattern: git, optional intermediate tokens (e.g. -C path), then commit|push|merge
# as a whole token. The char after the subcommand must not be alnum/_/- so we do
# NOT match false friends: merge-base, merge-file, merge-tree, commit-tree.
# Example that must stay allowed: `git merge-base --is-ancestor origin/master origin/dev`
if ! printf '%s' "$cmd" | grep -Eq \
  '(^|[^[:alnum:]_/-])git[[:space:]]+(.+[[:space:]])?(commit|push|merge)([^[:alnum:]_-]|$)'; then
  exit 0
fi

# Honor the same escape hatch as the git hooks.
case "$cmd" in
  *ALLOW_PROTECTED_COMMIT=1*) exit 0 ;;
esac

branch=$(git -C "${CLAUDE_PROJECT_DIR:-.}" symbolic-ref --short HEAD 2>/dev/null)
case "$branch" in
  master|dev)
    echo "Blocked: '$branch' is a protected branch. Do not commit/push/merge directly onto it." >&2
    echo "Start a feature branch first (git switch -c feature/...), move the work there, and open a PR." >&2
    echo "master and dev only advance via a reviewed GitHub PR." >&2
    exit 2
    ;;
esac
exit 0
