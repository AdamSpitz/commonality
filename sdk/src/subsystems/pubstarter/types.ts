
/**
 * A crowdfunding project created via the Pubstarter system.
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
  /** Minimum funding amount (in wei) required for success. */
  threshold: string;
  /** Unix timestamp deadline for the funding campaign. */
  deadline: string;
  /** Cumulative amount received (in wei), net of refunds. */
  totalReceived: string;
  /** Address of the EthThresholdCondition contract, if configured. */
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

/** A sell-side listing on the ERC-1155 secondary marketplace. */
export interface SaleListing {
  /** Address of the marketplace contract. */
  marketplaceAddress: string;
  /** Unique listing ID within the marketplace. */
  listingId: string;
  /** Address of the seller. */
  seller: string;
  tokenId: string;
  /** Original quantity listed. */
  originalCount: string;
  /** Remaining quantity available for purchase. */
  remainingCount: string;
  /** Price per token (in wei). */
  pricePerToken: string;
  /** Current status: 'active', 'filled', or 'cancelled'. */
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** A buy-side order on the ERC-1155 secondary marketplace. */
export interface BuyOrder {
  /** Address of the marketplace contract. */
  marketplaceAddress: string;
  /** Unique order ID within the marketplace. */
  orderId: string;
  /** Address of the buyer. */
  buyer: string;
  tokenId: string;
  /** Original quantity requested. */
  originalCount: string;
  /** Remaining quantity to be filled. */
  remainingCount: string;
  /** Price per token (in wei). */
  pricePerToken: string;
  /** Current status: 'active', 'filled', or 'cancelled'. */
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** A completed trade on the secondary marketplace (from a fulfilled listing or order). */
export interface Trade {
  /** Unique ID derived from transactionHash-logIndex. */
  id: string;
  /** Address of the marketplace contract. */
  marketplaceAddress: string;
  /** Whether this trade came from a 'sale_listing' or 'buy_order'. */
  orderType: string;
  /** ID of the listing or order that was fulfilled. */
  orderId: string;
  buyer: string;
  seller: string;
  tokenId: string;
  /** Number of tokens traded. */
  count: string;
  /** Price per token (in wei). */
  pricePerToken: string;
  /** Total trade value (count * pricePerToken, in wei). */
  totalPrice: string;
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}

/**
 * A record of ERC-1155 tokens being burned (sent to the zero address).
 *
 * In the retroactive funding model, burning tokens converts from an
 * investor position to a donor position — demonstrating pure support.
 */
export interface TokenBurn {
  /** Unique ID derived from transactionHash-logIndex. */
  id: string;
  /** Address of the ERC-1155 token contract. */
  erc1155Address: string;
  /** Address of the user who burned the tokens. */
  burner: string;
  /** JSON-encoded array of token IDs burned. */
  tokenIds: string;
  /** JSON-encoded array of quantities burned per token ID. */
  tokenCounts: string;
  /** Block timestamp of the burn. */
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}
