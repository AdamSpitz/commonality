import { SDKMachinery, TestConfig, createSDKMachinery } from "@commonality/sdk";

export type ActionTestingMachinery = SDKMachinery;

export function createActionTestingMachinery(indexerUrl: string): ActionTestingMachinery {
  const testConfig: TestConfig = {
    areWeJustRunningTests: true,
    shouldTestsBeVerbose: false,
  };
  return createSDKMachinery(indexerUrl, undefined, testConfig);
}
