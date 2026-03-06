import { SDKMachinery, TestConfig, createIPFSConfigInNodeJSFromTheUsualEnvVars, createSDKMachinery } from "@commonality/sdk";

export type ActionTestingMachinery = SDKMachinery;

export function createActionTestingMachinery(indexerUrl: string): ActionTestingMachinery {
  const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
  const testConfig: TestConfig = {
    areWeJustRunningTests: true,
    shouldTestsBeVerbose: false,
  };
  return createSDKMachinery(indexerUrl, ipfsConfig, testConfig);
}
