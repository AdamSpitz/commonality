# Shared guard: refuse direct commits/pushes on protected branches.
# Sourced by .husky/pre-commit and .husky/pre-push.
#
# All real work happens on feature branches; master and dev are only ever
# updated by merging a reviewed PR on GitHub. See CONTRIBUTING.md.
#
# Escape hatch (use sparingly, e.g. a hotfix): ALLOW_PROTECTED_COMMIT=1 git commit ...

protected_branch_guard() {
  local action="$1"   # "commit" or "push"
  local branch
  branch=$(git symbolic-ref --short HEAD 2>/dev/null)

  case "$branch" in
    master|dev)
      if [ "${ALLOW_PROTECTED_COMMIT:-}" = "1" ]; then
        echo "⚠️  ALLOW_PROTECTED_COMMIT=1 set — allowing $action on '$branch'."
        return 0
      fi
      echo ""
      echo "✋ Direct $action on '$branch' is blocked."
      echo "   master and dev only move via a reviewed GitHub PR."
      echo ""
      echo "   Start a branch and move your work onto it:"
      echo "     git switch -c feature/your-thing"
      echo ""
      echo "   Override (rare): ALLOW_PROTECTED_COMMIT=1 git $action ..."
      echo ""
      exit 1
      ;;
  esac
}
