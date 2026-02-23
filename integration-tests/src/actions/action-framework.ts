/**
 * Action Framework for State Transition Property Checking
 *
 * This framework allows actions to be associated with state transition properties
 * and invariants that are automatically checked when the action is executed.
 *
 * Instead of manually writing:
 *   state0 = getRelevantState();
 *   runAction(a);
 *   state1 = getRelevantState();
 *   assertTheProperty(a, state0, state1);
 *
 * You can write:
 *   runActionAndCheckStateTransitions(a);
 *
 * This makes tests more concise, ensures properties are always checked,
 * and makes actions reusable in generative testing.
 */

import { type ActionTestingMachinery } from './action-machinery.js';
export { type ActionTestingMachinery };

/**
 * Category of action - used for organizing and filtering
 */
export type ActionCategory = 'belief' | 'funding' | 'delegation' | 'marketplace' | 'other';

/**
 * Context passed to all property checks
 * Contains everything needed to verify properties about an action
 */
export interface ActionContext {
  machinery: ActionTestingMachinery;

  /** Contract instances (only include what's relevant for this action) */
  contracts?: {
    beliefs?: any;
    pubstarter?: any;
    delegation?: any;
    mutableRefUpdater?: any;
    // ... other contracts as needed
  };

  /** Entity identifiers affected by the action */
  entities: {
    statementCid?: string;
    projectAddress?: string;
    subjectAddress?: string;
    userAddress?: string;
    delegationNoteId?: string;
    fromStatementCid?: string;
    toStatementCid?: string;
    attesterAddress?: string;
    marketplaceAddress?: string;
    // ... other entity IDs as needed
  };

  /** Optional additional data specific to the action */
  extra?: Record<string, any>;
}

/**
 * A state transition property checks that an action causes the expected changes
 *
 * Example: When a user changes from BELIEVES to DISBELIEVES,
 * believerCount should decrease by 1 AND disbelieverCount should increase by 1
 */
export interface StateTransitionProperty {
  /** Human-readable name for this property */
  name: string;

  /**
   * Capture the relevant state before/after the action
   * Returns an object representing the state to compare
   */
  captureState: (context: ActionContext) => Promise<any>;

  /**
   * Check that the state transition is valid
   * Receives the before and after states captured by captureState
   */
  check: (context: ActionContext, before: any, after: any) => Promise<void>;
}

/**
 * An invariant check verifies consistency properties at a point in time
 *
 * Example: believerCount should always equal the number of UserBelief records
 * with beliefState=BELIEVES
 */
export interface InvariantCheck {
  /** Human-readable name for this invariant */
  name: string;

  /** Check the invariant holds */
  check: (context: ActionContext) => Promise<void>;

  /**
   * Whether this check is expensive (e.g., queries lots of data)
   * Expensive checks can be skipped in fast test runs
   */
  expensive?: boolean;
}

/**
 * Metadata describing an action and its associated properties
 */
export interface ActionMetadata {
  /** Human-readable name of the action */
  name: string;

  /** Category for organization */
  category: ActionCategory;

  /**
   * State transition properties to check
   * These verify that the action caused the expected changes
   */
  stateTransitionProperties?: StateTransitionProperty[];

  /**
   * Invariants to check after the action
   * These verify consistency properties hold
   */
  invariantsToCheck?: InvariantCheck[];
}

/**
 * Options for running an action with property checking
 */
export interface ActionRunOptions {
  /** Skip all invariant checks (useful for setup phases) */
  skipInvariants?: boolean;

  /** Skip all state transition property checks */
  skipStateTransitions?: boolean;

  /** Skip specific invariants by name */
  skipSpecificInvariants?: string[];

  /** Skip specific state transition properties by name */
  skipSpecificTransitions?: string[];

  /** Override: skip expensive checks even if not globally disabled */
  skipExpensiveChecks?: boolean;

  /**
   * Expect the action to fail/revert
   * When true, the action must throw an error, and state should remain unchanged
   */
  expectFailure?: boolean;

  /**
   * Expected error message or pattern
   * Only checked if expectFailure is true
   * Can be a string (substring match) or RegExp (pattern match)
   */
  expectedError?: string | RegExp;
}

/**
 * Run an action and check its associated state transition properties and invariants
 *
 * @param action - The action to execute (a function that returns a Promise)
 * @param metadata - Metadata describing the action and its properties
 * @param context - Context for property checking (entities, contracts, etc.)
 * @param options - Options to control which checks run
 * @returns The result of the action
 *
 * @example
 * ```typescript
 * const result = await runActionAndCheckProperties(
 *   () => believeStatement(clients, contract, cid),
 *   {
 *     name: 'believeStatement',
 *     category: 'belief',
 *     stateTransitionProperties: [beliefTransitionProperty],
 *     invariantsToCheck: [beliefCountsInvariant],
 *   },
 *   {
 *     graphqlClient,
 *     contracts: { beliefs: contract },
 *     entities: { statementId, userAddress },
 *   }
 * );
 * ```
 */
