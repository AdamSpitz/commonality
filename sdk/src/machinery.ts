import { IPFSConfig } from "./utils/ipfs.js";
import { TwitterApiConfig } from "./utils/twitter.js";
import { type PublicClient } from "viem";

export interface TestConfig {
  areWeJustRunningTests?: boolean;
  shouldTestsBeVerbose?: boolean;
}

export interface ContractAddresses {
  beliefs: `0x${string}`;
  implications: `0x${string}`;
  assuranceContractFactory: `0x${string}`;
  erc1155Factory: `0x${string}`;
  marketplaceFactory: `0x${string}`;
  delegatableNotes: `0x${string}`;
  noteIntent: `0x${string}`;
  alignmentAttestations: `0x${string}`;
  mutableRefUpdater: `0x${string}`;
  trustRegistry: `0x${string}`;
  contentRegistry?: `0x${string}`;
  channelRegistry?: `0x${string}`;
  channelEscrow?: `0x${string}`;
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
};

export function createSDKMachinery(
  indexerUrl: string,
  ipfsConfig: IPFSConfig,
  twitterApiConfig?: TwitterApiConfig,
  testConfig?: TestConfig,
  publicClient?: PublicClient,
  eventCacheUrl?: string,
  contractAddresses?: ContractAddresses,
): SDKMachinery {
  return {
    indexerUrl,
    ipfsConfig,
    twitterApiConfig: twitterApiConfig ?? { twitterApiDotIoApiKey: '' },
    testConfig: testConfig ?? {},
    publicClient,
    eventCacheUrl,
    contractAddresses,
  };
}
