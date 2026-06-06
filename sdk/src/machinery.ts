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
  indexerUrl: string;
  ipfsConfig: IPFSConfig;
  twitterApiConfig: TwitterApiConfig;
  testConfig: TestConfig;
  /**
   * Viem public client for on-chain reads.
   * Required for Phase 2+ on-chain read functions (readConditionParams, readProjectETHBalance, etc.)
   * Can be omitted if only using indexer-based queries (GraphQL) and IPFS.
   */
  publicClient?: PublicClient;
  /**
   * Event cache URL for Phase 4+ - fetches raw events for client-side folding.
   * If not provided, falls back to GraphQL-based queries.
   */
  eventCacheUrl?: string;
  /**
   * Contract addresses for the event cache.
   * Required when using eventCacheUrl for Phase 4+.
   */
  contractAddresses?: ContractAddresses;
  /** Default chain for bare addresses and single-chain deployments. */
  defaultChainId?: number;
  /** Optional chain-key used by services such as Ponder status responses. */
  chainStatusKey?: string;
  /** Optional chain-keyed address registry for future multi-chain deployments. */
  contractAddressesByChain?: ContractAddressesByChain;
};

/**
 * Create an {@link SDKMachinery} configuration object for the Commonality SDK.
 *
 * At minimum, an indexer URL and IPFS configuration are required. Additional
 * parameters enable on-chain reads (publicClient), event-cache queries
 * (eventCacheUrl + contractAddresses), and Twitter API integration.
 *
 * @param indexerUrl - Base URL of the GraphQL indexer
 * @param ipfsConfig - IPFS gateway and pinning configuration
 * @param twitterApiConfig - Platform API config for social lookups (optional)
 * @param testConfig - Test environment flags (optional)
 * @param publicClient - Viem public client for on-chain reads (optional)
 * @param eventCacheUrl - Event cache API base URL for Phase 4+ queries (optional)
 * @param contractAddresses - Deployed contract addresses for event filtering (optional)
 * @returns Configured SDK machinery instance
 */
export function createSDKMachinery(
  indexerUrl: string,
  ipfsConfig: IPFSConfig,
  twitterApiConfig?: TwitterApiConfig,
  testConfig?: TestConfig,
  publicClient?: PublicClient,
  eventCacheUrl?: string,
  contractAddresses?: ContractAddresses,
  defaultChainId?: number,
  chainStatusKey?: string,
  contractAddressesByChain?: ContractAddressesByChain,
): SDKMachinery {
  return {
    indexerUrl,
    ipfsConfig,
    twitterApiConfig: twitterApiConfig ?? {},
    testConfig: testConfig ?? {},
    publicClient,
    eventCacheUrl,
    contractAddresses,
    defaultChainId,
    chainStatusKey,
    contractAddressesByChain,
  };
}

export function getContractAddressesForChain(
  machinery: SDKMachinery,
  chainId: number = machinery.defaultChainId ?? 31337,
): ContractAddresses | undefined {
  return machinery.contractAddressesByChain?.[chainId] ?? machinery.contractAddresses;
}
