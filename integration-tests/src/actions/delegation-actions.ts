/**
 * User actions for Delegation subsystem
 */

import { type Address, type Hash } from 'viem';
import { type TestClients } from './common.js';

// ============================================================================
// Delegation Actions
// ============================================================================

export interface DelegatableNotesContract {
  address: Address;
  abi: any;
}

export enum TokenType {
  ERC20 = 0,
  ERC1155 = 1,
}

/**
 * Deposit ETH into a delegatable note
 */
export async function depositETH(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    amount: bigint;
    intendedStatementId: `0x${string}`;
  }
): Promise<{ hash: Hash; noteId: bigint }> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'deposit',
    args: [
      '0x0000000000000000000000000000000000000000', // address(0) for ETH
      TokenType.ERC20, // TokenType.ERC20 for ETH
      0n, // tokenId (unused for ETH)
      0n, // amount parameter (unused for ETH, use msg.value)
      params.intendedStatementId,
    ],
    value: params.amount,
  });

  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

  // Parse the NoteCreated event to get the noteId
  const noteCreatedEventSig = '0x1a2a0b1d6b65f8d90bc804c7b1e3c8d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9'; // NoteCreated event signature

  // Find the NoteCreated event
  let noteId: bigint | undefined;
  for (const log of receipt.logs) {
    // The noteId is the first indexed parameter in NoteCreated event
    if (log.topics[0] && log.topics[1]) {
      noteId = BigInt(log.topics[1]);
      break;
    }
  }

  if (noteId === undefined) {
    throw new Error('Failed to extract noteId from transaction logs');
  }

  return { hash, noteId };
}

/**
 * Delegate a note to another address
 */
export async function delegateNote(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    noteId: bigint;
    owners: Address[]; // Delegation chain (leaf first, root last)
    delegateTo: Address;
    amount: bigint;
  }
): Promise<{ hash: Hash; delegatedNoteId: bigint; remainderNoteId: bigint }> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'delegate',
    args: [params.noteId, params.owners, params.delegateTo, params.amount],
  });

  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

  // Parse the NoteDelegated event to get the delegated note ID
  // The event could be a ChainSplit (partial delegation) or NoteDelegated (full delegation)
  let delegatedNoteId = params.noteId; // Default to same note for full delegation
  let remainderNoteId = 0n;

  // Look for ChainSplit event first (partial delegation)
  for (const log of receipt.logs) {
    if (log.topics[0] && log.topics.length >= 3) {
      // ChainSplit has originalLeafId, splitLeafId, remainderLeafId as indexed params
      const possibleDelegatedId = BigInt(log.topics[2] || 0);
      const possibleRemainderID = BigInt(log.topics[3] || 0);
      if (possibleDelegatedId > 0n) {
        delegatedNoteId = possibleDelegatedId;
        remainderNoteId = possibleRemainderID;
        break;
      }
    }
  }

  return { hash, delegatedNoteId, remainderNoteId };
}

/**
 * Revoke a delegated note back to a position in the chain
 */
export async function revokeNote(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    noteId: bigint;
    owners: Address[]; // Current delegation chain (leaf first, root last)
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'revoke',
    args: [params.noteId, params.owners],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Reclaim funds from a root note (non-delegated)
 */
export async function reclaimFunds(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  noteId: bigint
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'reclaimFunds',
    args: [noteId],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Purchase from primary market using delegatable notes
 */
export async function purchaseFromPrimaryMarketWithNotes(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    noteIds: bigint[];
    chains: Address[][]; // Array of delegation chains (one per note)
    paymentAmount: bigint;
    primaryMarket: Address;
    erc1155Contract: Address;
    tokenIds: bigint[];
    counts: bigint[];
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'purchaseFromPrimaryMarket',
    args: [
      params.noteIds,
      params.chains,
      params.paymentAmount,
      params.primaryMarket,
      params.erc1155Contract,
      params.tokenIds,
      params.counts,
    ],
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
