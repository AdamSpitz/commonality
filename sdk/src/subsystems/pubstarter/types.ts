
export interface Project {
  id: string;
  erc1155Address: string;
  marketplaceAddress: string | null;
  recipient: string;
  threshold: string;
  deadline: string;
  totalReceived: string;
  conditionAddress: string | null;
  metadataCid?: string;
  createdAt?: string;
  blockNumber?: string;
}

export interface ProjectToken {
  projectAddress: string;
  erc1155Address: string;
  tokenId: string;
  price: string;
  createdAt: string;
}

export interface Contribution {
  id: string;
  participant: string;
  projectAddress: string;
  erc1155Address: string;
  tokenIds: string; // JSON array
  tokenCounts: string; // JSON array
  totalCost: string;
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}

export interface Refund {
  id: string;
  participant: string;
  projectAddress: string;
  erc1155Address: string;
  tokenIds: string; // JSON array
  tokenCounts: string; // JSON array
  totalRefund: string;
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}

export interface ProjectFilterOptions {
  // Filter by deadline
  minDeadline?: bigint;
  maxDeadline?: bigint;
  // Filter by threshold
  minThreshold?: bigint;
  maxThreshold?: bigint;
  // Filter by funding progress
  minTotalReceived?: bigint;
  maxTotalReceived?: bigint;
}

export type ProjectSortField =
  | 'createdAt'
  | 'deadline'
  | 'threshold'
  | 'totalReceived'
  | 'fundingProgress'; // totalReceived / threshold

export type SortDirection = 'asc' | 'desc';

export interface ProjectWithMetrics extends Project {
  fundingProgress: number; // 0.0 to 1.0+ (can exceed 1.0 if overfunded)
  createdAtBlock: string;
}

export interface SaleListing {
  marketplaceAddress: string;
  listingId: string;
  seller: string;
  tokenId: string;
  originalCount: string;
  remainingCount: string;
  pricePerToken: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuyOrder {
  marketplaceAddress: string;
  orderId: string;
  buyer: string;
  tokenId: string;
  originalCount: string;
  remainingCount: string;
  pricePerToken: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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
  tokenIds: string; // JSON array
  tokenCounts: string; // JSON array
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}
