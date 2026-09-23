import { IPFSConfig } from './utils/ipfs.js';
import { TwitterApiConfig } from './utils/twitter.js';
import { type PublicClient } from 'viem';
import type { ContentResolver } from './subsystems/published-data/content-resolver.js';

/**
 * Configuration flags used when running the SDK in a test environment.
 */
export interface TestConfig {
  /** When true, the SDK may skip rate-limited external calls (e.g. Twitter API). */
  areWeJustRunningTests?: boolean;
  /** When true, query and action helpers emit extra debug logging. */
  shouldTestsBeVerbose?: boolean;
}

/**
 * Conceptspace contracts: statements, implications, generic subject
 * attestations, publications, and trust. A non-financial deployment
 * supplies these and nothing from {@link FundingContractAddresses}.
 *
 * Do not fill unused addresses with the zero address. Omit a field the
 * deployment does not have, and fail at the action that needs it.
 */
export interface ConceptspaceContractAddresses {
  /** Beliefs.sol -- stores direct belief attestations on statements. */
  beliefs: `0x${string}`;
  /** Implications.sol -- stores implication links between statements. */
  implications: `0x${string}`;
  /** AlignmentAttestations.sol -- links arbitrary subjects to statements. */
  alignmentAttestations: `0x${string}`;
  /** MutableRefUpdater.sol -- on-chain named mutable references. */
  mutableRefUpdater: `0x${string}`;
  /** TrustRegistry.sol -- stores direct trust scores between addresses. */
  trustRegistry: `0x${string}`;
  /** AccountAssertions.sol -- tier-0/1 proof-of-personhood self-declarations. */
  accountAssertions?: `0x${string}`;
  /** NudgePublications.sol -- records nudger publication CIDs. */
  nudgePublications?: `0x${string}`;
  /** PublishedData.sol -- shared user-published content/retraction registry. */
  publishedData?: `0x${string}`;
}

/**
 * Funding contracts. Present only on a deployment that moves value.
 * Content-funding factories may be omitted where those contracts are
 * not deployed; the four core fields are required once this capability
 * is configured.
 */
export interface FundingContractAddresses {
  /** CreatorAssuranceContractFactory.sol -- deploys new crowdfunding projects. */
  assuranceContractFactory: `0x${string}`;
  /** Factory that deploys per-project ERC-1155 token contracts. */
  erc1155Factory: `0x${string}`;
  /** DelegatableNotes.sol -- ERC-20/ERC-1155 note delegation tree. */
  delegatableNotes: `0x${string}`;
  /** NoteIntent.sol -- records the intended purpose of a note. */
  noteIntent: `0x${string}`;
  /** RecurringPledges.sol -- standing pledge intent registry and executor. */
  recurringPledges?: `0x${string}`;
  /** ContentRegistry.sol -- registers content for the content-funding subsystem. */
  contentRegistry?: `0x${string}`;
  /** BeneficiaryRegistry.sol -- registers funding channels. */
  beneficiaryRegistry?: `0x${string}`;
  /** BeneficiaryEscrow.sol -- holds escrowed funds for channels. */
  beneficiaryEscrow?: `0x${string}`;
  /** Factory that deploys per-creator assurance contracts. */
  creatorContractFactory?: `0x${string}`;
  /** Factory for channel-bound future-content rounds. */
  prospectiveContentRoundFactory?: `0x${string}`;
}

/**
 * Full deployment: Conceptspace plus funding. Prefer
 * {@link ConceptspaceContractAddresses} when the process does not fund.
 */
export type ContractAddresses = ConceptspaceContractAddresses & FundingContractAddresses;

/**
 * Addresses a process actually has. Funding fields are present only when
 * that capability is configured.
 */
export type DeployedContractAddresses = ConceptspaceContractAddresses & Partial<FundingContractAddresses>;

export type ContractAddressesByChain = Record<number, DeployedContractAddresses>;

const FUNDING_CORE_FIELDS = [
  'assuranceContractFactory',
  'erc1155Factory',
  'delegatableNotes',
  'noteIntent',
] as const;

/** Throw if a funding action is invoked without its contract addresses. */
export function requireFundingContractAddresses(
  addresses: Partial<FundingContractAddresses> | undefined,
): FundingContractAddresses {
  const missing = FUNDING_CORE_FIELDS.filter((field) => !addresses?.[field]);
  if (missing.length > 0) {
    throw new Error(
      `Funding contract addresses are required (${missing.join(', ')}). ` +
      'A Conceptspace-only configuration does not include them.',
    );
  }
  return addresses as FundingContractAddresses;
}

export type SDKMachinery = {
  ipfsConfig: IPFSConfig;
  twitterApiConfig: TwitterApiConfig;
  testConfig: TestConfig;
  /** Viem public client for on-chain reads. Required for on-chain read functions. */
  publicClient?: PublicClient;
  /** Event cache API base URL for client-side folding queries and the indexer /status endpoint. */
  eventCacheUrl?: string;
  /** Deployed contract addresses for event-cache filtering. Required when using eventCacheUrl. */
  contractAddresses?: DeployedContractAddresses;
  /** Default chain for bare addresses and single-chain deployments. */
  defaultChainId?: number;
  /** Optional chain-key used by services such as Ponder status responses. */
  chainStatusKey?: string;
  /** Optional chain-keyed address registry for multi-chain deployments. */
  contractAddressesByChain?: ContractAddressesByChain;
  /** Settlement ERC-20s whose balances may be included in soft note-intent aggregates. */
  settlementTokenAddresses?: `0x${string}`[];
  /**
   * Where PublishedData content bytes are fetched from.
   *
   * Defaults to recovering them from the publishing transaction's calldata via `publicClient`.
   * Set this to read content from a different storage backend instead — it is the application-level
   * half of the seam described in subsystems/published-data/content-resolver.ts.
   */
  publishedContentResolver?: ContentResolver;
};

export function createSDKMachinery(options: Partial<SDKMachinery>): SDKMachinery {
  return {
    ipfsConfig: options.ipfsConfig ?? {},
    twitterApiConfig: options.twitterApiConfig ?? {},
    testConfig: options.testConfig ?? {},
    publicClient: options.publicClient,
    eventCacheUrl: options.eventCacheUrl,
    contractAddresses: options.contractAddresses,
    defaultChainId: options.defaultChainId,
    chainStatusKey: options.chainStatusKey,
    contractAddressesByChain: options.contractAddressesByChain,
    settlementTokenAddresses: options.settlementTokenAddresses,
    publishedContentResolver: options.publishedContentResolver,
  };
}

export function getContractAddressesForChain(
  machinery: SDKMachinery,
  chainId: number = machinery.defaultChainId ?? 31337,
): DeployedContractAddresses | undefined {
  return machinery.contractAddressesByChain?.[chainId] ?? machinery.contractAddresses;
}
