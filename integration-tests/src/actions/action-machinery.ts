import { SDKMachinery, TestConfig, createSDKMachinery, type ContractAddresses } from "@commonality/sdk/machinery";
import { createIPFSConfigInNodeJSFromTheUsualEnvVars, createTwitterApiConfigInNodeJSFromTheUsualEnvVars } from "@commonality/sdk/node";
import { createPublicClient, http } from "viem";
import { hardhat } from "viem/chains";

export type ActionTestingMachinery = SDKMachinery;

export function createActionTestingMachinery(): ActionTestingMachinery {
  const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
  const testConfig: TestConfig = {
    areWeJustRunningTests: true,
    shouldTestsBeVerbose: false,
  };

  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(rpcUrl),
  });

  const eventCacheUrl = process.env.EVENT_CACHE_URL;
  const contractAddresses: ContractAddresses = {
    beliefs: process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}`,
    implications: process.env.IMPLICATIONS_CONTRACT_ADDRESS as `0x${string}`,
    assuranceContractFactory: process.env.ASSURANCE_CONTRACT_FACTORY_ADDRESS as `0x${string}`,
    erc1155Factory: process.env.ERC1155_FACTORY_ADDRESS as `0x${string}`,
    delegatableNotes: process.env.DELEGATABLE_NOTES_CONTRACT_ADDRESS as `0x${string}`,
    noteIntent: process.env.NOTE_INTENT_ADDRESS as `0x${string}`,
    alignmentAttestations: process.env.PROJECT_ALIGNMENT_CONTRACT_ADDRESS as `0x${string}`,
    mutableRefUpdater: process.env.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS as `0x${string}`,
    trustRegistry: process.env.TRUST_REGISTRY_ADDRESS as `0x${string}`,
    nudgePublications: process.env.NUDGE_PUBLICATIONS_CONTRACT_ADDRESS as `0x${string}` | undefined,
    publishedData: process.env.PUBLISHED_DATA_CONTRACT_ADDRESS as `0x${string}` | undefined,
  };

  return createSDKMachinery({ ipfsConfig, twitterApiConfig: createTwitterApiConfigInNodeJSFromTheUsualEnvVars(), testConfig, publicClient, eventCacheUrl, contractAddresses });
}
