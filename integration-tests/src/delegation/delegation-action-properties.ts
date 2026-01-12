/**
 * State transition properties and invariants for delegation-related actions
 *
 * This defines the properties that should hold when users create, delegate,
 * revoke, or spend delegatable notes.
 */

import assert from 'assert';
import {
  type ActionContext,
  type StateTransitionProperty,
  type InvariantCheck,
  type ActionMetadata,
} from '../actions/action-framework.js';
import {
  getNote,
  getDelegationChain,
} from '../utils/graphql-helpers.js';
import { assertDelegationChainIntegrity } from '../utils/invariants.js';

/**
 * State captured before/after a delegation action
 */
interface DelegationState {
  noteExists: boolean;
  owner: string | null;
  rootOwner: string | null;
  amount: bigint;
  chainLength: number;
  active: boolean;
}

/**
 * Capture the current state of a delegation note
 */
async function captureDelegationState(context: ActionContext): Promise<DelegationState> {
  const { graphqlClient, entities } = context;
  const { delegationNoteId } = entities;

  if (!delegationNoteId) {
    throw new Error('delegationNoteId is required in context.entities');
  }

  // Cast to any to handle GraphQLClient | GraphQLExecutor union type
  const executor = graphqlClient as any;

  const note = await getNote(executor, delegationNoteId);

  if (!note) {
    return {
      noteExists: false,
      owner: null,
      rootOwner: null,
      amount: 0n,
      chainLength: 0,
      active: false,
    };
  }

  const chain = await getDelegationChain(executor, delegationNoteId);

  return {
    noteExists: true,
    owner: note.owner,
    rootOwner: note.rootOwner,
    amount: BigInt(note.amount),
    chainLength: chain.length,
    active: note.active,
  };
}

/**
 * State Transition Property #1: Delegation Creation
 *
 * When a note is delegated:
 * - A new note should be created (or the existing note updated)
 * - The delegation chain should grow by 1 position
 * - The new owner should be the delegate address
 * - The root owner should remain the same
 */
export const delegationCreationProperty: StateTransitionProperty = {
  name: 'delegationCreation',
  captureState: captureDelegationState,
  check: async (context: ActionContext, before: DelegationState, after: DelegationState) => {
    const { entities, extra } = context;
    const { delegateTo } = extra || {};

    if (!delegateTo) {
      throw new Error('delegateTo is required in context.extra for delegation creation property');
    }

    // Verify the note exists after delegation
    assert.ok(
      after.noteExists,
      `Delegation failed: note ${entities.delegationNoteId} should exist after delegation`
    );

    // Verify the new owner is the delegate
    assert.strictEqual(
      after.owner?.toLowerCase(),
      delegateTo.toLowerCase(),
      `Delegation owner mismatch. Expected ${delegateTo}, got ${after.owner}`
    );

    // Verify the chain grew
    if (before.noteExists) {
      // For existing notes being delegated further
      assert.strictEqual(
        after.chainLength,
        before.chainLength + 1,
        `Delegation chain should grow by 1. Was ${before.chainLength}, now ${after.chainLength}`
      );
    } else {
      // For newly created delegations
      assert(
        after.chainLength >= 1,
        `New delegation chain should have at least 1 position, got ${after.chainLength}`
      );
    }
  },
};

/**
 * State Transition Property #2: Delegation Revocation
 *
 * When a note is revoked by a parent in the chain:
 * - The delegation chain should be truncated (become shorter)
 * - The note should still exist (for audit trail)
 * - The chain should have fewer positions than before
 *
 * Note: Revocation doesn't mark the note as inactive. Instead, it modifies
 * the delegation chain by removing the child positions after the revoker.
 */
export const delegationRevocationProperty: StateTransitionProperty = {
  name: 'delegationRevocation',
  captureState: captureDelegationState,
  check: async (context: ActionContext, before: DelegationState, after: DelegationState) => {
    // Verify the note existed before revocation
    assert.ok(
      before.noteExists,
      `Cannot revoke non-existent note ${context.entities.delegationNoteId}`
    );

    // Verify the chain has been truncated (shorter than before)
    assert(
      after.chainLength < before.chainLength,
      `Note ${context.entities.delegationNoteId}: Delegation chain should be truncated after revocation. ` +
      `Before: ${before.chainLength} positions, After: ${after.chainLength} positions. ` +
      `Expected after < before.`
    );

    // Note: The note should still exist for audit trail
    assert.ok(
      after.noteExists,
      `Revoked note ${context.entities.delegationNoteId} should still exist in database`
    );
  },
};

