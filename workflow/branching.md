# Branching, Review, and Release Workflow

## Daily cheat sheet

The everyday loop, one task at a time:

```bash
git switch dev && git pull            # 1. start from an up-to-date dev
git switch -c feature/the-thing       # 2. branch off (you CAN'T commit on dev)
# ...do the work, commit as often as you like...
git push -u origin feature/the-thing  # 3. push the branch (no gate to push)
# 4. review + post the receipt:  /code-review --comment  &&  scripts/post-review.sh
# 5. open the PR (see below); merge once review-received is green + threads resolved
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
- **`master`** — release branch, auto-deploys to Render. End-user documentation
  links source files at `master` on purpose: it is the code the deployed sites
  are running, even though `dev` is GitHub's default branch.

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
4. **Run an LLM review before merging, then post the receipt.** With Claude Code:
   ```
   /code-review --comment   # review the diff; post findings as inline threads
   scripts/post-review.sh    # record the receipt so the gate goes green
   ```
   Any tool works (Claude, pi, a human) — see [`review-gate.md`](review-gate.md).
   The `review-received` check must be green and every finding thread resolved
   before GitHub will let you merge.
5. **Merge the PR into `dev`** (squash or merge, your call), then delete the branch.
6. **Release:** open a PR `dev → master` and merge it. The `pre-merge-commit`
   hook still runs the full test suite as the safety net. Render deploys `master`.

### If `dev` and `master` have diverged

The normal release path is a GitHub PR from `dev` into `master`:

```bash
git fetch origin
gh pr create --base master --head dev --title "Promote dev to master"
```

Before opening/merging it, sanity-check that `master` is an ancestor of `dev`:

```bash
git merge-base --is-ancestor origin/master origin/dev
```

Exit code `0` means the PR is a normal fast-forward-style promotion. Exit code
`1` means `origin/master` has commits that are not in `origin/dev`; a regular
merge PR will try to reconcile the two histories, not simply make `master` equal
`dev`.

If the deliberate intent is **"make `master` exactly match the current `dev`
tree"**, create a promotion branch based on `master` and replace its contents
with `dev`:

```bash
git fetch origin
git switch -c release/dev-to-master origin/master
git restore --source=origin/dev --staged --worktree :/
git commit -m "Promote dev to master"
git push -u origin release/dev-to-master
gh pr create --base master --head release/dev-to-master --title "Promote dev to master"
```

Then verify the promotion branch's tree matches `dev`:

```bash
git diff --quiet origin/dev origin/release/dev-to-master
```

Only merge after the usual release checks pass. If your local `master` got messy
while experimenting, reset it to the protected remote branch instead of pushing
it:

```bash
git switch master
git reset --hard origin/master
```

## Enforcement (why you can't forget)

This is layered so the discipline holds regardless of which tool — or human —
is driving:

| Layer | What it does | Bypassable? |
|-------|--------------|-------------|
| GitHub branch protection on `master` & `dev` | No direct pushes, no force-push/delete, PR required, conversations must resolve. `enforce_admins` is on, so it applies to you too. | No — server-side |
| `.husky/pre-commit` guard | Refuses commits while `HEAD` is `master`/`dev` | `--no-verify` / escape hatch |
| `.husky/pre-push` guard | Refuses pushing local `master`/`dev` | `--no-verify` / escape hatch |
| `.claude/hooks/block-protected-branch.sh` | Makes Claude Code / Grok self-correct onto a feature branch instead of erroring. Matches `git commit` / `git push` / `git merge` as subcommands only (not `merge-base`, not the word "merge" in a description). | Agent sugar; husky still enforces |

Escape hatch for a genuine hotfix commit (still can't push to protected branch
on GitHub): `ALLOW_PROTECTED_COMMIT=1 git commit ...`

### On the "LLM review" gate

A feature PR into `dev` **cannot merge until a review was posted for its current
head commit.** This is a real, enforced gate, not an honor-system checkbox:

- A tiny, tool-agnostic CI referee (`scripts/review-gate.mjs`, run by
  `.github/workflows/review-gate.yml`) sets the required status check
  `review-received`. It runs **no LLM and holds no API key** — it only asks
  whether a review receipt exists for the head sha.
- **Any reviewer satisfies it** — Claude Code (`/code-review`), pi, or a human —
  by posting a receipt via `scripts/post-review.sh`. Which tool did the review
  is your choice; the gate only cares that one ran on *this* commit.
- Pushing new commits changes the sha, so the receipt expires and the gate
  re-arms — you can't review once and then quietly amend the code.
- **Findings** are enforced separately by `required_conversation_resolution`:
  post each finding as a review thread (`/code-review --comment` does this) and
  GitHub blocks the merge until every one is resolved.

`required_approving_review_count` stays `0` because a solo account can't approve
its own PR — the `review-received` check is what does the enforcing. The full
protocol (so other agents can post receipts) is in
[`review-gate.md`](review-gate.md).

`master` is **not** gated by the `review-received` check: a `dev → master`
release is a rubber-stamp of content already reviewed on the way into `dev`. The
full test suite still runs — the `pre-merge-commit` hook executes
`automated.test-full` on every merge into `master` and aborts on failure.

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
