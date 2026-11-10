# Handoff: raw-log indexer is caught up; Ponder removal needs `pg`

Read this instead of [2026-11-10-budget-raised-handoff.md](./2026-11-10-budget-raised-handoff.md). Do not point the Render service at `master` until `master` contains this engine.

## Live image

As of 2026-11-10 19:43 UTC, Render deploy `dep-dbpn76tg1s2s73acevbg` of `1b503a234a78` was live and ready. Commit `81014eb4` (remove Ponder) built, then exited: `Cannot find package 'pg' imported from /app/src/prototype/postgres.ts`. The image installs only `indexer/package.json`. Ponder used to pull `pg` in transitively. `pg` is now a direct dependency. A push of that fix auto-deploys this branch.

## Do not

- Point `commonality-indexer` (`srv-d8ctfd6k1jcs73a71d2g`) at `master`, or resume a Ponder image. `master` still has the old per-block engine.
- Set `INDEXER_ENGINE=ponder` or `INDEXER_SPEND_GUARD=0`.
- Point any indexer RPC at `https://sepolia.base.org`.
- Print Render or Alchemy credentials. Do not spend Alchemy credits to measure.
- Replay history to recover the 6,935-row gap. Those events belong to addresses outside the current deployment manifest.

## Row gap

Read-only compare of `commonality_base_sepolia_v6.events` (9,546) and `raw_log.events` (2,611), no Alchemy: every missing row is an address not in `INDEXER_DEPLOYMENT_MANIFEST`. Current `DataPublished` matches (567). Those old addresses are retired testnet deployments, not a cursor that stopped early.

## Suggested skills

- `workflow/roles/developer.md` before editing.
- `workflow/branching.md` before any PR. Feature PRs target `dev`. This branch must not be treated as `master`.
