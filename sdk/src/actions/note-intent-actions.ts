/**
 * User actions for NoteIntent contract (delegation subsystem)
 */

import { type Address, type Hash, type Abi } from 'viem';
import { type TestClients } from './common.js';
import { cidToBytes32, IpfsCidV1 } from '../utils/cid-types.js';

export interface NoteIntentContract {
  address: Address;
  abi: Abi;
}

/**
 * Attest that a note is intended for a specific statement/cause
 */
export async function attestNoteIntent(
  clients: TestClients,
  noteIntentContract: NoteIntentContract,
  noteContract: Address,
  noteId: bigint,
  intendedStatementCid: IpfsCidV1
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: noteIntentContract.address,
    abi: noteIntentContract.abi,
    functionName: 'attestNoteIntent',
    args: [noteContract, noteId, cidToBytes32(intendedStatementCid)],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Batch attest multiple note intents
 */
export async function attestNoteIntentsBatch(
  clients: TestClients,
  noteIntentContract: NoteIntentContract,
  noteContract: Address,
  noteIds: bigint[],
  intendedStatementCids: IpfsCidV1[]
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: noteIntentContract.address,
    abi: noteIntentContract.abi,
    functionName: 'attestNoteIntentsInBatch',
    args: [noteContract, noteIds, intendedStatementCids.map(cidToBytes32)],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