/**
 * State Transition Property #3: Delegation Permission Enforcement
 *
 * This property verifies that unauthorized delegation/revocation/spending attempts
 * are rejected. It's used when we *expect* an action to fail.
 *
 * Usage: Set context.extra.expectFailure = true when calling a checked action
 * that should fail due to permission issues.
 */
export const delegationPermissionProperty: StateTransitionProperty = {
  name: 'delegationPermission',
  captureState: captureDelegationState,
  check: async (context: ActionContext, before: DelegationState, after: DelegationState) => {
    const { extra } = context;
    const { expectFailure } = extra || {};

    if (expectFailure) {
      // If we expected the action to fail, the state should be unchanged
      assert.deepStrictEqual(
        after,
        before,
        `When action fails due to permission denial, state should remain unchanged. ` +
        `Note ${context.entities.delegationNoteId} state changed unexpectedly.`
      );
    }
    // If we didn't expect failure, other properties will verify success
  },
};

/**
 * Invariant Check: Delegation Chain Integrity
 *
 * The delegation chain should:
 * - Never contain cycles
 * - Have sequential positions (0, 1, 2, ...)
 * - Have the root owner at position 0
 * - Have the current owner at the last position
 */
export const delegationChainInvariant: InvariantCheck = {
  name: 'delegationChainIntegrity',
  check: async (context: ActionContext) => {
    const { graphqlClient, entities } = context;
    const { delegationNoteId } = entities;

    if (!delegationNoteId) {
      throw new Error('delegationNoteId is required in context.entities');
    }

    await assertDelegationChainIntegrity(graphqlClient, delegationNoteId);
  },
};

/**
 * Action metadata for depositETH (creating a new note)
 */
export const depositETHMetadata: ActionMetadata = {
  name: 'depositETH',
  category: 'delegation',
  stateTransitionProperties: [],
  invariantsToCheck: [delegationChainInvariant],
};

/**
 * Action metadata for delegateNote
 */
export const delegateNoteMetadata: ActionMetadata = {
  name: 'delegateNote',
  category: 'delegation',
  stateTransitionProperties: [delegationCreationProperty],
  invariantsToCheck: [delegationChainInvariant],
};

/**
 * Action metadata for revokeNote
 */
export const revokeNoteMetadata: ActionMetadata = {
  name: 'revokeNote',
  category: 'delegation',
  stateTransitionProperties: [delegationRevocationProperty],
  invariantsToCheck: [delegationChainInvariant],
};

/**
 * Action metadata for spending delegated notes (purchaseFromPrimaryMarketWithNotes)
 */
export const spendDelegatedNoteMetadata: ActionMetadata = {
  name: 'spendDelegatedNote',
  category: 'delegation',
  stateTransitionProperties: [],
  // When spending notes, we check delegation chain integrity for each note used
  invariantsToCheck: [delegationChainInvariant],
};

/**
 * State Transition Property #4: Reclaim Funds
 *
 * When funds are reclaimed from a note:
 * - The note should become inactive
 * - The note amount should become 0
 * - The note should still exist (not deleted, just inactive)
 */
export const reclaimFundsProperty: StateTransitionProperty = {
  name: 'reclaimFunds',
  captureState: captureDelegationState,
  check: async (context: ActionContext, before: DelegationState, after: DelegationState) => {
    // Verify the note existed before
    assert.ok(
      before.noteExists,
      `Reclaim failed: note ${context.entities.delegationNoteId} should exist before reclaim`
    );

    // Verify the note still exists after (not deleted)
    assert.ok(
      after.noteExists,
      `Reclaim failed: note ${context.entities.delegationNoteId} should still exist after reclaim`
    );

    // Verify the note is now inactive
    assert.strictEqual(
      after.active,
      false,
      `Note ${context.entities.delegationNoteId} should be inactive after reclaim`
    );

    // Verify the amount is now 0
    assert.strictEqual(
      after.amount,
      0n,
      `Note ${context.entities.delegationNoteId} amount should be 0 after reclaim. Got: ${after.amount}`
    );
  },
};

/**
 * Action metadata for reclaimFunds
 */
export const reclaimFundsMetadata: ActionMetadata = {
  name: 'reclaimFunds',
  category: 'delegation',
  stateTransitionProperties: [reclaimFundsProperty],
  invariantsToCheck: [delegationChainInvariant],
};
