# Branching and Release Workflow

## Overview

We use a two-branch structure:
- **`dev`** — development branch where all work happens
- **`master`** — release branch, gated by the full test suite

## Branch Structure

```
dev     ── work happens here (pre-commit hook: lint + build + fast tests)
  │
  │  git checkout master && git merge dev && git push origin master
  ▼
master  ── promoted from dev (pre-push hook: full test suite before push)
```

## Hooks

### pre-commit (runs on every commit in any branch)
- **Lint:** ESLint on hardhat, indexer, sdk
- **Build:** TypeScript compilation for all workspaces
- **Test:** `verifier-run automated.test-fast` (SDK + Hardhat + integration harness + UI Vitest; no Docker/Playwright)
- **Skip:** If only `.txt/.md/.gitignore` files changed, the above is skipped

### pre-merge-commit (runs when merging into master)
- **Check:** Working tree must be clean (no uncommitted changes)
- **Test:** `verifier-run automated.test-full` (full suite including Docker/Playwright E2E tests — takes ~3 minutes)
- **Block:** If tests fail, the merge is aborted. Fix failures in `dev`, merge again.

## Workflow

1. **Do work in `dev`** (the pre-commit hook runs on every commit)
2. **When ready to release:**
   ```bash
   git checkout master
   git merge dev
   ```
   The pre-merge-commit hook runs the full test suite. If tests pass, the merge completes. If tests fail, the merge is aborted — go back to `dev`, fix the issues, and retry.
3. **After merge succeeds:** `git push origin master`

The test suite also runs when pushing to master (pre-push hook), but the main gate is the merge itself.

## Rationale

- **Dev is fast:** Pre-commit hook runs `verifier-run automated.test-fast` (~46s) so you get quick feedback and recorded verifier results on each commit
- **Master is safe:** Pre-merge-commit hook runs `verifier-run automated.test-full` (~3min) including Docker-based E2E tests before allowing any merge to master
- **Local enforcement:** The merge itself is blocked if tests fail, so you can't accidentally skip the gate
- **No external dependencies:** Works offline. Tradeoff: can be bypassed with `--no-verify`, so discipline is required.

## Notes

- The `.husky/pre-push` hook uses POSIX-compatible bash (`#!/usr/bin/env bash` with `case` instead of `[[`)
- If you work across multiple machines, ensure hooks are installed on each (or use a dotfiles sync tool)
- History is preserved — `dev` and `master` contain the same commits from the point of rename