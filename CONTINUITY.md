# Continuity notes for ephemeral AI instances

## 2026-05-01 — data seeding existing-indexer guard

- Changed `scripts/data.sh --seed` to fail when the Ponder indexer already has events, unless `--allow-seed-on-existing-data` is passed.
- Documented the override in `workflow/local-development.md` and `workflow/BUILD.md`.
- Verified with `bash -n scripts/data.sh`.

## 2026-05-01 — before-testnet review fixes 1-3

- Removed developer-facing statement metadata, unknown fields, and successful-render CID footers from `ui/src/conceptspace/components/StatementRenderer.tsx`; error/not-found states still show the CID for troubleshooting.
- Updated Browse Statements to suppress excerpts that normalize to the same text as the statement title, avoiding duplicate statement text on cards.
- Added local-dev stale-Ponder guardrails: `scripts/services.sh --start` clears Ponder data when no saved local chain state exists, `scripts/data.sh --seed` warns if the indexer already contains events, and `workflow/local-development.md` documents the clean reset flow.
- Verified with targeted Vitest (`StatementRenderer`, `BrowseStatementsPage`), shell syntax checks for scripts, and `npm run build --workspace=ui`.
