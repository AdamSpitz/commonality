/**
 * User actions for Delegation subsystem
 */

import { type Address, type Hash, parseEventLogs } from 'viem';
import { type TestClients } from './common.js';
import { DelegatableNotesAbi } from '../abis.js';

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
 *
 * Creates a new delegatable note funded with ETH. The note can later be delegated
 * to others or used to purchase from aligned projects.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param params - Deposit parameters
 * @param params.amount - Amount of ETH to deposit (in wei)
 * @param params.intendedStatementId - The statement/cause this note is intended to support
 * @returns Transaction hash and the newly created noteId
 *
 * @example
 * ```typescript
 * const { noteId } = await depositETH(clients, contract, {
 *   amount: parseEther('1.0'),
 *   intendedStatementId: '0x1234...'
 * });
 * ```
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

  // Parse the NoteCreated event to get the noteId using viem's parseEventLogs
  const parsedLogs = parseEventLogs({
    abi: DelegatableNotesAbi,
    eventName: 'NoteCreated',
    logs: receipt.logs,
  });

  if (parsedLogs.length === 0) {
    throw new Error('Failed to find NoteCreated event in transaction logs');
  }

  const noteId = parsedLogs[0].args.noteId;

  return { hash, noteId };
}

/**
 * Delegate a note to another address
 *
 * Delegates all or part of a note's value to another address. If delegating a partial
 * amount, the note will be split into two: one for the delegate and one remainder note.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param params - Delegation parameters
 * @param params.noteId - The ID of the note to delegate
 * @param params.owners - The delegation chain (leaf first, root last) that proves ownership
 * @param params.delegateTo - Address to delegate the note to
 * @param params.amount - Amount to delegate (can be partial or full note value)
 * @returns Transaction hash, the delegated note ID, and remainder note ID (0 if full delegation)
 *
 * @example
 * ```typescript
 * const { delegatedNoteId, remainderNoteId } = await delegateNote(clients, contract, {
 *   noteId: 1n,
 *   owners: [alice.address],
 *   delegateTo: bob.address,
 *   amount: parseEther('0.5')
 * });
 * ```
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

  // Parse events to get the delegated note ID
  // The event could be a ChainSplit (partial delegation) or NoteDelegated (full delegation)
  let delegatedNoteId = params.noteId; // Default to same note for full delegation
  let remainderNoteId = 0n;

  // Look for ChainSplit event first (partial delegation)
  const chainSplitLogs = parseEventLogs({
    abi: DelegatableNotesAbi,
    eventName: 'ChainSplit',
    logs: receipt.logs,
  });

  if (chainSplitLogs.length > 0) {
    // Partial delegation occurred
    delegatedNoteId = chainSplitLogs[0].args.splitLeafId;
    remainderNoteId = chainSplitLogs[0].args.remainderLeafId;
  } else {
    // Full delegation - parse NoteDelegated event
    const noteDelegatedLogs = parseEventLogs({
      abi: DelegatableNotesAbi,
      eventName: 'NoteDelegated',
      logs: receipt.logs,
    });

    if (noteDelegatedLogs.length > 0) {
      delegatedNoteId = noteDelegatedLogs[0].args.childNoteId;
    }
  }

  return { hash, delegatedNoteId, remainderNoteId };
}

/**
 * Revoke a delegated note back to a position in the chain
 *
 * Revokes a delegation by calling this function from a parent position in the delegation
 * chain. This burns the delegated note and returns control to the revoker.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param params - Revocation parameters
 * @param params.noteId - The ID of the note to revoke
 * @param params.owners - Current delegation chain (leaf first, root last)
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await revokeNote(clients, contract, {
 *   noteId: 2n,
 *   owners: [bob.address, alice.address]
 * });
 * ```
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
 *
 * Withdraws the funds from a note that hasn't been delegated. Only the original
 * depositor can reclaim funds from their root notes.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param noteId - The ID of the note to reclaim funds from
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await reclaimFunds(clients, contract, noteId);
 * ```
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
 *
 * Uses one or more delegatable notes to purchase tokens from a project's primary market
 * (assurance contract). The notes are consumed as payment and the delegation chain members
 * receive credit for the purchase.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param params - Purchase parameters
 * @param params.noteIds - IDs of notes to use for payment
 * @param params.chains - Delegation chains for each note (leaf first, root last)
 * @param params.paymentAmount - Total amount to pay
 * @param params.primaryMarket - Address of the assurance contract
 * @param params.erc1155Contract - Address of the project's token contract
 * @param params.tokenIds - Token IDs to purchase
 * @param params.counts - Quantities for each token ID
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await purchaseFromPrimaryMarketWithNotes(clients, contract, {
 *   noteIds: [1n, 2n],
 *   chains: [[alice.address], [bob.address, alice.address]],
 *   paymentAmount: parseEther('1.0'),
 *   primaryMarket: assuranceContract.address,
 *   erc1155Contract: tokenContract.address,
 *   tokenIds: [0n],
 *   counts: [10n]
 * });
 * ```
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
