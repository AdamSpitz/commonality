import { createConfig, factory } from "ponder";
import { http } from "viem";

// Conceptspace ABIs
import { BeliefsAbi } from "./abis/BeliefsAbi";
import { ImplicationsAbi } from "./abis/ImplicationsAbi";

// LazyGiving ABIs
import {
  AssuranceContractFactoryAbi,
  PremintingERC1155FactoryAbi,
  MarketplaceFactoryAbi,
} from "./abis/ProjectFactoriesAbi";
import { MultiERC1155AssuranceContractAbi as AssuranceContractAbi } from "./abis/AssuranceContractAbi";
import { ERC1155SecondaryMarketAbi } from "./abis/ERC1155SecondaryMarketAbi";
import { PremintingERC1155Abi } from "./abis/PremintingERC1155Abi";

// Delegation ABIs
import { DelegatableNotesAbi } from "./abis/DelegatableNotesAbi";
import { RecurringPledgesAbi } from "./abis/RecurringPledgesAbi";
import { NoteIntentAbi } from "./abis/NoteIntentAbi";

// Funding Portal ABIs
import { AlignmentAttestationsAbi } from "./abis/AlignmentAttestationsAbi";

// Mutable Refs ABIs
import { MutableRefUpdaterAbi } from "./abis/MutableRefUpdaterAbi";

// Nudger publication ABIs
import { NudgePublicationsAbi } from "./abis/NudgePublicationsAbi";

// Content Funding ABIs
import { ContentRegistryAbi } from "./abis/ContentRegistryAbi";
import { ChannelRegistryAbi } from "./abis/ChannelRegistryAbi";
import { ChannelEscrowAbi } from "./abis/ChannelEscrowAbi";
import { CreatorAssuranceContractFactoryAbi } from "./abis/CreatorAssuranceContractFactoryAbi";

const SUPPORTED_CHAINS = ["hardhat", "base-sepolia", "mainnet"] as const;
type SupportedChain = (typeof SUPPORTED_CHAINS)[number];
type CreateConfigArgs = Parameters<typeof createConfig>[0];

function getIndexerChain(): SupportedChain {
  const chain = process.env.PONDER_CHAIN ?? "hardhat";

  if ((SUPPORTED_CHAINS as readonly string[]).includes(chain)) {
    return chain as SupportedChain;
  }

  throw new Error(
    `Unsupported PONDER_CHAIN "${chain}". Expected one of: ${SUPPORTED_CHAINS.join(", ")}`,
  );
}

function getRpcTransport(url: string | undefined) {
  return url
    ? http(url, {
        timeout: 10_000,
      })
    : undefined;
}

const creatorContractCreatedEvent = {
  type: "event",
  name: "CreatorContractCreated",
  inputs: [
    { name: "contractAddress", type: "address", indexed: true },
    { name: "channelId", type: "bytes32", indexed: true },
    { name: "creator", type: "address", indexed: true },
    { name: "isThirdParty", type: "bool", indexed: false },
  ],
} as const;

type ContractDeployment = {
  address: `0x${string}`;
  startBlock: number;
};

type DeploymentManifest = {
  chains?: Partial<Record<SupportedChain, Record<string, ContractDeployment[]>>>;
} & Partial<Record<SupportedChain, Record<string, ContractDeployment[]>>>;

function parseDeploymentManifest(): DeploymentManifest {
  const rawManifest = process.env.INDEXER_DEPLOYMENT_MANIFEST;
  if (!rawManifest) return {};

  try {
    return JSON.parse(rawManifest) as DeploymentManifest;
  } catch (error) {
    throw new Error(
      `Invalid INDEXER_DEPLOYMENT_MANIFEST JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function parseStartBlock(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid start block "${value}". Expected a non-negative integer.`);
  }
  return parsed;
}

function parseLegacyDeployment(addressEnvVar: string, startBlock: number): ContractDeployment[] {
  const address = process.env[addressEnvVar];
  return address && address !== "" ? [{ address: address as `0x${string}`, startBlock }] : [];
}

const START_BLOCK = parseStartBlock(process.env.START_BLOCK, 0);
const LAZYGIVING_START_BLOCK = parseStartBlock(process.env.LAZYGIVING_START_BLOCK, START_BLOCK);
const DELEGATION_START_BLOCK = parseStartBlock(process.env.DELEGATION_START_BLOCK, START_BLOCK);
const FUNDING_PORTAL_START_BLOCK = parseStartBlock(process.env.FUNDING_PORTAL_START_BLOCK, START_BLOCK);
const CONTENT_FUNDING_START_BLOCK = parseStartBlock(process.env.CONTENT_FUNDING_START_BLOCK, START_BLOCK);
const INDEXER_CHAIN = getIndexerChain();
const DEPLOYMENT_MANIFEST = parseDeploymentManifest();

