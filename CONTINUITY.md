# Continuity notes for ephemeral AI instances

## 2026-04-17 - Fold Cache Implementation (In Progress)

**Task**: Implement client-side storage of fold accumulators per TODO.md

**Changes made**:
- Created `ui/src/shared/foldCache.ts` - IndexedDB persistence layer for project accumulators
  - Uses IndexedDB (not localStorage) following the Subjectiv trust cache pattern
  - Stores: accumulator, foldVersion, and blockNumber
  - Cache key includes: eventCacheUrl, assuranceContractFactory address, project address, foldType
  - On load: validates foldVersion matches CURRENT_PROJECT_FOLD_VERSION, returns null if stale
  - Handles bigint serialization/deserialization
- Created `ui/src/shared/foldCache.test.ts` - Tests for the cache (3 tests passing)
- Updated `sdk/src/utils/eventCacheClient.ts` - Added `blockNumber_gte` option to `fetchPubstarterProjectEvents`
- Updated `sdk/src/subsystems/pubstarter/queries.ts` - Added `blockNumber_gte` option to `fetchAndDecodeProjectEvents`

**Partially implemented** (incomplete):
- The SDK's `getProject` function has not been updated to use the cache or accept an initial accumulator
- The TODO says "Add incremental fetching support" but the fetch functions now support `blockNumber_gte` - the query layer integration is not done

**Next steps** (not yet implemented):
- Update `getProject` in SDK to accept an optional initial accumulator and use the cache
- Wire up the UI to use the fold cache (e.g., in the project detail page)
- Add tests for incremental resume producing the same result as full refold

**Blocker**: The `getProject` query function needs to be modified to optionally accept an initial accumulator and use it with foldProject. This is the key integration point.

---

## 2026-04-16 - API/ABI/SDK Documentation Generation

**Task**: Added documentation generation for SDK (TypeScript) and smart contracts (Solidity NatSpec)

**Changes made**:
- Added `typedoc` to SDK workspace - generates HTML API docs to `sdk/docs/api/`
- Added `solidity-docgen` to hardhat workspace - generates contract docs to `hardhat/docs/contracts/`
- Added `docs` script to SDK package.json (`npm run docs`)
- Added `docs` script to hardhat package.json (`npm run docs`)
- Added `build:docs` script to root package.json (`npm run build:docs`)
- Added `typedoc.json` config in SDK
- Configured `docgen` in hardhat.config.cjs
- Added generated docs to `.gitignore`

**Usage**:
```bash
npm run build:docs  # generates both SDK and contract docs
# Or individually:
npm run docs --workspace=sdk
npm run docs --workspace=hardhat
```

**Next steps** (not yet implemented):
- Link docs from UI user-facing docs (add to `/docs/` or relevant UI pages)
- Consider copying generated docs to a location accessible from deployed UI
- Add docs generation to CI/CD pipeline

**Note**: The typedoc generates many warnings about viem types - these are noise from the SDK exposing viem clients. Could be suppressed with externalSymbolLinkMappings config.

No ongoing work in progress. See [TODO.md](TODO.md) for the next tasks.
