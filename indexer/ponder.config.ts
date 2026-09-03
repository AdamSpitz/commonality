import { createConfig, factory } from "ponder";
import { http } from "viem";
import { INDEXER_CHAIN_IDS, type IndexerChainName } from "./src/utils/chain";

// Conceptspace ABIs
import { BeliefsAbi } from "./abis/BeliefsAbi";
import { ImplicationsAbi } from "./abis/ImplicationsAbi";

// LazyGiving ABIs
import { AssuranceContractFactoryAbi } from "./abis/AssuranceContractFactoryAbi";
import { PremintingERC1155FactoryAbi } from "./abis/PremintingERC1155FactoryAbi";
import { ProjectFactoryAbi } from "./abis/ProjectFactoryAbi";
import { AssuranceContractAbi } from "./abis/AssuranceContractAbi";
import { PremintingERC1155Abi } from "./abis/PremintingERC1155Abi";

// Delegation ABIs
import { DelegatableNotesAbi } from "./abis/DelegatableNotesAbi";
import { RecurringPledgesAbi } from "./abis/RecurringPledgesAbi";
import { NoteIntentAbi } from "./abis/NoteIntentAbi";

// Funding Portal ABIs
import { AlignmentAttestationsAbi } from "./abis/AlignmentAttestationsAbi";

// Subjectiv identity ABIs
import { AccountAssertionsAbi } from "./abis/AccountAssertionsAbi";
import { TrustRegistryAbi } from "./abis/TrustRegistryAbi";

// Mutable Refs ABIs
import { MutableRefUpdaterAbi } from "./abis/MutableRefUpdaterAbi";

// Nudger publication ABIs
import { NudgePublicationsAbi } from "./abis/NudgePublicationsAbi";

// PublishedData ABI
import { PublishedDataAbi } from "./abis/PublishedDataAbi";

// Content Funding ABIs
import { ContentRegistryAbi } from "./abis/ContentRegistryAbi";
import { ChannelRegistryAbi } from "./abis/ChannelRegistryAbi";
import { ChannelEscrowAbi } from "./abis/ChannelEscrowAbi";
import { CreatorAssuranceContractFactoryAbi } from "./abis/CreatorAssuranceContractFactoryAbi";
import { ProspectiveContentRoundFactoryAbi } from "./abis/ProspectiveContentRoundFactoryAbi";
import { MaterializedContentTokensAbi } from "./abis/MaterializedContentTokensAbi";

const SUPPORTED_CHAINS = Object.keys(INDEXER_CHAIN_IDS) as IndexerChainName[];
type SupportedChain = IndexerChainName;
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

