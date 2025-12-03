/**
 * Mutable Refs Indexer Event Handlers
 *
 * This module handles events from the MutableRefUpdater contract:
 * - RefUpdated events (when a user creates or updates a named ref)
 *
 * This is a utility subsystem that can be used by any other subsystem
 * to track mutable references (pointers to IPFS content).
 */

import { ponder } from "ponder:registry";
import { mutableRefs, refUpdates } from "ponder:schema";

/**
 * Handle RefUpdated events
 *
 * Updates the current state of a ref and creates a history record
 */
ponder.on("MutableRefUpdater:RefUpdated", async ({ event, context }) => {
  const { owner, name, currentRefValue } = event.args;
  const { db } = context;

  // Get timestamp from event block
  const timestamp = BigInt(event.block.timestamp);

  const ownerLower = owner.toLowerCase() as `0x${string}`;

  // Check if ref already exists
  const existingRef = await db.find(mutableRefs, {
    owner: ownerLower,
    name,
  });

  // Update or insert the current ref state
  if (existingRef) {
    await db
      .update(mutableRefs, { owner: ownerLower, name })
      .set({
        value: currentRefValue,
        updatedAt: timestamp,
        updatedAtBlock: event.block.number,
        transactionHash: event.transaction.hash,
      });
  } else {
    await db.insert(mutableRefs).values({
      owner: ownerLower,
      name,
      value: currentRefValue,
      updatedAt: timestamp,
      updatedAtBlock: event.block.number,
      transactionHash: event.transaction.hash,
    });
  }

  // Create history record
  const historyId = `${owner.toLowerCase()}:${name}:${event.block.number}:${event.log.logIndex}`;

  await db.insert(refUpdates).values({
    id: historyId,
    owner: ownerLower,
    name,
    value: currentRefValue,
    blockNumber: event.block.number,
    timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
  });
});
