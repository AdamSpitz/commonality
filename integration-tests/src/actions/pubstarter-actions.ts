/**
 * User actions for Pubstarter subsystem
 */

import { type Address, type Hash, parseEventLogs } from 'viem';
import { type TestClients } from './common.js';
import {
  PremintingERC1155FactoryAbi,
  MarketplaceFactoryAbi,
  AssuranceContractFactoryAbi
} from '../test-abis.js';

// ============================================================================
// Pubstarter Actions
// ============================================================================

export interface PubstarterContract {
  address: Address;
  abi: any;
}

export interface AssuranceContract {
  address: Address;
  abi: any;
}

export interface ProjectDetails {
  tokenAddress: Address;
  marketplaceAddress: Address;
  assuranceContractAddress: Address;
}

/**
 * Create a new crowdfunding project with ERC1155 tokens, marketplace, and assurance contract
 *
 * Creates a complete project setup including an ERC1155 token contract, a secondary marketplace,
 * and an assurance contract for the crowdfunding campaign.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param pubstarterContract - The Pubstarter factory contract instance
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
 * @returns Transaction hash and addresses of created contracts
 *
 * @example
 * ```typescript
 * const { projectDetails } = await createProject(clients, pubstarter, {
 *   metadataURI: 'ipfs://...',
 *   contractURI: 'ipfs://...',
 *   owner: alice.address,
 *   recipient: alice.address,
 *   threshold: parseEther('10'),
 *   deadline: BigInt(Date.now() / 1000 + 86400 * 30),
 *   projectMetadataCid: 'Qm...',
 *   tokenIds: [0n],
 *   tokenCounts: [100n],
 *   tokenPrices: [parseEther('0.1')]
 * });
 * ```
 */
export async function createProject(
  clients: TestClients,
  pubstarterContract: PubstarterContract,
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
  }
): Promise<{ hash: Hash; projectDetails: ProjectDetails }> {
  const hash = await clients.walletClient.writeContract({
    address: pubstarterContract.address,
    abi: pubstarterContract.abi,
    functionName: 'createERC1155AndMarketplaceAndAssuranceContract',
    args: [
      params.metadataURI,
      params.contractURI,
      params.owner,
      params.recipient,
      params.threshold,
      params.deadline,
      params.projectMetadataCid,
      params.tokenIds,
      params.tokenCounts,
      params.tokenPrices,
    ],
  });

  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

  // Parse the events to get the created contract addresses using viem's parseEventLogs
  const tokenEvents = parseEventLogs({
    abi: PremintingERC1155FactoryAbi,
    eventName: 'PubstarterERC1155ContractCreated',
    logs: receipt.logs,
  });

  const marketplaceEvents = parseEventLogs({
    abi: MarketplaceFactoryAbi,
    eventName: 'PubstarterERC1155SecondaryMarketCreated',
    logs: receipt.logs,
  });

  const assuranceEvents = parseEventLogs({
    abi: AssuranceContractFactoryAbi,
    eventName: 'PubstarterAssuranceContractCreated',
    logs: receipt.logs,
  });

  if (tokenEvents.length === 0 || marketplaceEvents.length === 0 || assuranceEvents.length === 0) {
    throw new Error(`Failed to extract contract addresses from transaction logs. Found: ${tokenEvents.length} token events, ${marketplaceEvents.length} marketplace events, ${assuranceEvents.length} assurance events`);
  }

  const tokenAddress = tokenEvents[0].args.erc1155;
  const marketplaceAddress = marketplaceEvents[0].args.marketplace;
  const assuranceContractAddress = assuranceEvents[0].args.assuranceContract;

  return {
    hash,
    projectDetails: {
      tokenAddress,
      marketplaceAddress,
      assuranceContractAddress,
    },
  };
}

/**
 * Buy tokens from a project's assurance contract
 *
 * Purchases tokens from a crowdfunding project's primary market. Funds are held in escrow
 * until the project reaches its threshold or the deadline passes.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param assuranceContract - The project's assurance contract instance
 * @param params - Purchase parameters
 * @param params.buyer - Address that will receive the tokens
 * @param params.tokenAddress - Address of the project's ERC1155 token contract
 * @param params.tokenIds - Token IDs to purchase
 * @param params.tokenCounts - Quantity for each token ID
 * @param params.totalCost - Total cost in wei (sent as msg.value)
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await buyProjectTokens(clients, assuranceContract, {
 *   buyer: bob.address,
 *   tokenAddress: projectDetails.tokenAddress,
 *   tokenIds: [0n],
 *   tokenCounts: [10n],
 *   totalCost: parseEther('1.0')
 * });
 * ```
 */
