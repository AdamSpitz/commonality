import { toHex, type Abi, type Address, type Hash } from 'viem';
import { type WriteClients } from '../../utils/ethereum.js';
import { computePublishedDataId, publishedDataIdToCid, type PublishedDataCid } from './id.js';
import type { PublishedDataId } from './types.js';

export interface PublishedDataContract {
  address: Address;
  abi: Abi;
}

export interface PublishDataResult {
  dataId: PublishedDataId;
  cid: PublishedDataCid;
  txHash: Hash;
}

export interface PublishDataOptions {
  waitForReceipt?: boolean;
  nonce?: number;
}

/**
 * Publish raw bytes through PublishedData and return both canonical identifiers.
 *
 * The contract derives `dataId = sha256(content)`; the SDK computes the same id
 * client-side so callers can use the CID immediately without decoding logs.
 */
export async function publishData(
  clients: WriteClients,
  publishedDataContract: PublishedDataContract,
  content: Uint8Array,
  options: PublishDataOptions = {},
): Promise<PublishDataResult> {
  const dataId = computePublishedDataId(content);
  const cid = publishedDataIdToCid(dataId);
  const txHash = await clients.walletClient.writeContract({
    address: publishedDataContract.address,
    abi: publishedDataContract.abi,
    functionName: 'publishData',
    args: [toHex(content)],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
    ...(options.nonce !== undefined ? { nonce: options.nonce } : {}),
  });

  if (options.waitForReceipt !== false) {
    await clients.publicClient.waitForTransactionReceipt({ hash: txHash });
  }
  return { dataId, cid, txHash };
}

/**
 * Publish several byte strings in one `publishDataBatch` transaction.
 * Identifiers are computed client-side in the same order as `contents`.
 */
export async function publishDataBatch(
  clients: WriteClients,
  publishedDataContract: PublishedDataContract,
  contents: readonly Uint8Array[],
  options: PublishDataOptions = {},
): Promise<{ txHash: Hash; results: PublishDataResult[] }> {
  if (contents.length === 0) throw new Error('publishDataBatch requires at least one document');
  const results = contents.map((content) => {
    const dataId = computePublishedDataId(content);
    return { dataId, cid: publishedDataIdToCid(dataId), txHash: '0x' as Hash };
  });
  const txHash = await clients.walletClient.writeContract({
    address: publishedDataContract.address,
    abi: publishedDataContract.abi,
    functionName: 'publishDataBatch',
    args: [contents.map((content) => toHex(content))],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
    ...(options.nonce !== undefined ? { nonce: options.nonce } : {}),
  });
  if (options.waitForReceipt !== false) {
    await clients.publicClient.waitForTransactionReceipt({ hash: txHash });
  }
  return { txHash, results: results.map((result) => ({ ...result, txHash })) };
}
