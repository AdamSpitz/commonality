import type { SDKMachinery } from '../../../machinery.js';
import { fetchAllContentFundingEvents } from '../../../utils/eventCacheClient.js';
import { decodeProspectiveContentEvent } from '../../../utils/eventDecoder.js';
import { MaterializedContentTokensAbi, ProspectiveContentRoundFactoryAbi } from '../../../abis.js';
import { zeroAddress, type Address, type Hex } from 'viem';
import type { ProspectiveContentEvent } from '../events.js';
import { sortedByBlockOrder } from './order.js';

export interface ProspectiveRoundOnchainState {
  channelId: Hex;
  materializedToken: Address | null;
}

/** Read the authoritative channel and materialized collection directly from the factory. */
export async function getProspectiveRoundOnchainState(
  machinery: SDKMachinery,
  round: Address,
): Promise<ProspectiveRoundOnchainState> {
  const publicClient = machinery.publicClient;
  const factory = machinery.contractAddresses?.prospectiveContentRoundFactory;
  if (!publicClient) throw new Error('Public client not configured');
  if (!factory) throw new Error('Prospective content round factory not configured');

  const [isRound, channelId, materializedToken] = await Promise.all([
    publicClient.readContract({ address: factory, abi: ProspectiveContentRoundFactoryAbi, functionName: 'isProspectiveRound', args: [round], authorizationList: undefined }),
    publicClient.readContract({ address: factory, abi: ProspectiveContentRoundFactoryAbi, functionName: 'channelIdByRound', args: [round], authorizationList: undefined }),
    publicClient.readContract({ address: factory, abi: ProspectiveContentRoundFactoryAbi, functionName: 'materializedTokenByRound', args: [round], authorizationList: undefined }),
  ]);
  if (!isRound) throw new Error('Prospective content round not found');
  return { channelId, materializedToken: materializedToken === zeroAddress ? null : materializedToken };
}

/** Minimal ERC-1155 read surface: the receipt token is only ever balance-checked here. */
const ERC1155_BALANCE_OF_ABI = [{
  type: 'function',
  name: 'balanceOf',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }],
  outputs: [{ name: '', type: 'uint256' }],
}] as const;

/** One account's claim position on a single materialized content item. */
export interface MaterializedContentClaimState {
  contentId: bigint;
  /** Receipts held for the round -- the total this account may ever claim per item. */
  entitlement: bigint;
  /** Already claimed for this item. */
  claimed: bigint;
  /** Still claimable now (entitlement minus claimed, never negative). */
  claimable: bigint;
}

/**
 * Read an account's per-item claim position directly from chain.
 *
 * Entitlement is the account's non-transferable receipt balance for the round,
 * so buying more receipts after a first claim raises the claimable remainder.
 * Read on-chain rather than folded from ContentTokenClaimed so the UI reflects
 * a claim immediately instead of waiting for the indexer.
 */
export async function getMaterializedClaimStates(
  machinery: SDKMachinery,
  tokenContract: Address,
  account: Address,
  contentIds: bigint[],
): Promise<MaterializedContentClaimState[]> {
  const publicClient = machinery.publicClient;
  if (!publicClient) throw new Error('Public client not configured');
  if (contentIds.length === 0) return [];

  const [receiptToken, receiptTokenId] = await Promise.all([
    publicClient.readContract({ address: tokenContract, abi: MaterializedContentTokensAbi, functionName: 'prospectiveToken', authorizationList: undefined }),
    publicClient.readContract({ address: tokenContract, abi: MaterializedContentTokensAbi, functionName: 'prospectiveTokenId', authorizationList: undefined }),
  ]);
  const entitlement = await publicClient.readContract({
    address: receiptToken,
    abi: ERC1155_BALANCE_OF_ABI,
    functionName: 'balanceOf',
    args: [account, receiptTokenId],
    authorizationList: undefined,
  });

  return Promise.all(contentIds.map(async (contentId) => {
    const claimed = await publicClient.readContract({
      address: tokenContract,
      abi: MaterializedContentTokensAbi,
      functionName: 'claimedAmount',
      args: [contentId, account],
      authorizationList: undefined,
    });
    return { contentId, entitlement, claimed, claimable: claimed >= entitlement ? 0n : entitlement - claimed };
  }));
}

export async function getMaterializedContentOnchain(
  machinery: SDKMachinery,
  tokenContract: Address,
): Promise<{ contentId: bigint; canonicalId: string }[]> {
  const publicClient = machinery.publicClient;
  if (!publicClient) throw new Error('Public client not configured');
  const contentIds = await publicClient.readContract({
    address: tokenContract,
    abi: MaterializedContentTokensAbi,
    functionName: 'getContentIds',
    authorizationList: undefined,
  });
  return Promise.all(contentIds.map(async (contentId) => ({
    contentId,
    canonicalId: await publicClient.readContract({
      address: tokenContract,
      abi: MaterializedContentTokensAbi,
      functionName: 'contentCanonicalId',
      args: [contentId],
      authorizationList: undefined,
    }),
  })));
}

export interface ProspectiveRoundSummary {
  round: `0x${string}`;
  /** Keccak-256 hash of the canonical channel ID emitted by the factory. */
  channelIdHash: Hex;
  receiptToken: `0x${string}`;
  receiptTokenId: bigint;
  condition: `0x${string}`;
  materializedToken: `0x${string}` | null;
  content: { contentId: bigint; canonicalId: string }[];
}

/** Fold prospective-round events in chain order into round summaries. */
export function foldProspectiveRounds(events: ProspectiveContentEvent[]): ProspectiveRoundSummary[] {
  const rounds = new Map<string, ProspectiveRoundSummary>();
  const tokenToRound = new Map<string, ProspectiveRoundSummary>();
  for (const event of sortedByBlockOrder([...events])) {
    if (event.type === 'ProspectiveRoundCreated') {
      const summary: ProspectiveRoundSummary = { round: event.round, channelIdHash: event.channelId as Hex, receiptToken: event.receiptToken, receiptTokenId: event.receiptTokenId, condition: event.condition, materializedToken: null, content: [] };
      rounds.set(summary.round.toLowerCase(), summary);
    } else if (event.type === 'ProspectiveRoundMaterialized') {
      const summary = rounds.get(event.round.toLowerCase());
      if (summary) { summary.materializedToken = event.tokenContract; tokenToRound.set(summary.materializedToken.toLowerCase(), summary); }
    } else if (event.type === 'ContentMaterialized') {
      tokenToRound.get(event.contractAddress.toLowerCase())?.content.push({ contentId: event.contentId, canonicalId: event.canonicalId });
    }
  }
  return [...rounds.values()];
}

/** Fetch and fold prospective-round creation/materialization into round summaries. */
export async function getProspectiveRounds(machinery: SDKMachinery): Promise<ProspectiveRoundSummary[]> {
  const decoded = (await fetchAllContentFundingEvents(machinery))
    .map(decodeProspectiveContentEvent)
    .filter((event): event is ProspectiveContentEvent => event !== null);
  return foldProspectiveRounds(decoded);
}
