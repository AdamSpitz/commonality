import type { Address, Hex } from 'viem';

export type PublishedDataId = Hex;

export interface PublishedDataCache {
  getPublishedData(publisher: Address, dataId: PublishedDataId): Promise<Uint8Array | null>;
  isPublished(publisher: Address, dataId: PublishedDataId): Promise<boolean>;
  isRetracted(publisher: Address, dataId: PublishedDataId): Promise<boolean>;
}

export type PublishedDataReadResult =
  | { status: 'active'; data: Uint8Array }
  | { status: 'retracted'; retractedData: Uint8Array }
  | { status: 'not-published' };
