# Branching, Review, and Release Workflow

## Daily cheat sheet

The everyday loop, one task at a time:

```bash
git switch dev && git pull            # 1. start from an up-to-date dev
git switch -c feature/the-thing       # 2. branch off (you CAN'T commit on dev)
# ...do the work, commit as often as you like...
git push -u origin feature/the-thing  # 3. push the branch (no gate to push)
gh pr create --base dev --fill        # 4. open the PR
# 5. review + post the receipt:  /code-review --comment  &&  scripts/post-review.sh
gh pr merge --auto --merge            # 6. queue merge; do NOT wait for GitHub Actions
# 7. start the next task (see "Don't wait on CI" below)
```

- **Never work on `dev` directly.** If you forget and try to commit, the hook
  refuses and tells you to branch — that's the safety net, not an error to fight.
- **Feature PRs target `dev`.** GitHub's default branch is `dev`, so a plain
  `gh pr create` (or telling an LLM "make a PR") bases onto `dev` automatically.
  Do not open a PR into `master` to release — fast-forward `master` to `dev`
  (see below).
- **The review is a manual step** you trigger before merging — decide when the
  branch is ready, run `/code-review`, address findings, then queue auto-merge.
- **Do not sit on GitHub Actions.** Lint / build / UI / contract jobs on the PR
  are informational. They are **not** required to merge. If Adam says "merge
  when it's ready," that means review receipt + resolved threads, not a
  six-minute CI wait.

## Overview

All work happens on **feature branches**. You never commit on `dev` or `master`.

- **`feature/*`** (also `fix/*`, `chore/*`) — where you actually work
- **`dev`** — integration branch; the review gate lives here; advances only by
  merging a **reviewed GitHub PR**
- **`master`** — release pointer, auto-deploys to Render. End-user documentation
  links source files at `master` on purpose: it is the code the deployed sites
  are running, even though `dev` is GitHub's default branch. `master` advances
  only by **fast-forwarding to the current `dev` tip** — same commit SHA, no
  extra merge commit.

```
feature/x ──▶ PR ──▶ /code-review ──▶ merge to dev ──▶ fast-forward master to dev ──▶ Render deploys
              (the mandatory review gate)
```

Because `dev` is gated, promoting `dev → master` is a formality — everything in
`dev` was already reviewed on the way in. GitHub's "Create a merge commit" is
`--no-ff` and would leave a commit only on `master`; we do not use a PR for
this step.

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
   before GitHub will let you merge. That referee is a short Actions job; it is
   **not** the lint/build/test workflow.
5. **Queue the merge, then move on.** Do not poll GitHub Actions until the
   full test jobs go green:
   ```bash
   gh pr merge --auto --merge    # or --squash; your call
   ```
   Auto-merge lands the PR as soon as `review-received` is green, threads are
   resolved, and the branch is up to date with `dev` (`strict` is on). Then
   delete the branch when GitHub does (or after it lands).
6. **Release:** fast-forward `master` to `dev`:
   ```bash
   scripts/promote-dev-to-master.sh
   ```
   Render deploys `master`. No GitHub PR, no back-merge.

### Don't wait on CI

GitHub branch protection on `dev` requires **only** the `review-received`
status check (plus resolved conversations, and the branch being up to date
with `dev`). The "CI - Build and Test" workflow is extra signal. The same
lint + build + fast tests already ran locally in `pre-commit`.

Agents: after `scripts/post-review.sh`, run `gh pr merge --auto --merge` and
**start the next task in the same turn**. Do not `sleep`, poll `gh pr checks`,
or hold the conversation open for six minutes. If CI later fails, fix it in a
follow-up — that is cheaper than blocking Adam.

Starting the next task:

- **Independent work:** `git fetch origin && git switch -c feature/next origin/dev`.
  If the earlier PR merges first, this one may go stale (`strict` is on);
  auto-merge will wait until someone rebases onto the new `dev`. Rebase when
  you notice; don't sit watching for it.
- **Depends on the open PR:** branch off that feature branch (or keep working
  in its worktree). Don't wait for it to reach `dev`.

If you push more commits after the receipt, the head sha changes and you must
review + `post-review.sh` again before auto-merge can fire.

### Releasing `dev` to `master`

`master` is a pointer. Release means move it to the same commit as `dev`:

```bash
scripts/promote-dev-to-master.sh
```

That is `git push origin origin/dev:refs/heads/master` after a fetch. GitHub
branch protection on `master` does **not** require a PR. Force-push is off, so
the push succeeds only when it is a fast-forward (`origin/master` is already an
ancestor of `origin/dev`). After a successful promote, the SHAs match:

```bash
git fetch origin
test "$(git rev-parse origin/dev)" = "$(git rev-parse origin/master)"
```

If `origin/master` has unique *file* changes (a hotfix that never went through
`dev`), land those on `dev` with the usual feature PR + review gate first. Then
promote. Do not open a `dev → master` GitHub PR — that creates a merge commit
only on `master` and breaks the next fast-forward.

If your local `master` got messy while experimenting, reset it to the
remote instead of pushing it:

```bash
git switch master
git reset --hard origin/master
```

## Enforcement (why you can't forget)

This is layered so the discipline holds regardless of which tool — or human —
is driving:

| Layer | What it does | Bypassable? |
|-------|--------------|-------------|
| GitHub branch protection on `dev` | No direct pushes, no force-push/delete, PR required, `review-received`, conversations must resolve. `enforce_admins` is on. | No — server-side |
| GitHub branch protection on `master` | No force-push/delete. PR **not** required. Direct fast-forward to `dev` is how release works. | No — server-side |
| `.husky/pre-commit` guard | Refuses commits while `HEAD` is `master`/`dev` | `--no-verify` / escape hatch |
| `.husky/pre-push` guard | Refuses pushing `origin/dev`. `origin/master` only if the new SHA is current `origin/dev` and the update is a fast-forward. | `--no-verify` / escape hatch |
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

`master` is **not** gated by `review-received` and does not require a PR: a
`dev → master` promote is a fast-forward of content already reviewed on the way
into `dev`. The `pre-merge-commit` hook still runs `automated.test-full` if
someone merges into a local `master` checkout; the normal promote path does not
create a merge commit, so that hook does not run.

## Hook reference

- **pre-commit** (every commit, any branch): branch guard, then lint + build +
  `verifier-run automated.test-fast`. Skipped if only `.txt/.md/.gitignore`
  changed.
- **pre-push** (every push): refuse `origin/dev`; allow `origin/master` only as
  a fast-forward to current `origin/dev`.
- **pre-merge-commit** (merging into a local `master` checkout): clean-tree
  check + `verifier-run automated.test-full` (Docker/Playwright E2E, ~3 min).
  Aborts that merge on failure. Not used by `scripts/promote-dev-to-master.sh`.

## Notes

- Hooks are POSIX-compatible bash (`#!/usr/bin/env bash`, `case` not `[[`).
- Hooks are shared via husky (`core.hooksPath=.husky/_`); a fresh clone gets them
  after `npm install` runs the `prepare` script.
- Branch protection settings live in `scripts/protect-branches.sh` — re-run it to
  reapply or adjust (e.g. after adding a CI status check).
