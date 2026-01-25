# NoteIntent Migration Fix Plan

This document describes the issues discovered after removing `intendedStatementId` from the `Note` struct in `DelegatableNotes.sol` and moving it to the separate `NoteIntent.sol` attestation contract.

## Background

The `intendedStatementId` field was removed from `DelegatableNotes` and moved to a separate `NoteIntent` contract that provides an attestation layer. This allows:
- Clearer separation between the financial primitive (DelegatableNotes) and the political/content layer (statements)
- Multiple concurrent attestations from different attesters
- Audit trail of intent declarations without coupling to the core contract

See `specs/decoupling-intendedStatementId.md` for the full design rationale.

## Issues to Fix

### Issue 1: GraphQL Query Naming Mismatch ✅ RESOLVED

**Status:** Fixed (2026-01-25)

**Symptom:** Tests fail with `Error: Note X not found` after `depositETH` action.

**Root Cause:** **Stale Docker image**

The Docker image for the indexer was built on December 26, 2025, before the `intendedStatementId` field was removed from the schema. The old image still had `intendedStatementId` in the Ponder schema, causing a mismatch between the schema and the event handlers.

**Solution:** Rebuild the Docker image to get the current code:

```bash
docker compose build --no-cache indexer
```

**Verification:** After rebuilding, all 102 integration tests pass (plus 238 hardhat tests).

**Investigation History:**

The original investigation found that the query naming was correct:
- Tests use SDK schema names (`note`, `notesByOwner`, etc.)
- SDK queries use Ponder names (`delegatableNotes`, `delegatableNotess`, etc.)
- The architecture flow is: Test → SDK schema → SDK resolvers → SDK queries → Ponder

The real issue was identified by:
1. Querying Ponder's schema directly: `curl ... '{"query":"{ __type(name: \"delegatableNotes\") { fields { name } } }"}'`
2. Seeing `intendedStatementId` in the schema (which should have been removed)
3. Checking the Docker image creation date (`docker images --format '{{.Repository}}\t{{.CreatedAt}}'`)
4. Rebuilding the image and verifying the schema was updated

---

### Issue 2: NoteIntent Contract Not Indexed

The `NoteIntent.sol` contract emits `NoteIntentAttested` events but the indexer doesn't process them.

**Contract Reference:** `hardhat/contracts/delegation/NoteIntent.sol`

```solidity
event NoteIntentAttested(
    address indexed attester,
    address indexed noteContract,
    uint256 indexed noteId,
    bytes32 intendedStatementId
);
```

**Files to Create/Update:**

1. **Add NoteIntent ABI to indexer:**
   - Create `indexer/abis/NoteIntentAbi.ts` (extract from compiled contract)

2. **Update Ponder config:**
   - File: `indexer/ponder.config.ts`
   - Add NoteIntent contract configuration similar to DelegatableNotes
   - Will need `NOTE_INTENT_ADDRESS` environment variable

3. **Add schema table:**
   - File: `indexer/schemas/delegation.schema.ts`
   - Add new table:
   ```typescript
   export const noteIntentAttestations = onchainTable("note_intent_attestations", (t) => ({
     // Composite key: attester + noteContract + noteId
     id: t.text().primaryKey(), // Format: `${attester}-${noteContract}-${noteId}`
     attester: t.hex().notNull(),
     noteContract: t.hex().notNull(),
     noteId: t.bigint().notNull(),
     intendedStatementId: t.hex().notNull(), // bytes32
     createdAt: t.bigint().notNull(),
     createdAtBlock: t.bigint().notNull(),
     transactionHash: t.hex().notNull(),
   }), (table) => ({
     attesterIdx: index().on(table.attester),
     noteContractNoteIdIdx: index().on(table.noteContract, table.noteId),
     intendedStatementIdx: index().on(table.intendedStatementId),
   }));
   ```

4. **Add event handler:**
   - File: `indexer/src/delegation/index.ts`
   - Add handler for `NoteIntent:NoteIntentAttested`
   ```typescript
   ponder.on("NoteIntent:NoteIntentAttested", async ({ event, context }) => {
     const { attester, noteContract, noteId, intendedStatementId } = event.args;
     const id = `${attester}-${noteContract}-${noteId}`;

     await context.db.insert(noteIntentAttestations).values({
       id,
       attester,
       noteContract,
       noteId,
       intendedStatementId,
       createdAt: BigInt(event.block.timestamp),
       createdAtBlock: BigInt(event.block.number),
       transactionHash: event.transaction.hash,
     }).onConflictDoUpdate({
       // If same attester re-attests, update the intent
       intendedStatementId,
       createdAt: BigInt(event.block.timestamp),
       createdAtBlock: BigInt(event.block.number),
       transactionHash: event.transaction.hash,
     });
   });
   ```

---

### Issue 3: API Endpoints Return Empty Results

Several API endpoints have TODO placeholders that return empty results.

**Files to Update:**

1. `indexer/src/api/delegation-api.ts` (lines 244-246)
   - Currently returns empty results for `/api/available-funding/:statementId`
   - Update to query `noteIntentAttestations` table

2. `indexer/src/api/fundingportal-api.ts` (lines 248-250, 266-267)
   - Direct notes query (line 248-250)
   - Indirect notes query (line 266-267)
   - Update both to query attestations

3. `sdk/src/queries/funding-portals-queries.ts` (lines 340-342)
   - `getTotalFundingForCause()` returns 0 for notes
   - Update to aggregate funding from notes with matching attestations

---

### Issue 4: Skipped Integration Test

**File:** `integration-tests/src/fundingportal/fundingportal-aggregated-metrics.test.ts` (lines 249-250)

The test `'should calculate total available funding from delegatable notes for a cause'` is skipped with `it.skip()`.

**Action:** Re-enable this test after implementing NoteIntent indexing.

---

### Issue 5: Outdated Documentation

**File:** `specs/indexers.md` (line 83)

Still references `intendedStatementId` as part of notes:
```
- Active notes indexed by noteId, owner, intendedStatementId
```

**Action:** Update to reflect new architecture with separate attestations.

---

## Implementation Order

1. **~~Investigate "Note not found" failures~~** ✅ Resolved - Stale Docker image; rebuild with `docker compose build --no-cache indexer`
2. **Add NoteIntent to Ponder config and schema** - Foundation for indexing
3. **Implement NoteIntentAttested event handler** - Start capturing attestations
4. **Update API endpoints** - Make attestation data queryable
5. **Update SDK queries** - Expose attestations through SDK
6. **Re-enable skipped test** - Verify end-to-end functionality
7. **Update documentation** - Keep specs accurate

## Deployment Considerations

- The `NoteIntent` contract must be deployed and its address added to `.env` as `NOTE_INTENT_ADDRESS`
- The deploy script (`hardhat/scripts/deploy-local.js`) may need to be updated to deploy NoteIntent
- Existing notes won't have attestations until users call `attestNoteIntent()` on them

## Testing

After implementing:
1. Run `npm run integration-tests` to verify all tests pass
2. Specifically verify the delegation tests that were failing
3. Re-enable and run the skipped funding portal test
