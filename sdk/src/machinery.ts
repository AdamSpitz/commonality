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
 * Every field is optional on the configured object for that reason.
 */
export interface ConceptspaceContractAddresses {
  /** Beliefs.sol -- stores direct belief attestations on statements. */
  beliefs?: `0x${string}`;
  /** Implications.sol -- stores implication links between statements. */
  implications?: `0x${string}`;
  /** AlignmentAttestations.sol -- links arbitrary subjects to statements. */
  alignmentAttestations?: `0x${string}`;
  /** MutableRefUpdater.sol -- on-chain named mutable references. */
  mutableRefUpdater?: `0x${string}`;
  /** TrustRegistry.sol -- stores direct trust scores between addresses. */
  trustRegistry?: `0x${string}`;
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

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const FUNDING_CORE_FIELDS = [
  'assuranceContractFactory',
  'erc1155Factory',
  'delegatableNotes',
  'noteIntent',
] as const;

function isConfiguredAddress(value: `0x${string}` | undefined): value is `0x${string}` {
  return !!value && value.toLowerCase() !== ZERO_ADDRESS;
}

/** Keep a real address; drop empty strings and the zero address. */
export function configuredAddress(value: string | undefined): `0x${string}` | undefined {
  if (!value || value.toLowerCase() === ZERO_ADDRESS) return undefined;
  return value as `0x${string}`;
}

/** Throw if an action needs a Conceptspace contract that was not configured. */
export function requireConceptspaceContractAddress(
  addresses: Partial<ConceptspaceContractAddresses> | undefined,
  field: keyof ConceptspaceContractAddresses,
): `0x${string}` {
  const value = addresses?.[field];
  if (!isConfiguredAddress(value)) {
    throw new Error(
      `Conceptspace contract address "${field}" is required. ` +
      'Do not substitute the zero address.',
    );
  }
  return value;
}

/** Throw if a funding action is invoked without its contract addresses. */
export function requireFundingContractAddresses(
  addresses: Partial<FundingContractAddresses> | undefined,
): FundingContractAddresses {
  const missing = FUNDING_CORE_FIELDS.filter((field) => !isConfiguredAddress(addresses?.[field]));
  if (missing.length > 0) {
    throw new Error(
      `Funding contract addresses are required (${missing.join(', ')}). ` +
      'A Conceptspace-only configuration does not include them.',
    );
  }
  return addresses as FundingContractAddresses;
}

/**
 * Optional check that a hinted social handle is controlled by an address.
 * Conceptspace profiles work without it. A funding deployment may install
 * the beneficiary-registry adapter; that proof is not authorization to
 * claim funds.
 */
export type VerifiedSocialAssociationLookup = (
  machinery: SDKMachinery,
  address: string,
  handleHint?: string,
) => Promise<{ twitterHandle: string } | null>;

/**
 * Throw if an action needs Twitter or ENS social lookup and the process
 * did not configure it. An empty object is a real configuration: ENS uses
 * the default mainnet RPC and follower counts are skipped.
 */
export function requireTwitterApiConfig(
  machinery: { twitterApiConfig?: TwitterApiConfig },
): TwitterApiConfig {
  if (!machinery.twitterApiConfig) {
    throw new Error(
      'Twitter API configuration is required for this action. ' +
      'A Conceptspace configuration does not include it unless social lookup is enabled.',
    );
  }
  return machinery.twitterApiConfig;
}

/**
 * Settlement ERC-20s are a funding capability. Native value (the zero
 * address) does not need this list. Throw when an action is specifically
 * including configured settlement tokens and none were provided.
 */
export function requireSettlementTokenAddresses(
  machinery: { settlementTokenAddresses?: `0x${string}`[] },
): `0x${string}`[] {
  const addresses = machinery.settlementTokenAddresses?.filter(isConfiguredAddress);
  if (!addresses || addresses.length === 0) {
    throw new Error(
      'Settlement token addresses are required for this action. ' +
      'A Conceptspace configuration does not include them.',
    );
  }
  return addresses;
}

export type SDKMachinery = {
  ipfsConfig: IPFSConfig;
  /**
   * Social lookup (ENS text records and the platform API). Omit it on a
   * deployment that does not resolve handles. Do not default this to `{}`.
   */
  twitterApiConfig?: TwitterApiConfig;
  /**
   * When set, signer profiles may mark a handle verified. Omit it and
   * profiles still resolve ENS text records.
   */
  verifiedSocialAssociation?: VerifiedSocialAssociationLookup;
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
  /**
   * Funding capability: settlement ERC-20s included in soft note-intent
   * aggregates, in addition to native value. Omit when the deployment
   * does not fund, or when only native value counts.
   */
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
    ...(options.twitterApiConfig ? { twitterApiConfig: options.twitterApiConfig } : {}),
    ...(options.verifiedSocialAssociation
      ? { verifiedSocialAssociation: options.verifiedSocialAssociation }
      : {}),
    testConfig: options.testConfig ?? {},
    publicClient: options.publicClient,
    eventCacheUrl: options.eventCacheUrl,
    contractAddresses: options.contractAddresses,
    defaultChainId: options.defaultChainId,
    chainStatusKey: options.chainStatusKey,
    contractAddressesByChain: options.contractAddressesByChain,
    ...(options.settlementTokenAddresses && options.settlementTokenAddresses.length > 0
      ? { settlementTokenAddresses: options.settlementTokenAddresses }
      : {}),
    publishedContentResolver: options.publishedContentResolver,
  };
}

export function getContractAddressesForChain(
  machinery: SDKMachinery,
  chainId: number = machinery.defaultChainId ?? 31337,
): DeployedContractAddresses | undefined {
  return machinery.contractAddressesByChain?.[chainId] ?? machinery.contractAddresses;
}
