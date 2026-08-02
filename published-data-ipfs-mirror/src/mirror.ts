import type { Address, Hash } from 'viem';
import {
  contentMatchesDataId,
  type ContentResolver,
  type PublishedDataId,
} from '@commonality/sdk/published-data';
import { addPublishedDataToIpfs } from './ipfs.js';

export interface PublicationLog {
  publisher: Address;
  dataId: PublishedDataId;
  transactionHash: Hash;
  blockNumber: bigint;
  logIndex: number;
}

export interface MirrorDependencies {
  resolveContent: ContentResolver;
  addToIpfs: typeof addPublishedDataToIpfs;
  ipfsApiUrl: string;
}

export async function mirrorPublication(log: PublicationLog, dependencies: MirrorDependencies): Promise<string> {
  const content = await dependencies.resolveContent.resolve({
    publisher: log.publisher,
    dataId: log.dataId,
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.logIndex,
  });
  if (!content) throw new Error(`Could not recover calldata for ${log.transactionHash}:${log.logIndex}`);
  if (!contentMatchesDataId(log.dataId, content)) {
    throw new Error(`Recovered content does not match ${log.dataId}`);
  }
  return dependencies.addToIpfs(dependencies.ipfsApiUrl, log.dataId, content);
}
