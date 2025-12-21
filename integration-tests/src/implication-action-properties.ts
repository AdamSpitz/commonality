/**
 * State transition properties and invariants for implication-related actions
 *
 * This defines the properties that should hold when users attest that one
 * statement implies another in the Conceptspace system.
 */

import assert from 'assert';
import {
  type ActionContext,
  type StateTransitionProperty,
  type InvariantCheck,
  type ActionMetadata,
} from './action-framework.js';
import { getImplicationsFrom, getImplicationsTo } from '@commonality/sdk';

/**
 * State captured before/after an implication action
 */
interface ImplicationState {
  implicationsFromCount: number;
  implicationsToCount: number;
  specificImplicationExists: boolean;
}

/**
 * Capture the current state of implications for the statements involved
 */
async function captureImplicationState(context: ActionContext): Promise<ImplicationState> {
  const { graphqlClient, entities, extra } = context;
  const { fromStatementId, toStatementId, attesterAddress } = entities;

  if (!fromStatementId) {
    throw new Error('fromStatementId is required in context.entities');
  }
  if (!toStatementId) {
    throw new Error('toStatementId is required in context.entities');
  }
  if (!attesterAddress) {
    throw new Error('attesterAddress is required in context.entities');
  }

  // Cast to any to handle GraphQLClient | GraphQLExecutor union type
  const executor = graphqlClient as any;

  const implicationsFrom = await getImplicationsFrom(executor, fromStatementId);
  const implicationsTo = await getImplicationsTo(executor, toStatementId);

  // Check if this specific implication already exists
  const specificImplicationExists = implicationsFrom.some(
    (imp) =>
      imp.toStatementId.toLowerCase() === toStatementId.toLowerCase() &&
      imp.attester.id.toLowerCase() === attesterAddress.toLowerCase()
  );

  return {
    implicationsFromCount: implicationsFrom.length,
    implicationsToCount: implicationsTo.length,
    specificImplicationExists,
  };
}

/**
 * State Transition Property: Implication Bidirectionality
 *
 * When an attester creates an implication from statement A to statement B:
 * - The implication should appear in "implications from A" queries
 * - The implication should appear in "implications to B" queries
 * - Both counts should increase by 1 (unless the implication already existed)
 * - The attester should be correctly recorded
 *
 * This verifies:
 * - The blockchain event was properly indexed
 * - The implication is queryable from both directions
 * - No duplicate implications are created
 * - The attester identity is preserved
 */
export const implicationBidirectionalityProperty: StateTransitionProperty = {
  name: 'implicationBidirectionality',
  captureState: captureImplicationState,
  check: async (context: ActionContext, before: ImplicationState, after: ImplicationState) => {
    const { entities } = context;
    const { fromStatementId, toStatementId, attesterAddress } = entities;

    if (!fromStatementId || !toStatementId || !attesterAddress) {
      throw new Error('fromStatementId, toStatementId, and attesterAddress are required');
    }

    // If the implication already existed, counts shouldn't change
    if (before.specificImplicationExists) {
      assert.strictEqual(
        after.implicationsFromCount,
        before.implicationsFromCount,
        'Implication counts should not change when creating duplicate implication'
      );
      assert.strictEqual(
        after.implicationsToCount,
        before.implicationsToCount,
        'Implication counts should not change when creating duplicate implication'
      );
      return;
    }

    // Verify counts increased by exactly 1
    assert.strictEqual(
      after.implicationsFromCount,
      before.implicationsFromCount + 1,
      `Implications FROM count mismatch. ` +
      `Before: ${before.implicationsFromCount}, ` +
      `Expected: ${before.implicationsFromCount + 1}, ` +
      `Got: ${after.implicationsFromCount}`
    );

    assert.strictEqual(
      after.implicationsToCount,
      before.implicationsToCount + 1,
      `Implications TO count mismatch. ` +
      `Before: ${before.implicationsToCount}, ` +
      `Expected: ${before.implicationsToCount + 1}, ` +
      `Got: ${after.implicationsToCount}`
    );

    // Verify the specific implication now exists
    assert.strictEqual(
      after.specificImplicationExists,
      true,
      'The specific implication should exist after attestation'
    );

    // Query the implication to verify details
    const executor = context.graphqlClient as any;
    const implicationsFrom = await getImplicationsFrom(executor, fromStatementId);
    const newImplication = implicationsFrom.find(
      (imp) =>
        imp.toStatementId.toLowerCase() === toStatementId.toLowerCase() &&
        imp.attester.id.toLowerCase() === attesterAddress.toLowerCase()
    );

    assert.ok(newImplication, 'Should be able to find the newly created implication');
    assert.strictEqual(
      newImplication.fromStatementId.toLowerCase(),
      fromStatementId.toLowerCase(),
      'Implication fromStatementId should match'
    );
    assert.strictEqual(
      newImplication.toStatementId.toLowerCase(),
      toStatementId.toLowerCase(),
      'Implication toStatementId should match'
    );
    assert.strictEqual(
      newImplication.attester.id.toLowerCase(),
      attesterAddress.toLowerCase(),
      'Implication attester should match'
    );
  },
};

