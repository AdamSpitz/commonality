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
