/**
 * User actions for content-funding subsystem
 */

import { type Address, type Hash, type Abi, parseEventLogs } from 'viem';
import { type TestClients } from '../../utils/ethereum.js';
import { CreatorAssuranceContractFactoryAbi } from '../../abis.js';
import { hashCanonicalId, parseContentFundingUrl } from './canonicalization.js';

export interface ContentFundingContract {
  address: Address;
  abi: Abi;
}

export interface ContentFundingContractDetails {
  contractAddress: Address;
  erc1155Address: Address;
  channelId: string;
  isThirdParty: boolean;
}

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
    const tokenId = params.initialPurchaseTokenIds[i];
    const count = params.initialPurchaseCounts[i];
    const contentIndex = params.contentUrls.findIndex((_, idx) => {
      try { return parseContentUrl(params.contentUrls[idx]).contentSuffix === String(tokenId) } catch { return false };
    });
    if (contentIndex !== -1) {
      actualInitialPurchaseValue += params.contentPrices[contentIndex] * count;
    }
  }

  const hash = await clients.walletClient.writeContract({
    address: factoryContract.address,
    abi: CreatorAssuranceContractFactoryAbi,
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
    value: actualInitialPurchaseValue,
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

  const events = parseEventLogs({
    abi: CreatorAssuranceContractFactoryAbi,
    eventName: 'CreatorContractCreated',
    logs: receipt.logs,
  });

  if (events.length === 0) {
    throw new Error('Failed to find CreatorContractCreated event in transaction receipt');
  }

  const event = events[0];
  const args = event.args as unknown as {
    contractAddress: Address;
    erc1155: Address;
    isThirdParty: boolean;
  };

  return {
    hash,
    contractDetails: {
      contractAddress: args.contractAddress,
      erc1155Address: args.erc1155,
      channelId: channelId,
      isThirdParty: args.isThirdParty,
    },
  };
}

export async function getThirdPartyMinPurchase(
  clients: TestClients,
  factoryContract: ContentFundingContract,
): Promise<bigint> {
  // @ts-expect-error - viem type inference issue with readContract
  const value = await clients.publicClient.readContract({
    address: factoryContract.address,
    abi: CreatorAssuranceContractFactoryAbi,
    functionName: 'thirdPartyMinPurchase',
  });

  return value as bigint;
}

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