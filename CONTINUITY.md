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

## Same-domain implication restriction — COMPLETE ✓

### What was done

Verified and documented that the same-domain restriction for implication generation is already implemented across the codebase:

1. **generateAttestations.ts:88-102** — generates implication pairs within the same domain only
2. **runSimulation.ts:514** — simulation only creates implications between statements of the same domain
3. **generateStatements.ts:84, 111** — generates conjunction/disjunction statements only within same domain

The `universe.json` file already defines domains (politics, crypto, religion, music, climate, technology) and statements are tagged with their domain. The code correctly restricts implication generation to same-domain pairs.

The task in TODO.md was phrased as "restrict in universe.json" but the restriction is already enforced in the code that generates implications — there's nothing to add to `universe.json` itself.

### Files changed
- `TODO.md` — marked task done
- `README.md` — updated status section
- `CONTINUITY.md` — this note

### Notes for next session

Task complete. The TODO.md item was a misunderstanding — the restriction was already implemented, just not explicitly documented as "done."

Next items in TODO.md:
- Pubstarter UI: token type images
- e2e tests for pubstarter, fundingportals, mutablerefs, etc.

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

## Document chainHash delegation mechanism — COMPLETE ✓

### What was done

Wrote `specs/subsystems/delegation/README.md` explaining the `chainHash` commitment design:
- Why the contract stores a hash instead of an explicit owner list (gas efficiency)
- How `chainHash` is computed recursively from root to leaf
- How the indexer captures raw events so the SDK can reconstruct chains client-side
- The chain-ordering mismatch: SDK is root-first, contract expects leaf-first — callers must `.reverse()` before calling contract functions
- Full lifecycle example showing deposit → delegate → partial-delegate → revoke → spend

Key references explored: `DelegatableNotes.sol`, `sdk/src/subsystems/delegation/folds.ts`, `events.ts`, `types.ts`, `queries.ts`, `actions.ts`.

### Files changed
- `specs/subsystems/delegation/README.md` — full rewrite: now documents the chainHash mechanism
- `TODO.md` — marked task done
- `README.md` — updated status section
- `CONTINUITY.md` — this note

### Notes for next session

Good interrupt point — docs for two major architectural patterns (Client-Side Folding and chainHash delegation) are now complete.

Next item in TODO.md: **Implement user-selectable attester trust** — users should see implications filtered by attesters they personally trust, not a global feed.

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

---

## Implication Discovery plan — COMPLETE ✓

### What was done

Wrote `specs/subsystems/conceptspace/implication-discovery.md` clarifying the plan for implication "discovery" services:

1. **Current finder architecture** — documented how the finder proactively discovers candidate pairs by polling for new statements, building a popularity map, and submitting pairs to the attester.

2. **Transitive chain discovery** — proposed a new finder feature: when it notices A→B→C chains, suggest the A→C direct link to the attester. This is a good heuristic because the chain suggests the direct link is likely valid.

3. **Same-domain restriction** — noted that fake-data-generation already restricts implications to same-domain pairs (to prevent O(N²) explosion). Proposed applying the same filter to the finder.

### Files changed
- `specs/subsystems/conceptspace/implication-discovery.md` — new doc
- `TODO.md` — marked task done
- `CONTINUITY.md` — this note

### Notes for next session

Good interrupt point — the discovery plan is documented and the spec is ready for implementation if desired.

Next item in TODO.md: **Restrict implication generation to same-domain pairs in `universe.json`** (preventing O(N²) explosion). This is already implemented in `generateAttestations.ts` but may need to be verified/communicated.

---


Wired the trusted attester list (stored in localStorage by the Settings page) into the SDK and UI:

1. **SDK** (`sdk/src/subsystems/conceptspace/`):
   - Changed all attester-filter params from `attesterAddress?: string` to `trustedAttesters?: string[]` — `getImplicationsFrom`, `getImplicationsTo`, `getIndirectSupporters`, `getIndirectSupporterCount`, `getStatementSuggestions`, `getStatementWithContent` options.
   - Fixed `getUserIndirectSupport` which was incorrectly using only `trustedAttesters?.[0]` — now passes the full array.
   - Empty array or undefined → no filter (show all attesters).

