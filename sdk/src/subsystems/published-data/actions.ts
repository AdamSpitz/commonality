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
  });

  await clients.publicClient.waitForTransactionReceipt({ hash: txHash });
  return { dataId, cid, txHash };
}
