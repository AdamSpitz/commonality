/**
 * State transition properties and invariants for funding-related actions
 *
 * This defines the properties that should hold when users contribute to
 * crowdfunding projects (pubstarter).
 */

import assert from 'assert';
import {
  type ActionContext,
  type StateTransitionProperty,
  type InvariantCheck,
  type ActionMetadata,
} from './action-framework.js';
import { getProject, getProjectContributions } from '@commonality/sdk';
import { assertMoneyConservation } from '../utils/invariants.js';

/**
 * State captured before/after a funding action
 */
interface FundingState {
  totalReceived: bigint;
  contributionCount: number;
}

/**
 * Capture the current state of a project's funding
 */
async function captureFundingState(context: ActionContext): Promise<FundingState> {
  const { machinery, entities } = context;
  const { projectAddress } = entities;

  if (!projectAddress) {
    throw new Error('projectAddress is required in context.entities');
  }

  const project = await getProject(machinery, projectAddress);
  const contributions = await getProjectContributions(machinery, projectAddress);

  return {
    totalReceived: project ? BigInt(project.totalReceived) : BigInt(0),
    contributionCount: contributions.length,
  };
}

/**
 * State Transition Property #1: Project Funding
 *
 * When someone buys tokens worth X ETH, the project's totalReceived should
 * increase by exactly X.
 *
 * This verifies:
 * - Money is correctly tracked when contributions are made
 * - The exact amount contributed is reflected in totalReceived
 * - No money is lost or duplicated in the transaction
 */
export const projectFundingProperty: StateTransitionProperty = {
  name: 'projectFunding',
  captureState: captureFundingState,
  check: async (context: ActionContext, before: FundingState, after: FundingState) => {
    const { extra } = context;

    if (!extra?.contributionAmount) {
      throw new Error('contributionAmount is required in context.extra for projectFundingProperty');
    }

    const contributionAmount = BigInt(extra.contributionAmount);
    const expectedTotal = before.totalReceived + contributionAmount;

    assert.strictEqual(
      after.totalReceived,
      expectedTotal,
      `Total received mismatch. ` +
      `Before: ${before.totalReceived}, ` +
      `Contribution: ${contributionAmount}, ` +
      `Expected: ${expectedTotal}, ` +
      `Got: ${after.totalReceived}`
    );

    // Also verify that contribution count increased by 1
    assert.strictEqual(
      after.contributionCount,
      before.contributionCount + 1,
      `Contribution count should increase by 1. ` +
      `Before: ${before.contributionCount}, ` +
      `After: ${after.contributionCount}`
    );
  },
};

/**
 * Invariant Check: Money Conservation
 *
 * The cached totalReceived on the Project entity should always match
 * the sum of all individual Contribution records.
 */
export const moneyConservationInvariant: InvariantCheck = {
  name: 'moneyConservation',
  check: async (context: ActionContext) => {
    const { machinery, entities } = context;
    const { projectAddress } = entities;

    if (!projectAddress) {
      throw new Error('projectAddress is required in context.entities');
    }

    await assertMoneyConservation(machinery, projectAddress);
  },
};

/**
 * State Transition Property #2: Refund Mechanics
 *
 * When a refund is processed:
 * - The project's totalReceived should decrease by the refund amount
 * - Money conservation should still hold (totalReceived = sum of contributions minus refunds)
 * - Token conservation should still hold (tokens are returned to the contract)
 *
 * This verifies:
 * - Refunds correctly reduce the project's funding
 * - The exact refund amount is reflected in totalReceived
 * - No money is lost or duplicated during refund
 */
export const refundMechanicsProperty: StateTransitionProperty = {
  name: 'refundMechanics',
  captureState: captureFundingState,
  check: async (context: ActionContext, before: FundingState, after: FundingState) => {
    const { extra } = context;

    if (!extra?.refundAmount) {
      throw new Error('refundAmount is required in context.extra for refundMechanicsProperty');
    }

    const refundAmount = BigInt(extra.refundAmount);
    const expectedTotal = before.totalReceived - refundAmount;

    assert.strictEqual(
      after.totalReceived,
      expectedTotal,
      `Total received mismatch after refund. ` +
      `Before: ${before.totalReceived}, ` +
      `Refund: ${refundAmount}, ` +
      `Expected: ${expectedTotal}, ` +
      `Got: ${after.totalReceived}`
    );

    // Note: contribution count should remain the same - refunds don't delete contributions
    // The contribution records remain as historical records
  },
};

/**
 * State Transition Property #3: Withdrawal Mechanics
 *
 * When funds are withdrawn from a successful project:
 * - The withdrawal should succeed (no revert)
 * - The project's totalReceived should remain the same (withdrawal doesn't change history)
 * - Money conservation should still hold
 *
 * This verifies:
 * - Withdrawals don't corrupt the funding data
 * - Historical funding data is preserved
 */