/**
 * Invariant Check: Implication Bidirectionality Consistency
 *
 * For any implication, it should be queryable from both directions:
 * - If it appears in getImplicationsFrom(A), it should also appear in getImplicationsTo(B)
 * - The counts should be consistent
 *
 * This is an expensive check that queries all implications.
 */
export const implicationBidirectionalityInvariant: InvariantCheck = {
  name: 'implicationBidirectionalityConsistency',
  expensive: true,
  check: async (context: ActionContext) => {
    const { graphqlClient, entities } = context;
    const { fromStatementId, toStatementId, attesterAddress } = entities;

    if (!fromStatementId || !toStatementId || !attesterAddress) {
      throw new Error('fromStatementId, toStatementId, and attesterAddress are required');
    }

    const executor = graphqlClient as any;

    // Get implications from both directions
    const implicationsFrom = await getImplicationsFrom(executor, fromStatementId);
    const implicationsTo = await getImplicationsTo(executor, toStatementId);

    // Find this specific implication in both queries
    const foundInFrom = implicationsFrom.find(
      (imp) =>
        imp.toStatementId.toLowerCase() === toStatementId.toLowerCase() &&
        imp.attester.id.toLowerCase() === attesterAddress.toLowerCase()
    );

    const foundInTo = implicationsTo.find(
      (imp) =>
        imp.fromStatementId.toLowerCase() === fromStatementId.toLowerCase() &&
        imp.attester.id.toLowerCase() === attesterAddress.toLowerCase()
    );

    // Both should exist or both should not exist
    if (foundInFrom && !foundInTo) {
      throw new Error(
        `Implication found in getImplicationsFrom(${fromStatementId}) ` +
        `but NOT in getImplicationsTo(${toStatementId})`
      );
    }

    if (!foundInFrom && foundInTo) {
      throw new Error(
        `Implication found in getImplicationsTo(${toStatementId}) ` +
        `but NOT in getImplicationsFrom(${fromStatementId})`
      );
    }

    // If both exist, verify they have the same data
    if (foundInFrom && foundInTo) {
      assert.strictEqual(
        foundInFrom.fromStatementId.toLowerCase(),
        foundInTo.fromStatementId.toLowerCase(),
        'fromStatementId should match in both query directions'
      );
      assert.strictEqual(
        foundInFrom.toStatementId.toLowerCase(),
        foundInTo.toStatementId.toLowerCase(),
        'toStatementId should match in both query directions'
      );
      assert.strictEqual(
        foundInFrom.attester.id.toLowerCase(),
        foundInTo.attester.id.toLowerCase(),
        'attester should match in both query directions'
      );
    }
  },
};

/**
 * Action metadata for attestImplication
 */
export const attestImplicationMetadata: ActionMetadata = {
  name: 'attestImplication',
  category: 'belief',
  stateTransitionProperties: [implicationBidirectionalityProperty],
  invariantsToCheck: [implicationBidirectionalityInvariant],
};
