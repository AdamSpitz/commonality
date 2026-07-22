import type { RawEvent } from '../events-common.js';

export interface AssuranceContractCreatedEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  creator?: `0x${string}`;
}

export interface AssuranceContractInitializedEvent extends RawEvent {
  recipient: `0x${string}`;
  condition: `0x${string}`;
}

export interface ContractMetadataUpdatedEvent extends RawEvent {
  uri?: string;
  metadata?: string;
}

export interface ERC1155OfferedEvent extends RawEvent {
  erc1155Addr: `0x${string}`;
  id: bigint;
  price: bigint;
}

export interface ERC1155BoughtEvent extends RawEvent {
  participant: `0x${string}`;
  erc1155Addr: `0x${string}`;
  totalCost: bigint;
  ids: bigint[];
  counts: bigint[];
}

export interface ERC1155SoldEvent extends RawEvent {
  participant: `0x${string}`;
  erc1155Addr: `0x${string}`;
  totalCost: bigint;
  ids: bigint[];
  counts: bigint[];
}

export interface AssuranceContractWithdrawalEvent extends RawEvent {
  recipient: `0x${string}`;
  value: bigint;
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
