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
  type InvariantCheck,
  type ActionMetadata,
} from './action-framework.js';
import {
  getAlignedSubjects,
  getSubjectStatements,
  getAlignmentAttestation,
} from '../utils/graphql-helpers.js';
import { assertNoOrphanedData } from '../utils/invariants.js';

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
  const { graphqlClient, entities } = context;
  const { statementId, subjectAddress, attesterAddress } = entities;

  if (!statementId) {
    throw new Error('statementId is required in context.entities for alignment state');
  }
  if (!subjectAddress) {
    throw new Error('subjectAddress is required in context.entities for alignment state');
  }
  if (!attesterAddress) {
    throw new Error('attesterAddress is required in context.entities for alignment state');
  }

  // Cast to any to handle GraphQLClient | GraphQLExecutor union type
  const executor = graphqlClient as any;

  // Get all subjects aligned with this statement
  const alignedSubjects = await getAlignedSubjects(executor, statementId);

  // Get all statements this subject is aligned with
  const subjectStatements = await getSubjectStatements(executor, subjectAddress);

  // Check if this specific alignment exists
  const alignment = await getAlignmentAttestation(
    executor,
    attesterAddress,
    subjectAddress,
    statementId
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
  check: async (context: ActionContext, before: any, after: any) => {
    const { graphqlClient, entities } = context;
    const { statementId, subjectAddress, attesterAddress } = entities;

    if (!statementId || !subjectAddress || !attesterAddress) {
      throw new Error('statementId, subjectAddress, and attesterAddress are required');
    }

    const executor = graphqlClient as any;

    // Query by statement - should include this subject
    const alignedSubjects = await getAlignedSubjects(executor, statementId);
    const subjectFound = alignedSubjects.some(
      a => a.subjectAddress.toLowerCase() === subjectAddress.toLowerCase() &&
           a.attester.toLowerCase() === attesterAddress.toLowerCase()
    );
    assert.ok(
      subjectFound,
      `Subject ${subjectAddress} should appear in aligned subjects for statement ${statementId}`
    );

    // Query by subject - should include this statement
    const subjectStatements = await getSubjectStatements(executor, subjectAddress);
    const statementFound = subjectStatements.some(
      a => a.statementId.toLowerCase() === statementId.toLowerCase() &&
           a.attester.toLowerCase() === attesterAddress.toLowerCase()
    );
    assert.ok(
      statementFound,
      `Statement ${statementId} should appear in statements for subject ${subjectAddress}`
    );

    // Query the specific alignment - should exist
    const alignment = await getAlignmentAttestation(
      executor,
      attesterAddress,
      subjectAddress,
      statementId
    );
    assert.ok(
      alignment,
      `Alignment should exist for attester ${attesterAddress}, subject ${subjectAddress}, statement ${statementId}`
    );
  },
};

/**
 * Invariant Check: No Orphaned Alignment Data
 *
 * All alignment records should reference valid entities:
 * - Every alignment references a Statement that exists
 * - Every alignment references a Subject that exists
 * - Every alignment references an Attester that exists
 *
 * This is a referential integrity check.
 */
export const noOrphanedAlignmentDataInvariant: InvariantCheck = {
  name: 'noOrphanedAlignmentData',
  check: async (context: ActionContext) => {
    const { graphqlClient } = context;
    await assertNoOrphanedData(graphqlClient);
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
  invariantsToCheck: [noOrphanedAlignmentDataInvariant],
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
  invariantsToCheck: [noOrphanedAlignmentDataInvariant],
};
