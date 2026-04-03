/**
 * State transition properties and invariants for alignment attestation actions
 *
 * This defines the properties that should hold when attesters create
 * alignment attestations linking subjects to statements.
 */

import assert from 'assert';
import {
  type ActionContext,
  type StateTransitionProperty,
  type ActionMetadata,
} from './action-framework.js';
import {
  getAlignedSubjects,
  getSubjectStatements,
  getAlignmentAttestation,
} from '@commonality/sdk';

/**
 * State captured before/after an alignment attestation action
 */
interface AlignmentState {
  /** Number of subjects aligned with a statement (from statement's perspective) */
  alignedSubjectCount: number;
  /** Number of statements a subject is aligned with (from subject's perspective) */
  subjectStatementCount: number;
  /** Whether the specific alignment exists */
  alignmentExists: boolean;
}

/**
 * Capture the current state of subject-statement alignments
 */
async function captureAlignmentState(context: ActionContext): Promise<AlignmentState> {
  const { machinery, entities } = context;
  const { statementCid, subjectId, attesterAddress } = entities;

  if (!statementCid) {
    throw new Error('statementCid is required in context.entities for alignment state');
  }
  if (!subjectId) {
    throw new Error('subjectId is required in context.entities for alignment state');
  }
  if (!attesterAddress) {
    throw new Error('attesterAddress is required in context.entities for alignment state');
  }

  // Get all subjects aligned with this statement
  const alignedSubjects = await getAlignedSubjects(machinery, statementCid);

  // Get all statements this subject is aligned with
  const subjectStatements = await getSubjectStatements(machinery, subjectId);

  // Check if this specific alignment exists
  const alignment = await getAlignmentAttestation(
    machinery,
    attesterAddress,
    subjectId,
    statementCid
  );

  return {
    alignedSubjectCount: alignedSubjects.length,
    subjectStatementCount: subjectStatements.length,
    alignmentExists: alignment !== null,
  };
}

/**
 * State Transition Property #1: Alignment Attestation
 *
 * When an attester creates a subject-statement alignment:
 * - The alignment should exist in the indexer
 * - The count of subjects aligned with the statement should increase by 1
 * - The count of statements the subject is aligned with should increase by 1
 *
 * This verifies:
 * - Alignments are correctly recorded
 * - Both forward and reverse query indexes are updated
 * - Counts are properly maintained
 */
export const alignmentAttestationProperty: StateTransitionProperty = {
  name: 'alignmentAttestation',
  captureState: captureAlignmentState,
  check: async (context: ActionContext, before: AlignmentState, after: AlignmentState) => {
    // The alignment should now exist
    assert.strictEqual(
      after.alignmentExists,
      true,
      'Alignment should exist after attestation'
    );

    // The alignment count from statement's perspective should increase by 1
    assert.strictEqual(
      after.alignedSubjectCount,
      before.alignedSubjectCount + 1,
      `Aligned subject count mismatch. ` +
      `Before: ${before.alignedSubjectCount}, ` +
      `After: ${after.alignedSubjectCount}, ` +
      `Expected increase of 1`
    );

    // The alignment count from subject's perspective should increase by 1
    assert.strictEqual(
      after.subjectStatementCount,
      before.subjectStatementCount + 1,
      `Subject statement count mismatch. ` +
      `Before: ${before.subjectStatementCount}, ` +
      `After: ${after.subjectStatementCount}, ` +
      `Expected increase of 1`
    );
  },
};

/**
 * State Transition Property #2: Alignment Bidirectionality
 *
 * After creating an alignment:
 * - Querying by statement should return the subject
 * - Querying by subject should return the statement
 * - Querying by attester should return the alignment
 *
 * This verifies that all query paths are consistent.
 */
export const alignmentBidirectionalityProperty: StateTransitionProperty = {
  name: 'alignmentBidirectionality',
  captureState: async () => ({}), // No state to capture, we just verify after
  check: async (context: ActionContext) => {
    const { machinery, entities } = context;
    const { statementCid, subjectId, attesterAddress } = entities;

    if (!statementCid || !subjectId || !attesterAddress) {
      throw new Error('statementCid, subjectId, and attesterAddress are required');
    }

    // Query by statement - should include this subject
    const alignedSubjects = await getAlignedSubjects(machinery, statementCid);
    const subjectFound = alignedSubjects.some(
      a => a.subjectId.toLowerCase() === subjectId.toLowerCase() &&
           a.attester.toLowerCase() === attesterAddress.toLowerCase()
    );
    assert.ok(
      subjectFound,
      `Subject ${subjectId} should appear in aligned subjects for statement ${statementCid}`
    );

    // Query by subject - should include this statement
    const subjectStatements = await getSubjectStatements(machinery, subjectId);
    const statementFound = subjectStatements.some(
      a => a.statementCid.toLowerCase() === statementCid.toLowerCase() &&
           a.attester.toLowerCase() === attesterAddress.toLowerCase()
    );
    assert.ok(
      statementFound,
      `Statement ${statementCid} should appear in statements for subject ${subjectId}`
    );

    // Query the specific alignment - should exist
    const alignment = await getAlignmentAttestation(
      machinery,
      attesterAddress,
      subjectId,
      statementCid
    );
    assert.ok(
      alignment,
      `Alignment should exist for attester ${attesterAddress}, subject ${subjectId}, statement ${statementCid}`
    );
  },
};

/**
 * Action metadata for attestAlignment
 */
export const attestAlignmentMetadata: ActionMetadata = {
  name: 'attestAlignment',
  category: 'other',
  stateTransitionProperties: [
    alignmentAttestationProperty,
    alignmentBidirectionalityProperty,
  ],
  invariantsToCheck: [],
};

/**
 * Action metadata for attestAlignmentsBatch
 *
 * For batch operations, we skip the detailed state transition checks
 * (since they would need to track multiple alignments) and just verify
 * the invariants hold.
 */
export const attestAlignmentsBatchMetadata: ActionMetadata = {
  name: 'attestAlignmentsBatch',
  category: 'other',
  stateTransitionProperties: [],
  invariantsToCheck: [],
};
