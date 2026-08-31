# AGENTS.md

## Get acquainted with the project

Please read the project's README.md. Follow the role-based guidance links there for your task. Do NOT broadly explore specs/ — most of it won't be relevant to you.

## Local data

It is fine to wipe local dev data (`./scripts/data.sh --wipe`) unless the user explicitly says otherwise. Local chain state, Ponder DB, and IPFS data are all ephemeral by design.

## Shell commands

Prefer writing scripts to files and executing them over inline multi-line -e strings.
Avoid heredocs or embedded newlines in shell commands.
Write temporary debug scripts to `tmp/` and clean them up when done.

## Diagnostics

Avoid `lens_diagnostics mode=full` unless you specifically need a project-wide scan; it can hang or report stale cache noise. Prefer bounded `lsp_diagnostics` on touched files plus the relevant workspace typecheck/tests.

## PRs and branching

**Always compare to `dev`, not `master`.** Feature branches merge into `dev` first, then `dev → master` is a separate release step. When reviewing a branch or creating a PR:
- Use `git log dev..branch-name` (not `master..branch-name`) to count commits
- Use `git diff dev..branch-name` (not `master..branch-name`) to see changed files
- Target `dev` as the base branch for PRs (`gh pr create --base dev`)

See `workflow/branching.md` for full details.
