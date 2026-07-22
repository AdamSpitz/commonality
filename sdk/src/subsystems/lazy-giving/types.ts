
import type { Currency } from '../../utils/currency.js';

/**
 * A crowdfunding project created via the LazyGiving system.
 *
 * Projects use an assurance-contract model: funds are held in escrow until the
 * threshold is met or the deadline passes. The project's address is the
 * assurance contract address.
 */
export interface Project {
  /** Assurance contract address (serves as the project's unique ID). */
  id: string;
  /** Address of the project's ERC-1155 token contract. */
  erc1155Address: string;
  /** Address of the project's secondary marketplace contract, if deployed. */
  marketplaceAddress: string | null;
  /** Address that receives funds if the project succeeds. */
  recipient: string;
  /** Currency used for threshold, contributions, refunds, and balances. */
  fundingCurrency: Currency;
  /** Minimum funding amount (in wei) required for success. */
  threshold: string;
  /** Unix timestamp deadline for the funding campaign. */
  deadline: string;
  /** Cumulative amount received (in wei), net of refunds. */
  totalReceived: string;
  /** Address of the ValueThresholdCondition contract, if configured. */
  conditionAddress: string | null;
  /** IPFS CID of the project's metadata document. */
  metadataCid?: string;
  /** ISO 8601 timestamp when the project was created. */
  createdAt?: string;
  /** Block number when the project was created. */
  blockNumber?: string;
}

/** A token tier offered by a project, with a fixed price per token. */
export interface ProjectToken {
  /** Assurance contract address of the project. */
  projectAddress: string;
  /** Address of the ERC-1155 token contract. */
  erc1155Address: string;
  /** Numeric token ID within the ERC-1155 contract. */
  tokenId: string;
  /** Currency used when buying this token tier. */
  currency: Currency;
  /** Price per token (in wei). */
  price: string;
  /** Block timestamp when this token was first offered. */
  createdAt: string;
}

/** A token purchase (contribution) to a project's assurance contract. */
export interface Contribution {
  /** Unique ID derived from transactionHash-logIndex. */
  id: string;
  /** Address of the buyer. */
  participant: string;
  /** Assurance contract address of the project. */
  projectAddress: string;
  /** Address of the ERC-1155 token contract. */
  erc1155Address: string;
  /** JSON-encoded array of token IDs purchased. */
  tokenIds: string;
  /** JSON-encoded array of quantities per token ID. */
  tokenCounts: string;
  /** Currency used for the purchase. */
  currency: Currency;
  /** Total cost paid (in wei). */
  totalCost: string;
  /** Block timestamp of the purchase. */
  createdAt: string;
  /** Block number of the purchase. */
  blockNumber: string;
  transactionHash: string;
}

/** A token return (refund) from a project's assurance contract. */
export interface Refund {
  /** Unique ID derived from transactionHash-logIndex. */
  id: string;
  /** Address of the refund recipient. */
  participant: string;
  /** Assurance contract address of the project. */
  projectAddress: string;
  /** Address of the ERC-1155 token contract. */
  erc1155Address: string;
  /** JSON-encoded array of token IDs returned. */
  tokenIds: string;
  /** JSON-encoded array of quantities per token ID. */
  tokenCounts: string;
  /** Currency used for the refund. */
  currency: Currency;
  /** Total refund amount (in wei). */
  totalRefund: string;
  /** Block timestamp of the refund. */
  createdAt: string;
  /** Block number of the refund. */
  blockNumber: string;
  transactionHash: string;
}

/** Filters for querying projects by numeric ranges. */
export interface ProjectFilterOptions {
  /** Minimum deadline (unix timestamp). */
  minDeadline?: bigint;
  /** Maximum deadline (unix timestamp). */
  maxDeadline?: bigint;
  /** Minimum funding threshold (in wei). */
  minThreshold?: bigint;
  /** Maximum funding threshold (in wei). */
  maxThreshold?: bigint;
  /** Minimum total received (in wei). */
  minTotalReceived?: bigint;
  /** Maximum total received (in wei). */
  maxTotalReceived?: bigint;
}

export type ProjectSortField =
  | 'createdAt'
  | 'deadline'
  | 'threshold'
  | 'totalReceived'
  | 'fundingProgress'; // totalReceived / threshold

export type SortDirection = 'asc' | 'desc';

/** A project with computed funding progress metric. */
export interface ProjectWithMetrics extends Project {
  /** Ratio of totalReceived to threshold (0.0–1.0+; can exceed 1.0 if overfunded). */
  fundingProgress: number;
  /** Block number when the project was created. */
  createdAtBlock: string;
}
