#!/usr/bin/env bash
# Post a review receipt for the current PR so the review-gate can go green.
#
# Tool-agnostic: whatever ran the review — Claude Code, pi, a human — calls this
# to record that a review happened for the PR's current head commit. It submits
# a GitHub PR review carrying the trailer the referee looks for:
#
#     Reviewed-commit: <head sha>
#
# The gate only checks that this receipt exists for the current commit. The
# *findings* are what enforce quality: post each as a review thread (e.g.
# `/code-review --comment`, or `gh pr review --comment`/`gh api ... /comments`)
# BEFORE calling this. GitHub's "require conversation resolution" then blocks the
# merge until every finding is resolved. A clean review (no findings) is fine —
# just approve/comment with no threads.
#
# Usage:
#   scripts/post-review.sh                      # infer PR from current branch
#   scripts/post-review.sh --pr 123
#   scripts/post-review.sh --tool pi --files 7 --summary "No issues found."
#   scripts/post-review.sh --event approve      # approve | comment (default: comment)
#
# Notes:
#   * Requires `gh` authenticated with repo access.
#   * Re-run after pushing new commits — the head sha changes and the old
#     receipt no longer counts.
set -euo pipefail

PR=""
TOOL="${REVIEW_TOOL:-unspecified}"
FILES=""
SUMMARY=""
EVENT="comment"

while [ $# -gt 0 ]; do
  case "$1" in
    --pr) PR="$2"; shift 2 ;;
    --tool) TOOL="$2"; shift 2 ;;
    --files) FILES="$2"; shift 2 ;;
    --summary) SUMMARY="$2"; shift 2 ;;
    --event) EVENT="$2"; shift 2 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "post-review: unknown arg '$1'" >&2; exit 2 ;;
  esac
done

# Resolve the PR for the current branch if not given.
if [ -z "$PR" ]; then
  PR=$(gh pr view --json number --jq .number 2>/dev/null || true)
  if [ -z "$PR" ]; then
    echo "post-review: no PR found for the current branch; pass --pr <n>." >&2
    exit 1
  fi
fi

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
HEAD_SHA=$(gh api "repos/$REPO/pulls/$PR" --jq .head.sha)

case "$EVENT" in
  approve) GH_EVENT="APPROVE" ;;
  comment) GH_EVENT="COMMENT" ;;
  *) echo "post-review: --event must be 'approve' or 'comment'" >&2; exit 2 ;;
esac

# Light teeth: the body records what was reviewed, so a rubber-stamp takes a
# deliberate (traceable) statement rather than a reflexive click. The referee
# only requires the Reviewed-commit trailer to match the head sha.
BODY=$(cat <<EOF
Review receipt.

${SUMMARY:-Reviewed the diff; see any inline threads for findings.}

Reviewed-with: ${TOOL}${FILES:+
Reviewed-files: ${FILES}}
Reviewed-commit: ${HEAD_SHA}
EOF
)

# Submit against the current head sha so the receipt is tied to this exact code.
gh api -X POST "repos/$REPO/pulls/$PR/reviews" \
  -f "commit_id=$HEAD_SHA" \
  -f "event=$GH_EVENT" \
  -f "body=$BODY" >/dev/null

echo "post-review: receipt posted for PR #$PR @ ${HEAD_SHA:0:12} (event=$GH_EVENT, tool=$TOOL)."
echo "  The review-gate check will re-run and go green shortly."
