# Shared guard: refuse direct commits/pushes on protected branches.
# Sourced by .husky/pre-commit and .husky/pre-push.
#
# All real work happens on feature branches. `dev` only moves via a reviewed
# GitHub PR. `master` only moves by fast-forwarding to current origin/dev
# (scripts/promote-dev-to-master.sh). See workflow/branching.md.
#
# Escape hatch (use sparingly, e.g. a hotfix commit): ALLOW_PROTECTED_COMMIT=1

protected_branch_guard() {
  action="$1"   # "commit" or "push"

  if [ "$action" = "push" ]; then
    protected_branch_push_guard
    return
  fi

  branch=$(git symbolic-ref --short HEAD 2>/dev/null) || return 0

  case "$branch" in
    master|dev)
      if [ "${ALLOW_PROTECTED_COMMIT:-}" = "1" ]; then
        echo "⚠️  ALLOW_PROTECTED_COMMIT=1 set — allowing $action on '$branch'."
        return 0
      fi
      echo ""
      echo "✋ Direct $action on '$branch' is blocked."
      echo "   Work on a feature branch; merge to dev via a reviewed PR."
      echo "   Release: scripts/promote-dev-to-master.sh (FF origin/dev → master)."
      echo ""
      echo "   Start a branch:"
      echo "     git switch -c feature/your-thing"
      echo ""
      echo "   Override (rare): ALLOW_PROTECTED_COMMIT=1 git $action ..."
      echo ""
      exit 1
      ;;
  esac
}

# Git feeds pre-push: <local_ref> <local_sha> <remote_ref> <remote_sha>
protected_branch_push_guard() {
  if [ "${ALLOW_PROTECTED_COMMIT:-}" = "1" ]; then
    echo "⚠️  ALLOW_PROTECTED_COMMIT=1 set — allowing push."
    return 0
  fi

  saw_ref=0
  while read -r _local_ref local_sha remote_ref remote_sha; do
    [ -z "${remote_ref:-}" ] && continue
    saw_ref=1
    case "$remote_ref" in
      refs/heads/dev)
        echo ""
        echo "✋ Pushing to origin/dev is blocked. Open a PR into dev instead."
        echo ""
        exit 1
        ;;
      refs/heads/master)
        expected=$(git rev-parse origin/dev 2>/dev/null) || {
          echo "✋ Cannot push master: origin/dev is missing. git fetch origin first."
          exit 1
        }
        if [ "$local_sha" != "$expected" ]; then
          echo ""
          echo "✋ origin/master may only fast-forward to current origin/dev."
          echo "   Use scripts/promote-dev-to-master.sh"
          echo "   attempted: $local_sha"
          echo "   origin/dev: $expected"
          echo ""
          exit 1
        fi
        zeros=0000000000000000000000000000000000000000
        if [ "$remote_sha" != "$zeros" ]; then
          if ! git merge-base --is-ancestor "$remote_sha" "$local_sha"; then
            echo ""
            echo "✋ origin/master update is not a fast-forward."
            echo "   See scripts/promote-dev-to-master.sh (and --reset-master-to-dev"
            echo "   only when the trees already match)."
            echo ""
            exit 1
          fi
        fi
        ;;
    esac
  done

  if [ "$saw_ref" = 1 ]; then
    return 0
  fi

  # Empty stdin (unusual): still refuse a default push from master/dev.
  branch=$(git symbolic-ref --short HEAD 2>/dev/null) || return 0
  case "$branch" in
    master|dev)
      echo ""
      echo "✋ Direct push on '$branch' is blocked."
      echo "   Release: scripts/promote-dev-to-master.sh"
      echo ""
      exit 1
      ;;
  esac
}
