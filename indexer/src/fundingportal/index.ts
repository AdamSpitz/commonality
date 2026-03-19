/**
 * Funding Portal Indexer Event Handlers
 *
 * This module handles events from the Funding Portal subsystem:
 * - AlignmentAttestations contract events (AlignmentAttestation - linking subjects to statements)
 *
 * These handlers are logically separate from the Concept Space, Pubstarter, and Delegation indexers.
 * The Funding Portal federates queries to those other subsystems' APIs to provide cross-cutting views.
 */

import { ponder } from "ponder:registry";
import { alignmentAttestations, events, alignmentAttestationsRegistry } from "ponder:schema";
import { IpfsCidBytes32, bytes32ToCid } from "../utils/cid-types";
import { captureRawEvent } from "../utils/rawEvents";

/**
 * Handle AlignmentAttestation events from the AlignmentAttestations contract
 * Creates alignment attestation records linking subjects (projects, users, etc.) to statements
 *
 * The topicStatementId field allows filtering attestations by topic.
 * This enables indexers to only process attestations for specific topics.
 */
ponder.on("AlignmentAttestations:AlignmentAttestation", async ({ event, context }) => {
  const { attester, subjectAddress, statementId, topicStatementId } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);

  // Capture raw event
  await context.db.insert(events).values(captureRawEvent(event, 'AlignmentAttestation'));

  // Convert bytes32 to CIDv1 for storage
  const statementIdCidV1 = bytes32ToCid(statementId as IpfsCidBytes32);
  const topicStatementIdCidV1 = bytes32ToCid(topicStatementId as IpfsCidBytes32);

  // Update alignment attestations registry (lightweight tracking)
  const registryId = `${attester.toLowerCase()}-${subjectAddress.toLowerCase()}-${statementIdCidV1}`;
  const existingRegistry = await context.db.find(alignmentAttestationsRegistry, { id: registryId });
  if (!existingRegistry) {
    await context.db.insert(alignmentAttestationsRegistry).values({
      id: registryId,
      attester: attester.toLowerCase() as `0x${string}`,
      subjectAddress: subjectAddress.toLowerCase() as `0x${string}`,
      statementId: statementIdCidV1,
      createdAtBlock: blockNumber,
    });
  }

  // Check if this alignment already exists (contract allows re-attestation)
  const existing = await context.db.find(alignmentAttestations, {
    attester,
    subjectAddress,
    statementId: statementIdCidV1,
  });

  if (!existing) {
    // Create new alignment record
    await context.db.insert(alignmentAttestations).values({
      attester,
      subjectAddress,
      statementId: statementIdCidV1,
      topicStatementId: topicStatementIdCidV1,
      createdAt: timestamp,
      blockNumber,
    });
  } else {
    // If it already exists but with a different topic, update the topic
    // (The topic is the latest one used for this subject-statement pair)
    if (existing.topicStatementId !== topicStatementIdCidV1) {
      await context.db.update(alignmentAttestations, {
        attester,
        subjectAddress,
        statementId: statementIdCidV1,
      }).set({
        topicStatementId: topicStatementIdCidV1,
      });
    }
  }
});
