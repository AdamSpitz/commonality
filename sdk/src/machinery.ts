import { createIPFSConfigFromTheUsualEnvVars, IPFSConfig } from "./utils/ipfs";

export interface TestConfig {
  areWeJustRunningTests?: boolean;
  shouldTestsBeVerbose?: boolean;
}

export type SDKMachinery = {
  indexerUrl: string;
  ipfsConfig: IPFSConfig;
  testConfig: TestConfig;
};

export function createSDKMachinery(indexerUrl: string, ipfsConfig?: IPFSConfig, testConfig?: TestConfig): SDKMachinery {
  return {
    indexerUrl,
    ipfsConfig: ipfsConfig || createIPFSConfigFromTheUsualEnvVars(),
    testConfig,
  };
}
