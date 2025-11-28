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
import { AssuranceContractAbi } from "./abis/AssuranceContractAbi";
import { ERC1155SecondaryMarketAbi } from "./abis/ERC1155SecondaryMarketAbi";

// Delegation ABIs
import { DelegatableNotesAbi } from "./abis/DelegatableNotesAbi";

// Funding Portal ABIs
import { ProjectAlignmentAbi } from "./abis/ProjectAlignmentAbi";

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

// ============================================================================
// FUNDING PORTAL CONTRACT ADDRESSES
// ============================================================================
const PROJECT_ALIGNMENT_ADDRESS = (process.env.PROJECT_ALIGNMENT_ADDRESS && process.env.PROJECT_ALIGNMENT_ADDRESS !== '') ? process.env.PROJECT_ALIGNMENT_ADDRESS as `0x${string}` : undefined;

// Start block - set to the block where contracts were deployed
const START_BLOCK = Number(process.env.START_BLOCK || 0);
const PUBSTARTER_START_BLOCK = Number(process.env.PUBSTARTER_START_BLOCK || START_BLOCK);
const DELEGATION_START_BLOCK = Number(process.env.DELEGATION_START_BLOCK || START_BLOCK);
const FUNDING_PORTAL_START_BLOCK = Number(process.env.FUNDING_PORTAL_START_BLOCK || START_BLOCK);

export default createConfig({
  database: process.env.PONDER_EPHEMERAL === 'true'
    ? { kind: "pglite", directory: undefined } // Uses in-memory ephemeral database
    : undefined, // Uses default persistent database
  chains: {
    // Local Hardhat network for development
    hardhat: {
      id: 31337,
      rpc: http(process.env.PONDER_RPC_URL_31337 || "http://localhost:8545", {
        timeout: 10_000, // 10 second timeout instead of default
      }),
      pollingInterval: 100, // Poll every 100ms for faster test execution (default is 1000ms)
      disableCache: true,   // Disable caching for local development to avoid stale data
    },
  },
  contracts: {
    // ========================================================================
    // CONCEPTSPACE INDEXER CONTRACTS
    // ========================================================================

    // Beliefs contract - tracks user beliefs about statements
    Beliefs: {
      abi: BeliefsAbi,
      chain: "hardhat",
      address: BELIEFS_ADDRESS,
      startBlock: START_BLOCK,
    },
    // Implications contract - tracks implication attestations between statements
    Implications: {
      abi: ImplicationsAbi,
      chain: "hardhat",
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
      chain: "hardhat",
      address: ASSURANCE_CONTRACT_FACTORY_ADDRESS,
      startBlock: PUBSTARTER_START_BLOCK,
    },

    // Factory contract for creating ERC1155 tokens
    ERC1155Factory: {
      abi: PremintingERC1155FactoryAbi,
      chain: "hardhat",
      address: ERC1155_FACTORY_ADDRESS,
      startBlock: PUBSTARTER_START_BLOCK,
    },

    // Factory contract for creating secondary marketplaces
    MarketplaceFactory: {
      abi: MarketplaceFactoryAbi,
      chain: "hardhat",
      address: MARKETPLACE_FACTORY_ADDRESS,
      startBlock: PUBSTARTER_START_BLOCK,
    },

    // Dynamically indexed assurance contracts (created by factory)
    // Uses Ponder's factory pattern to index child contracts
    // The factory() function returns addresses discovered from factory events
    AssuranceContract: {
      abi: AssuranceContractAbi,
      chain: "hardhat",
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
      chain: "hardhat",
      address: MARKETPLACE_FACTORY_ADDRESS
        ? factory({
            address: MARKETPLACE_FACTORY_ADDRESS,
            event: MarketplaceFactoryAbi[0], // PubstarterERC1155SecondaryMarketCreated
            parameter: "marketplace",
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
      chain: "hardhat",
      address: DELEGATABLE_NOTES_ADDRESS,
      startBlock: DELEGATION_START_BLOCK,
    },

    // ========================================================================
    // FUNDING PORTAL INDEXER CONTRACTS
    // ========================================================================
    // These are logically separate from the foundational subsystems above.
    // The Funding Portal indexer tracks project alignment attestations and
    // federates queries to other subsystems' APIs for cross-cutting views.

    ProjectAlignment: {
      abi: ProjectAlignmentAbi,
      chain: "hardhat",
      address: PROJECT_ALIGNMENT_ADDRESS,
      startBlock: FUNDING_PORTAL_START_BLOCK,
    },
  },
});
