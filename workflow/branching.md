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
- **Test:** `npm run test:fast` (SDK + Hardhat + integration harness + UI Vitest; no Docker/Playwright)
- **Skip:** If only `.txt/.md/.gitignore` files changed, the above is skipped

### pre-push (runs only when pushing to master)
- **Check:** Working tree must be clean (no uncommitted changes)
- **Test:** `npm test` (full suite including Docker/Playwright E2E tests — takes ~3 minutes)
- **Block:** If tests fail, push is rejected. Fix failures in `dev`, merge, and retry.
- **Bypass:** `git push --no-verify` (not recommended; skips the gate)

## Workflow

1. **Do work in `dev`** (the pre-commit hook runs on every commit)
2. **When ready to release:**
   ```bash
   git checkout master
   git merge dev
   git push origin master
   ```
3. **If tests fail on push:** The push is rejected. Go back to `dev`, fix the issues, commit, merge again, and push.

## Rationale

- **Dev is fast:** Pre-commit hook runs `test:fast` (~46s) so you get quick feedback on each commit
- **Master is safe:** Pre-push hook runs `npm test` (~3min) including Docker-based E2E tests before allowing any push to master
- **Local hooks:** No external dependencies (GitHub CI); works offline. Tradeoff: can be bypassed with `--no-verify`, so discipline is required.

## Notes

- The `.husky/pre-push` hook uses POSIX-compatible bash (`#!/usr/bin/env bash` with `case` instead of `[[`)
- If you work across multiple machines, ensure hooks are installed on each (or use a dotfiles sync tool)
- History is preserved — `dev` and `master` contain the same commits from the point of rename