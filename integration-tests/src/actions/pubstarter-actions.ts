/**
 * User actions for Pubstarter subsystem
 */

import { type Address, type Hash } from 'viem';
import { type TestClients } from './common.js';

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

  // Parse the events to get the created contract addresses using the correct event signatures
  // Event signatures (keccak256 of event signature string):
  const TOKEN_EVENT_SIG = '0xb19b1e716b2442a282f6c0a8070d29d679fafef0ffe820b8d57e8cffb23baf74'; // PubstarterERC1155ContractCreated(address)
  const MARKETPLACE_EVENT_SIG = '0xffbbed5570d9ef9bfcd7f36845d1c453eb9b6a1866a22f3124e606c19bc62259'; // PubstarterERC1155SecondaryMarketCreated(address)
  const ASSURANCE_EVENT_SIG = '0xce37cb32adaee3ca1e28b96585d947e318568558ee75f07562f230ffb35bd645'; // PubstarterAssuranceContractCreated(address)

  let tokenAddress: Address | undefined;
  let marketplaceAddress: Address | undefined;
  let assuranceContractAddress: Address | undefined;

  // Find each event by its signature
  for (const log of receipt.logs) {
    if (log.topics[0] === TOKEN_EVENT_SIG && log.topics[1]) {
      tokenAddress = `0x${log.topics[1].slice(26)}` as Address;
    } else if (log.topics[0] === MARKETPLACE_EVENT_SIG && log.topics[1]) {
      marketplaceAddress = `0x${log.topics[1].slice(26)}` as Address;
    } else if (log.topics[0] === ASSURANCE_EVENT_SIG && log.topics[1]) {
      assuranceContractAddress = `0x${log.topics[1].slice(26)}` as Address;
    }
  }

  if (!tokenAddress || !marketplaceAddress || !assuranceContractAddress) {
    throw new Error(`Failed to extract contract addresses from transaction logs. Found: token=${tokenAddress}, marketplace=${marketplaceAddress}, assurance=${assuranceContractAddress}`);
  }

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