export async function runActionAndCheckProperties<TResult>(
  action: () => Promise<TResult>,
  metadata: ActionMetadata,
  context: ActionContext,
  options: ActionRunOptions = {}
): Promise<TResult> {
  const {
    skipInvariants = false,
    skipStateTransitions = false,
    skipSpecificInvariants = [],
    skipSpecificTransitions = [],
    skipExpensiveChecks = false,
    expectFailure = false,
    expectedError,
  } = options;

  // Determine if we should skip expensive checks globally
  const shouldSkipExpensive =
    skipExpensiveChecks || process.env.SKIP_EXPENSIVE_CHECKS === 'true';

  // Capture before state for transition properties
  const beforeStates: Array<{ name: string; state: any }> = [];

  if (!skipStateTransitions && metadata.stateTransitionProperties) {
    for (const prop of metadata.stateTransitionProperties) {
      if (skipSpecificTransitions.includes(prop.name)) {
        continue;
      }

      try {
        const state = await prop.captureState(context);
        beforeStates.push({ name: prop.name, state });
      } catch (error: any) {
        throw new Error(
          `Failed to capture 'before' state for property '${prop.name}' ` +
          `in action '${metadata.name}':\n${error.message}`
        );
      }
    }
  }

  // Execute the action
  let result: TResult;

  if (expectFailure) {
    // Action should fail - verify it throws and state remains unchanged
    let caughtError: Error | undefined;

    try {
      result = await action();
      // If we get here, the action didn't fail as expected
      throw new Error(
        `Expected action '${metadata.name}' to fail, but it succeeded.\n` +
        `Entities: ${JSON.stringify(context.entities, null, 2)}`
      );
    } catch (error: any) {
      caughtError = error;

      // Check if this is the "action didn't fail" error we just threw
      if (error.message?.includes('Expected action') && error.message?.includes('to fail, but it succeeded')) {
        throw error;
      }

      // Verify the error message if an expected error was specified
      if (expectedError !== undefined) {
        const errorMessage = error.message || String(error);
        const matches = typeof expectedError === 'string'
          ? errorMessage.includes(expectedError)
          : expectedError.test(errorMessage);

        if (!matches) {
          throw new Error(
            `Action '${metadata.name}' failed as expected, but with wrong error message.\n` +
            `Expected error matching: ${expectedError}\n` +
            `Actual error: ${errorMessage}\n` +
            `Entities: ${JSON.stringify(context.entities, null, 2)}`
          );
        }
      }
    }

    // Verify state remained unchanged by comparing before and after states
    if (!skipStateTransitions && metadata.stateTransitionProperties) {
      for (const [i, prop] of metadata.stateTransitionProperties.entries()) {
        if (skipSpecificTransitions.includes(prop.name)) {
          continue;
        }

        try {
          const after = await prop.captureState(context);
          const before = beforeStates[i].state;

          // For failed actions, we expect the state to be unchanged
          // We do a deep comparison of the before and after states
          // Use a custom replacer to handle BigInt values
          const bigIntReplacer = (_key: string, value: any) =>
            typeof value === 'bigint' ? value.toString() : value;

          const beforeJson = JSON.stringify(before, bigIntReplacer);
          const afterJson = JSON.stringify(after, bigIntReplacer);

          if (beforeJson !== afterJson) {
            throw new Error(
              `State changed after failed action '${metadata.name}'\n` +
              `Property: ${prop.name}\n` +
              `Before: ${beforeJson}\n` +
              `After: ${afterJson}\n` +
              `Entities: ${JSON.stringify(context.entities, null, 2)}`
            );
          }
        } catch (error: any) {
          // If this is the error we just threw about state changing, re-throw it
          if (error.message?.includes('State changed after failed action')) {
            throw error;
          }
          // Otherwise, it's an error in capturing state - report it
          throw new Error(
            `Failed to verify state unchanged for property '${prop.name}' ` +
            `after expected failure of action '${metadata.name}':\n${error.message}`
          );
        }
      }
    }

    // Return undefined for failed actions (we know result is not set)
    return undefined as TResult;
  }

  // Normal flow: action should succeed
  try {
    result = await action();
  } catch (error: any) {
    throw new Error(
      `Action '${metadata.name}' failed during execution:\n${error.message}`
    );
  }

  // Check state transitions
  if (!skipStateTransitions && metadata.stateTransitionProperties) {
    for (const [i, prop] of metadata.stateTransitionProperties.entries()) {
      if (skipSpecificTransitions.includes(prop.name)) {
        continue;
      }

      try {
        const after = await prop.captureState(context);
        const before = beforeStates[i].state;
        await prop.check(context, before, after);
      } catch (error: any) {
        // Format the error with context for debugging
        const errorMessage = error.message || String(error);
        throw new Error(
          `State transition property '${prop.name}' failed for action '${metadata.name}'\n` +
          `Entities: ${JSON.stringify(context.entities, null, 2)}\n` +
          `Error: ${errorMessage}`
        );
      }
    }
  }

  // Check invariants
  if (!skipInvariants && metadata.invariantsToCheck) {
    for (const inv of metadata.invariantsToCheck) {
      // Skip if explicitly excluded
      if (skipSpecificInvariants.includes(inv.name)) {
        continue;
      }

      // Skip expensive checks if globally disabled
      if (inv.expensive && shouldSkipExpensive) {
        continue;
      }

      try {
        await inv.check(context);
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        throw new Error(
          `Invariant '${inv.name}' failed after action '${metadata.name}'\n` +
          `Entities: ${JSON.stringify(context.entities, null, 2)}\n` +
          `Error: ${errorMessage}`
        );
      }
    }
  }

  return result;
}

/**
 * Create a wrapper function that runs an action with property checking
 *
 * This is a convenience function for creating reusable action wrappers.
 *
 * @example
 * ```typescript
 * const believeStatementChecked = createActionWrapper(
 *   believeStatement,
 *   beliefActionMetadata
 * );
 * ```
 */
export function createActionWrapper<TArgs extends any[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  metadata: ActionMetadata,
  contextBuilder: (...args: TArgs) => ActionContext,
  options?: ActionRunOptions
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const context = contextBuilder(...args);
    return runActionAndCheckProperties(
      () => action(...args),
      metadata,
      context,
      options
    );
  };
}
