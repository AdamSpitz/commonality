# E2E Tests Status

## Current Status (Mar 2026)

**Status**: 14/16 passing

**Failing tests**:
- `user-profile.spec.ts:77` - "should display connected user profile with beliefs"
- `user-profile.spec.ts:147` - "should switch between tabs on profile page"

## Root Cause

The failing tests have the **same bug that was fixed in statement-creation.spec.ts**:

The `createTestStatement` helper function in `user-profile.spec.ts` triggers IPFS sync **before** waiting for the statement to exist in the database:

```typescript
// Current buggy order:
await triggerSyncWithRetry(graphqlUrl)  // No statement exists yet!
await new Promise((r) => setTimeout(r, 2000))
await waitForStatement(graphqlUrl, statementCid)  // Too late
```

When IPFS sync runs before the statement row exists, `syncedCount: 0` because there's nothing to sync. The statement has no title/excerpt, so the UI can't find the content text.

## Recommended Fix

Apply the same fix that worked for statement-creation.spec.ts - **wait for the statement FIRST, then trigger IPFS sync**:

In `user-profile.spec.ts`, change the `createTestStatement` function (lines 59-73):

```typescript
// Wait for indexer to be ready
await waitForIndexer(graphqlUrl)

// Wait for statement to be indexed FIRST (must happen before IPFS sync)
await waitForStatement(graphqlUrl, result.cid)

// THEN trigger IPFS sync (will find the statement and fetch content)
await triggerSyncWithRetry(graphqlUrl)

// Additional wait for IPFS content to be processed
await new Promise((r) => setTimeout(r, 2000))

const statementCid = result.cid

return { cid: statementCid, statementContent }
```

This is the exact fix that was applied to statement-creation.spec.ts which now passes.

## Why This Works

The IPFS sync job queries for statements where `contentFetched = false`. If the statement doesn't exist in the DB yet, there's nothing to sync. By waiting for the statement row to exist first, the IPFS sync can find it and fetch the content.
