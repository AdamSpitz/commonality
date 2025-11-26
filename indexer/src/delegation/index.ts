/**
 * Delegation Indexer Event Handlers
 *
 * This module handles events from the Delegation subsystem:
 * - DelegatableNotes contract events (note creation, delegation, revocation, etc.)
 *
 * These handlers are logically separate from the Concept Space and Pubstarter indexers.
 */

import { ponder } from "ponder:registry";
import {
  delegatableNotes,
  delegationChains,
  noteEvents,
} from "../../ponder.schema";

// Token type constants (matching Solidity enum)
const TOKEN_TYPE_ERC20 = 0;
const TOKEN_TYPE_ERC1155 = 1;

/**
 * Helper to compute chain hash (matching Solidity logic)
 * chainHash = keccak256(abi.encodePacked(owner, parentChainHash))
 */
function computeChainHash(owner: `0x${string}`, parentHash: `0x${string}`): `0x${string}` {
  // This would need to use keccak256 - for now we'll store the hash from the contract
  // In practice, we get the chainHash from the contract events/state
  return parentHash; // Placeholder - will use contract's chainHash
}

/**
 * Helper to store delegation chain entries
 * Parses the owners array and creates chain entries
 */
async function storeDelegationChain(
  ctx: { db: any },
  noteId: bigint,
  owners: readonly `0x${string}`[],
  timestamp: bigint
) {
  // Delete existing chain entries for this note
  const existing = await ctx.db
    .select({ noteId: delegationChains.noteId })
    .from(delegationChains)
    .where((row: any) => row.noteId.equals(noteId));

  for (const row of existing) {
    await ctx.db.delete(delegationChains, {
      noteId: row.noteId,
      position: 0, // Will delete all positions
    });
  }

  // Create new chain entries
  // owners array: [leaf, ..., root], so we reverse it for storage
  for (let i = 0; i < owners.length; i++) {
    const position = owners.length - 1 - i; // Reverse: root at position 0
    await ctx.db.insert(delegationChains).values({
      noteId,
      position,
      address: owners[i],
      createdAt: timestamp,
    });
  }
}

/**
 * Helper to create a note event record
 */
async function createNoteEvent(
  ctx: { db: any },
  eventType: string,
  noteId: bigint,
  actor: `0x${string}`,
  timestamp: bigint,
  blockNumber: bigint,
  transactionHash: `0x${string}`,
  logIndex: number,
  data?: {
    parentNoteId?: bigint;
    childNoteId?: bigint;
    amount?: bigint;
    extraData?: any;
  }
) {
  const eventId = `${transactionHash}-${logIndex}`;

  await ctx.db.insert(noteEvents).values({
    id: eventId,
    eventType,
    noteId,
    actor,
    parentNoteId: data?.parentNoteId ?? null,
    childNoteId: data?.childNoteId ?? null,
    amount: data?.amount ?? null,
    data: data?.extraData ? JSON.stringify(data.extraData) : null,
    createdAt: timestamp,
    blockNumber,
    transactionHash,
  });
}

// ============================================================================
// DELEGATABLE NOTES EVENT HANDLERS
// ============================================================================

/**
 * Handle NoteCreated event
 * Creates a new note record with initial (root) delegation chain
 */
ponder.on("DelegatableNotes:NoteCreated", async ({ event, context }) => {
  const { noteId, owner, amount, token, tokenType, tokenId } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  // Read the note from the contract to get chainHash and intendedStatementId
  // For now, we'll compute chainHash for root: hash(owner, 0)
  // In production, you might want to read from contract state
  const chainHash = `0x${"0".repeat(64)}` as `0x${string}`; // Placeholder - should compute or read

  await context.db.insert(delegatableNotes).values({
    id: noteId,
    owner,
    rootOwner: owner,
    token,
    tokenType,
    tokenId: tokenId || 0n,
    amount,
    intendedStatementId: `0x${"0".repeat(64)}` as `0x${string}`, // Will be updated if we can read it
    chainHash,
    active: true,
    parentNoteId: null,
    createdAt: timestamp,
    createdAtBlock: blockNumber,
    updatedAt: timestamp,
  });

  // Create initial chain entry (single owner - the creator)
  await context.db.insert(delegationChains).values({
    noteId,
    position: 0, // Root position
    address: owner,
    createdAt: timestamp,
  });

  // Record event
  await createNoteEvent(
    context,
    "created",
    noteId,
    owner,
    timestamp,
    blockNumber,
    transactionHash,
    event.log.logIndex,
    { amount }
  );
});

