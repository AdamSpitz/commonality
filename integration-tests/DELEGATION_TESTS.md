# Delegation System Integration Tests

This document describes the delegation system user actions, queries, and tests that have been added to the integration tests.

## Summary

I've added comprehensive delegation system functionality to the integration tests, including:

1. **User Actions** ([actions.ts](src/actions.ts)) - Functions to interact with the DelegatableNotes contract
2. **Queries** ([queries.ts](src/queries.ts)) - GraphQL queries to retrieve delegation data from the indexer
3. **Tests** ([delegation-basic.test.ts](src/delegation-basic.test.ts)) - 7 comprehensive test scenarios

## User Actions (actions.ts)

The following delegation-related actions have been added:

### `depositETH(clients, delegatableNotesContract, params)`
Deposits ETH into a delegatable note.

**Parameters:**
- `amount`: Amount of ETH to deposit (in wei)
- `intendedStatementId`: The statement ID this funding is intended for

**Returns:** `{ hash, noteId }` - Transaction hash and the created note ID

### `delegateNote(clients, delegatableNotesContract, params)`
Delegates a note (full or partial amount) to another address.

**Parameters:**
- `noteId`: The note to delegate from
- `owners`: Current delegation chain (leaf first, root last)
- `delegateTo`: Address to delegate to
- `amount`: Amount to delegate

**Returns:** `{ hash, delegatedNoteId, remainderNoteId }` - Transaction hash, delegated note ID, and remainder note ID (0 for full delegation)

### `revokeNote(clients, delegatableNotesContract, params)`
Revokes a delegated note back to a position in the chain.

**Parameters:**
- `noteId`: The note to revoke
- `owners`: Current delegation chain (leaf first, root last)

**Returns:** Transaction hash

### `reclaimFunds(clients, delegatableNotesContract, noteId)`
Reclaims funds from a root note (non-delegated).

**Parameters:**
- `noteId`: The note to reclaim

**Returns:** Transaction hash

### `purchaseFromPrimaryMarketWithNotes(clients, delegatableNotesContract, params)`
Purchases ERC1155 tokens from a primary market using delegatable notes.

**Parameters:**
- `noteIds`: Array of note IDs to use for payment
- `chains`: Array of delegation chains (one per note)
- `paymentAmount`: Total amount to spend
- `primaryMarket`: Primary market contract address
- `erc1155Contract`: ERC1155 token contract address
- `tokenIds`: Array of token IDs to purchase
- `counts`: Array of token counts to purchase

**Returns:** Transaction hash

## Queries (queries.ts)

The following delegation-related queries have been added:

### `getNote(client, noteId)`
Retrieves a note by its ID.

**Returns:** Note object with:
- `id`, `chainHash`, `amount`, `token`, `tokenType`, `tokenId`
- `intendedStatementId`, `owner`, `root`, `delegationDepth`

### `getNotesByOwner(client, ownerAddress)`
Gets all notes owned by a specific address (as current leaf owner).

### `getNotesByRoot(client, rootAddress)`
Gets all notes deposited by a specific address (as root depositor).

### `getDelegationChain(client, noteId)`
Retrieves the full delegation chain for a note.

**Returns:** Array of `{ owner, position }` objects

### `getNotesByStatement(client, statementId)`
Gets all notes intended for a specific statement.

## Test Scenarios (delegation-basic.test.ts)

The test file includes 7 comprehensive test scenarios:

### 1. Deposit ETH and create a note
Tests basic deposit functionality and verifies:
- Note amount matches deposit
- Token is address(0) for ETH
- Owner and root are both the depositor
- Delegation depth is 0

### 2. Delegate a note to another user
Tests full delegation and verifies:
- Delegated note has full amount
- Owner changes to delegate
- Root remains the original depositor
- Delegation depth increases to 1

### 3. Support partial delegation (splitting a note)
Tests partial delegation and verifies:
- Delegated note has correct partial amount
- Remainder note has correct remaining amount
- Delegated note is owned by delegate
- Remainder note is still owned by original owner

### 4. Support multi-level delegation chains
Tests a 3-level delegation chain (User1 → User2 → User3) and verifies:
- Final owner is User3
- Root is still User1
- Delegation depth is 2

### 5. Allow revoking a delegation
Tests revocation in a multi-level chain and verifies:
- Revoker regains control of the note
- Delegation depth decreases appropriately

### 6. Allow reclaiming funds from a root note
Tests fund reclamation and verifies:
- ETH balance increases (minus gas)
- Note is deleted after reclaim

### 7. Track notes by root depositor
Tests querying notes by root depositor and verifies:
- Root can query all their original deposits
- Even delegated notes show correct root

## Current Status

**Actions and Queries:** ✅ Complete and working

**Tests:** ✅ All 7 tests passing!

The delegation system integration tests are fully functional. All tests successfully:
- Execute blockchain transactions via the DelegatableNotes contract
- Wait for the Ponder indexer to sync
- Query the indexed data via GraphQL
- Verify the results match expected behavior

## Test Results

```
Delegation System
  ✔ should deposit ETH and create a note (976ms)
  ✔ should delegate a note to another user (2012ms)
  ✔ should support partial delegation (splitting a note) (2037ms)
  ✔ should support multi-level delegation chains (2968ms)
  ✔ should allow revoking a delegation (4048ms)
  ✔ should allow reclaiming funds from a root note (1925ms)
  ✔ should track notes by root depositor (3020ms)

7 passing (17s)
```

The indexer was already configured with:
- Complete Ponder schema in `indexer/schemas/delegation.schema.ts`
- Event handlers in `indexer/src/delegation/index.ts`
- Full delegation chain tracking and computation
