/**
 * User actions for content-funding subsystem
 */

import { type Address, type Hash, type Abi, parseEventLogs } from 'viem';
import { type TestClients } from '../../utils/ethereum.js';
import { hashCanonicalId, parseContentFundingUrl } from './canonicalization.js';

/** Contract instance for the CreatorAssuranceContractFactory. */
export interface ContentFundingContract {
  address: Address;
  abi: Abi;
}

/** Addresses and metadata returned after creating a content-funding contract. */
export interface ContentFundingContractDetails {
  /** Address of the newly deployed assurance contract. */
  contractAddress: Address;
  /** Address of the associated ERC-1155 token contract. */
  erc1155Address: Address;
  /** Bytes32 keccak256 hash of the channel's canonical ID. */
  channelId: string;
  /** Whether this contract was created by a third party (not the channel owner). */
  isThirdParty: boolean;
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
] as const;

const creatorAssuranceFactoryActionAbi = [
  {
    type: 'function',
    name: 'paymentToken',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'createContract',
    inputs: [
      { name: 'channelId', type: 'bytes32' },
      { name: 'channelCanonicalId', type: 'string' },
      { name: 'contentSuffixes', type: 'string[]' },
      { name: 'supplies', type: 'uint256[]' },
      { name: 'prices', type: 'uint256[]' },
      { name: 'threshold', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'metadataCid', type: 'string' },
      { name: 'erc1155MetadataUri', type: 'string' },
      { name: 'erc1155ContractUri', type: 'string' },
      { name: 'isThirdParty', type: 'bool' },
      { name: 'initialPurchaseIds', type: 'uint256[]' },
      { name: 'initialPurchaseCounts', type: 'uint256[]' },
    ],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'contractERC1155',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'thirdPartyMinPurchase',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'CreatorContractCreated',
    inputs: [
      { name: 'contractAddress', type: 'address', indexed: true },
      { name: 'channelId', type: 'bytes32', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'isThirdParty', type: 'bool', indexed: false },
    ],
  },
] as const;

