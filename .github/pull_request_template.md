## What & why

<!-- Brief summary of the change and the reason for it. -->

## Review (enforced for PRs into `dev`)

- [ ] Reviewed the diff and posted findings as review threads (`/code-review --comment`, pi, etc.)
- [ ] Posted the receipt so the `review-received` check goes green (`scripts/post-review.sh`)
- [ ] All finding threads resolved

> You can't merge into `dev` until `review-received` is green **and** every
> conversation is resolved — GitHub enforces both. See `workflow/review-gate.md`.

## Checklist

- [ ] Tests pass (`pre-commit` fast tests green; full suite runs on `dev → master`)
- [ ] Targeting the right base branch (`dev` for features; `master` only for releases)

<!--
Workflow: feature branch → PR into dev → review + receipt → merge → (later) dev → master.
See workflow/branching.md and workflow/review-gate.md.
-->
