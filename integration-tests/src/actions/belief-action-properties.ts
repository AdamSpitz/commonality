/**
 * State transition properties and invariants for belief-related actions
 *
 * This defines the properties that should hold when users express beliefs,
 * disbeliefs, or clear their opinions about statements.
 */

import assert from 'assert';
import {
  type ActionContext,
  type StateTransitionProperty,
  type ActionMetadata,
} from './action-framework.js';
import { NO_OPINION, BELIEVES, DISBELIEVES } from '@commonality/sdk/conceptspace';
import { getStatement, getUserBelief } from '@commonality/sdk/conceptspace';

/**
 * State captured before/after a belief action
 */
interface BeliefState {
  believerCount: number;
  disbelieverCount: number;
  userBeliefState: number;
}

/**
 * Capture the current state of a statement and user's belief
 */
async function captureBeliefState(context: ActionContext): Promise<BeliefState> {
  const { machinery, entities } = context;
  const { statementCid, userAddress } = entities;

  if (!statementCid) {
    throw new Error('statementCid is required in context.entities');
  }
  if (!userAddress) {
    throw new Error('userAddress is required in context.entities');
  }

  const statement = await getStatement(machinery, statementCid);
  const userBelief = await getUserBelief(machinery, userAddress, statementCid);

  return {
    believerCount: statement?.believerCount ?? 0,
    disbelieverCount: statement?.disbelieverCount ?? 0,
    userBeliefState: userBelief?.beliefState ?? NO_OPINION,
  };
}

/**
 * State Transition Property #1: Belief Transition
 *
 * When a user changes their belief state, the counts should change correctly:
 * - NO_OPINION → BELIEVES: believerCount +1
 * - NO_OPINION → DISBELIEVES: disbelieverCount +1
 * - BELIEVES → DISBELIEVES: believerCount -1, disbelieverCount +1
 * - DISBELIEVES → BELIEVES: believerCount +1, disbelieverCount -1
 * - BELIEVES → NO_OPINION: believerCount -1
 * - DISBELIEVES → NO_OPINION: disbelieverCount -1
 * - Same state → no changes
 */
export const beliefTransitionProperty: StateTransitionProperty = {
  name: 'beliefTransition',
  captureState: captureBeliefState,
  check: async (context: ActionContext, before: BeliefState, after: BeliefState) => {
    // Determine what the expected counts should be based on the transition
    let expectedBelieverCount = before.believerCount;
    let expectedDisbelieverCount = before.disbelieverCount;

    // Determine the transition
    const fromState = before.userBeliefState;
    const toState = after.userBeliefState;

    // Calculate expected changes based on the transition
    if (fromState === toState) {
      // No change - counts should stay the same
      // (This can happen if the user calls the same action twice)
    } else if (fromState === NO_OPINION && toState === BELIEVES) {
      expectedBelieverCount += 1;
    } else if (fromState === NO_OPINION && toState === DISBELIEVES) {
      expectedDisbelieverCount += 1;
    } else if (fromState === BELIEVES && toState === DISBELIEVES) {
      expectedBelieverCount -= 1;
      expectedDisbelieverCount += 1;
    } else if (fromState === DISBELIEVES && toState === BELIEVES) {
      expectedBelieverCount += 1;
      expectedDisbelieverCount -= 1;
    } else if (fromState === BELIEVES && toState === NO_OPINION) {
      expectedBelieverCount -= 1;
    } else if (fromState === DISBELIEVES && toState === NO_OPINION) {
      expectedDisbelieverCount -= 1;
    }

    // Verify the counts match expectations
    assert.strictEqual(
      after.believerCount,
      expectedBelieverCount,
      `Believer count mismatch. ` +
      `Transition: ${fromState} → ${toState}. ` +
      `Expected ${expectedBelieverCount}, got ${after.believerCount}`
    );

    assert.strictEqual(
      after.disbelieverCount,
      expectedDisbelieverCount,
      `Disbeliever count mismatch. ` +
      `Transition: ${fromState} → ${toState}. ` +
      `Expected ${expectedDisbelieverCount}, got ${after.disbelieverCount}`
    );

    // Verify the user's belief state is correct
    assert.strictEqual(
      after.userBeliefState,
      toState,
      `User belief state should be ${toState}, got ${after.userBeliefState}`
    );
  },
};

/**
 * Action metadata for believeStatement
 */
export const believeStatementMetadata: ActionMetadata = {
  name: 'believeStatement',
  category: 'belief',
  stateTransitionProperties: [beliefTransitionProperty],
  invariantsToCheck: [],
};

/**
 * Action metadata for disbelieveStatement
 */
export const disbelieveStatementMetadata: ActionMetadata = {
  name: 'disbelieveStatement',
  category: 'belief',
  stateTransitionProperties: [beliefTransitionProperty],
  invariantsToCheck: [],
};

/**
 * Action metadata for clearOpinion
 */
export const clearOpinionMetadata: ActionMetadata = {
  name: 'clearOpinion',
  category: 'belief',
  stateTransitionProperties: [beliefTransitionProperty],
  invariantsToCheck: [],
};
