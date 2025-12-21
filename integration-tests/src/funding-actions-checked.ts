/**
 * Checked versions of funding actions
 *
 * These wrapper functions execute funding actions and automatically verify
 * state transition properties and invariants.
 *
 * Usage:
 *   // Instead of:
 *   await buyProjectTokens(clients, assuranceContract, params);
 *   await assertMoneyConservation(graphqlClient, projectAddress);
 *
 *   // Write:
 *   await buyProjectTokensChecked(clients, assuranceContract, graphqlClient, params);
 */

import type { Hash, Address } from 'viem';
import {
  buyProjectTokens,
  waitForSync,
  type TestClients,
  type AssuranceContract,
} from '@commonality/sdk';
import type { GraphQLClient, GraphQLExecutor } from './invariants.js';
import {
  runActionAndCheckProperties,
  type ActionContext,
  type ActionRunOptions,
} from './action-framework.js';
import { buyProjectTokensMetadata } from './funding-action-properties.js';

/**
 * Buy tokens from a project (with property checking)
 *
 * This wrapper runs the buyProjectTokens action and automatically:
 * 1. Checks that totalReceived increases by the exact contribution amount
 * 2. Verifies that contribution count increases by 1
 * 3. Verifies that cached totalReceived matches sum of individual contributions
 *
 * @param clients - Test wallet and public clients
 * @param assuranceContract - The project's assurance contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param params - Purchase parameters
 * @param params.buyer - Address that will receive the tokens
 * @param params.tokenAddress - Address of the project's ERC1155 token contract
 * @param params.tokenIds - Token IDs to purchase
 * @param params.tokenCounts - Quantity for each token ID
 * @param params.totalCost - Total cost in wei (sent as msg.value)
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await buyProjectTokensChecked(
 *   clients,
 *   assuranceContract,
 *   graphqlClient,
 *   {
 *     buyer: bob.address,
 *     tokenAddress: projectDetails.tokenAddress,
 *     tokenIds: [0n],
 *     tokenCounts: [10n],
 *     totalCost: parseEther('1.0')
 *   }
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function buyProjectTokensChecked(
  clients: TestClients,
  assuranceContract: AssuranceContract,
  graphqlClient: GraphQLClient | GraphQLExecutor,
  params: {
    buyer: Address;
    tokenAddress: Address;
    tokenIds: bigint[];
    tokenCounts: bigint[];
    totalCost: bigint;
  },
  options?: ActionRunOptions
): Promise<Hash> {
  const projectAddress = assuranceContract.address;

  const context: ActionContext = {
    graphqlClient,
    contracts: { pubstarter: assuranceContract },
    entities: {
      projectAddress,
      userAddress: clients.account,
    },
    extra: {
      contributionAmount: params.totalCost,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await buyProjectTokens(clients, assuranceContract, params);
      const receipt = await clients.publicClient.getTransactionReceipt({ hash });
      await waitForSync(graphqlClient, receipt.blockNumber);
      return hash;
    },
    buyProjectTokensMetadata,
    context,
    options
  );
}
