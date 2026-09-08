#!/usr/bin/env bash
set -euo pipefail
REPO="AdamSpitz/commonality"

# Force the PR flow on `dev`: no direct pushes, no force-pushes/deletes,
# require the PR to be up to date, and require conversations resolved.
# required_approving_review_count is 0 because this is a solo account (you
# can't approve your own PR); the review discipline is ENFORCED by the
# `review-received` status check on `dev` (see scripts/review-gate.mjs and
# workflow/review-gate.md), plus required_conversation_resolution which blocks
# merge until every posted finding is resolved.
#
# `master` is the release pointer. It does NOT require a pull request: release
# is a fast-forward push of current `origin/dev` onto `master` (see
# scripts/promote-dev-to-master.sh). Force-push and delete stay off, so GitHub
# will reject anything that is not a fast-forward. There is no review-received
# check on `master`; content was already reviewed on the way into `dev`.
#
# Hotfix branches should still land on `dev` (review gate) and then be
# promoted. A leftover PR into `master` is optional paper trail, not required.

echo "=== Protecting dev ==="
gh api -X PUT "repos/$REPO/branches/dev/protection" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["review-received"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": false
}
JSON
echo "  ok"

echo "=== Protecting master (FF push allowed; no PR required) ==="
gh api -X PUT "repos/$REPO/branches/master/protection" \
  --input - <<'JSON'
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_conversation_resolution": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": false
}
JSON
echo "  ok"
