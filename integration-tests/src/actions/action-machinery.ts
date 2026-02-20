import { SDKMachinery, createSDKMachinery } from "@commonality/sdk";

export type ActionTestingMachinery = SDKMachinery;

export function createActionTestingMachinery(indexerUrl?: string): ActionTestingMachinery {
  return createSDKMachinery(indexerUrl);
}
