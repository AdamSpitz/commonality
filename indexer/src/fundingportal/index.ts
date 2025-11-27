/**
 * Funding Portal Indexer Event Handlers
 *
 * This module handles events from the Funding Portal subsystem:
 * - ProjectAlignment contract events (ProjectAlignmentAttestation - linking projects to statements)
 *
 * These handlers are logically separate from the Concept Space, Pubstarter, and Delegation indexers.
 * The Funding Portal federates queries to those other subsystems' APIs to provide cross-cutting views.
 */

import { ponder } from "ponder:registry";
import { projectAlignments } from "ponder:schema";

/**
 * Handle ProjectAlignmentAttestation events from the ProjectAlignment contract
 * Creates project alignment records linking projects to statements
 */
ponder.on("ProjectAlignment:ProjectAlignmentAttestation", async ({ event, context }) => {
  const { attester, projectAddress, statementId } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);

  // Check if this alignment already exists (contract allows re-attestation)
  const existing = await context.db.find(projectAlignments, {
    attester,
    projectAddress,
    statementId,
  });

  if (!existing) {
    // Create new alignment record
    await context.db.insert(projectAlignments).values({
      attester,
      projectAddress,
      statementId,
      createdAt: timestamp,
      blockNumber,
    });
  }
  // If it already exists, we ignore re-attestations (idempotent)
});
