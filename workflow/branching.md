# Branching, Review, and Release Workflow

## Daily cheat sheet

The everyday loop, one task at a time:

```bash
git switch dev && git pull            # 1. start from an up-to-date dev
git switch -c feature/the-thing       # 2. branch off (you CAN'T commit on dev)
# ...do the work, commit as often as you like...
git push -u origin feature/the-thing  # 3. push the branch (no gate to push)
# 4. run an LLM review:  /code-review   (optionally --comment)
# 5. open the PR (see below), then merge it into dev on GitHub
```

- **Never work on `dev` directly.** If you forget and try to commit, the hook
  refuses and tells you to branch — that's the safety net, not an error to fight.
- **Feature PRs target `dev`.** GitHub's default branch is `dev`, so a plain
  `gh pr create` (or telling an LLM "make a PR") bases onto `dev` automatically.
  You only ever target `master` for a deliberate `dev → master` release.
- **The review is a manual step** you trigger before merging — decide when the
  branch is ready, run `/code-review`, address findings, then merge.

## Overview

All work happens on **feature branches**. The two long-lived branches are never
committed to directly — they only advance by merging a **reviewed GitHub PR**.

- **`feature/*`** (also `fix/*`, `chore/*`) — where you actually work
- **`dev`** — integration branch; the review gate lives here
- **`master`** — release branch, auto-deploys to Render

```
feature/x ──▶ PR ──▶ /code-review ──▶ merge to dev ──▶ PR ──▶ merge to master ──▶ Render deploys
              (the mandatory review gate)                (rubber-stamp: dev is already reviewed)
```

Because `dev` is gated, promoting `dev → master` is a formality — everything in
`dev` was already reviewed on the way in.

## The flow

1. **Start a branch** — you cannot commit on `master`/`dev` (git hook blocks it):
   ```bash
   git switch -c feature/your-thing
   ```
2. **Do the work and commit.** The `pre-commit` hook runs lint + build + fast
   tests on every commit, same as before.
3. **Push and open a PR into `dev`:**
   ```bash
   git push -u origin feature/your-thing
   gh pr create --base dev --fill
   ```
4. **Run an LLM review before merging.** With Claude Code:
   ```
   /code-review           # reviews the current branch's diff
   /code-review --comment  # ...and posts findings as inline PR comments
   ```
   Any LLM works — the requirement is a review happened, not which tool did it.
   Tick the review checkbox in the PR template.
5. **Merge the PR into `dev`** (squash or merge, your call), then delete the branch.
6. **Release:** open a PR `dev → master` and merge it. The `pre-merge-commit`
   hook still runs the full test suite as the safety net. Render deploys `master`.

## Enforcement (why you can't forget)

This is layered so the discipline holds regardless of which tool — or human —
is driving:

| Layer | What it does | Bypassable? |
|-------|--------------|-------------|
| GitHub branch protection on `master` & `dev` | No direct pushes, no force-push/delete, PR required, conversations must resolve. `enforce_admins` is on, so it applies to you too. | No — server-side |
| `.husky/pre-commit` guard | Refuses commits while `HEAD` is `master`/`dev` | `--no-verify` / escape hatch |
| `.husky/pre-push` guard | Refuses pushing local `master`/`dev` | `--no-verify` / escape hatch |
| `.claude/hooks/block-protected-branch.sh` | Makes *Claude Code* self-correct onto a feature branch gracefully instead of erroring | Claude-only sugar |

Escape hatch for a genuine hotfix commit (still can't push to protected branch
on GitHub): `ALLOW_PROTECTED_COMMIT=1 git commit ...`

### On the "LLM review" gate

GitHub can't verify that an *LLM* reviewed a PR, and on a solo account you can't
approve your own PR — so `required_approving_review_count` is `0`. The review
discipline is enforced by the PR flow itself (which pushes you into
`/code-review`) plus the PR-template checklist, not a GitHub-counted approval.
If you later add a CI job that posts a status check, add it to
`required_status_checks` in `scripts/protect-branches.sh` to make it a hard gate.

## Hook reference

- **pre-commit** (every commit, any branch): branch guard, then lint + build +
  `verifier-run automated.test-fast`. Skipped if only `.txt/.md/.gitignore`
  changed.
- **pre-push** (every push): branch guard against pushing local `master`/`dev`.
- **pre-merge-commit** (merging into `master`): clean-tree check +
  `verifier-run automated.test-full` (Docker/Playwright E2E, ~3 min). Aborts the
  merge on failure.

## Notes

- Hooks are POSIX-compatible bash (`#!/usr/bin/env bash`, `case` not `[[`).
- Hooks are shared via husky (`core.hooksPath=.husky/_`); a fresh clone gets them
  after `npm install` runs the `prepare` script.
- Branch protection settings live in `scripts/protect-branches.sh` — re-run it to
  reapply or adjust (e.g. after adding a CI status check).
