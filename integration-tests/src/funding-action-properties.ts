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
import { assertMoneyConservation } from './invariants.js';

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
  const { graphqlClient, entities } = context;
  const { projectAddress } = entities;

  if (!projectAddress) {
    throw new Error('projectAddress is required in context.entities');
  }

  // Cast to any to handle GraphQLClient | GraphQLExecutor union type
  const executor = graphqlClient as any;
  const project = await getProject(executor, projectAddress);
  const contributions = await getProjectContributions(executor, projectAddress);

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
    const { graphqlClient, entities } = context;
    const { projectAddress } = entities;

    if (!projectAddress) {
      throw new Error('projectAddress is required in context.entities');
    }

    await assertMoneyConservation(graphqlClient, projectAddress);
  },
};

/**
 * Action metadata for buyProjectTokens
 */
export const buyProjectTokensMetadata: ActionMetadata = {
  name: 'buyProjectTokens',
  category: 'funding',
  stateTransitionProperties: [projectFundingProperty],
  invariantsToCheck: [moneyConservationInvariant],
};