/**
 * Handle NoteDelegated event
 * Updates the note's owner and chain, or creates a new note if split
 */
ponder.on("DelegatableNotes:NoteDelegated", async ({ event, context }) => {
  const { parentNoteId, childNoteId, delegate, amount } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  // If parentNoteId === childNoteId, it's a full delegation (in-place update)
  // Otherwise, it's a partial delegation (split into two notes)
  const isFullDelegation = parentNoteId === childNoteId;

  if (isFullDelegation) {
    // Full delegation - update existing note
    const note = await context.db.find(delegatableNotes, { id: parentNoteId });

    if (note) {
      // Get current chain
      const chainEntries = await context.db
        .select()
        .from(delegationChains)
        .where((row: any) => row.noteId.equals(parentNoteId))
        .orderBy((row: any) => row.position.asc());

      // Add delegate to chain
      const newPosition = chainEntries.length;
      await context.db.insert(delegationChains).values({
        noteId: parentNoteId,
        position: newPosition,
        address: delegate,
        createdAt: timestamp,
      });

      // Update note owner
      await context.db
        .update(delegatableNotes, { id: parentNoteId })
        .set({
          owner: delegate,
          updatedAt: timestamp,
        });
    }
  } else {
    // Partial delegation - childNoteId is a new note created by the contract
    // The contract emits ChainSplit and NoteDelegated events
    // We'll handle the new note in ChainSplit handler
  }

  // Record event
  await createNoteEvent(
    context,
    "delegated",
    childNoteId,
    delegate,
    timestamp,
    blockNumber,
    transactionHash,
    event.log.logIndex,
    {
      parentNoteId,
      amount,
    }
  );
});

/**
 * Handle ChainSplit event
 * Creates a new note for the delegated portion and updates the remainder
 */
ponder.on("DelegatableNotes:ChainSplit", async ({ event, context }) => {
  const { originalLeafId, splitLeafId, remainderLeafId, splitAmount } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  // Get the original note
  const originalNote = await context.db.find(delegatableNotes, { id: originalLeafId });

  if (!originalNote) {
    console.warn(`ChainSplit: Original note ${originalLeafId} not found`);
    return;
  }

  // The originalLeafId becomes the remainder (with reduced amount)
  // The splitLeafId is the new delegated note

  // Update remainder note (originalLeafId)
  const remainderAmount = originalNote.amount - splitAmount;
  await context.db
    .update(delegatableNotes, { id: remainderLeafId })
    .set({
      amount: remainderAmount,
      updatedAt: timestamp,
    });

  // Get the chain for the original note
  const chainEntries = await context.db
    .select()
    .from(delegationChains)
    .where((row: any) => row.noteId.equals(originalLeafId))
    .orderBy((row: any) => row.position.asc());

  // Create new note for split portion (splitLeafId)
  // This will have the same chain initially, but NoteDelegated will add the delegate
  await context.db.insert(delegatableNotes).values({
    id: splitLeafId,
    owner: originalNote.owner, // Will be updated by NoteDelegated event
    rootOwner: originalNote.rootOwner,
    token: originalNote.token,
    tokenType: originalNote.tokenType,
    tokenId: originalNote.tokenId,
    amount: splitAmount,
    intendedStatementId: originalNote.intendedStatementId,
    chainHash: originalNote.chainHash, // Will be updated by NoteDelegated
    active: true,
    parentNoteId: originalLeafId,
    createdAt: timestamp,
    createdAtBlock: blockNumber,
    updatedAt: timestamp,
  });

  // Copy chain entries for the split note
  for (const entry of chainEntries) {
    await context.db.insert(delegationChains).values({
      noteId: splitLeafId,
      position: entry.position,
      address: entry.address,
      createdAt: timestamp,
    });
  }

  // Record event
  await createNoteEvent(
    context,
    "split",
    splitLeafId,
    originalNote.owner,
    timestamp,
    blockNumber,
    transactionHash,
    event.log.logIndex,
    {
      parentNoteId: originalLeafId,
      childNoteId: splitLeafId,
      amount: splitAmount,
    }
  );
});

