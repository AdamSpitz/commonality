import { IPFSConfig } from "./utils/ipfs";
import { type PublicClient } from "viem";

export interface TestConfig {
  areWeJustRunningTests?: boolean;
  shouldTestsBeVerbose?: boolean;
}

export type SDKMachinery = {
  indexerUrl: string;
  ipfsConfig: IPFSConfig;
  testConfig: TestConfig;
  /**
   * Viem public client for on-chain reads.
   * Required for Phase 2+ on-chain read functions (readConditionParams, readProjectETHBalance, etc.)
   * Can be omitted if only using indexer-based queries (GraphQL) and IPFS.
   */
  publicClient?: PublicClient;
};

export function createSDKMachinery(
  indexerUrl: string,
  ipfsConfig: IPFSConfig,
  testConfig?: TestConfig,
  publicClient?: PublicClient,
): SDKMachinery {
  return {
    indexerUrl,
    ipfsConfig,
    testConfig,
    publicClient,
  };
}
