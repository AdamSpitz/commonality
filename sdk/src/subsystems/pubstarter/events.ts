import type { RawEvent } from '../events-common.js';

export interface AssuranceContractCreatedEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  creator: `0x${string}`;
}

export interface AssuranceContractInitializedEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  recipient: `0x${string}`;
  condition: `0x${string}`;
  // Note: threshold and deadline are not in this event — they require on-chain reads (Phase 2).
}

export interface ContractMetadataUpdatedEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  metadataCid: string;  // bytes32 → CIDv1
}

export interface ERC1155OfferedEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  erc1155Addr: `0x${string}`;
  tokenId: bigint;
  price: bigint;
}

export interface ERC1155BoughtEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  participant: `0x${string}`;
  erc1155Addr: `0x${string}`;
  totalCost: bigint;
  ids: bigint[];
  counts: bigint[];
}

export interface ERC1155SoldEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  participant: `0x${string}`;
  erc1155Addr: `0x${string}`;
  totalRefund: bigint;
  ids: bigint[];
  counts: bigint[];
}

export interface AssuranceContractWithdrawalEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  value: bigint;
}

// ============================================================================
// Secondary market events (ERC1155SecondaryMarket contract)
// ============================================================================

export interface ERC1155SecondaryMarketCreatedEvent extends RawEvent {
  erc1155: `0x${string}`;
}

export interface SaleListingCreatedEvent extends RawEvent {
  saleListingId: bigint;
  seller: `0x${string}`;
  tokenId: bigint;
  count: bigint;
  pricePerToken: bigint;
}

export interface SaleListingFulfilledEvent extends RawEvent {
  saleListingId: bigint;
  buyer: `0x${string}`;
  count: bigint;
}

export interface SaleListingCancelledEvent extends RawEvent {
  saleListingId: bigint;
}

export interface BuyOrderCreatedEvent extends RawEvent {
  buyOrderId: bigint;
  buyer: `0x${string}`;
  tokenId: bigint;
  count: bigint;
  pricePerToken: bigint;
}

export interface BuyOrderFulfilledEvent extends RawEvent {
  buyOrderId: bigint;
  seller: `0x${string}`;
  count: bigint;
}

export interface BuyOrderCancelledEvent extends RawEvent {
  buyOrderId: bigint;
}

// ============================================================================
// ERC1155 transfer events (for tracking burns)
// ============================================================================

export interface TransferSingleEvent extends RawEvent {
  operator: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  id: bigint;
  value: bigint;
}

export interface TransferBatchEvent extends RawEvent {
  operator: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  ids: bigint[];
  values: bigint[];
}
