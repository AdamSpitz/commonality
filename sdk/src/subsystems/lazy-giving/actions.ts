/**
 * User actions for LazyGiving subsystem
 */

import { type Address, type Hash, type Abi, parseEventLogs } from 'viem';
import { type WriteClients } from '../../utils/ethereum.js';
import {
  PremintingERC1155FactoryAbi,
  AssuranceContractFactoryAbi
} from '../../abis.js';
import { IpfsCidV1 } from '../../utils/cid-types.js';

// ============================================================================
// LazyGiving Actions
// ============================================================================

export interface ProjectFactoryContract {
  address: Address;
  abi: Abi;
}

export interface AssuranceContract {
  address: Address;
  abi: Abi;
}

export interface ProjectDetails {
  tokenAddress: Address;
  marketplaceAddress: Address | null;
  assuranceContractAddress: Address;
}

const erc20ApproveAbi = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const paymentTokenGetterAbi = [
  {
    inputs: [],
    name: 'paymentToken',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

async function approveERC20Spend(
  clients: WriteClients,
  token: Address,
  spender: Address,
  amount: bigint,
): Promise<void> {
  // Only send an approval when the existing allowance is insufficient. This
  // avoids a redundant approve transaction on every purchase — which matters
  // especially on the sponsored-gas / embedded-wallet path, where each extra
  // UserOp is a cost and an extra confirmation the contributor must sit through.
  // @ts-expect-error - viem type inference issue with readContract
  const currentAllowance = await clients.publicClient.readContract({
    address: token,
    abi: erc20ApproveAbi,
    functionName: 'allowance',
    args: [clients.account, spender],
  }) as bigint;
  if (currentAllowance >= amount) {
    return;
  }

  const approvalHash = await clients.walletClient.writeContract({
    address: token,
    abi: erc20ApproveAbi,
    functionName: 'approve',
    args: [spender, amount],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash: approvalHash });
}

/**
 * Create a new crowdfunding project with ERC1155 receipt tokens and an assurance contract.
 *
 * Securities-redesign projects no longer deploy a per-project secondary marketplace; receipts are
 * non-transferable and later donations use the reimbursement flow instead of resale.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param projectFactoryContract - The ProjectFactory contract instance
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
 * const { projectDetails } = await createProject(clients, projectFactory, {
 *   metadataURI: 'ipfs://...',
 *   contractURI: 'ipfs://...',
 *   owner: alice.address,
 *   recipient: alice.address,
 *   threshold: parseEther('10'),
 *   deadline: BigInt(Date.now() / 1000 + 86400 * 30),
 *   projectMetadataCid: 'bafy...',
 *   tokenIds: [0n],
 *   tokenCounts: [100n],
 *   tokenPrices: [parseEther('0.1')]
 * });
 * ```
 */
export async function createProject(
  clients: WriteClients,
  projectFactoryContract: ProjectFactoryContract,
  params: {
    metadataURI: string;
    contractURI: string;
    owner: Address;
    recipient: Address;
    paymentToken?: Address;
    threshold: bigint;
    deadline: bigint;
    projectMetadataCid: IpfsCidV1;
    tokenIds: bigint[];
    tokenCounts: bigint[];
    tokenPrices: bigint[];
  }
): Promise<{ hash: Hash; projectDetails: ProjectDetails }> {
  if (!params.paymentToken) {
    throw new Error('createProject requires a paymentToken address');
  }

  const hash = await clients.walletClient.writeContract({
    address: projectFactoryContract.address,
    abi: projectFactoryContract.abi,
    functionName: 'createERC1155AndMarketplaceAndAssuranceContract',
    args: [
      params.metadataURI,
      params.contractURI,
      params.owner,
      params.recipient,
      params.paymentToken,
      params.threshold,
      params.deadline,
      params.projectMetadataCid,
      params.tokenIds,
      params.tokenCounts,
      params.tokenPrices,
    ],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

  // Parse the events to get the created contract addresses using viem's parseEventLogs
  const tokenEvents = parseEventLogs({
    abi: PremintingERC1155FactoryAbi,
    eventName: 'LazyGivingERC1155ContractCreated',
    logs: receipt.logs,
  });

  const assuranceEvents = parseEventLogs({
    abi: AssuranceContractFactoryAbi,
    eventName: 'LazyGivingAssuranceContractCreated',
    logs: receipt.logs,
  });

  if (tokenEvents.length === 0 || assuranceEvents.length === 0) {
    throw new Error(`Failed to extract contract addresses from transaction logs. Found: ${tokenEvents.length} token events, ${assuranceEvents.length} assurance events`);
  }

  const tokenAddress = tokenEvents[0].args.erc1155;
  const marketplaceAddress = null;
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
 * @param params.totalCost - Total cost in payment-token units
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
  clients: WriteClients,
  assuranceContract: AssuranceContract,
  params: {
    buyer: Address;
    tokenAddress: Address;
    tokenIds: bigint[];
    tokenCounts: bigint[];
    totalCost: bigint;
  }
): Promise<Hash> {
  // @ts-expect-error - viem type inference issue with readContract
  const paymentToken = await clients.publicClient.readContract({
    address: assuranceContract.address,
    abi: paymentTokenGetterAbi,
    functionName: 'paymentToken',
  }) as Address;

  await approveERC20Spend(clients, paymentToken, assuranceContract.address, params.totalCost);

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
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Refund tokens back to the assurance contract
 */
export async function refundProjectTokens(
  clients: WriteClients,
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
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Withdraw funds from a successful project
 */
export async function withdrawProjectFunds(
  clients: WriteClients,
  assuranceContract: AssuranceContract
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'withdraw',
    args: [],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ============================================================================
// Secondary Marketplace Actions
// ============================================================================

export interface SecondaryMarketContract {
  address: Address;
  abi: Abi;
}

/**
 * Create a sale listing for ERC1155 tokens on the secondary market
 */
export async function createSaleListing(
  clients: WriteClients,
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
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Fulfill a sale listing by purchasing tokens
 */
export async function fulfillSaleListing(
  clients: WriteClients,
  marketplaceContract: SecondaryMarketContract,
  params: {
    saleListingId: bigint;
    count: bigint;
    totalCost: bigint;
    expectedPricePerToken: bigint;
  }
): Promise<Hash> {
  // @ts-expect-error - viem type inference issue with readContract
  const paymentToken = await clients.publicClient.readContract({
    address: marketplaceContract.address,
    abi: paymentTokenGetterAbi,
    functionName: 'paymentToken',
  }) as Address;

  await approveERC20Spend(clients, paymentToken, marketplaceContract.address, params.totalCost);

  const hash = await clients.walletClient.writeContract({
    address: marketplaceContract.address,
    abi: marketplaceContract.abi,
    functionName: 'fulfillSaleListing',
    args: [params.saleListingId, params.count, params.expectedPricePerToken],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Cancel a sale listing
 */
export async function cancelSaleListing(
  clients: WriteClients,
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
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Create a buy order for ERC1155 tokens on the secondary market
 */
export async function createBuyOrder(
  clients: WriteClients,
  marketplaceContract: SecondaryMarketContract,
  params: {
    tokenId: bigint;
    count: bigint;
    pricePerToken: bigint;
  }
): Promise<Hash> {
  const totalCost = params.count * params.pricePerToken;
  // @ts-expect-error - viem type inference issue with readContract
  const paymentToken = await clients.publicClient.readContract({
    address: marketplaceContract.address,
    abi: paymentTokenGetterAbi,
    functionName: 'paymentToken',
  }) as Address;

  await approveERC20Spend(clients, paymentToken, marketplaceContract.address, totalCost);

  const hash = await clients.walletClient.writeContract({
    address: marketplaceContract.address,
    abi: marketplaceContract.abi,
    functionName: 'createBuyOrder',
    args: [params.tokenId, params.count, params.pricePerToken],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Fulfill a buy order by selling tokens
 */
export async function fulfillBuyOrder(
  clients: WriteClients,
  marketplaceContract: SecondaryMarketContract,
  params: {
    buyOrderId: bigint;
    count: bigint;
    expectedPricePerToken: bigint;
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: marketplaceContract.address,
    abi: marketplaceContract.abi,
    functionName: 'fulfillBuyOrder',
    args: [params.buyOrderId, params.count, params.expectedPricePerToken],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Cancel a buy order
 */
export async function cancelBuyOrder(
  clients: WriteClients,
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
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Approve an operator to transfer the caller's ERC1155 tokens.
 */
export async function approveERC1155ForOperator(
  clients: WriteClients,
  tokenAddress: Address,
  operatorAddress: Address
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
    args: [operatorAddress, true],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Approve ERC1155 tokens for the marketplace to transfer.
 */
export async function approveERC1155ForMarketplace(
  clients: WriteClients,
  tokenAddress: Address,
  marketplaceAddress: Address
): Promise<Hash> {
  return approveERC1155ForOperator(clients, tokenAddress, marketplaceAddress);
}

/**
 * Burn ERC1155 tokens (converting from investor to donor)
 *
 * Burns tokens by sending them to the zero address. This is part of the retroactive
 * funding model where token holders can burn their tokens to demonstrate pure support
 * (donors) rather than investment intent (investors).
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param tokenAddress - Address of the ERC1155 token contract
 * @param params - Burn parameters
 * @param params.tokenIds - Token IDs to burn
 * @param params.tokenCounts - Quantity to burn for each token ID
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await burnTokens(clients, tokenAddress, {
 *   tokenIds: [0n, 1n],
 *   tokenCounts: [5n, 3n]
 * });
 * ```
 */
export async function burnTokens(
  clients: WriteClients,
  tokenAddress: Address,
  params: {
    tokenIds: bigint[];
    tokenCounts: bigint[];
  }
): Promise<Hash> {
  const erc1155BurnableAbi = [
    {
      inputs: [
        { name: 'account', type: 'address' },
        { name: 'ids', type: 'uint256[]' },
        { name: 'values', type: 'uint256[]' },
      ],
      name: 'burnBatch',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ] as const;

  const hash = await clients.walletClient.writeContract({
    address: tokenAddress,
    abi: erc1155BurnableAbi,
    functionName: 'burnBatch',
    args: [clients.account, params.tokenIds, params.tokenCounts],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