function manifestDeployments(logicalName: string): ContractDeployment[] | undefined {
  return DEPLOYMENT_MANIFEST.chains?.[INDEXER_CHAIN]?.[logicalName] ?? DEPLOYMENT_MANIFEST[INDEXER_CHAIN]?.[logicalName];
}

function getDeployments(
  logicalName: string,
  legacyAddressEnvVar: string,
  legacyStartBlock: number,
): ContractDeployment[] {
  const deployments = manifestDeployments(logicalName) ?? parseLegacyDeployment(legacyAddressEnvVar, legacyStartBlock);
  return deployments.map((deployment) => ({
    address: deployment.address,
    startBlock: parseStartBlock(String(deployment.startBlock), legacyStartBlock),
  }));
}

function deploymentAddresses(deployments: ContractDeployment[]): `0x${string}` | readonly `0x${string}`[] | undefined {
  if (deployments.length === 0) return undefined;
  if (deployments.length === 1) return deployments[0]!.address;
  return deployments.map((deployment) => deployment.address);
}

function deploymentStartBlock(deployments: ContractDeployment[], fallback: number): number {
  if (deployments.length === 0) return fallback;
  return Math.min(...deployments.map((deployment) => deployment.startBlock));
}

function deploymentConfig(deployments: ContractDeployment[], fallbackStartBlock: number) {
  return {
    address: deploymentAddresses(deployments),
    startBlock: deploymentStartBlock(deployments, fallbackStartBlock),
  };
}

function factoryAddress(deployments: ContractDeployment[]) {
  const address = deploymentAddresses(deployments);
  return address ? { address, startBlock: deploymentStartBlock(deployments, START_BLOCK) } : undefined;
}

const BELIEFS_DEPLOYMENTS = getDeployments("Beliefs", "BELIEFS_CONTRACT_ADDRESS", START_BLOCK);
const IMPLICATIONS_DEPLOYMENTS = getDeployments("Implications", "IMPLICATIONS_CONTRACT_ADDRESS", START_BLOCK);
const ASSURANCE_CONTRACT_FACTORY_DEPLOYMENTS = getDeployments("AssuranceContractFactory", "ASSURANCE_CONTRACT_FACTORY_ADDRESS", LAZYGIVING_START_BLOCK);
const ERC1155_FACTORY_DEPLOYMENTS = getDeployments("ERC1155Factory", "ERC1155_FACTORY_ADDRESS", LAZYGIVING_START_BLOCK);
const MARKETPLACE_FACTORY_DEPLOYMENTS = getDeployments("MarketplaceFactory", "MARKETPLACE_FACTORY_ADDRESS", LAZYGIVING_START_BLOCK);
const DELEGATABLE_NOTES_DEPLOYMENTS = getDeployments("DelegatableNotes", "DELEGATABLE_NOTES_ADDRESS", DELEGATION_START_BLOCK);
const RECURRING_PLEDGES_DEPLOYMENTS = getDeployments("RecurringPledges", "RECURRING_PLEDGES_ADDRESS", DELEGATION_START_BLOCK);
const NOTE_INTENT_DEPLOYMENTS = getDeployments("NoteIntent", "NOTE_INTENT_ADDRESS", DELEGATION_START_BLOCK);
const ALIGNMENT_ATTESTATIONS_DEPLOYMENTS = getDeployments("AlignmentAttestations", "ALIGNMENT_ATTESTATIONS_ADDRESS", FUNDING_PORTAL_START_BLOCK);
const MUTABLE_REF_UPDATER_DEPLOYMENTS = getDeployments("MutableRefUpdater", "MUTABLE_REF_UPDATER_ADDRESS", START_BLOCK);
const NUDGE_PUBLICATIONS_DEPLOYMENTS = getDeployments("NudgePublications", "NUDGE_PUBLICATIONS_CONTRACT_ADDRESS", START_BLOCK);
const CONTENT_REGISTRY_DEPLOYMENTS = getDeployments("ContentRegistry", "CONTENT_REGISTRY_ADDRESS", CONTENT_FUNDING_START_BLOCK);
const CHANNEL_REGISTRY_DEPLOYMENTS = getDeployments("ChannelRegistry", "CHANNEL_REGISTRY_ADDRESS", CONTENT_FUNDING_START_BLOCK);
const CHANNEL_ESCROW_DEPLOYMENTS = getDeployments("ChannelEscrow", "CHANNEL_ESCROW_ADDRESS", CONTENT_FUNDING_START_BLOCK);
const CREATOR_CONTRACT_FACTORY_DEPLOYMENTS = getDeployments("CreatorAssuranceContractFactory", "CREATOR_CONTRACT_FACTORY_ADDRESS", CONTENT_FUNDING_START_BLOCK);

