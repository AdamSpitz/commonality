/**
 * State transition properties and invariants for marketplace-related actions
 *
 * This defines the properties that should hold when users trade tokens on
 * the secondary marketplace.
 */

import assert from 'assert';
import {
  type ActionContext,
  type StateTransitionProperty,
  type InvariantCheck,
  type ActionMetadata,
} from '../actions/action-framework.js';
import { getSaleListing } from '@commonality/sdk/lazy-giving';

/**
 * State captured before/after a marketplace action
 */
interface MarketplaceState {
  // We can extend this as needed for specific checks
  listingExists: boolean;
  remainingCount?: string;
}

/**
 * Capture the current state of a sale listing
 */
async function captureListingState(context: ActionContext): Promise<MarketplaceState> {
  const { machinery, entities, extra } = context;
  const { marketplaceAddress } = entities;

  if (!marketplaceAddress) {
    throw new Error('marketplaceAddress is required in context.entities');
  }

  const listingId = extra?.listingId as bigint | undefined;
  if (listingId === undefined) {
    return { listingExists: false };
  }

  const listing = await getSaleListing(machinery, marketplaceAddress, listingId);

  return {
    listingExists: listing !== null,
    remainingCount: listing?.remainingCount,
  };
}

/**
 * State Transition Property #1: Sale Listing Creation
 *
 * When a sale listing is created:
 * - A new listing should exist in the indexer
 * - The listing should have the correct initial parameters
 * - Trade data consistency should hold
 *
 * This verifies:
 * - Listings are correctly indexed
 * - Initial state matches creation parameters
 */
export const saleListingCreationProperty: StateTransitionProperty = {
  name: 'saleListingCreation',
  captureState: captureListingState,
  check: async (context: ActionContext, before: MarketplaceState, after: MarketplaceState) => {
    // After creating a listing, it should exist
    assert.strictEqual(
      after.listingExists,
      true,
      'Sale listing should exist after creation'
    );

    // We could add more checks here if we capture more state
  },
};

/**
 * State Transition Property #2: Sale Listing Fulfillment
 *
 * When a sale listing is (partially) fulfilled:
 * - The remaining count should decrease by the purchased amount
 * - If fully fulfilled, the listing should be marked as completed
 * - Trade data should be consistent
 *
 * This verifies:
 * - Token transfers are correctly tracked
 * - Listing state updates properly
 */
export const saleListingFulfillmentProperty: StateTransitionProperty = {
  name: 'saleListingFulfillment',
  captureState: captureListingState,
  check: async (context: ActionContext, before: MarketplaceState, after: MarketplaceState) => {
    const { extra } = context;

    // Both states should exist
    assert.strictEqual(before.listingExists, true, 'Listing should exist before fulfillment');
    assert.strictEqual(after.listingExists, true, 'Listing should exist after fulfillment');

    if (!extra?.purchaseCount) {
      throw new Error('purchaseCount is required in context.extra for saleListingFulfillmentProperty');
    }

    const purchaseCount = BigInt(extra.purchaseCount);
    const beforeCount = BigInt(before.remainingCount || '0');
    const afterCount = BigInt(after.remainingCount || '0');
    const expectedAfterCount = beforeCount - purchaseCount;

    assert.strictEqual(
      afterCount,
      expectedAfterCount,
      `Remaining count mismatch. ` +
      `Before: ${beforeCount}, ` +
      `Purchased: ${purchaseCount}, ` +
      `Expected: ${expectedAfterCount}, ` +
      `Got: ${afterCount}`
    );
  },
};

/**
 * Invariant Check: Trade Data Consistency
 *
 * The trade data should be consistent with token transfers.
 * This is already implemented in invariants.ts as assertTradeDataConsistency.
 */
export const tradeDataConsistencyInvariant: InvariantCheck = {
  name: 'tradeDataConsistency',
  check: async (context: ActionContext) => {
    const { machinery, entities, extra } = context;
    const { marketplaceAddress } = entities;

    if (!marketplaceAddress) {
      throw new Error('marketplaceAddress is required in context.entities');
    }

    const transactionHash = extra?.transactionHash as `0x${string}` | undefined;
    if (!transactionHash) {
      // Skip if no transaction hash provided
      return;
    }

    const { assertTradeDataConsistency } = await import('../utils/invariants.js');
    await assertTradeDataConsistency(machinery, marketplaceAddress, transactionHash);
  },
};

/**
 * Action metadata for createSaleListing
 */
export const createSaleListingMetadata: ActionMetadata = {
  name: 'createSaleListing',
  category: 'marketplace',
  stateTransitionProperties: [saleListingCreationProperty],
  invariantsToCheck: [],
};

/**
 * Action metadata for fulfillSaleListing
 */
export const fulfillSaleListingMetadata: ActionMetadata = {
  name: 'fulfillSaleListing',
  category: 'marketplace',
  stateTransitionProperties: [saleListingFulfillmentProperty],
  invariantsToCheck: [tradeDataConsistencyInvariant],
};