2. **New hook** `ui/src/shared/hooks/useTrustedAttesters.ts`: reads the list from localStorage once on mount.

3. **SettingsPage.tsx**: refactored to import shared `TRUSTED_ATTESTERS_KEY` and `loadTrustedAttesters` from the new hook (no behavior change).

4. **StatementPage.tsx**: passes `trustedAttesters` to `getStatementWithContent` so indirect support count respects user preferences.

5. **StatementSuggestions.tsx**: removed the buggy `userAddress` prop (which was being incorrectly passed as an attester address). Now reads trusted attesters from the hook and passes them to `getStatementSuggestions`.

6. **UserProfilePage.tsx**: passes trusted attesters to `getUserIndirectSupport`.

7. **Integration tests** updated: changed single-string attester args to arrays in `conceptspace-multiple-attesters.test.ts`, `conceptspace-indirect-support.test.ts`, `end-to-end-workflows.test.ts`, and `invariants.ts`.

### Files changed
- `sdk/src/subsystems/conceptspace/types.ts`
- `sdk/src/subsystems/conceptspace/queries.ts`
- `ui/src/shared/hooks/useTrustedAttesters.ts` (new)
- `ui/src/conceptspace/pages/SettingsPage.tsx`
- `ui/src/conceptspace/pages/StatementPage.tsx`
- `ui/src/conceptspace/components/StatementSuggestions.tsx`
- `ui/src/conceptspace/components/StatementSuggestions.test.tsx`
- `ui/src/conceptspace/pages/UserProfilePage.tsx`
- `integration-tests/src/conceptspace/conceptspace-multiple-attesters.test.ts`
- `integration-tests/src/conceptspace/conceptspace-indirect-support.test.ts`
- `integration-tests/src/workflows/end-to-end-workflows.test.ts`
- `integration-tests/src/utils/invariants.ts`
- `TODO.md`, `README.md`, `CONTINUITY.md`

### Notes for next session

Good interrupt point. The attester trust feature is fully wired end-to-end.

Next item in TODO.md: **Clarify the plan for implication "Discovery" services** or **Restrict implication generation to same-domain pairs in `universe.json`**. Or consider doing some seed-content / statement proliferation work.

---

## Token type images for Pubstarter UI — COMPLETE ✓

### What was done

Verified that token type images are **already implemented** across the Pubstarter UI:

1. **CreateProjectPage.tsx** (lines 27-34, 106-119):
   - `TokenTypeRow` interface includes `imageFile: File | null` and `imagePreviewUrl: string | null`
   - On file selection, creates preview URL with `URL.createObjectURL(file)`
   - On submit: uploads image to IPFS via `uploadBlobToIPFS`, builds per-token metadata with image CID, stores metadata in IPFS, and includes token CIDs in the main project metadata under `tokens` field

2. **ProjectDetailPage.tsx** (lines 50, 139-159):
   - Fetches `metadata.tokens` from IPFS
   - For each token CID, fetches token metadata and extracts the `image` field
   - Stores in `tokenImages` state: `Record<string, string>` (tokenId → IPFS image URL)

3. **BuyTokensSection.tsx** (line 23): accepts optional `tokenImages` prop, renders images for tokens (lines 265-268, 319-322)

4. **BurnTokensSection.tsx** (line 18): accepts optional `tokenImages` prop, renders images (lines 88-91)

5. **SecondaryMarketSection.tsx** (line 54): accepts optional `tokenImages` prop, renders images in both sale listings (lines 238-241) and buy orders (lines 307-310)

### Tests

- CreateProjectPage.test.tsx has 3 tests for per-token images (lines 139-181)
- BuyTokensSection.test.tsx has 3 tests for token images (lines 139-180)

### Notes for next iteration

The feature is complete and tested. No further action needed on this item.

Next item in TODO.md: **e2e tests for pubstarter, fundingportals, mutablerefs, and other subsystems** — the TODO notes "I'm not sure exactly what e2e tests are done already and what's not, but we just wrote the UI code for some other subsystems (pubstarter, fundingportals, mutablerefs, anything else?), and I suspect we don't have e2e tests for them yet."

Note: `npm run lint` fails due to a pre-existing ESLint flat-config issue in `fake-data-generation/eslint.config.js` (unrelated to this task).