const ETH_GET_LOGS_BLOCK_RANGE = process.env.PONDER_ETH_GET_LOGS_BLOCK_RANGE
  ? Number(process.env.PONDER_ETH_GET_LOGS_BLOCK_RANGE)
  : undefined;

function chainForContract(_contractName: string): SupportedChain {
  return INDEXER_CHAIN;
}

const contracts = {
  // ========================================================================
  // CONCEPTSPACE INDEXER CONTRACTS
  // ========================================================================

  // Beliefs contract - tracks user beliefs about statements
  Beliefs: {
    abi: BeliefsAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(BELIEFS_DEPLOYMENTS, START_BLOCK),
  },
  // Implications contract - tracks implication attestations between statements
  Implications: {
    abi: ImplicationsAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(IMPLICATIONS_DEPLOYMENTS, START_BLOCK),
  },

  // ========================================================================
  // LAZYGIVING INDEXER CONTRACTS
  // ========================================================================
  // These are logically separate from Conceptspace contracts.
  // The LazyGiving indexer tracks crowdfunding projects and secondary markets.

  // Factory contract for creating assurance contracts
  AssuranceContractFactory: {
    abi: AssuranceContractFactoryAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(ASSURANCE_CONTRACT_FACTORY_DEPLOYMENTS, LAZYGIVING_START_BLOCK),
  },

  // Factory contract for creating ERC1155 tokens
  ERC1155Factory: {
    abi: PremintingERC1155FactoryAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(ERC1155_FACTORY_DEPLOYMENTS, LAZYGIVING_START_BLOCK),
  },

  // Factory contract for creating secondary marketplaces
  MarketplaceFactory: {
    abi: MarketplaceFactoryAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(MARKETPLACE_FACTORY_DEPLOYMENTS, LAZYGIVING_START_BLOCK),
  },

  // Dynamically indexed assurance contracts (created by factory)
  // Uses Ponder's factory pattern to index child contracts
  // The factory() function returns addresses discovered from factory events
  AssuranceContract: {
    abi: AssuranceContractAbi,
    chain: chainForContract("default"),
    address: factoryAddress(ASSURANCE_CONTRACT_FACTORY_DEPLOYMENTS)
      ? factory({
          ...factoryAddress(ASSURANCE_CONTRACT_FACTORY_DEPLOYMENTS)!,
          event: AssuranceContractFactoryAbi[0], // LazyGivingAssuranceContractCreated
          parameter: "assuranceContract",
        })
      : undefined,
    startBlock: LAZYGIVING_START_BLOCK,
  },

  // Dynamically indexed secondary marketplaces (created by factory)
  SecondaryMarket: {
    abi: ERC1155SecondaryMarketAbi,
    chain: chainForContract("default"),
    address: factoryAddress(MARKETPLACE_FACTORY_DEPLOYMENTS)
      ? factory({
          ...factoryAddress(MARKETPLACE_FACTORY_DEPLOYMENTS)!,
          event: MarketplaceFactoryAbi[0], // LazyGivingERC1155SecondaryMarketCreated
          parameter: "marketplace",
        })
      : undefined,
    startBlock: LAZYGIVING_START_BLOCK,
  },

  // Dynamically indexed ERC1155 token contracts (created by factory)
  // Used to track token burns (transfers to zero address)
  PremintingERC1155: {
    abi: PremintingERC1155Abi,
    chain: chainForContract("default"),
    address: factoryAddress(ERC1155_FACTORY_DEPLOYMENTS)
      ? factory({
          ...factoryAddress(ERC1155_FACTORY_DEPLOYMENTS)!,
          event: PremintingERC1155FactoryAbi[0], // LazyGivingERC1155ContractCreated
          parameter: "erc1155",
        })
      : undefined,
    startBlock: LAZYGIVING_START_BLOCK,
  },

  // ========================================================================
  // DELEGATION INDEXER CONTRACTS
  // ========================================================================
  // These are logically separate from Conceptspace and LazyGiving contracts.
  // The Delegation indexer tracks delegatable notes and delegation chains.

  DelegatableNotes: {
    abi: DelegatableNotesAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(DELEGATABLE_NOTES_DEPLOYMENTS, DELEGATION_START_BLOCK),
  },

  RecurringPledges: {
    abi: RecurringPledgesAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(RECURRING_PLEDGES_DEPLOYMENTS, DELEGATION_START_BLOCK),
  },

  NoteIntent: {
    abi: NoteIntentAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(NOTE_INTENT_DEPLOYMENTS, DELEGATION_START_BLOCK),
  },

  // ========================================================================
  // FUNDING PORTAL INDEXER CONTRACTS
  // ========================================================================
  // These are logically separate from the foundational subsystems above.
  // The Funding Portal indexer tracks alignment attestations and
  // federates queries to other subsystems' APIs for cross-cutting views.

  AlignmentAttestations: {
    abi: AlignmentAttestationsAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(ALIGNMENT_ATTESTATIONS_DEPLOYMENTS, FUNDING_PORTAL_START_BLOCK),
  },

  // ========================================================================
  // MUTABLE REFS INDEXER CONTRACTS
  // ========================================================================
  // This is a utility contract that can be used by any subsystem to track
  // mutable references (pointers to IPFS content). Users can create named
  // refs that point to IPFS CIDs or other string values.

  MutableRefUpdater: {
    abi: MutableRefUpdaterAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(MUTABLE_REF_UPDATER_DEPLOYMENTS, START_BLOCK),
  },

  // ========================================================================
  // NUDGER INDEXER CONTRACTS
  // ========================================================================

  NudgePublications: {
    abi: NudgePublicationsAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(NUDGE_PUBLICATIONS_DEPLOYMENTS, START_BLOCK),
  },

  // ========================================================================
  // CONTENT FUNDING INDEXER CONTRACTS
  // ========================================================================
  // Content Registry - tracks registered content items and their contracts
  ContentRegistry: {
    abi: ContentRegistryAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(CONTENT_REGISTRY_DEPLOYMENTS, CONTENT_FUNDING_START_BLOCK),
  },

  // Channel Registry - tracks channel verification and control states
  ChannelRegistry: {
    abi: ChannelRegistryAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(CHANNEL_REGISTRY_DEPLOYMENTS, CONTENT_FUNDING_START_BLOCK),
  },

  // Channel Escrow - holds funds for unclaimed channels
  ChannelEscrow: {
    abi: ChannelEscrowAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(CHANNEL_ESCROW_DEPLOYMENTS, CONTENT_FUNDING_START_BLOCK),
  },

  // Creator Assurance Contract Factory - creates content-funding contracts
  CreatorAssuranceContractFactory: {
    abi: CreatorAssuranceContractFactoryAbi,
    chain: chainForContract("default"),
    ...deploymentConfig(CREATOR_CONTRACT_FACTORY_DEPLOYMENTS, CONTENT_FUNDING_START_BLOCK),
  },

  // Dynamically indexed creator assurance contracts (created by factory)
  CreatorAssuranceContract: {
    abi: AssuranceContractAbi,
    chain: chainForContract("default"),
    address: factoryAddress(CREATOR_CONTRACT_FACTORY_DEPLOYMENTS)
      ? factory({
          ...factoryAddress(CREATOR_CONTRACT_FACTORY_DEPLOYMENTS)!,
          event: creatorContractCreatedEvent,
          parameter: "contractAddress",
        })
      : undefined,
    startBlock: CONTENT_FUNDING_START_BLOCK,
  },
} as const;

