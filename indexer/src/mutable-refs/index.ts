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

  // Create composite ID for the current ref state
  const refId = `${owner.toLowerCase()}:${name}`;

  // Update or insert the current ref state
  await db
    .insert(mutableRefs)
    .values({
      owner: owner.toLowerCase() as `0x${string}`,
      name,
      value: currentRefValue,
      updatedAt: timestamp,
      updatedAtBlock: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      value: currentRefValue,
      updatedAt: timestamp,
      updatedAtBlock: event.block.number,
      transactionHash: event.transaction.hash,
    });

  // Create history record
  const historyId = `${owner.toLowerCase()}:${name}:${event.block.number}:${event.log.logIndex}`;

  await db.insert(refUpdates).values({
    id: historyId,
    owner: owner.toLowerCase() as `0x${string}`,
    name,
    value: currentRefValue,
    blockNumber: event.block.number,
    timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
  });
});