export async function buyProjectTokens(
  clients: TestClients,
  assuranceContract: AssuranceContract,
  params: {
    buyer: Address;
    tokenAddress: Address;
    tokenIds: bigint[];
    tokenCounts: bigint[];
    totalCost: bigint;
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'buyERC1155',
    args: [
      params.buyer,
      params.tokenAddress,
      params.tokenIds,
      params.tokenCounts,
      '0x', // data parameter
    ],
    value: params.totalCost,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Refund tokens back to the assurance contract
 */
export async function refundProjectTokens(
  clients: TestClients,
  assuranceContract: AssuranceContract,
  params: {
    holder: Address;
    tokenAddress: Address;
    tokenIds: bigint[];
    tokenCounts: bigint[];
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'refundERC1155',
    args: [
      params.holder,
      params.tokenAddress,
      params.tokenIds,
      params.tokenCounts,
      '0x', // data parameter
    ],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Withdraw funds from a successful project
 */
export async function withdrawProjectFunds(
  clients: TestClients,
  assuranceContract: AssuranceContract
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'withdraw',
    args: [],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ============================================================================
// Secondary Marketplace Actions
// ============================================================================

export interface SecondaryMarketContract {
  address: Address;
  abi: any;
}

/**
 * Create a sale listing for ERC1155 tokens on the secondary market
 */
export async function createSaleListing(
  clients: TestClients,
  marketplaceContract: SecondaryMarketContract,
  params: {
    tokenId: bigint;
    count: bigint;
    pricePerToken: bigint;
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: marketplaceContract.address,
    abi: marketplaceContract.abi,
    functionName: 'createSaleListing',
    args: [params.tokenId, params.count, params.pricePerToken],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Fulfill a sale listing by purchasing tokens
 */
export async function fulfillSaleListing(
  clients: TestClients,
  marketplaceContract: SecondaryMarketContract,
  params: {
    saleListingId: bigint;
    count: bigint;
    totalCost: bigint;
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: marketplaceContract.address,
    abi: marketplaceContract.abi,
    functionName: 'fulfillSaleListing',
    args: [params.saleListingId, params.count],
    value: params.totalCost,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Cancel a sale listing
 */
export async function cancelSaleListing(
  clients: TestClients,
  marketplaceContract: SecondaryMarketContract,
  params: {
    saleListingId: bigint;
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: marketplaceContract.address,
    abi: marketplaceContract.abi,
    functionName: 'cancelSaleListing',
    args: [params.saleListingId],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Create a buy order for ERC1155 tokens on the secondary market
 */
export async function createBuyOrder(
  clients: TestClients,
  marketplaceContract: SecondaryMarketContract,
  params: {
    tokenId: bigint;
    count: bigint;
    pricePerToken: bigint;
  }
): Promise<Hash> {
  const totalCost = params.count * params.pricePerToken;

  const hash = await clients.walletClient.writeContract({
    address: marketplaceContract.address,
    abi: marketplaceContract.abi,
    functionName: 'createBuyOrder',
    args: [params.tokenId, params.count, params.pricePerToken],
    value: totalCost,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Fulfill a buy order by selling tokens
 */
export async function fulfillBuyOrder(
  clients: TestClients,
  marketplaceContract: SecondaryMarketContract,
  params: {
    buyOrderId: bigint;
    count: bigint;
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: marketplaceContract.address,
    abi: marketplaceContract.abi,
    functionName: 'fulfillBuyOrder',
    args: [params.buyOrderId, params.count],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Cancel a buy order
 */
export async function cancelBuyOrder(
  clients: TestClients,
  marketplaceContract: SecondaryMarketContract,
  params: {
    buyOrderId: bigint;
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: marketplaceContract.address,
    abi: marketplaceContract.abi,
    functionName: 'cancelBuyOrder',
    args: [params.buyOrderId],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Approve ERC1155 tokens for the marketplace to transfer
 */
export async function approveERC1155ForMarketplace(
  clients: TestClients,
  tokenAddress: Address,
  marketplaceAddress: Address
): Promise<Hash> {
  const erc1155Abi = [
    {
      inputs: [
        { name: 'operator', type: 'address' },
        { name: 'approved', type: 'bool' },
      ],
      name: 'setApprovalForAll',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ] as const;

  const hash = await clients.walletClient.writeContract({
    address: tokenAddress,
    abi: erc1155Abi,
    functionName: 'setApprovalForAll',
    args: [marketplaceAddress, true],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
