#!/usr/bin/env bash
# Fast-forward origin/master to origin/dev (release).
# See workflow/branching.md.
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

RESET=0
if [ "${1:-}" = "--reset-master-to-dev" ]; then
  RESET=1
fi

git fetch origin

dev_sha=$(git rev-parse origin/dev)
master_sha=$(git rev-parse origin/master)

if [ "$dev_sha" = "$master_sha" ]; then
  echo "origin/master already points at origin/dev ($dev_sha)."
  exit 0
fi

if git merge-base --is-ancestor "$master_sha" "$dev_sha"; then
  echo "Fast-forwarding origin/master to origin/dev ($dev_sha)."
  git push origin "origin/dev:refs/heads/master"
  exit 0
fi

echo "Cannot fast-forward: origin/master is not an ancestor of origin/dev."
echo "  master: $master_sha"
echo "  dev:    $dev_sha"

if git diff --quiet origin/dev origin/master; then
  echo "Trees match (leftover GitHub merge commit on master)."
  if [ "$RESET" = 1 ]; then
    echo "Force-pushing origin/master to origin/dev (same tree)."
    git push --force origin "origin/dev:refs/heads/master"
    exit 0
  fi
  echo "One-time catch-up after old merge-commit promotes:"
  echo "  1. Temporarily allow force-pushes on master (GitHub settings or"
  echo "     allow_force_pushes in scripts/protect-branches.sh), then:"
  echo "  2. $0 --reset-master-to-dev"
  echo "  3. Re-run scripts/protect-branches.sh so force-push is off again."
  exit 1
fi

echo "Master has file changes that are not on dev. Land those on dev via a"
echo "feature PR first, then re-run this script."
git log --oneline origin/dev..origin/master
exit 1
