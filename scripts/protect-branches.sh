#!/usr/bin/env bash
set -euo pipefail
REPO="AdamSpitz/commonality"

# Force the PR flow: no direct pushes to master/dev, no force-pushes/deletes,
# require the PR to be up to date, and require conversations resolved.
# required_approving_review_count is 0 because this is a solo account (you
# can't approve your own PR); the review discipline is the /code-review step
# + the PR-template checklist, not a GitHub-counted human approval.
for BRANCH in master dev; do
  echo "=== Protecting $BRANCH ==="
  gh api -X PUT "repos/$REPO/branches/$BRANCH/protection" \
    --input - <<JSON
{
  "required_status_checks": null,
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
done
