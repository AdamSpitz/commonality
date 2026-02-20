/**
 * State transition properties and invariants for mutable reference actions
 *
 * This defines the properties that should hold when users create or update
 * mutable references (refs).
 */

import assert from 'assert';
import {
  type ActionContext,
  type StateTransitionProperty,
  type InvariantCheck,
  type ActionMetadata,
} from '../actions/action-framework.js';
import { getRef } from '@commonality/sdk';
import {
  getUserRef,
  getUserRefHistory,
} from '../utils/graphql-helpers.js';
import {
  assertRefContractIndexerConsistency,
  assertRefHistoryOrdering,
} from '../utils/invariants.js';

/**
 * State captured before/after a ref update action
 */
interface RefState {
  /** Current value from indexer (null if doesn't exist) */
  currentValue: string | null;
  /** Number of history entries */
  historyCount: number;
  /** Value from contract directly */
  contractValue: string;
}

/**
 * Capture the current state of a mutable ref
 */
async function captureRefState(context: ActionContext): Promise<RefState> {
  const { machinery, entities, extra, contracts } = context;
  const { userAddress } = entities;
  const refName = extra?.refName as string;

  if (!userAddress) {
    throw new Error('userAddress is required in context.entities');
  }
  if (!refName) {
    throw new Error('refName is required in context.extra');
  }
  if (!contracts?.mutableRefUpdater) {
    throw new Error('mutableRefUpdater contract is required in context.contracts');
  }

  // Get current value from indexer
  const currentRef = await getUserRef(executor, userAddress, refName);
  const currentValue = currentRef?.value ?? null;

  // Get history count
  const history = await getUserRefHistory(executor, userAddress, refName);
  const historyCount = history.length;

  // Get value directly from contract
  // We need to create a temporary clients object for getRef
  // For now, we'll skip this in captureState and do it in the check
  // to avoid needing the full clients object here
  const contractValue = ''; // Placeholder, checked separately

  return {
    currentValue,
    historyCount,
    contractValue,
  };
}

/**
 * State Transition Property: Ref Update
 *
 * When a user updates a mutable ref:
 * - The new value should be retrievable from the indexer
 * - History should have one more entry
 * - The contract value should match the indexer value
 */
export const refUpdateProperty: StateTransitionProperty = {
  name: 'refUpdate',
  captureState: captureRefState,
  check: async (context: ActionContext, before: RefState, after: RefState) => {
    const { extra } = context;
    const newValue = extra?.value as string;

    if (newValue === undefined) {
      throw new Error('value is required in context.extra');
    }

    // Check that the value was updated
    assert.strictEqual(
      after.currentValue,
      newValue,
      `Ref value should be updated to ${newValue}, but got ${after.currentValue}`
    );

    // Check that history increased by 1
    const expectedHistoryCount = before.historyCount + 1;
    assert.strictEqual(
      after.historyCount,
      expectedHistoryCount,
      `History count should increase by 1 (from ${before.historyCount} to ${expectedHistoryCount}), ` +
      `but got ${after.historyCount}`
    );
  },
};

/**
 * State Transition Property: List Append
 *
 * When a user appends to a list:
 * - The ref value should change (new CID for the updated list)
 * - History should have one more entry
 * - The new value should be a valid CID
 */
export const listAppendProperty: StateTransitionProperty = {
  name: 'listAppend',
  captureState: captureRefState,
  check: async (context: ActionContext, before: RefState, after: RefState) => {
    // Check that the value changed (list was updated, so CID should be different)
    if (before.currentValue !== null) {
      assert.notStrictEqual(
        after.currentValue,
        before.currentValue,
        'Ref value should change when appending to list'
      );
    }

    // Check that we have a new value
    assert.ok(
      after.currentValue,
      'Ref should have a value after appending to list'
    );

    // Check that it's a valid CID (starts with Qm for CIDv0 or baf for CIDv1)
    assert.ok(
      after.currentValue!.startsWith('Qm') || after.currentValue!.startsWith('baf'),
      `Ref value should be a valid CID, got: ${after.currentValue}`
    );

    // Check that history increased by 1
    const expectedHistoryCount = before.historyCount + 1;
    assert.strictEqual(
      after.historyCount,
      expectedHistoryCount,
      `History count should increase by 1 (from ${before.historyCount} to ${expectedHistoryCount}), ` +
      `but got ${after.historyCount}`
    );
  },
};

/**
 * Invariant: Ref contract-indexer consistency
 *
 * The value from the contract should always match the value from the indexer
 */
export const refContractIndexerConsistency: InvariantCheck = {
  name: 'refContractIndexerConsistency',
  check: async (context: ActionContext) => {
    const { machinery, entities, extra, contracts } = context;
    const { userAddress } = entities;
    const refName = extra?.refName as string;

    if (!userAddress || !refName || !contracts?.mutableRefUpdater) {
      // Skip check if required data is missing
      return;
    }

    await assertRefContractIndexerConsistency(
      graphqlClient,
      contracts.mutableRefUpdater,
      userAddress,
      refName
    );
  },
};

/**
 * Invariant: Ref history ordering
 *
 * History entries should be properly ordered by timestamp/block number
 */
export const refHistoryOrdering: InvariantCheck = {
  name: 'refHistoryOrdering',
  check: async (context: ActionContext) => {
    const { machinery, entities, extra } = context;
    const { userAddress } = entities;
    const refName = extra?.refName as string;

    if (!userAddress || !refName) {
      // Skip check if required data is missing
      return;
    }

    await assertRefHistoryOrdering(graphqlClient, userAddress, refName);
  },
};

/**
 * Metadata for updateRef action
 */
export const updateRefMetadata: ActionMetadata = {
  name: 'updateRef',
  category: 'other',
  stateTransitionProperties: [refUpdateProperty],
  invariantsToCheck: [refContractIndexerConsistency, refHistoryOrdering],
};

/**
 * Metadata for appendToUserList action
 */
export const appendToUserListMetadata: ActionMetadata = {
  name: 'appendToUserList',
  category: 'other',
  stateTransitionProperties: [listAppendProperty],
  invariantsToCheck: [refContractIndexerConsistency, refHistoryOrdering],
};
