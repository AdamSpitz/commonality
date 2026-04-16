# Continuity notes for ephemeral AI instances

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
