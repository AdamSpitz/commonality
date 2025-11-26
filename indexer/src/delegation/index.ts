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
import { TokenType } from "../constants";

// Token type constants (matching Solidity enum)
const TOKEN_TYPE_ERC20 = TokenType.ERC20;
const TOKEN_TYPE_ERC1155 = TokenType.ERC1155;

/**
 * Helper to compute chain hash (matching Solidity logic)
 * chainHash = keccak256(abi.encodePacked(owner, parentChainHash))
 */
function computeChainHash(owner: `0x${string}`, parentHash: `0x${string}`): `0x${string}` {
  // Import keccak256 from viem (Ponder uses viem internally)
  const { keccak256, encodePacked } = require('viem');

  // Match Solidity's abi.encodePacked(owner, parentHash)
  return keccak256(encodePacked(['address', 'bytes32'], [owner, parentHash]));
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
  // Since delegationChains has a composite primary key (noteId, position),
  // we need to delete each position individually
  // Use db.sql for querying (Store API doesn't support complex queries)
  const existing = await ctx.db.sql.query.delegationChains.findMany({
    where: (table: any, { eq }: any) => eq(table.noteId, noteId),
    columns: { noteId: true, position: true },
  });

  for (const row of existing) {
    await ctx.db.delete(delegationChains, {
      noteId: row.noteId,
      position: row.position, // Delete each specific position
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
  const { noteId, owner, amount, token, tokenType, tokenId, intendedStatementId } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  // Compute chainHash for root note: hash(owner, 0x00...00)
  // This matches the Solidity implementation: keccak256(abi.encodePacked(owner, bytes32(0)))
  const chainHash = computeChainHash(owner, `0x${"0".repeat(64)}` as `0x${string}`);

  await context.db.insert(delegatableNotes).values({
    id: noteId,
    owner,
    rootOwner: owner,
    token,
    tokenType,
    tokenId: tokenId || 0n,
    amount,
    intendedStatementId,
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
      const chainEntries = await context.db.sql.query.delegationChains.findMany({
        where: (table: any, { eq }: any) => eq(table.noteId, parentNoteId),
        orderBy: (table: any, { asc }: any) => [asc(table.position)],
      });

      // Add delegate to chain
      const newPosition = chainEntries.length;
      await context.db.insert(delegationChains).values({
        noteId: parentNoteId,
        position: newPosition,
        address: delegate,
        createdAt: timestamp,
      });

      // Compute new chainHash: hash(delegate, oldChainHash)
      const newChainHash = computeChainHash(delegate, note.chainHash);

      // Update note owner and chainHash
      await context.db
        .update(delegatableNotes, { id: parentNoteId })
        .set({
          owner: delegate,
          chainHash: newChainHash,
          updatedAt: timestamp,
        });
    }
  } else {
    // Partial delegation - childNoteId is a new note created by the contract
    // The contract emits ChainSplit first (creates the note), then NoteDelegated
    // Both events are in the same transaction, so they should be processed in order.
    // However, we'll handle the case where the child note doesn't exist yet.

    const childNote = await context.db.find(delegatableNotes, { id: childNoteId });

    if (!childNote) {
      // This should not happen if events are processed in order, but handle gracefully
      context.log.error(
        `NoteDelegated: Child note ${childNoteId} not found. ChainSplit may not have been processed yet.`
      );
      return;
    }

    // Get current chain for child note
    const chainEntries = await context.db.sql.query.delegationChains.findMany({
      where: (table: any, { eq }: any) => eq(table.noteId, childNoteId),
      orderBy: (table: any, { asc }: any) => [asc(table.position)],
    });

    // Add delegate to chain
    const newPosition = chainEntries.length;
    await context.db.insert(delegationChains).values({
      noteId: childNoteId,
      position: newPosition,
      address: delegate,
      createdAt: timestamp,
    });

    // Compute new chainHash: hash(delegate, oldChainHash)
    const newChainHash = computeChainHash(delegate, childNote.chainHash);

    // Update child note owner and chainHash
    await context.db
      .update(delegatableNotes, { id: childNoteId })
      .set({
        owner: delegate,
        chainHash: newChainHash,
        updatedAt: timestamp,
      });
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
 * Creates a new note for the delegated portion and updates the remainder.
 *
 * Event ordering: In the smart contract, for partial delegations:
 *   1. ChainSplit is emitted first (this handler)
 *   2. NoteDelegated is emitted second
 * Both events are in the same transaction. This handler creates the child note
 * with temporary values, and NoteDelegated updates the owner and chainHash.
 */
ponder.on("DelegatableNotes:ChainSplit", async ({ event, context }) => {
  const { originalLeafId, splitLeafId, remainderLeafId, splitAmount } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  // Get the original note
  const originalNote = await context.db.find(delegatableNotes, { id: originalLeafId });

  if (!originalNote) {
    context.log.warn(`ChainSplit: Original note ${originalLeafId} not found`);
    return;
  }

  // The originalLeafId becomes the remainder (with reduced amount)
  // The splitLeafId is the new delegated note
  // Note: remainderLeafId === originalLeafId (contract keeps same ID for remainder)

  // Update remainder note (originalLeafId)
  const remainderAmount = originalNote.amount - splitAmount;
  await context.db
    .update(delegatableNotes, { id: originalLeafId })
    .set({
      amount: remainderAmount,
      updatedAt: timestamp,
    });

  // Get the chain for the original note
  const chainEntries = await context.db.sql.query.delegationChains.findMany({
    where: (table: any, { eq }: any) => eq(table.noteId, originalLeafId),
    orderBy: (table: any, { asc }: any) => [asc(table.position)],
  });

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
  const chainEntries = await context.db.sql.query.delegationChains.findMany({
    where: (table: any, { eq }: any) => eq(table.noteId, noteId),
    orderBy: (table: any, { asc }: any) => [asc(table.position)],
  });

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

    // Recompute chainHash for the truncated chain
    // Build chain from root (highest position) to revoker (keepUntilPosition)
    let newChainHash: `0x${string}` = `0x${"0".repeat(64)}` as `0x${string}`;
    const truncatedChain = chainEntries
      .filter((entry: any) => entry.position <= keepUntilPosition)
      .sort((a: any, b: any) => b.position - a.position); // Sort descending (root first)

    for (const entry of truncatedChain) {
      newChainHash = computeChainHash(entry.address, newChainHash);
    }

    // Update note owner and chainHash
    await context.db
      .update(delegatableNotes, { id: noteId })
      .set({
        owner: revoker,
        chainHash: newChainHash,
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
 * Handle NoteConsumed event
 * Updates note amounts and marks fully spent notes as inactive
 */
ponder.on("DelegatableNotes:NoteConsumed", async ({ event, context }) => {
  const { noteId, amountConsumed, remainingAmount, deleted } = event.args;
  const timestamp = BigInt(event.block.timestamp);

  const note = await context.db.find(delegatableNotes, { id: noteId });
  if (!note) {
    context.log.warn(`NoteConsumed: Note ${noteId} not found in database`);
    return;
  }

  if (deleted) {
    // Mark note as inactive (fully consumed)
    await context.db.update(delegatableNotes, { id: noteId }).set({
      active: false,
      amount: 0n,
      updatedAt: timestamp,
    });
  } else {
    // Update remaining amount (partially consumed)
    await context.db.update(delegatableNotes, { id: noteId }).set({
      amount: remainingAmount,
      updatedAt: timestamp,
    });
  }
});

/**
 * Handle ERC1155Purchased event
 * Records purchase event for audit trail
 * Note: Input notes are handled by NoteConsumed events
 * Note: Output notes are handled by NoteCreated events
 */
ponder.on("DelegatableNotes:ERC1155Purchased", async ({ event, context }) => {
  const { buyer, erc1155Contract, tokenIds, counts, totalCost, inputNoteIds, outputNoteIds } =
    event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

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