function parseMaxResponseBodySize(value: string | undefined): number | false | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === "false" || value === "0") return false;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid PONDER_RPC_MAX_RESPONSE_BODY_SIZE "${value}". Expected a positive byte count, 0, or false.`);
  }
  return parsed;
}

function getRpcTransport(url: string | undefined) {
  return url
    ? http(url, {
        timeout: 10_000,
        maxResponseBodySize: parseMaxResponseBodySize(process.env.PONDER_RPC_MAX_RESPONSE_BODY_SIZE),
      })
    : undefined;
}

const assuranceContractCreatedEvent = AssuranceContractFactoryAbi.find(
  (item) => item.type === "event" && item.name === "LazyGivingAssuranceContractCreated",
)!;
const erc1155ContractCreatedEvent = PremintingERC1155FactoryAbi.find(
  (item) => item.type === "event" && item.name === "LazyGivingERC1155ContractCreated",
)!;
const prospectiveRoundCreatedEvent = ProspectiveContentRoundFactoryAbi.find(
  (item) => item.type === "event" && item.name === "ProspectiveRoundCreated",
)!;
const prospectiveRoundMaterializedEvent = ProspectiveContentRoundFactoryAbi.find(
  (item) => item.type === "event" && item.name === "ProspectiveRoundMaterialized",
)!;
const creatorContractCreatedEvent = CreatorAssuranceContractFactoryAbi.find(
  (item) => item.type === "event" && item.name === "CreatorContractCreated",
)!;

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
const PUBLISHED_DATA_START_BLOCK = parseStartBlock(process.env.PUBLISHED_DATA_START_BLOCK, START_BLOCK);
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
const PROJECT_FACTORY_DEPLOYMENTS = getDeployments("ProjectFactory", "PROJECT_FACTORY_ADDRESS", LAZYGIVING_START_BLOCK);
const ERC1155_FACTORY_DEPLOYMENTS = getDeployments("ERC1155Factory", "ERC1155_FACTORY_ADDRESS", LAZYGIVING_START_BLOCK);
const DELEGATABLE_NOTES_DEPLOYMENTS = getDeployments(
  "DelegatableNotes",
  process.env.DELEGATABLE_NOTES_ADDRESS ? "DELEGATABLE_NOTES_ADDRESS" : "DELEGATABLE_NOTES_CONTRACT_ADDRESS",
  DELEGATION_START_BLOCK,
);
const RECURRING_PLEDGES_DEPLOYMENTS = getDeployments("RecurringPledges", "RECURRING_PLEDGES_ADDRESS", DELEGATION_START_BLOCK);
const NOTE_INTENT_DEPLOYMENTS = getDeployments("NoteIntent", "NOTE_INTENT_ADDRESS", DELEGATION_START_BLOCK);
const ALIGNMENT_ATTESTATIONS_DEPLOYMENTS = getDeployments(
  "AlignmentAttestations",
  process.env.ALIGNMENT_ATTESTATIONS_ADDRESS ? "ALIGNMENT_ATTESTATIONS_ADDRESS" : "ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS",
  FUNDING_PORTAL_START_BLOCK,
);
const ACCOUNT_ASSERTIONS_DEPLOYMENTS = getDeployments("AccountAssertions", "ACCOUNT_ASSERTIONS_ADDRESS", START_BLOCK);
const TRUST_REGISTRY_DEPLOYMENTS = getDeployments("TrustRegistry", "TRUST_REGISTRY_ADDRESS", START_BLOCK);
const MUTABLE_REF_UPDATER_DEPLOYMENTS = getDeployments("MutableRefUpdater", "MUTABLE_REF_UPDATER_ADDRESS", START_BLOCK);
const NUDGE_PUBLICATIONS_DEPLOYMENTS = getDeployments("NudgePublications", "NUDGE_PUBLICATIONS_CONTRACT_ADDRESS", START_BLOCK);
const PUBLISHED_DATA_DEPLOYMENTS = getDeployments("PublishedData", "PUBLISHED_DATA_CONTRACT_ADDRESS", PUBLISHED_DATA_START_BLOCK);
const CONTENT_REGISTRY_DEPLOYMENTS = getDeployments("ContentRegistry", "CONTENT_REGISTRY_ADDRESS", CONTENT_FUNDING_START_BLOCK);
const CHANNEL_REGISTRY_DEPLOYMENTS = getDeployments("ChannelRegistry", "CHANNEL_REGISTRY_ADDRESS", CONTENT_FUNDING_START_BLOCK);
const CHANNEL_ESCROW_DEPLOYMENTS = getDeployments("ChannelEscrow", "CHANNEL_ESCROW_ADDRESS", CONTENT_FUNDING_START_BLOCK);
const CREATOR_CONTRACT_FACTORY_DEPLOYMENTS = getDeployments("CreatorAssuranceContractFactory", "CREATOR_CONTRACT_FACTORY_ADDRESS", CONTENT_FUNDING_START_BLOCK);
const PROSPECTIVE_FACTORY_DEPLOYMENTS = getDeployments("ProspectiveContentRoundFactory", "PROSPECTIVE_CONTENT_ROUND_FACTORY_ADDRESS", CONTENT_FUNDING_START_BLOCK);

const ETH_GET_LOGS_BLOCK_RANGE = process.env.PONDER_ETH_GET_LOGS_BLOCK_RANGE
  ? Number(process.env.PONDER_ETH_GET_LOGS_BLOCK_RANGE)
  : undefined;

const contracts = {
  // ========================================================================
  // CONCEPTSPACE INDEXER CONTRACTS
  // ========================================================================

  // Beliefs contract - tracks user beliefs about statements
  Beliefs: {
    abi: BeliefsAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(BELIEFS_DEPLOYMENTS, START_BLOCK),
  },
  // Implications contract - tracks implication attestations between statements
  Implications: {
    abi: ImplicationsAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(IMPLICATIONS_DEPLOYMENTS, START_BLOCK),
  },

  // ========================================================================
  // LAZYGIVING INDEXER CONTRACTS
  // ========================================================================
  // These are logically separate from Conceptspace contracts.
  // The LazyGiving indexer tracks crowdfunding projects and non-transferable receipts.

  // Factory contract for creating assurance contracts
  AssuranceContractFactory: {
    abi: AssuranceContractFactoryAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(ASSURANCE_CONTRACT_FACTORY_DEPLOYMENTS, LAZYGIVING_START_BLOCK),
  },

  // ProjectFactory emits ProjectCreated with an indexed creator topic
  ProjectFactory: {
    abi: ProjectFactoryAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(PROJECT_FACTORY_DEPLOYMENTS, LAZYGIVING_START_BLOCK),
  },

  // Factory contract for creating ERC1155 tokens
  ERC1155Factory: {
    abi: PremintingERC1155FactoryAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(ERC1155_FACTORY_DEPLOYMENTS, LAZYGIVING_START_BLOCK),
  },

  // Dynamically indexed assurance contracts (created by factory)
  // Uses Ponder's factory pattern to index child contracts
  // The factory() function returns addresses discovered from factory events
  AssuranceContract: {
    abi: AssuranceContractAbi,
    chain: INDEXER_CHAIN,
    address: factoryAddress(ASSURANCE_CONTRACT_FACTORY_DEPLOYMENTS)
      ? factory({
          ...factoryAddress(ASSURANCE_CONTRACT_FACTORY_DEPLOYMENTS)!,
          event: assuranceContractCreatedEvent,
          parameter: "assuranceContract",
        })
      : undefined,
    startBlock: deploymentStartBlock(ASSURANCE_CONTRACT_FACTORY_DEPLOYMENTS, LAZYGIVING_START_BLOCK),
  },

  // Dynamically indexed ERC1155 token contracts (created by factory)
  // Used to track token burns (transfers to zero address)
  PremintingERC1155: {
    abi: PremintingERC1155Abi,
    chain: INDEXER_CHAIN,
    address: factoryAddress(ERC1155_FACTORY_DEPLOYMENTS)
      ? factory({
          ...factoryAddress(ERC1155_FACTORY_DEPLOYMENTS)!,
          event: erc1155ContractCreatedEvent,
          parameter: "erc1155",
        })
      : undefined,
    startBlock: deploymentStartBlock(ERC1155_FACTORY_DEPLOYMENTS, LAZYGIVING_START_BLOCK),
  },

  // ========================================================================
  // DELEGATION INDEXER CONTRACTS
  // ========================================================================
  // These are logically separate from Conceptspace and LazyGiving contracts.
  // The Delegation indexer tracks delegatable notes and delegation chains.

  DelegatableNotes: {
    abi: DelegatableNotesAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(DELEGATABLE_NOTES_DEPLOYMENTS, DELEGATION_START_BLOCK),
  },

  RecurringPledges: {
    abi: RecurringPledgesAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(RECURRING_PLEDGES_DEPLOYMENTS, DELEGATION_START_BLOCK),
  },

  NoteIntent: {
    abi: NoteIntentAbi,
    chain: INDEXER_CHAIN,
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
    chain: INDEXER_CHAIN,
    ...deploymentConfig(ALIGNMENT_ATTESTATIONS_DEPLOYMENTS, FUNDING_PORTAL_START_BLOCK),
  },

  // ========================================================================
  // SUBJECTIV IDENTITY INDEXER CONTRACTS
  // ========================================================================
  // AccountAssertions - tier-0/1 proof-of-personhood self-declarations
  // ("this is my one Commonality account"). Indexed so the SDK can build the
  // knownTiers map (tier 1 for asserted anchors) for tiered Tally head-counts.

  AccountAssertions: {
    abi: AccountAssertionsAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(ACCOUNT_ASSERTIONS_DEPLOYMENTS, START_BLOCK),
  },

  // TrustRegistry — Subjectiv direct-trust edges. CauseStarter (and the
  // alignment-trust bootstrap) fold TrustSet events client-side.
  TrustRegistry: {
    abi: TrustRegistryAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(TRUST_REGISTRY_DEPLOYMENTS, START_BLOCK),
  },

  // ========================================================================
  // MUTABLE REFS INDEXER CONTRACTS
  // ========================================================================
  // This is a utility contract that can be used by any subsystem to track
  // mutable references (pointers to IPFS content). Users can create named
  // refs that point to IPFS CIDs or other string values.

  MutableRefUpdater: {
    abi: MutableRefUpdaterAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(MUTABLE_REF_UPDATER_DEPLOYMENTS, START_BLOCK),
  },

  // ========================================================================
  // NUDGER INDEXER CONTRACTS
  // ========================================================================

  NudgePublications: {
    abi: NudgePublicationsAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(NUDGE_PUBLICATIONS_DEPLOYMENTS, START_BLOCK),
  },

  // ========================================================================
  // PUBLISHED DATA INDEXER CONTRACTS
  // ========================================================================

  PublishedData: {
    abi: PublishedDataAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(PUBLISHED_DATA_DEPLOYMENTS, PUBLISHED_DATA_START_BLOCK),
  },

  // ========================================================================
  // CONTENT FUNDING INDEXER CONTRACTS
  // ========================================================================
  // Content Registry - tracks registered content items and their contracts
  ContentRegistry: {
    abi: ContentRegistryAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(CONTENT_REGISTRY_DEPLOYMENTS, CONTENT_FUNDING_START_BLOCK),
  },

  // Channel Registry - tracks channel verification and control states
  ChannelRegistry: {
    abi: ChannelRegistryAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(CHANNEL_REGISTRY_DEPLOYMENTS, CONTENT_FUNDING_START_BLOCK),
  },

  // Channel Escrow - holds funds for unclaimed channels
  ChannelEscrow: {
    abi: ChannelEscrowAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(CHANNEL_ESCROW_DEPLOYMENTS, CONTENT_FUNDING_START_BLOCK),
  },

  // Creator Assurance Contract Factory - creates content-funding contracts
  CreatorAssuranceContractFactory: {
    abi: CreatorAssuranceContractFactoryAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(CREATOR_CONTRACT_FACTORY_DEPLOYMENTS, CONTENT_FUNDING_START_BLOCK),
  },

  ProspectiveContentRoundFactory: {
    abi: ProspectiveContentRoundFactoryAbi,
    chain: INDEXER_CHAIN,
    ...deploymentConfig(PROSPECTIVE_FACTORY_DEPLOYMENTS, CONTENT_FUNDING_START_BLOCK),
  },

  MaterializedContentTokens: {
    abi: MaterializedContentTokensAbi,
    chain: INDEXER_CHAIN,
    address: factoryAddress(PROSPECTIVE_FACTORY_DEPLOYMENTS)
      ? factory({ ...factoryAddress(PROSPECTIVE_FACTORY_DEPLOYMENTS)!, event: prospectiveRoundMaterializedEvent, parameter: "tokenContract" })
      : undefined,
    startBlock: deploymentStartBlock(PROSPECTIVE_FACTORY_DEPLOYMENTS, CONTENT_FUNDING_START_BLOCK),
  },

  // Prospective rounds use the same assurance-contract event surface as
  // creator contracts, so index them for the shared backing/details UI.
  ProspectiveContentAssuranceContract: {
    abi: AssuranceContractAbi,
    chain: INDEXER_CHAIN,
    address: factoryAddress(PROSPECTIVE_FACTORY_DEPLOYMENTS)
      ? factory({
          ...factoryAddress(PROSPECTIVE_FACTORY_DEPLOYMENTS)!,
          event: prospectiveRoundCreatedEvent,
          parameter: "round",
        })
      : undefined,
    startBlock: deploymentStartBlock(PROSPECTIVE_FACTORY_DEPLOYMENTS, CONTENT_FUNDING_START_BLOCK),
  },

  // Dynamically indexed creator assurance contracts (created by factory)
  CreatorAssuranceContract: {
    abi: AssuranceContractAbi,
    chain: INDEXER_CHAIN,
    address: factoryAddress(CREATOR_CONTRACT_FACTORY_DEPLOYMENTS)
      ? factory({
          ...factoryAddress(CREATOR_CONTRACT_FACTORY_DEPLOYMENTS)!,
          event: creatorContractCreatedEvent,
          parameter: "contractAddress",
        })
      : undefined,
    startBlock: deploymentStartBlock(CREATOR_CONTRACT_FACTORY_DEPLOYMENTS, CONTENT_FUNDING_START_BLOCK),
  },
} as const;

function getActiveChains() {
  switch (INDEXER_CHAIN) {
    case "hardhat":
      return {
        hardhat: {
          id: INDEXER_CHAIN_IDS.hardhat,
          rpc: getRpcTransport(process.env.PONDER_RPC_URL_31337 || "http://localhost:8545"),
          pollingInterval: 100, // Poll every 100ms for faster test execution (default is 1000ms)
        },
      } as const;
    case "base-sepolia":
      return {
        "base-sepolia": {
          id: INDEXER_CHAIN_IDS["base-sepolia"],
          rpc: getRpcTransport(process.env.PONDER_RPC_URL_84532),
          ethGetLogsBlockRange: ETH_GET_LOGS_BLOCK_RANGE ?? 1000,
        },
      } as const;
    case "mainnet":
      return {
        mainnet: {
          id: INDEXER_CHAIN_IDS.mainnet,
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
