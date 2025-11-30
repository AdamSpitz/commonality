# SDK Extraction Plan

## Goal

Extract the `actions/` and `queries/` code from `integration-tests/src/` into a separate `sdk/` package that can be used by both the integration tests and the future UI code.

## Why The First Attempt Failed

The initial attempt resulted in **two copies of the code** (one in `integration-tests/src/`, one in `sdk/src/`) because we hit module resolution issues with tsx/mocha and gave up, reverting to a "copy" approach instead of fixing the root cause.

### Root Cause of Failure

The issue was: `Package subpath './cid' is not defined by "exports" in .../multiformats/package.json`

This happened because:
1. The SDK was set up as a separate npm package with its own `node_modules/`
2. tsx (the TypeScript executor used by mocha) was trying to resolve `multiformats/cid` imports from the SDK source files
3. The SDK's copy of `multiformats` was in a different location than integration-tests expected
4. tsx's module resolution got confused by the nested package structure

**This is a solved problem** - we just didn't use the right approach.

## The Correct Approach

### Option 1: npm workspaces (RECOMMENDED)

Use npm workspaces to manage the monorepo structure. This ensures all packages share the same `node_modules/` at the root level, avoiding module resolution issues.

**Project structure:**
```
/
├── package.json          # Root workspace config
├── node_modules/         # Shared dependencies
├── sdk/
│   ├── package.json
│   ├── src/
│   │   ├── actions/
│   │   ├── queries/
│   │   ├── constants.ts
│   │   └── index.ts
│   └── tsconfig.json
├── integration-tests/
│   ├── package.json
│   ├── src/
│   │   └── *.test.ts
│   └── tsconfig.json
├── hardhat/
└── indexer/
```

**Root package.json:**
```json
{
  "name": "commonality",
  "private": true,
  "workspaces": [
    "sdk",
    "integration-tests",
    "hardhat",
    "indexer"
  ]
}
```

**SDK package.json:**
```json
{
  "name": "@commonality/sdk",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.js",
  "types": "./src/index.ts",
  "dependencies": {
    "multiformats": "^13.0.0",
    "viem": "^2.21.3"
  }
}
```

**Integration-tests package.json:**
```json
{
  "name": "commonality-integration-tests",
  "private": true,
  "type": "module",
  "dependencies": {
    "@commonality/sdk": "workspace:*"
  },
  "devDependencies": {
    "@types/mocha": "^10.0.6",
    "mocha": "^10.2.0",
    "tsx": "^4.7.0"
  }
}
```

**Steps:**
1. Create root `package.json` with workspaces config
2. Move existing `integration-tests/src/{actions,queries}/` to `sdk/src/`
3. Create `sdk/package.json` and `sdk/src/index.ts`
4. Update `integration-tests/package.json` to depend on `@commonality/sdk`
5. Run `npm install` at the root (this installs everything and links workspaces)
6. Update integration test imports from `'./actions/index.js'` to `'@commonality/sdk'`
7. Run tests - they should just work

**Why this works:**
- All packages share the same `node_modules/` at root
- npm automatically creates symlinks between workspace packages
- No module resolution confusion
- No code duplication
- Simple to maintain

### Option 2: npm link (if you don't want workspaces)

If you don't want to restructure the entire repo into workspaces:

1. In `sdk/`: `npm link`
2. In `integration-tests/`: `npm link @commonality/sdk`
3. Make sure SDK has NO node_modules of its own (delete it)
4. SDK dependencies should be peerDependencies, not dependencies
5. integration-tests should have all the actual dependencies

**SDK package.json:**
```json
{
  "name": "@commonality/sdk",
  "type": "module",
  "main": "./src/index.js",
  "peerDependencies": {
    "multiformats": "^13.0.0",
    "viem": "^2.21.3"
  }
}
```

This way, the SDK source files will resolve imports using integration-tests' node_modules.

### Option 3: Path mapping in tsconfig (not recommended)

You could use TypeScript path mapping, but this doesn't solve the runtime module resolution issue with tsx/mocha.

## Lessons Learned

1. **Don't give up on module resolution errors** - they're almost always solvable with the right package structure
2. **npm workspaces exist for exactly this use case** - shared code in a monorepo
3. **Code duplication is a code smell** - if you end up with two copies, something went wrong
4. **Test the simple solution first** - workspaces or npm link, not custom complex setups

## Migration Path

To fix the current situation:

1. Delete the `sdk/` directory
2. Create root `package.json` with workspaces
3. Recreate `sdk/` properly with workspaces
4. Move (not copy) `integration-tests/src/{actions,queries}` to `sdk/src/`
5. Update imports
6. Run `npm install` at root
7. Verify tests pass

This should take <10 minutes if done correctly.

## Future UI Integration

When building the UI:

```bash
cd ui/
npm install  # Will automatically get @commonality/sdk from workspace
```

```typescript
import { believeStatement, getUserBelief } from '@commonality/sdk';
```

It just works. No code duplication, no complex build process, no confusion.
