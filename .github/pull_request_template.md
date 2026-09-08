## What & why

<!-- Brief summary of the change and the reason for it. -->

## Review (enforced for PRs into `dev`)

- [ ] Reviewed the diff and posted findings as review threads (`/code-review --comment`, pi, etc.)
- [ ] Posted the receipt so the `review-received` check goes green (`scripts/post-review.sh`)
- [ ] All finding threads resolved

> You can't merge into `dev` until `review-received` is green **and** every
> conversation is resolved — GitHub enforces both. See `workflow/review-gate.md`.

## Checklist

- [ ] Tests pass (`pre-commit` fast tests green)
- [ ] Targeting `dev` (feature PRs never target `master`)

<!--
Workflow: feature branch → PR into dev → review + receipt → merge.
Release (later): scripts/promote-dev-to-master.sh (fast-forward master to dev).
See workflow/branching.md and workflow/review-gate.md.
-->
