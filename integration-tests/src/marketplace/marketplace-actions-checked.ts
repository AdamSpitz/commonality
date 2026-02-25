/**
 * Checked versions of marketplace actions
 *
 * These wrapper functions execute secondary marketplace actions and automatically
 * verify state transition properties and invariants.
 *
 * Usage:
 *   // Instead of:
 *   await createSaleListing(clients, marketplaceContract, params);
 *   await assertTradeDataConsistency(graphqlClient, marketplaceAddress, hash);
 *
 *   // Write:
 *   await createSaleListingChecked(clients, marketplaceContract, graphqlClient, marketplaceAddress, params);
 */

import type { Hash, Address } from 'viem';
import {
  createSaleListing,
  fulfillSaleListing,
  waitForIndexerToSyncToTxHash,
  type TestClients,
  type SecondaryMarketContract,
} from '@commonality/sdk';
import {
  ActionTestingMachinery,
  runActionAndCheckProperties,
  type ActionContext,
  type ActionRunOptions,
} from '../actions/action-framework.js';
import {
  createSaleListingMetadata,
  fulfillSaleListingMetadata,
} from './marketplace-action-properties.js';

/**
 * Create a sale listing on the secondary marketplace (with property checking)
 *
 * This wrapper runs the createSaleListing action and automatically:
 * 1. Checks that the listing exists after creation
 * 2. Verifies initial listing state
 *
 * @param clients - Test wallet and public clients
 * @param marketplaceContract - The marketplace contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param marketplaceAddress - Address of the marketplace (for invariant checks)
 * @param params - Listing parameters
 * @param params.tokenId - Token ID to list for sale
 * @param params.count - Number of tokens to list
 * @param params.pricePerToken - Price per token in wei
 * @param listingId - Expected listing ID (defaults to 0n for first listing)
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await createSaleListingChecked(
 *   clients,
 *   marketplaceContract,
 *   graphqlClient,
 *   marketplaceAddress,
 *   {
 *     tokenId: 1n,
 *     count: 5n,
 *     pricePerToken: parseEther('0.015')
 *   },
 *   0n
 * );
 * // State transition properties are automatically verified
 * ```
 */
export async function createSaleListingChecked(
  clients: TestClients,
  marketplaceContract: SecondaryMarketContract,
  machinery: ActionTestingMachinery,
  marketplaceAddress: Address,
  params: {
    tokenId: bigint;
    count: bigint;
    pricePerToken: bigint;
  },
  listingId: bigint = 0n,
  options?: ActionRunOptions
): Promise<Hash> {
  const context: ActionContext = {
    machinery,
    entities: {
      marketplaceAddress,
      userAddress: clients.account,
    },
    extra: {
      listingId,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await createSaleListing(clients, marketplaceContract, params);
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, hash);
      return hash;
    },
    createSaleListingMetadata,
    context,
    options
  );
}

/**
 * Fulfill a sale listing by purchasing tokens (with property checking)
 *
 * This wrapper runs the fulfillSaleListing action and automatically:
 * 1. Checks that remaining count decreases correctly
 * 2. Verifies trade data consistency
 *
 * @param clients - Test wallet and public clients
 * @param marketplaceContract - The marketplace contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param marketplaceAddress - Address of the marketplace (for invariant checks)
 * @param params - Purchase parameters
 * @param params.saleListingId - ID of the listing to purchase from
 * @param params.count - Number of tokens to purchase
 * @param params.totalCost - Total cost in wei (sent as msg.value)
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await fulfillSaleListingChecked(
 *   clients,
 *   marketplaceContract,
 *   graphqlClient,
 *   marketplaceAddress,
 *   {
 *     saleListingId: 0n,
 *     count: 3n,
 *     totalCost: parseEther('0.045')
 *   }
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function fulfillSaleListingChecked(
  clients: TestClients,
  marketplaceContract: SecondaryMarketContract,
  machinery: ActionTestingMachinery,
  marketplaceAddress: Address,
  params: {
    saleListingId: bigint;
    count: bigint;
    totalCost: bigint;
  },
  options?: ActionRunOptions
): Promise<Hash> {
  const context: ActionContext = {
    machinery,
    entities: {
      marketplaceAddress,
      userAddress: clients.account,
    },
    extra: {
      listingId: params.saleListingId,
      purchaseCount: params.count,
      // transactionHash will be set after the action runs
    },
  };

  const hash = await runActionAndCheckProperties(
    async () => {
      const h = await fulfillSaleListing(clients, marketplaceContract, params);
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, h);

      // Store hash in context for invariant checking
      context.extra!.transactionHash = h;

      return h;
    },
    fulfillSaleListingMetadata,
    context,
    options
  );

  return hash;
}
