# The review gate (tool-agnostic)

A feature PR into `dev` can only merge after **a review was posted for its
current head commit**. This is enforced by CI, but the enforcement is
deliberately split from *who does the reviewing* so you can use Claude Code, pi,
another agent, or a human — whatever you like — without touching CI.

## The two halves

| Requirement | Enforced by | Satisfied by |
| --- | --- | --- |
| A review actually ran on **this commit** | `review-received` status check (`scripts/review-gate.mjs`) | posting a **receipt** (below) |
| Every **finding** is dealt with | GitHub `required_conversation_resolution` | posting findings as review threads and resolving them |

Neither half runs an LLM in CI. The referee is a ~100-line script with no API
key; it only inspects the PR's existing reviews.

## Referee ⇄ reviewer split

- **The referee** (`scripts/review-gate.mjs`, run by
  `.github/workflows/review-gate.yml`) answers one factual question: does a
  submitted PR review exist whose body contains

  ```
  Reviewed-commit: <current head sha>
  ```

  If yes → `review-received` is green. If no → red, and branch protection blocks
  the merge. Pushing new commits changes the sha, expiring the receipt. The
  Actions job itself is named `review-gate-referee`, not `review-received`: the
  latter name is reserved for the commit status so an obsolete pre-review
  check run cannot keep the PR blocked after a receipt arrives.

- **The reviewer** is any tool you choose. It (1) reviews the diff, (2) posts
  each finding as a PR review thread, (3) posts the receipt.

## How to satisfy it

### With Claude Code

```bash
/code-review --comment      # posts findings as inline review threads
scripts/post-review.sh      # posts the receipt for the current PR + head sha
```

### With pi, another agent, or by hand

1. Review the diff. Post any findings as review threads, e.g.:
   ```bash
   gh api -X POST repos/<owner>/<repo>/pulls/<n>/comments \
     -f body="..." -f commit_id="<head sha>" -f path="..." -F line=NN
   ```
2. Post the receipt (this is all the referee requires):
   ```bash
   scripts/post-review.sh --tool pi --files <n> --summary "…"
   ```
   `post-review.sh` submits a PR review whose body carries the
   `Reviewed-commit: <head sha>` trailer. Any equivalent that includes that
   trailer, tied to the head sha, works just as well — the script is a
   convenience, not a requirement.

## Honest limits

The referee proves a review *was posted for this code*, not that it was a *good*
review — a reviewer that posts "no findings" without looking would still pass.
That's an accepted trade for a solo project: the goal is to stop reviews being
*skipped*, and the `Reviewed-with` / `Reviewed-files` fields make a rubber-stamp
a deliberate, traceable statement rather than a reflexive merge. Findings, when
they exist, are hard-blocked by conversation resolution.

## Where the knobs live

- Reviewer receipts / findings: `scripts/post-review.sh`, `/code-review`.
- The referee logic: `scripts/review-gate.mjs`.
- The CI trigger: `.github/workflows/review-gate.yml`.
- Branch protection (marks `review-received` **required** on `dev`):
  `scripts/protect-branches.sh` — re-run after changing it.
