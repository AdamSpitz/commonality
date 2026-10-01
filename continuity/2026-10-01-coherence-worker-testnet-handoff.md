# Testnet coherence worker handoff (2026-10-01)

## Status

The reported example is fixed. Render's live `commonality-coherence-badge-worker` had an obsolete `PUBLISHED_DATA_CONTRACT_ADDRESS` (`0xee860…`) while the current Base Sepolia deployment is `0xC4074f563DA9E2b9751629e9A3213eB02099513e`. Content reads fell through to `ipfs.io`, which returned 429; the old worker then advanced its cursor and lost the badge opportunity. I corrected the live Render env and deployed the worker from reviewed `dev` commit `cf571c5976ee9f6fac820a0b6a9ca020596227bd`.

The target `RefUpdated` at block 47524311, tx `0x8003dbeae86e14494176fbab7cd8ea24cfcffbae04b72d062dd3e51cdfc2f9c7`, was replayed. Render logged `judged attested` at 20:11:16 UTC, and a fresh browser load of the user's URL showed **Coherent construction**. A live cause-assist check independently returned `coherent: true`. The worker's public operator address is `0x39e477B6D9776244849eea9f79FC890ADB25cCbA`.

PR [#209](https://github.com/AdamSpitz/commonality/pull/209) merged to `dev` a durable pending queue: content-unavailable events are retried after the cursor advances instead of being lost. Worker tests plus pre-commit lint/build/fast tests passed. Render now runs that merged commit. No `dev`→`master` promotion has been done; avoid releasing unrelated `dev` changes merely for this worker.

## Work remaining

Only the example event was replayed. The indexer reports 46 `RefUpdated` events from the worker's configured `START_BLOCK=47467743`; other missed badges may remain. PR [#210](https://github.com/AdamSpitz/commonality/pull/210), commit `e81a2914`, changes the generated Render blueprint and template to use `/data/coherence-badge-worker.base-sepolia.v2.json`, forcing one full replay from that start block. It is pushed and open, with pre-commit checks passed, but **not yet reviewed or merged**.

Next agent should review #210, post a review receipt (`scripts/post-review.sh`), merge when `review-received` is green, and switch back to local `dev`/delete the feature branch per `workflow/branching.md`. GitHub auto-merge is disabled, so use `gh pr merge 210 --merge` after the gate passes. Then set Render worker `STATE_FILE` to `/data/coherence-badge-worker.base-sepolia.v2.json` and deploy the merged `dev` commit explicitly through the Render API. Live `START_BLOCK` is already `47467743`, and live `PUBLISHED_DATA_CONTRACT_ADDRESS` is corrected. Monitor the worker's replay logs, on-chain badge outcomes, and operator gas balance. The prior state file is preserved; the new one will be created on startup. The template already has the correct PublishedData address.

Current Render worker service ID is `srv-d9tielqjobas73d35da0`. The API key is in gitignored `.env.render`. Disposable diagnostic/deployment scripts are in `tmp/check-render-worker.py`, `tmp/check-deploy.py`, `tmp/redeploy-coherence-worker.py`, `tmp/check-coherence-page.js`, `tmp/check-publication.ts`, `tmp/check-roster-events.mjs`, and `tmp/check-worker-read.ts`; clean them up after the replay. `tmp/redeploy-coherence-worker.py` currently restores the old state-file path, so edit it before running again. Avoid printing secrets from Render env.

Current checkout is `fix/coherence-worker-backfill-state` with a clean tracked tree. The most recent Render deploy was `dep-davbt4vpn0mc73cegh5g`, live at 20:13:38 UTC, on commit `cf571c59` with the original state file. The user's example badge remains on-chain and visible.

## Suggested skills

- `browser-driving` to verify the live page after replay if useful.
- `handoff` only if work spans another context boundary.
