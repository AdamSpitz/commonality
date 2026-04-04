# Continuity notes for ephemeral AI instances

## Document Client-Side Folding architecture — COMPLETE ✓

### What was done

Wrote proper documentation for the "Client-Side Folding" architecture pattern (the indexer is intentionally a dumb event cache; all fold logic lives in the SDK).

Key decision: The existing `specs/indexer/federation.md` already had good content. Rewrote `specs/indexer/README.md` to be the canonical entry point — explicitly names the pattern, explains what/why, and links to the supplementary files. Left the other files (`federation.md`, `redesign.md`, etc.) in place as supplementary reading.

### Files changed
- `specs/indexer/README.md` — full rewrite: now the canonical "Client-Side Folding" doc
- `indexer/README.md` — added the pattern name and updated link text
- `README.md` — added "Unusual architecture" note under "Other things worth noting"
- `TODO.md` — marked task done
- `CONTINUITY.md` — this note

### Notes for next session

The next item in TODO.md's "Main thing I want to work on next" is: Document the `chainHash` delegation mechanism. Good interrupt point — the Client-Side Folding docs are complete and standalone.

---

## Working-directory guard for fake-data scripts — COMPLETE ✓

### What was done

Added a `process.cwd()` guard to `fake-data-generation/loadEnv.ts`. If the script is not run from within the `fake-data-generation/` directory, a clear warning is printed with the current directory, the expected directory, and the corrective command (`cd fake-data-generation && npm run gen:small`).

Key decision: the check uses `basename(process.cwd()) !== 'fake-data-generation'` — it checks the directory name only, not the full path, so it works regardless of where the project is cloned.

Note: the `fake-data-generation/README.md` says scripts need to be run from `hardhat/` — that's outdated. The scripts were refactored to use `viem` directly (no hardhat runtime) and now use `__dirname`-based paths, so `fake-data-generation/` is the correct expected cwd. The README note about hardhat is stale but was not updated as part of this task.

### Files changed
- `fake-data-generation/loadEnv.ts` — added cwd guard
- `TODO.md` — marked task done
- `CONTINUITY.md` — this note

### Notes for next session

The `fake-data-generation/README.md` still incorrectly says scripts need to run from `hardhat/`. Could be cleaned up. Also, `npm run lint` fails due to a pre-existing ESLint flat-config issue in `fake-data-generation/eslint.config.js` — unrelated to this task.

---

## Local deploy data persistence — COMPLETE ✓

### What was done

**Replaced hardhat node with Anvil** in `docker-compose.yml`. The `hardhat-node` service now uses `ghcr.io/foundry-rs/foundry:latest` running `anvil --host 0.0.0.0 --state /data/state.json`. Anvil's `--state` flag loads chain state on startup (if file exists) and saves it on clean exit.

Why not hardhat node: Hardhat 2.28.6 has no `--state` CLI flag, and `hardhat_dumpState`/`hardhat_loadState` JSON-RPC methods don't exist in this version. Anvil is a drop-in: same chain ID (31337), same default accounts, same JSON-RPC interface.

Entrypoint is explicitly overridden because the foundry image uses `ENTRYPOINT ["/bin/sh", "-c"]` which would swallow CLI args:
```yaml
entrypoint: ["anvil"]
command: ["--host", "0.0.0.0", "--state", "/data/state.json"]
```

`stop_grace_period: 30s` added so Anvil has time to write state.json before being killed.

Healthcheck updated to use `cast block-number` (bundled in foundry image).

**Deploy script idempotency** confirmed working — on restart with state loaded, deploy logs "Contracts already deployed on-chain — skipping redeployment."

**Data directory ownership fix:** `data.sh --wipe` (and `services.sh --start` and `run-integration-tests.sh`) all pre-create `$DATA_DIR/{hardhat,ipfs,ponder}` before `docker-compose up`, so Docker doesn't create them as root.

### Verified

Clean stop/start cycle confirmed working:
1. `./services.sh --stop` → Anvil writes `./data/hardhat/state.json`, Ponder's `./data/ponder/pglite` persists
2. `./services.sh --start` → Anvil loads same blocks, deploy skips, Ponder resumes from pglite with no reorg error