function getActiveChains() {
  switch (INDEXER_CHAIN) {
    case "hardhat":
      return {
        hardhat: {
          id: 31337,
          rpc: getRpcTransport(process.env.PONDER_RPC_URL_31337 || "http://localhost:8545"),
          pollingInterval: 100, // Poll every 100ms for faster test execution (default is 1000ms)
        },
      } as const;
    case "base-sepolia":
      return {
        "base-sepolia": {
          id: 84532,
          rpc: getRpcTransport(process.env.PONDER_RPC_URL_84532),
          ethGetLogsBlockRange: ETH_GET_LOGS_BLOCK_RANGE ?? 10,
        },
      } as const;
    case "mainnet":
      return {
        mainnet: {
          id: 1,
          rpc: getRpcTransport(process.env.PONDER_RPC_URL_1),
          ethGetLogsBlockRange: ETH_GET_LOGS_BLOCK_RANGE,
        },
      } as const;
  }
}

const chains = getActiveChains() as unknown as CreateConfigArgs["chains"];

export default createConfig({
  database:
    process.env.PONDER_EPHEMERAL === "true"
      ? { kind: "pglite", directory: "/tmp/ponder-pglite" } // Writable ephemeral DB for Docker-based test runs
      : process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL
        ? { kind: "postgres" }
        : undefined,
  chains,
  contracts,
});
