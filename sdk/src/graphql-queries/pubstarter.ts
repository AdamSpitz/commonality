/**
 * GraphQL-based pubstarter queries
 *
 * All wrapper functions have been removed. Tests should use the graphql-helpers module.
 * This file now only exports type definitions.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface Project {
  id: string;
  totalReceived: string;
  threshold: string;
  deadline: string;
  cid?: string;
  title?: string;
  description?: string;
  createdAt: string;
}

export interface ProjectToken {
  id: string;
  projectId: string;
  tokenId: string;
  supply: string;
  price: string;
  createdAt: string;
}

export interface Contribution {
  id: string;
  projectAddress: string;
  participant: string;
  erc1155Address?: string;
  tokenIds?: string;
  tokenCounts?: string;
  totalCost?: string;
  amount: string;
  timestamp: string;
  createdAt?: string;
  blockNumber: string;
  transactionHash?: string;
}

export interface Refund {
  id: string;
  projectAddress: string;
  participant: string;
  erc1155Address?: string;
  tokenIds?: string;
  tokenCounts?: string;
  totalRefund: string;
  createdAt: string;
  blockNumber: string;
  transactionHash?: string;
}

export interface SaleListing {
  id: string;
  projectAddress: string;
  tokenId: string;
  seller: string;
  amount: string;
  pricePerToken: string;
  createdAt: string;
}

export interface BuyOrder {
  id: string;
  projectAddress: string;
  tokenId: string;
  buyer: string;
  amount: string;
  pricePerToken: string;
  createdAt: string;
}

export interface Trade {
  id: string;
  marketplaceAddress: string;
  orderType: string;
  orderId: string;
  buyer: string;
  seller: string;
  tokenId: string;
  count: string;
  pricePerToken: string;
  totalPrice: string;
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}

export interface TokenBurn {
  id: string;
  erc1155Address: string;
  burner: string;
  tokenIds: string;
  tokenCounts: string;
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}

export interface ProjectWithMetrics {
  project: Project;
  totalContributions: string;
  contributionCount: number;
  activeTokens: number;
  fundingProgress: number;
}

export interface ProjectWithFundingProgress extends Project {
  fundingProgress: number;
}

export interface ProjectFilterOptions {
  statementId?: string;
  attester?: string;
  minThreshold?: string | bigint;
  maxThreshold?: string | bigint;
  deadlineAfter?: string;
  deadlineBefore?: string;
  activeOnly?: boolean;
}

export type ProjectSortField = 'date' | 'deadline' | 'fundingGoal' | 'fundingProgress' | 'amountRaised';
export type SortDirection = 'asc' | 'desc';
