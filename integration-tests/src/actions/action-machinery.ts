import { SDKMachinery, TestConfig, createIPFSConfigFromTheUsualEnvVars, createSDKMachinery } from "@commonality/sdk";

export type ActionTestingMachinery = SDKMachinery;

export function createActionTestingMachinery(indexerUrl: string): ActionTestingMachinery {
  const ipfsConfig = createIPFSConfigFromTheUsualEnvVars();
  const testConfig: TestConfig = {
    areWeJustRunningTests: true,
    shouldTestsBeVerbose: false,
  };
  return createSDKMachinery(indexerUrl, ipfsConfig, testConfig);
}