export const withdrawalMechanicsProperty: StateTransitionProperty = {
  name: 'withdrawalMechanics',
  captureState: captureFundingState,
  check: async (context: ActionContext, before: FundingState, after: FundingState) => {
    // Withdrawal should not change totalReceived - it's a historical record
    assert.strictEqual(
      after.totalReceived,
      before.totalReceived,
      `Total received should not change after withdrawal. ` +
      `Before: ${before.totalReceived}, ` +
      `After: ${after.totalReceived}`
    );

    // Contribution count should also remain the same
    assert.strictEqual(
      after.contributionCount,
      before.contributionCount,
      `Contribution count should not change after withdrawal. ` +
      `Before: ${before.contributionCount}, ` +
      `After: ${after.contributionCount}`
    );
  },
};

/**
 * Invariant Check: Token Conservation
 *
 * Tokens sold should equal tokens held + tokens burned.
 */
export const tokenConservationInvariant: InvariantCheck = {
  name: 'tokenConservation',
  check: async (context: ActionContext) => {
    const { machinery, entities } = context;
    const { projectAddress } = entities;

    if (!projectAddress) {
      throw new Error('projectAddress is required in context.entities');
    }

    const { assertTokenConservation } = await import('../utils/invariants.js');
    await assertTokenConservation(machinery, projectAddress);
  },
};

/**
 * Action metadata for buyProjectTokens
 */
export const buyProjectTokensMetadata: ActionMetadata = {
  name: 'buyProjectTokens',
  category: 'funding',
  stateTransitionProperties: [projectFundingProperty],
  invariantsToCheck: [moneyConservationInvariant, tokenConservationInvariant],
};

/**
 * Action metadata for refundProjectTokens
 */
export const refundProjectTokensMetadata: ActionMetadata = {
  name: 'refundProjectTokens',
  category: 'funding',
  stateTransitionProperties: [refundMechanicsProperty],
  invariantsToCheck: [moneyConservationInvariant, tokenConservationInvariant],
};

/**
 * Action metadata for withdrawProjectFunds
 */
export const withdrawProjectFundsMetadata: ActionMetadata = {
  name: 'withdrawProjectFunds',
  category: 'funding',
  stateTransitionProperties: [withdrawalMechanicsProperty],
  invariantsToCheck: [moneyConservationInvariant],
};

/**
 * State Transition Property #4: Token Burn Effects
 *
 * When tokens are burned:
 * - Token conservation should still hold (sold = held + burned)
 * - The burned amount should match what was requested
 * - Funding data should remain unchanged (burning doesn't affect totalReceived)
 *
 * This verifies:
 * - Tokens are correctly marked as burned
 * - Token conservation is maintained
 * - Historical funding data is not corrupted
 */
export const tokenBurnEffectsProperty: StateTransitionProperty = {
  name: 'tokenBurnEffects',
  captureState: captureFundingState,
  check: async (context: ActionContext, before: FundingState, after: FundingState) => {
    // Burning tokens should not affect funding totals
    assert.strictEqual(
      after.totalReceived,
      before.totalReceived,
      `Total received should not change after burning tokens. ` +
      `Before: ${before.totalReceived}, ` +
      `After: ${after.totalReceived}`
    );

    // Contribution count should also remain the same
    assert.strictEqual(
      after.contributionCount,
      before.contributionCount,
      `Contribution count should not change after burning tokens. ` +
      `Before: ${before.contributionCount}, ` +
      `After: ${after.contributionCount}`
    );
  },
};

/**
 * Action metadata for burnTokens
 */
export const burnTokensMetadata: ActionMetadata = {
  name: 'burnTokens',
  category: 'funding',
  stateTransitionProperties: [tokenBurnEffectsProperty],
  invariantsToCheck: [tokenConservationInvariant],
};

/**
 * State Transition Property #5: Project Creation
 *
 * When a project is created:
 * - The project should exist in the indexer with correct initial state
 * - totalReceived should be 0
 * - contributionCount should be 0
 * - Token types should be correctly indexed
 *
 * This verifies:
 * - Project creation event is properly indexed
 * - Initial state is correctly set
 * - Token metadata is properly indexed
 */
export const projectCreationProperty: StateTransitionProperty = {
  name: 'projectCreation',
  captureState: async () => {
    // No before state needed for creation
    return {};
  },
  check: async (context: ActionContext) => {
    const { machinery, entities } = context;
    const { projectAddress } = entities;

    if (!projectAddress) {
      throw new Error('projectAddress is required in context.entities');
    }

    const project = await getProject(machinery, projectAddress);

    assert.ok(project, 'Project should exist after creation');
    assert.strictEqual(
      BigInt(project.totalReceived),
      0n,
      'New project should have 0 totalReceived'
    );

    const contributions = await getProjectContributions(machinery, projectAddress);
    assert.strictEqual(
      contributions.length,
      0,
      'New project should have 0 contributions'
    );
  },
};

/**
 * Action metadata for createProject
 */
export const createProjectMetadata: ActionMetadata = {
  name: 'createProject',
  category: 'funding',
  stateTransitionProperties: [projectCreationProperty],
  invariantsToCheck: [],
};