async function approveERC20Spend(
  clients: TestClients,
  token: Address,
  spender: Address,
  amount: bigint,
): Promise<void> {
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

/** Parameters for creating a new content-funding contract. */
export interface CreateContentFundingContractParams {
  channelCanonicalId: string;
  contentUrls: string[];
  contentSupplies: bigint[];
  contentPrices: bigint[];
  threshold: bigint;
  deadline: bigint;
  metadataCid: string;
  erc1155MetadataUri: string;
  erc1155ContractUri: string;
  isThirdParty: boolean;
  initialPurchaseTokenIds: bigint[];
  initialPurchaseCounts: bigint[];
}

function parseContentUrl(url: string): { contentSuffix: string; platform: string } {
  const parsed = parseContentFundingUrl(url);
  switch (parsed.platform) {
    case 'twitter':
      return { contentSuffix: parsed.tweetId, platform: 'twitter' };
    case 'youtube':
      return { contentSuffix: parsed.videoId, platform: 'youtube' };
    case 'substack':
      return { contentSuffix: parsed.slug, platform: 'substack' };
  }
}

/**
 * Deploy a new content-funding contract via the factory.
 *
 * Creates an assurance contract with ERC-1155 tokens representing content items.
 * Supports an optional initial purchase in the same transaction.
 *
 * @param clients - Wallet and public clients for blockchain interaction
 * @param factoryContract - The CreatorAssuranceContractFactory contract instance
 * @param params - Contract creation parameters (channel, content URLs, pricing, etc.)
 * @returns Transaction hash and details of the created contracts
 */
export async function createContentFundingContract(
  clients: TestClients,
  factoryContract: ContentFundingContract,
  params: CreateContentFundingContractParams,
): Promise<{ hash: Hash; contractDetails: ContentFundingContractDetails }> {
  const channelId = hashCanonicalId(params.channelCanonicalId);

  const contentSuffixes: string[] = [];
  for (const url of params.contentUrls) {
    const parsed = parseContentUrl(url);
    contentSuffixes.push(parsed.contentSuffix);
  }

  let actualInitialPurchaseValue = 0n;
  for (let i = 0; i < params.initialPurchaseTokenIds.length; i++) {
    const count = params.initialPurchaseCounts[i];
    actualInitialPurchaseValue += params.contentPrices[i] * count;
  }

  // @ts-expect-error - viem type inference issue with readContract
  const paymentToken = await clients.publicClient.readContract({
    address: factoryContract.address,
    abi: creatorAssuranceFactoryActionAbi,
    functionName: 'paymentToken',
  }) as Address;

  if (actualInitialPurchaseValue > 0n) {
    await approveERC20Spend(clients, paymentToken, factoryContract.address, actualInitialPurchaseValue);
  }

  const hash = await clients.walletClient.writeContract({
    address: factoryContract.address,
    abi: creatorAssuranceFactoryActionAbi,
    functionName: 'createContract',
    args: [
      channelId,
      params.channelCanonicalId,
      contentSuffixes,
      params.contentSupplies,
      params.contentPrices,
      params.threshold,
      params.deadline,
      params.metadataCid,
      params.erc1155MetadataUri,
      params.erc1155ContractUri,
      params.isThirdParty,
      params.initialPurchaseTokenIds,
      params.initialPurchaseCounts,
    ],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

  const events = parseEventLogs({
    abi: creatorAssuranceFactoryActionAbi,
    eventName: 'CreatorContractCreated',
    logs: receipt.logs,
  });

  if (events.length === 0) {
    throw new Error('Failed to find CreatorContractCreated event in transaction receipt');
  }

  const event = events[0];
  const args = event.args as unknown as {
    contractAddress: Address;
    channelId: string;
    creator: Address;
    isThirdParty: boolean;
  };

  // @ts-expect-error - viem type inference issue with readContract
  const erc1155Address = await clients.publicClient.readContract({
    address: factoryContract.address,
    abi: creatorAssuranceFactoryActionAbi,
    functionName: 'contractERC1155',
    args: [args.contractAddress],
  }) as Address;

  return {
    hash,
    contractDetails: {
      contractAddress: args.contractAddress,
      erc1155Address,
      channelId: args.channelId,
      isThirdParty: args.isThirdParty,
    },
  };
}

/**
 * Read the minimum initial purchase amount required for third-party contracts.
 *
 * @param clients - Wallet and public clients for blockchain interaction
 * @param factoryContract - The CreatorAssuranceContractFactory contract instance
 * @returns Minimum purchase amount in wei
 */
export async function getThirdPartyMinPurchase(
  clients: TestClients,
  factoryContract: ContentFundingContract,
): Promise<bigint> {
  // @ts-expect-error - viem type inference issue with readContract
  const value = await clients.publicClient.readContract({
    address: factoryContract.address,
    abi: creatorAssuranceFactoryActionAbi,
    functionName: 'thirdPartyMinPurchase',
  });

  return value as bigint;
}

/**
 * Withdraw accumulated funds from the channel escrow.
 *
 * Only the verified channel owner can withdraw. Funds accumulate from
 * successful content-funding contracts.
 *
 * @param clients - Wallet and public clients for blockchain interaction
 * @param escrowContract - The ChannelEscrow contract instance
 * @param channelId - Bytes32 channel ID to withdraw from
 * @returns Transaction hash
 */
export async function withdrawFromEscrow(
  clients: TestClients,
  escrowContract: { address: Address; abi: Abi },
  channelId: string,
): Promise<{ hash: Hash }> {
  const hash = await clients.walletClient.writeContract({
    address: escrowContract.address,
    abi: escrowContract.abi,
    functionName: 'withdraw',
    args: [channelId as `0x${string}`],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });

  return { hash };
}

/**
 * Take control of a verified channel.
 *
 * After a channel is verified, the verified owner can "take control" to
 * enable the veto window — a period during which they can veto any
 * third-party contracts created for their channel.
 *
 * @param clients - Wallet and public clients for blockchain interaction
 * @param registryContract - The ChannelRegistry contract instance
 * @param channelId - Bytes32 channel ID to take control of
 * @returns Transaction hash
 */
export async function takeChannelControl(
  clients: TestClients,
  registryContract: { address: Address; abi: Abi },
  channelId: string,
): Promise<{ hash: Hash }> {
  const hash = await clients.walletClient.writeContract({
    address: registryContract.address,
    abi: registryContract.abi,
    functionName: 'takeChannelControl',
    args: [channelId as `0x${string}`],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });

  return { hash };
}

/**
 * Veto a third-party content-funding contract.
 *
 * Only available to the channel owner within the veto window after
 * taking control. Vetoed contracts are marked as invalid.
 *
 * @param clients - Wallet and public clients for blockchain interaction
 * @param registryContract - The ChannelRegistry contract instance
 * @param contractAddress - Address of the contract to veto
 * @returns Transaction hash
 */
export async function vetoContract(
  clients: TestClients,
  registryContract: { address: Address; abi: Abi },
  contractAddress: Address,
): Promise<{ hash: Hash }> {
  const hash = await clients.walletClient.writeContract({
    address: registryContract.address,
    abi: registryContract.abi,
    functionName: 'vetoContract',
    args: [contractAddress],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });

  return { hash };
}

/**
 * Verify ownership of a channel using a signed attestation from the verifier.
 *
 * The verifier (an off-chain service) signs a message confirming that the
 * claimant controls the social media account. This signature is submitted
 * on-chain to register the channel.
 *
 * @param clients - Wallet and public clients for blockchain interaction
 * @param registryContract - The ChannelRegistry contract instance
 * @param channelId - Bytes32 channel ID to verify
 * @param claimant - Address claiming ownership of the channel
 * @param nonce - Random nonce to prevent replay attacks
 * @param deadline - Unix timestamp after which the signature expires
 * @param verifierSignature - EIP-712 signature from the trusted verifier
 * @returns Transaction hash
 */
export async function verifyChannel(
  clients: TestClients,
  registryContract: { address: Address; abi: Abi },
  channelId: string,
  claimant: Address,
  nonce: `0x${string}`,
  deadline: bigint,
  verifierSignature: `0x${string}`,
): Promise<{ hash: Hash }> {
  const hash = await clients.walletClient.writeContract({
    address: registryContract.address,
    abi: registryContract.abi,
    functionName: 'verifyChannel',
    args: [
      channelId as `0x${string}`,
      claimant,
      nonce,
      BigInt(deadline),
      verifierSignature,
    ],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });

  return { hash };
}