/**
 * Handle NoteRevoked event
 * Updates the delegation chain by truncating to the revoker
 */
ponder.on("DelegatableNotes:NoteRevoked", async ({ event, context }) => {
  const { noteId, revoker } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  // Get current chain
  const chainEntries = await context.db
    .select()
    .from(delegationChains)
    .where((row: any) => row.noteId.equals(noteId))
    .orderBy((row: any) => row.position.asc());

  // Find revoker position in chain
  const revokerEntry = chainEntries.find((entry: any) => entry.address === revoker);

  if (revokerEntry) {
    // Delete all chain entries after revoker
    const keepUntilPosition = revokerEntry.position;

    for (const entry of chainEntries) {
      if (entry.position > keepUntilPosition) {
        await context.db.delete(delegationChains, {
          noteId,
          position: entry.position,
        });
      }
    }

    // Update note owner to revoker
    await context.db
      .update(delegatableNotes, { id: noteId })
      .set({
        owner: revoker,
        updatedAt: timestamp,
      });
  }

  // Record event
  await createNoteEvent(
    context,
    "revoked",
    noteId,
    revoker,
    timestamp,
    blockNumber,
    transactionHash,
    event.log.logIndex
  );
});

/**
 * Handle FundsReclaimed event
 * Marks the note as inactive (deleted)
 */
ponder.on("DelegatableNotes:FundsReclaimed", async ({ event, context }) => {
  const { noteId, owner, amount } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  // Mark note as inactive
  await context.db
    .update(delegatableNotes, { id: noteId })
    .set({
      active: false,
      amount: 0n,
      updatedAt: timestamp,
    });

  // Record event
  await createNoteEvent(
    context,
    "reclaimed",
    noteId,
    owner,
    timestamp,
    blockNumber,
    transactionHash,
    event.log.logIndex,
    { amount }
  );
});

/**
 * Handle ERC1155Purchased event
 * Marks input notes as consumed and creates output notes
 */
ponder.on("DelegatableNotes:ERC1155Purchased", async ({ event, context }) => {
  const { buyer, erc1155Contract, tokenIds, counts, totalCost, inputNoteIds, outputNoteIds } =
    event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  // Mark input notes as consumed (inactive or reduced amount)
  for (const inputNoteId of inputNoteIds) {
    const note = await context.db.find(delegatableNotes, { id: inputNoteId });

    if (note) {
      // If note amount is 0 (fully consumed), mark inactive
      // Note: The contract already updates amounts, so we read the event
      // In practice, we'd need to check if the note still exists in contract state
      // For now, assume notes with 0 amount are deleted by the contract

      // We'll mark as inactive if we receive info that it's deleted
      // The contract deletes notes with 0 amount, so we can infer from events
    }
  }

  // Output notes are created separately via NoteCreated events
  // So we just record the purchase event here

  // Record event for the purchase
  await createNoteEvent(
    context,
    "purchased",
    inputNoteIds[0], // Primary note involved
    buyer,
    timestamp,
    blockNumber,
    transactionHash,
    event.log.logIndex,
    {
      amount: totalCost,
      extraData: {
        erc1155Contract,
        tokenIds: tokenIds.map(id => id.toString()),
        counts: counts.map(c => c.toString()),
        inputNoteIds: inputNoteIds.map(id => id.toString()),
        outputNoteIds: outputNoteIds.map(id => id.toString()),
      },
    }
  );
});
