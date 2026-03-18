import { SDKMachinery, TestConfig, createIPFSConfigInNodeJSFromTheUsualEnvVars, createSDKMachinery, type ContractAddresses } from "@commonality/sdk";

export type ActionTestingMachinery = SDKMachinery;

export function createActionTestingMachinery(indexerUrl: string): ActionTestingMachinery {
  const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
  const testConfig: TestConfig = {
    areWeJustRunningTests: true,
    shouldTestsBeVerbose: false,
  };

  const eventCacheUrl = process.env.EVENT_CACHE_URL;
  const contractAddresses: ContractAddresses = {
    beliefs: process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`,
    implications: process.env.IMPLICATIONS_CONTRACT_ADDRESS as `0x${string}`,
    assuranceContractFactory: process.env.ASSURANCE_CONTRACT_FACTORY_ADDRESS as `0x${string}`,
    erc1155Factory: process.env.ERC1155_FACTORY_ADDRESS as `0x${string}`,
    marketplaceFactory: process.env.MARKETPLACE_FACTORY_ADDRESS as `0x${string}`,
    delegatableNotes: process.env.DELEGATABLE_NOTES_CONTRACT_ADDRESS as `0x${string}`,
    noteIntent: process.env.NOTE_INTENT_ADDRESS as `0x${string}`,
    alignmentAttestations: process.env.PROJECT_ALIGNMENT_CONTRACT_ADDRESS as `0x${string}`,
    mutableRefUpdater: process.env.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS as `0x${string}`,
  };

  return createSDKMachinery(indexerUrl, ipfsConfig, testConfig, undefined, eventCacheUrl, contractAddresses);
}
