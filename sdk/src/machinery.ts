import { IPFSConfig } from "./utils/ipfs.js";
import { TwitterApiConfig } from "./utils/twitter.js";
import { type PublicClient } from "viem";

/**
 * Configuration flags used when running the SDK in a test environment.
 */
export interface TestConfig {
  /** When true, the SDK may skip rate-limited external calls (e.g. Twitter API). */
  areWeJustRunningTests?: boolean;
  /** When true, query and action helpers emit extra debug logging. */
  shouldTestsBeVerbose?: boolean;
}

/**
 * Deployed contract addresses for every Commonality protocol contract.
 *
 * Required when using the event-cache query path (Phase 4+) so the SDK
 * knows which contract addresses to filter events for.
 *
 * Optional fields (content-funding contracts) may be omitted on chains
 * where those contracts are not yet deployed.
 */
export type ContractAddressesByChain = Record<number, ContractAddresses>;

export interface ContractAddresses {
  /** Beliefs.sol -- stores direct belief attestations on statements. */
  beliefs: `0x${string}`;
  /** Implications.sol -- stores implication links between statements. */
  implications: `0x${string}`;
  /** CreatorAssuranceContractFactory.sol -- deploys new crowdfunding projects. */
  assuranceContractFactory: `0x${string}`;
  /** Factory that deploys per-project ERC-1155 token contracts. */
  erc1155Factory: `0x${string}`;
  /** Factory that deploys per-project secondary marketplace contracts. */
  marketplaceFactory: `0x${string}`;
  /** DelegatableNotes.sol -- ERC-20/ERC-1155 note delegation tree. */
  delegatableNotes: `0x${string}`;
  /** RecurringPledges.sol -- standing pledge intent registry and executor. */
  recurringPledges?: `0x${string}`;
  /** NoteIntent.sol -- records the intended purpose of a note. */
  noteIntent: `0x${string}`;
  /** AlignmentAttestations.sol -- links subjects to cause-statements. */
  alignmentAttestations: `0x${string}`;
  /** MutableRefUpdater.sol -- on-chain named mutable references. */
  mutableRefUpdater: `0x${string}`;
  /** TrustRegistry.sol -- stores direct trust scores between addresses. */
  trustRegistry: `0x${string}`;
  /** AccountAssertions.sol -- tier-0/1 proof-of-personhood self-declarations. */
  accountAssertions?: `0x${string}`;
  /** NudgePublications.sol -- records nudger publication CIDs. */
  nudgePublications?: `0x${string}`;
  /** ContentRegistry.sol -- registers content for the content-funding subsystem. */
  contentRegistry?: `0x${string}`;
  /** ChannelRegistry.sol -- registers funding channels. */
  channelRegistry?: `0x${string}`;
  /** ChannelEscrow.sol -- holds escrowed funds for channels. */
  channelEscrow?: `0x${string}`;
  /** Factory that deploys per-creator assurance contracts. */
  creatorContractFactory?: `0x${string}`;
}

export type SDKMachinery = {
  ipfsConfig: IPFSConfig;
  twitterApiConfig: TwitterApiConfig;
  testConfig: TestConfig;
  /** Viem public client for on-chain reads. Required for on-chain read functions. */
  publicClient?: PublicClient;
  /** Event cache API base URL for client-side folding queries and the indexer /status endpoint. */
  eventCacheUrl?: string;
  /** Deployed contract addresses for event-cache filtering. Required when using eventCacheUrl. */
  contractAddresses?: ContractAddresses;
  /** Default chain for bare addresses and single-chain deployments. */
  defaultChainId?: number;
  /** Optional chain-key used by services such as Ponder status responses. */
  chainStatusKey?: string;
  /** Optional chain-keyed address registry for multi-chain deployments. */
  contractAddressesByChain?: ContractAddressesByChain;
};

export function createSDKMachinery(options: Partial<SDKMachinery>): SDKMachinery {
  return {
    ipfsConfig: options.ipfsConfig ?? {},
    twitterApiConfig: options.twitterApiConfig ?? {},
    testConfig: options.testConfig ?? {},
    publicClient: options.publicClient,
    eventCacheUrl: options.eventCacheUrl,
    contractAddresses: options.contractAddresses,
    defaultChainId: options.defaultChainId,
    chainStatusKey: options.chainStatusKey,
    contractAddressesByChain: options.contractAddressesByChain,
  };
}

export function getContractAddressesForChain(
  machinery: SDKMachinery,
  chainId: number = machinery.defaultChainId ?? 31337,
): ContractAddresses | undefined {
  return machinery.contractAddressesByChain?.[chainId] ?? machinery.contractAddresses;
}
