/**
 * State transition properties and invariants for project alignment actions
 *
 * This defines the properties that should hold when attesters create
 * project alignment attestations.
 */

import assert from 'assert';
import {
  type ActionContext,
  type StateTransitionProperty,
  type InvariantCheck,
  type ActionMetadata,
} from './action-framework.js';
import {
  getAlignedProjects,
  getProjectStatements,
  getProjectAlignment,
} from '../utils/graphql-helpers.js';
import { assertNoOrphanedData } from '../utils/invariants.js';

/**
 * State captured before/after an alignment attestation action
 */
interface AlignmentState {
  /** Number of projects aligned with a statement (from statement's perspective) */
  alignedProjectCount: number;
  /** Number of statements a project is aligned with (from project's perspective) */
  projectStatementCount: number;
  /** Whether the specific alignment exists */
  alignmentExists: boolean;
}

/**
 * Capture the current state of project-statement alignments
 */
async function captureAlignmentState(context: ActionContext): Promise<AlignmentState> {
  const { graphqlClient, entities } = context;
  const { statementId, projectAddress, attesterAddress } = entities;

  if (!statementId) {
    throw new Error('statementId is required in context.entities for alignment state');
  }
  if (!projectAddress) {
    throw new Error('projectAddress is required in context.entities for alignment state');
  }
  if (!attesterAddress) {
    throw new Error('attesterAddress is required in context.entities for alignment state');
  }

  // Cast to any to handle GraphQLClient | GraphQLExecutor union type
  const executor = graphqlClient as any;

  // Get all projects aligned with this statement
  const alignedProjects = await getAlignedProjects(executor, statementId);

  // Get all statements this project is aligned with
  const projectStatements = await getProjectStatements(executor, projectAddress);

  // Check if this specific alignment exists
  const alignment = await getProjectAlignment(
    executor,
    attesterAddress,
    projectAddress,
    statementId
  );

  return {
    alignedProjectCount: alignedProjects.length,
    projectStatementCount: projectStatements.length,
    alignmentExists: alignment !== null,
  };
}

/**
 * State Transition Property #1: Alignment Attestation
 *
 * When an attester creates a project-statement alignment:
 * - The alignment should exist in the indexer
 * - The count of projects aligned with the statement should increase by 1
 * - The count of statements the project is aligned with should increase by 1
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
      after.alignedProjectCount,
      before.alignedProjectCount + 1,
      `Aligned project count mismatch. ` +
      `Before: ${before.alignedProjectCount}, ` +
      `After: ${after.alignedProjectCount}, ` +
      `Expected increase of 1`
    );

    // The alignment count from project's perspective should increase by 1
    assert.strictEqual(
      after.projectStatementCount,
      before.projectStatementCount + 1,
      `Project statement count mismatch. ` +
      `Before: ${before.projectStatementCount}, ` +
      `After: ${after.projectStatementCount}, ` +
      `Expected increase of 1`
    );
  },
};

/**
 * State Transition Property #2: Alignment Bidirectionality
 *
 * After creating an alignment:
 * - Querying by statement should return the project
 * - Querying by project should return the statement
 * - Querying by attester should return the alignment
 *
 * This verifies that all query paths are consistent.
 */
export const alignmentBidirectionalityProperty: StateTransitionProperty = {
  name: 'alignmentBidirectionality',
  captureState: async () => ({}), // No state to capture, we just verify after
  check: async (context: ActionContext, before: any, after: any) => {
    const { graphqlClient, entities } = context;
    const { statementId, projectAddress, attesterAddress } = entities;

    if (!statementId || !projectAddress || !attesterAddress) {
      throw new Error('statementId, projectAddress, and attesterAddress are required');
    }

    const executor = graphqlClient as any;

    // Query by statement - should include this project
    const alignedProjects = await getAlignedProjects(executor, statementId);
    const projectFound = alignedProjects.some(
      a => a.projectAddress.toLowerCase() === projectAddress.toLowerCase() &&
           a.attester.toLowerCase() === attesterAddress.toLowerCase()
    );
    assert.ok(
      projectFound,
      `Project ${projectAddress} should appear in aligned projects for statement ${statementId}`
    );

    // Query by project - should include this statement
    const projectStatements = await getProjectStatements(executor, projectAddress);
    const statementFound = projectStatements.some(
      a => a.statementId.toLowerCase() === statementId.toLowerCase() &&
           a.attester.toLowerCase() === attesterAddress.toLowerCase()
    );
    assert.ok(
      statementFound,
      `Statement ${statementId} should appear in statements for project ${projectAddress}`
    );

    // Query the specific alignment - should exist
    const alignment = await getProjectAlignment(
      executor,
      attesterAddress,
      projectAddress,
      statementId
    );
    assert.ok(
      alignment,
      `Alignment should exist for attester ${attesterAddress}, project ${projectAddress}, statement ${statementId}`
    );
  },
};

/**
 * Invariant Check: No Orphaned Alignment Data
 *
 * All alignment records should reference valid entities:
 * - Every alignment references a Statement that exists
 * - Every alignment references a Project that exists
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
 * Action metadata for attestProjectAlignment
 */
export const attestProjectAlignmentMetadata: ActionMetadata = {
  name: 'attestProjectAlignment',
  category: 'other',
  stateTransitionProperties: [
    alignmentAttestationProperty,
    alignmentBidirectionalityProperty,
  ],
  invariantsToCheck: [noOrphanedAlignmentDataInvariant],
};

/**
 * Action metadata for attestProjectAlignmentsBatch
 *
 * For batch operations, we skip the detailed state transition checks
 * (since they would need to track multiple alignments) and just verify
 * the invariants hold.
 */
export const attestProjectAlignmentsBatchMetadata: ActionMetadata = {
  name: 'attestProjectAlignmentsBatch',
  category: 'other',
  stateTransitionProperties: [],
  invariantsToCheck: [noOrphanedAlignmentDataInvariant],
};
