import { createConfig, factory } from "ponder";
import { http } from "viem";

// Conceptspace ABIs
import { BeliefsAbi } from "./abis/BeliefsAbi";
import { ImplicationsAbi } from "./abis/ImplicationsAbi";

// Pubstarter ABIs
import {
  AssuranceContractFactoryAbi,
  PremintingERC1155FactoryAbi,
  MarketplaceFactoryAbi,
} from "./abis/PubstarterFactoriesAbi";
import { MultiERC1155AssuranceContractAbi as AssuranceContractAbi } from "./abis/AssuranceContractAbi";
import { ERC1155SecondaryMarketAbi } from "./abis/ERC1155SecondaryMarketAbi";
import { PremintingERC1155Abi } from "./abis/PremintingERC1155Abi";

// Delegation ABIs
import { DelegatableNotesAbi } from "./abis/DelegatableNotesAbi";
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

const SUPPORTED_CHAINS = ["hardhat", "sepolia", "mainnet"] as const;
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

// ============================================================================
// CONCEPTSPACE CONTRACT ADDRESSES
// ============================================================================
const BELIEFS_ADDRESS = (process.env.BELIEFS_CONTRACT_ADDRESS && process.env.BELIEFS_CONTRACT_ADDRESS !== '') ? process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}` : undefined;
const IMPLICATIONS_ADDRESS = (process.env.IMPLICATIONS_CONTRACT_ADDRESS && process.env.IMPLICATIONS_CONTRACT_ADDRESS !== '') ? process.env.IMPLICATIONS_CONTRACT_ADDRESS as `0x${string}` : undefined;

// ============================================================================
// PUBSTARTER CONTRACT ADDRESSES
// ============================================================================
// Factory contracts - these emit events when new projects are created
const ASSURANCE_CONTRACT_FACTORY_ADDRESS = (process.env.ASSURANCE_CONTRACT_FACTORY_ADDRESS && process.env.ASSURANCE_CONTRACT_FACTORY_ADDRESS !== '') ? process.env.ASSURANCE_CONTRACT_FACTORY_ADDRESS as `0x${string}` : undefined;
const ERC1155_FACTORY_ADDRESS = (process.env.ERC1155_FACTORY_ADDRESS && process.env.ERC1155_FACTORY_ADDRESS !== '') ? process.env.ERC1155_FACTORY_ADDRESS as `0x${string}` : undefined;
const MARKETPLACE_FACTORY_ADDRESS = (process.env.MARKETPLACE_FACTORY_ADDRESS && process.env.MARKETPLACE_FACTORY_ADDRESS !== '') ? process.env.MARKETPLACE_FACTORY_ADDRESS as `0x${string}` : undefined;

// ============================================================================
// DELEGATION CONTRACT ADDRESSES
// ============================================================================
const DELEGATABLE_NOTES_ADDRESS = (process.env.DELEGATABLE_NOTES_ADDRESS && process.env.DELEGATABLE_NOTES_ADDRESS !== '') ? process.env.DELEGATABLE_NOTES_ADDRESS as `0x${string}` : undefined;
const NOTE_INTENT_ADDRESS = (process.env.NOTE_INTENT_ADDRESS && process.env.NOTE_INTENT_ADDRESS !== '') ? process.env.NOTE_INTENT_ADDRESS as `0x${string}` : undefined;

// ============================================================================
// FUNDING PORTAL CONTRACT ADDRESSES
// ============================================================================
const ALIGNMENT_ATTESTATIONS_ADDRESS = (process.env.ALIGNMENT_ATTESTATIONS_ADDRESS && process.env.ALIGNMENT_ATTESTATIONS_ADDRESS !== '') ? process.env.ALIGNMENT_ATTESTATIONS_ADDRESS as `0x${string}` : undefined;

// ============================================================================
// MUTABLE REFS CONTRACT ADDRESSES
// ============================================================================
const MUTABLE_REF_UPDATER_ADDRESS = (process.env.MUTABLE_REF_UPDATER_ADDRESS && process.env.MUTABLE_REF_UPDATER_ADDRESS !== '') ? process.env.MUTABLE_REF_UPDATER_ADDRESS as `0x${string}` : undefined;

// ============================================================================
// NUDGER CONTRACT ADDRESSES
// ============================================================================
const NUDGE_PUBLICATIONS_ADDRESS = (process.env.NUDGE_PUBLICATIONS_CONTRACT_ADDRESS && process.env.NUDGE_PUBLICATIONS_CONTRACT_ADDRESS !== '') ? process.env.NUDGE_PUBLICATIONS_CONTRACT_ADDRESS as `0x${string}` : undefined;

// ============================================================================
// CONTENT FUNDING CONTRACT ADDRESSES
// ============================================================================
const CONTENT_REGISTRY_ADDRESS = (process.env.CONTENT_REGISTRY_ADDRESS && process.env.CONTENT_REGISTRY_ADDRESS !== '') ? process.env.CONTENT_REGISTRY_ADDRESS as `0x${string}` : undefined;
const CHANNEL_REGISTRY_ADDRESS = (process.env.CHANNEL_REGISTRY_ADDRESS && process.env.CHANNEL_REGISTRY_ADDRESS !== '') ? process.env.CHANNEL_REGISTRY_ADDRESS as `0x${string}` : undefined;
const CHANNEL_ESCROW_ADDRESS = (process.env.CHANNEL_ESCROW_ADDRESS && process.env.CHANNEL_ESCROW_ADDRESS !== '') ? process.env.CHANNEL_ESCROW_ADDRESS as `0x${string}` : undefined;
const CREATOR_CONTRACT_FACTORY_ADDRESS = (process.env.CREATOR_CONTRACT_FACTORY_ADDRESS && process.env.CREATOR_CONTRACT_FACTORY_ADDRESS !== '') ? process.env.CREATOR_CONTRACT_FACTORY_ADDRESS as `0x${string}` : undefined;

// Start block - set to the block where contracts were deployed
const START_BLOCK = Number(process.env.START_BLOCK || 0);
const PUBSTARTER_START_BLOCK = Number(process.env.PUBSTARTER_START_BLOCK || START_BLOCK);
const DELEGATION_START_BLOCK = Number(process.env.DELEGATION_START_BLOCK || START_BLOCK);
const FUNDING_PORTAL_START_BLOCK = Number(process.env.FUNDING_PORTAL_START_BLOCK || START_BLOCK);
const CONTENT_FUNDING_START_BLOCK = Number(process.env.CONTENT_FUNDING_START_BLOCK || START_BLOCK);
const INDEXER_CHAIN = getIndexerChain();

const contracts = {
  // ========================================================================
  // CONCEPTSPACE INDEXER CONTRACTS
  // ========================================================================

  // Beliefs contract - tracks user beliefs about statements
  Beliefs: {
    abi: BeliefsAbi,
    chain: INDEXER_CHAIN,
    address: BELIEFS_ADDRESS,
    startBlock: START_BLOCK,
  },
  // Implications contract - tracks implication attestations between statements
  Implications: {
    abi: ImplicationsAbi,
    chain: INDEXER_CHAIN,
    address: IMPLICATIONS_ADDRESS,
    startBlock: START_BLOCK,
  },

  // ========================================================================
  // PUBSTARTER INDEXER CONTRACTS
  // ========================================================================
  // These are logically separate from Conceptspace contracts.
  // The Pubstarter indexer tracks crowdfunding projects and secondary markets.

  // Factory contract for creating assurance contracts
  AssuranceContractFactory: {
    abi: AssuranceContractFactoryAbi,
    chain: INDEXER_CHAIN,
    address: ASSURANCE_CONTRACT_FACTORY_ADDRESS,
    startBlock: PUBSTARTER_START_BLOCK,
  },

  // Factory contract for creating ERC1155 tokens
  ERC1155Factory: {
    abi: PremintingERC1155FactoryAbi,
    chain: INDEXER_CHAIN,
    address: ERC1155_FACTORY_ADDRESS,
    startBlock: PUBSTARTER_START_BLOCK,
  },

  // Factory contract for creating secondary marketplaces
  MarketplaceFactory: {
    abi: MarketplaceFactoryAbi,
    chain: INDEXER_CHAIN,
    address: MARKETPLACE_FACTORY_ADDRESS,
    startBlock: PUBSTARTER_START_BLOCK,
  },

  // Dynamically indexed assurance contracts (created by factory)
  // Uses Ponder's factory pattern to index child contracts
  // The factory() function returns addresses discovered from factory events
  AssuranceContract: {
    abi: AssuranceContractAbi,
    chain: INDEXER_CHAIN,
    address: ASSURANCE_CONTRACT_FACTORY_ADDRESS
      ? factory({
          address: ASSURANCE_CONTRACT_FACTORY_ADDRESS,
          event: AssuranceContractFactoryAbi[0], // PubstarterAssuranceContractCreated
          parameter: "assuranceContract",
        })
      : undefined,
    startBlock: PUBSTARTER_START_BLOCK,
  },

  // Dynamically indexed secondary marketplaces (created by factory)
  SecondaryMarket: {
    abi: ERC1155SecondaryMarketAbi,
    chain: INDEXER_CHAIN,
    address: MARKETPLACE_FACTORY_ADDRESS
      ? factory({
          address: MARKETPLACE_FACTORY_ADDRESS,
          event: MarketplaceFactoryAbi[0], // PubstarterERC1155SecondaryMarketCreated
          parameter: "marketplace",
        })
      : undefined,
    startBlock: PUBSTARTER_START_BLOCK,
  },

  // Dynamically indexed ERC1155 token contracts (created by factory)
  // Used to track token burns (transfers to zero address)
  PremintingERC1155: {
    abi: PremintingERC1155Abi,
    chain: INDEXER_CHAIN,
    address: ERC1155_FACTORY_ADDRESS
      ? factory({
          address: ERC1155_FACTORY_ADDRESS,
          event: PremintingERC1155FactoryAbi[0], // PubstarterERC1155ContractCreated
          parameter: "erc1155",
        })
      : undefined,
    startBlock: PUBSTARTER_START_BLOCK,
  },

  // ========================================================================
  // DELEGATION INDEXER CONTRACTS
  // ========================================================================
  // These are logically separate from Conceptspace and Pubstarter contracts.
  // The Delegation indexer tracks delegatable notes and delegation chains.

  DelegatableNotes: {
    abi: DelegatableNotesAbi,
    chain: INDEXER_CHAIN,
    address: DELEGATABLE_NOTES_ADDRESS,
    startBlock: DELEGATION_START_BLOCK,
  },

  NoteIntent: {
    abi: NoteIntentAbi,
    chain: INDEXER_CHAIN,
    address: NOTE_INTENT_ADDRESS,
    startBlock: DELEGATION_START_BLOCK,
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
    address: ALIGNMENT_ATTESTATIONS_ADDRESS,
    startBlock: FUNDING_PORTAL_START_BLOCK,
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
    address: MUTABLE_REF_UPDATER_ADDRESS,
    startBlock: START_BLOCK,
  },

  // ========================================================================
  // NUDGER INDEXER CONTRACTS
  // ========================================================================

  NudgePublications: {
    abi: NudgePublicationsAbi,
    chain: INDEXER_CHAIN,
    address: NUDGE_PUBLICATIONS_ADDRESS,
    startBlock: START_BLOCK,
  },

  // ========================================================================
  // CONTENT FUNDING INDEXER CONTRACTS
  // ========================================================================
  // Content Registry - tracks registered content items and their contracts
  ContentRegistry: {
    abi: ContentRegistryAbi,
    chain: INDEXER_CHAIN,
    address: CONTENT_REGISTRY_ADDRESS,
    startBlock: CONTENT_FUNDING_START_BLOCK,
  },

  // Channel Registry - tracks channel verification and control states
  ChannelRegistry: {
    abi: ChannelRegistryAbi,
    chain: INDEXER_CHAIN,
    address: CHANNEL_REGISTRY_ADDRESS,
    startBlock: CONTENT_FUNDING_START_BLOCK,
  },

  // Channel Escrow - holds funds for unclaimed channels
  ChannelEscrow: {
    abi: ChannelEscrowAbi,
    chain: INDEXER_CHAIN,
    address: CHANNEL_ESCROW_ADDRESS,
    startBlock: CONTENT_FUNDING_START_BLOCK,
  },

  // Creator Assurance Contract Factory - creates content-funding contracts
  CreatorAssuranceContractFactory: {
    abi: CreatorAssuranceContractFactoryAbi,
    chain: INDEXER_CHAIN,
    address: CREATOR_CONTRACT_FACTORY_ADDRESS,
    startBlock: CONTENT_FUNDING_START_BLOCK,
  },

  // Dynamically indexed creator assurance contracts (created by factory)
  CreatorAssuranceContract: {
    abi: AssuranceContractAbi,
    chain: INDEXER_CHAIN,
    address: CREATOR_CONTRACT_FACTORY_ADDRESS
      ? factory({
          address: CREATOR_CONTRACT_FACTORY_ADDRESS,
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
    case "sepolia":
      return {
        sepolia: {
          id: 11155111,
          rpc: getRpcTransport(process.env.PONDER_RPC_URL_11155111),
        },
      } as const;
    case "mainnet":
      return {
        mainnet: {
          id: 1,
          rpc: getRpcTransport(process.env.PONDER_RPC_URL_1),
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
