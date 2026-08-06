#!/usr/bin/env bash
set -euo pipefail
REPO="AdamSpitz/commonality"

# Force the PR flow: no direct pushes to master/dev, no force-pushes/deletes,
# require the PR to be up to date, and require conversations resolved.
# required_approving_review_count is 0 because this is a solo account (you
# can't approve your own PR); the review discipline is ENFORCED by the
# `review-received` status check on `dev` (see scripts/review-gate.mjs and
# workflow/review-gate.md), plus required_conversation_resolution which blocks
# merge until every posted finding is resolved.
#
# Review receipts are required on `dev`: a feature PR into `dev` must carry a
# receipt for its head commit. `master` needs no fresh review — a dev -> master
# release is a rubber-stamp of already-reviewed content — but the same check is
# required there to enforce the other half of that bargain: master only accepts
# PRs headed by `dev`, so nothing reaches the release branch without having
# passed the gate on the way into dev.
#
# `strict` (require the PR branch to be up to date with the base) is on for dev
# and OFF for master. Promoting dev -> master leaves a merge commit on master
# that dev lacks, so a strict master would demand a back-merge into dev before
# every single release.
for BRANCH in master dev; do
  echo "=== Protecting $BRANCH ==="

  if [ "$BRANCH" = "dev" ]; then
    REQUIRED_STATUS_CHECKS='{
    "strict": true,
    "contexts": ["review-received"]
  }'
  else
    REQUIRED_STATUS_CHECKS='{
    "strict": false,
    "contexts": ["review-received"]
  }'
  fi

  gh api -X PUT "repos/$REPO/branches/$BRANCH/protection" \
    --input - <<JSON
{
  "required_status_checks": $REQUIRED_STATUS_CHECKS,
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
