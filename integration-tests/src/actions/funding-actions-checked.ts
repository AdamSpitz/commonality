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
  createProject,
  buyProjectTokens,
  refundProjectTokens,
  withdrawProjectFunds,
  burnTokens,
  waitForIndexerToSyncToTxHash,
  type TestClients,
  type AssuranceContract,
  type PubstarterContract,
  type ProjectDetails,
} from '@commonality/sdk';
import type { GraphQLClient, GraphQLExecutor } from '../utils/invariants.js';
import {
  runActionAndCheckProperties,
  type ActionContext,
  type ActionRunOptions,
} from './action-framework.js';
import {
  createProjectMetadata,
  buyProjectTokensMetadata,
  refundProjectTokensMetadata,
  withdrawProjectFundsMetadata,
  burnTokensMetadata,
} from './funding-action-properties.js';

/**
 * Create a new crowdfunding project (with property checking)
 *
 * This wrapper runs the createProject action and automatically:
 * 1. Verifies the project exists in the indexer after creation
 * 2. Checks that initial totalReceived is 0
 * 3. Verifies initial contribution count is 0
 *
 * @param clients - Test wallet and public clients
 * @param pubstarterContract - The Pubstarter factory contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param params - Project creation parameters
 * @param params.metadataURI - Base URI for token metadata
 * @param params.contractURI - Contract-level metadata URI
 * @param params.owner - Owner of the token contract
 * @param params.recipient - Address that will receive funds if project succeeds
 * @param params.threshold - Minimum funding amount required for project success
 * @param params.deadline - Unix timestamp deadline for the funding campaign
 * @param params.projectMetadataCid - IPFS CID for project metadata
 * @param params.tokenIds - Token IDs to create
 * @param params.tokenCounts - Supply for each token ID
 * @param params.tokenPrices - Price for each token ID (in wei)
 * @param options - Optional: control which checks run
 * @returns Object containing transaction hash and project details
 *
 * @example
 * ```typescript
 * const { hash, projectDetails } = await createProjectChecked(
 *   clients,
 *   pubstarterContract,
 *   graphqlClient,
 *   {
 *     metadataURI: 'https://example.com/metadata/',
 *     contractURI: 'https://example.com/contract',
 *     owner: alice.address,
 *     recipient: alice.address,
 *     threshold: parseEther('10'),
 *     deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
 *     projectMetadataCid: 'Qm...',
 *     tokenIds: [0n],
 *     tokenCounts: [100n],
 *     tokenPrices: [parseEther('0.1')]
 *   }
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function createProjectChecked(
  clients: TestClients,
  pubstarterContract: PubstarterContract,
  graphqlClient: GraphQLClient | GraphQLExecutor,
  params: {
    metadataURI: string;
    contractURI: string;
    owner: Address;
    recipient: Address;
    threshold: bigint;
    deadline: bigint;
    projectMetadataCid: string;
    tokenIds: bigint[];
    tokenCounts: bigint[];
    tokenPrices: bigint[];
  },
  options?: ActionRunOptions
): Promise<{ hash: Hash; projectDetails: ProjectDetails }> {
  // We don't know the project address yet, so we'll capture it after creation
  let projectDetails: ProjectDetails | null = null;

  const result = await runActionAndCheckProperties(
    async () => {
      const result = await createProject(clients, pubstarterContract, params);
      projectDetails = result.projectDetails;
      await waitForIndexerToSyncToTxHash(graphqlClient, clients.publicClient, result.hash);
      return result;
    },
    createProjectMetadata,
    {
      graphqlClient,
      contracts: { pubstarter: pubstarterContract },
      entities: {
        // We'll update this after the action completes
        get projectAddress() {
          if (!projectDetails) {
            throw new Error('Project details not yet available');
          }
          return projectDetails.assuranceContractAddress;
        },
        userAddress: clients.account,
      },
    },
    options
  );

  return result;
}

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
      await waitForIndexerToSyncToTxHash(graphqlClient, clients.publicClient, hash);
      return hash;
    },
    buyProjectTokensMetadata,
    context,
    options
  );
}

/**
 * Refund tokens back to the assurance contract (with property checking)
 *
 * This wrapper runs the refundProjectTokens action and automatically:
 * 1. Checks that totalReceived decreases by the exact refund amount
 * 2. Verifies money conservation (totalReceived matches sum of contributions minus refunds)
 * 3. Verifies token conservation (sold = held + burned)
 *
 * @param clients - Test wallet and public clients
 * @param assuranceContract - The project's assurance contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param params - Refund parameters
 * @param params.holder - Address that owns the tokens being refunded
 * @param params.tokenAddress - Address of the project's ERC1155 token contract
 * @param params.tokenIds - Token IDs to refund
 * @param params.tokenCounts - Quantity for each token ID
 * @param params.refundAmount - Total refund amount in wei (for property checking)
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await refundProjectTokensChecked(
 *   clients,
 *   assuranceContract,
 *   graphqlClient,
 *   {
 *     holder: bob.address,
 *     tokenAddress: projectDetails.tokenAddress,
 *     tokenIds: [0n],
 *     tokenCounts: [10n],
 *     refundAmount: parseEther('1.0')
 *   }
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function refundProjectTokensChecked(
  clients: TestClients,
  assuranceContract: AssuranceContract,
  graphqlClient: GraphQLClient | GraphQLExecutor,
  params: {
    holder: Address;
    tokenAddress: Address;
    tokenIds: bigint[];
    tokenCounts: bigint[];
    refundAmount: bigint;
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
      refundAmount: params.refundAmount,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await refundProjectTokens(clients, assuranceContract, {
        holder: params.holder,
        tokenAddress: params.tokenAddress,
        tokenIds: params.tokenIds,
        tokenCounts: params.tokenCounts,
      });
      await waitForIndexerToSyncToTxHash(graphqlClient, clients.publicClient, hash);
      return hash;
    },
    refundProjectTokensMetadata,
    context,
    options
  );
}

/**
 * Withdraw funds from a successful project (with property checking)
 *
 * This wrapper runs the withdrawProjectFunds action and automatically:
 * 1. Checks that totalReceived remains unchanged (withdrawal doesn't alter history)
 * 2. Verifies contribution count remains the same
 * 3. Verifies money conservation still holds
 *
 * @param clients - Test wallet and public clients
 * @param assuranceContract - The project's assurance contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await withdrawProjectFundsChecked(
 *   clients,
 *   assuranceContract,
 *   graphqlClient
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function withdrawProjectFundsChecked(
  clients: TestClients,
  assuranceContract: AssuranceContract,
  graphqlClient: GraphQLClient | GraphQLExecutor,
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
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await withdrawProjectFunds(clients, assuranceContract);
      await waitForIndexerToSyncToTxHash(graphqlClient, clients.publicClient, hash);
      return hash;
    },
    withdrawProjectFundsMetadata,
    context,
    options
  );
}

/**
 * Burn ERC1155 tokens (with property checking)
 *
 * This wrapper runs the burnTokens action and automatically:
 * 1. Checks that totalReceived remains unchanged (burning doesn't affect funding)
 * 2. Verifies contribution count remains the same
 * 3. Verifies token conservation (sold = held + burned)
 *
 * Burning tokens converts holders from "investors" to "donors" by permanently
 * destroying their tokens, demonstrating pure support rather than investment intent.
 *
 * @param clients - Test wallet and public clients
 * @param tokenAddress - Address of the ERC1155 token contract
 * @param graphqlClient - GraphQL client for the indexer
 * @param projectAddress - The project's assurance contract address (for invariant checks)
 * @param params - Burn parameters
 * @param params.tokenIds - Token IDs to burn
 * @param params.tokenCounts - Quantity to burn for each token ID
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await burnTokensChecked(
 *   clients,
 *   tokenAddress,
 *   graphqlClient,
 *   projectAddress,
 *   {
 *     tokenIds: [0n, 1n],
 *     tokenCounts: [5n, 3n]
 *   }
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function burnTokensChecked(
  clients: TestClients,
  tokenAddress: Address,
  graphqlClient: GraphQLClient | GraphQLExecutor,
  projectAddress: Address,
  params: {
    tokenIds: bigint[];
    tokenCounts: bigint[];
  },
  options?: ActionRunOptions
): Promise<Hash> {
  const context: ActionContext = {
    graphqlClient,
    entities: {
      projectAddress,
      userAddress: clients.account,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await burnTokens(clients, tokenAddress, params);
      await waitForIndexerToSyncToTxHash(graphqlClient, clients.publicClient, hash);
      return hash;
    },
    burnTokensMetadata,
    context,
    options
  );
}
